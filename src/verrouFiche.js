// Verrou de fiche atelier : une seule personne à la fois modifie une fiche, les autres l'ouvrent en lecture seule (pas de doublons ni de fiche écrasée).
// Le verrou est rangé dans la table « parametres_app » (aucune table à créer) : une ligne par fiche, clé « verrou_fiche_<id> », valeur JSON
//   {p: personne, d: appareil, s: session (une par ouverture de fiche), a: heure de prise, t: dernier signe de vie}.
// La prise est atomique (insertion « sans écraser » ; reprise d'un verrou abandonné par remplacement conditionnel) : deux personnes qui ouvrent en même temps ne passent pas toutes les deux.
// La fiche ouverte renouvelle son signe de vie toutes les 30 s ; un verrou sans signe de vie depuis 5 minutes (tablette éteinte, appli fermée de force) est considéré comme abandonné.
// En cas d'échec réseau on n'empêche jamais de travailler.
import {useEffect, useState} from "react";
import {SUPA_URL, H} from "./supabase";

const PREFIXE="verrou_fiche_";
const REST=SUPA_URL+"/rest/v1/parametres_app";
export const BATTEMENT_MS=30000;
export const EXPIRATION_MS=300000;
const enc=encodeURIComponent;

// identifiant de cet appareil (reconnaître « moi, sur un autre appareil » ; ne pas afficher mon propre verrou dans les listes)
export function idAppareil(){
  try{
    let id=localStorage.getItem("pmv_appareil");
    if(!id){id=Math.random().toString(36).slice(2,10)+Date.now().toString(36);localStorage.setItem("pmv_appareil",id);}
    return id;
  }catch(e){return "sans-stockage";}
}

// requête avec délai maximal de 8 s : une connexion qui ne répond pas ne bloque jamais l'ouverture d'une fiche
async function appel(url,opts){
  const ctl=typeof AbortController!=="undefined"?new AbortController():null;
  const minuteurAbandon=ctl?setTimeout(()=>ctl.abort(),8000):null;
  try{
    const r=await fetch(url,{...opts,signal:ctl?ctl.signal:undefined});
    if(!r.ok)throw new Error("verrou "+r.status);
    const t=await r.text();
    return t?JSON.parse(t):[];
  }finally{if(minuteurAbandon)clearTimeout(minuteurAbandon);}
}
const lireLigne=async cle=>{const rows=await appel(REST+"?select=cle,valeur&cle=eq."+enc(cle),{headers:H});return Array.isArray(rows)&&rows[0]?rows[0]:null;};
// insère la ligne seulement si elle n'existe pas : renvoie les lignes réellement insérées (vide = déjà prise)
const inserer=(cle,valeur)=>appel(REST+"?on_conflict=cle",{method:"POST",headers:{...H,"Prefer":"resolution=ignore-duplicates,return=representation"},body:JSON.stringify([{cle,valeur}])});
// remplace la valeur seulement si elle est encore celle que l'on a lue : renvoie les lignes modifiées (vide = quelqu'un d'autre est passé avant)
const remplacerSi=(cle,ancienne,nouvelle)=>appel(REST+"?cle=eq."+enc(cle)+"&valeur=eq."+enc(ancienne),{method:"PATCH",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify({valeur:nouvelle})});
const supprimerSi=(cle,valeur)=>appel(REST+"?cle=eq."+enc(cle)+"&valeur=eq."+enc(valeur),{method:"DELETE",headers:H});
const lire=ligne=>{try{const o=JSON.parse(ligne.valeur);return o&&typeof o==="object"?o:null;}catch(e){return null;}};
const abandonne=o=>!o||!(Date.now()-Number(o.t||0)<EXPIRATION_MS);

// ctrl = creerVerrou(id de la fiche, nom de la personne) ; chaque méthode renvoie {ok:true} ou {ok:false, par, depuis, appareil}
export function creerVerrou(ficheId,qui){
  const cle=PREFIXE+ficheId;
  const session=Math.random().toString(36).slice(2)+Date.now().toString(36);
  const debut=Date.now();
  let actuelle=null; // texte exact de la dernière valeur que nous avons écrite
  const fabriquer=()=>JSON.stringify({p:qui,d:idAppareil(),s:session,a:debut,t:Date.now()});
  const refuse=o=>({ok:false,par:o.p,depuis:o.a||o.t,appareil:o.d===idAppareil()});
  // les opérations d'un même verrou se font l'une après l'autre (libérer attend que la prise en cours soit terminée)
  let file=Promise.resolve();
  const enFile=fn=>{const p=file.then(fn,fn);file=p.catch(()=>{});return p;};
  async function prendre_(){
    try{
      for(let essai=0;essai<4;essai++){
        let v=fabriquer();
        if((await inserer(cle,v)).length){actuelle=v;return {ok:true};}
        const ligne=await lireLigne(cle);
        if(!ligne)continue; // libérée entre-temps
        const o=lire(ligne);
        if(o&&o.s===session){actuelle=ligne.valeur;return {ok:true};}
        // verrou abandonné, ou laissé par cet appareil lui-même (rechargement de la page, ancienne ouverture) : on le reprend
        if(abandonne(o)||o.d===idAppareil()){
          v=fabriquer();
          if((await remplacerSi(cle,ligne.valeur,v)).length){actuelle=v;return {ok:true};}
          continue; // quelqu'un est passé avant nous : on relit
        }
        return refuse(o);
      }
      return {ok:true,hors:true};
    }catch(e){return {ok:true,hors:true};}
  }
  async function garder_(){
    try{
      const ligne=await lireLigne(cle);
      if(!ligne)return await prendre_();
      const o=lire(ligne);
      if(o&&o.s===session){
        const v=fabriquer();
        if((await remplacerSi(cle,ligne.valeur,v)).length){actuelle=v;return {ok:true};}
        return await prendre_();
      }
      if(abandonne(o))return await prendre_();
      return refuse(o);
    }catch(e){return {ok:true,hors:true};}
  }
  // libérer = marquer le verrou comme périmé (t = 0), puis le supprimer si la base l'autorise : la libération ne dépend donc que du droit de modifier la ligne
  const perime=v=>{const o=lire({valeur:v})||{};return JSON.stringify({...o,t:0});};
  async function liberer_(){
    if(!actuelle)return;
    const v=actuelle;actuelle=null;
    try{
      const p=perime(v);
      if((await remplacerSi(cle,v,p)).length){try{await supprimerSi(cle,p);}catch(e){/* la ligne périmée reste, sans effet */}}
    }catch(e){/* le verrou expirera tout seul */}
  }
  const prendre=()=>enFile(prendre_),garder=()=>enFile(garder_),liberer=()=>enFile(liberer_);
  // fermeture de la page : la requête doit partir même si la page disparaît
  function libererVite(){
    if(!actuelle)return;
    const v=actuelle;actuelle=null;
    try{fetch(REST+"?cle=eq."+enc(cle)+"&valeur=eq."+enc(v),{method:"PATCH",headers:{...H,"Prefer":"return=minimal"},body:JSON.stringify({valeur:perime(v)}),keepalive:true});}catch(e){/* le verrou expirera tout seul */}
  }
  return {prendre,garder,liberer,libererVite};
}

// Verrous en cours de toutes les fiches : {id de fiche: {p,d,s,a,t}} (les verrous abandonnés sont ignorés)
export async function lireVerrous(){
  const rows=await appel(REST+"?select=cle,valeur&cle=like."+enc(PREFIXE+"*"),{headers:H});
  const m={};
  (Array.isArray(rows)?rows:[]).forEach(r=>{const o=lire(r);if(o&&!abandonne(o))m[String(r.cle).slice(PREFIXE.length)]=o;});
  return m;
}
// Verrou en cours d'une fiche tenu par quelqu'un d'autre que cet appareil (ou null)
export async function verrouDeAutrui(ficheId){
  try{
    const ligne=await lireLigne(PREFIXE+ficheId);
    const o=ligne&&lire(ligne);
    return o&&!abandonne(o)&&o.d!==idAppareil()?o:null;
  }catch(e){return null;}
}

// Les listes affichent « 🔒 nom » sur les fiches ouvertes par quelqu'un d'autre : une seule lecture toutes les 20 s, partagée par tous les composants
let carte={};const abonnes=new Set();let minuteur=null;
async function actualiser(){
  try{carte=await lireVerrous();abonnes.forEach(f=>f(carte));}catch(e){/* on garde la dernière carte connue */}
}
export function useVerrous(){
  const [m,setM]=useState(carte);
  useEffect(()=>{
    abonnes.add(setM);
    if(abonnes.size===1){actualiser();minuteur=setInterval(actualiser,20000);}
    else setM(carte);
    return()=>{abonnes.delete(setM);if(abonnes.size===0&&minuteur){clearInterval(minuteur);minuteur=null;}};
  },[]);
  return m;
}
