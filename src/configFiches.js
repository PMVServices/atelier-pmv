// Configuration modifiable de l'application sans passer par le code (profil « Maintenance », page « Maintenance »).
// Stockée dans la base (table parametres_app, clé « config_fiches ») et appliquée PAR-DESSUS les définitions écrites dans le code :
//   - champs d'une fiche (atelier : un jeu par type de matériel ; chantier : un jeu par type d'équipement, clé « ch:<type> ») :
//       champs[id] = {label, required, options, note, masque}  → renommer, rendre (non) obligatoire, changer les choix, masquer (les données restent en base)
//       deplace[id] = {apres}                                   → déplacer un champ après un autre (« __debut » = en tête de l'étape)
//       ajouts      = [{id, etape, apres, def:{type,label,…}}]  → champs ajoutés à un endroit précis
//   - colonnes du planning (statuts de chantier) : statuts = [{id,label,color}] dans l'ordre voulu
// Sans configuration, rien ne change : les définitions du code sont renvoyées telles quelles.
import {SUPA_URL, H, db} from "./supabase";

const CLE="config_fiches";
const CLE_HISTO="config_fiches_historique";
const CACHE="pmv_config_fiches";
const VIDE={v:1,fiches:{},statuts:null};

function normaliser(c){
  if(!c||typeof c!=="object")return VIDE;
  return {v:1,fiches:(c.fiches&&typeof c.fiches==="object")?c.fiches:{},statuts:Array.isArray(c.statuts)&&c.statuts.length?c.statuts:null};
}
let config=(()=>{try{return normaliser(JSON.parse(localStorage.getItem(CACHE)||"null"));}catch(e){return VIDE;}})();
let version=0;
const abonnes=new Set();
const memo=new Map();

export function configActuelle(){return config;}
export function versionConfig(){return version;}
export function surChangementConfig(fn){abonnes.add(fn);return()=>abonnes.delete(fn);}
function adopter(c){
  config=normaliser(c);memo.clear();version++;
  try{localStorage.setItem(CACHE,JSON.stringify(config));}catch(e){/* cache facultatif */}
  abonnes.forEach(f=>{try{f();}catch(e){/* un abonné défaillant ne bloque pas les autres */}});
}

async function lireValeur(cle){
  const r=await fetch(SUPA_URL+"/rest/v1/parametres_app?select=cle,valeur&cle=eq."+cle,{headers:H});
  const rows=await r.json();
  if(!r.ok||!Array.isArray(rows))throw new Error("lecture");
  return rows[0]&&rows[0].valeur?rows[0].valeur:null;
}
// Lit la configuration en base. En cas d'erreur de connexion on garde celle déjà connue (jamais de retour « à vide » par accident).
export async function chargerConfig(){
  try{
    const val=await lireValeur(CLE);
    const c=val?normaliser(JSON.parse(val)):VIDE;
    if(JSON.stringify(c)!==JSON.stringify(config))adopter(c);
  }catch(e){/* hors ligne : configuration en mémoire conservée */}
}
async function histoStrict(){const val=await lireValeur(CLE_HISTO);const a=val?JSON.parse(val):[];return Array.isArray(a)?a:[];}
export async function lireHistorique(){
  try{return await histoStrict();}catch(e){return [];}
}
// Publie une nouvelle configuration ; l'ancienne est rangée dans l'historique (20 versions) pour pouvoir revenir en arrière.
export async function publierConfig(nouvelle,qui,note){
  const ancienne=JSON.stringify(config);
  const histo=await histoStrict(); // si l'historique ne peut pas être lu, on ne publie pas (il serait écrasé)
  histo.unshift({t:new Date().toISOString(),qui:qui||"",note:note||"",config:ancienne});
  await db.upsert("parametres_app",[{cle:CLE_HISTO,valeur:JSON.stringify(histo.slice(0,20))}],"cle");
  await db.upsert("parametres_app",[{cle:CLE,valeur:JSON.stringify(normaliser(nouvelle))}],"cle");
  adopter(nouvelle);
}

// ── champs ajoutés par la maintenance ──
export const TYPES_AJOUT=[
  ["text","Texte court"],["texte_long","Texte long (avec dictée vocale)"],["number","Nombre (avec unité)"],["select","Liste de choix"],
  ["oui_non","Oui / Non"],["date","Date"],["photo","Photo (au moins une)"],["titre","Intertitre"]
];
export function champDepuisAjout(a){
  const d=a.def||{};
  const base={id:a.id,label:d.label||"Nouveau champ",note:d.note||undefined,ajoute:true};
  switch(d.type){
    case "texte_long":return {...base,type:"text",dictee:true,required:!!d.required};
    case "number":return {...base,type:"number",unite:d.unite||undefined,required:!!d.required};
    case "select":return {...base,type:"select",options:(d.options&&d.options.length?d.options:["—"]).concat(d.autre?["Autre"]:[]),autreTexte:!!d.autre,required:!!d.required};
    case "oui_non":return {...base,type:"oui_non",required:!!d.required};
    case "date":return {...base,type:"date",required:!!d.required};
    case "photo":return {...base,type:"photo_requise",categorie:d.label||"Photo",required:!!d.required,libre:true};
    case "titre":return {...base,type:"titre"};
    default:return {...base,type:"text",required:!!d.required};
  }
}

// ── application de la configuration aux définitions du code ──
// map : {étape: [champs]} ; cle : « Moteur », « Pompe »… (atelier) ou « ch:Moteur »… (chantier) ; garderMasques : pour l'éditeur
function construire(map,cle,cfgGlobale,garderMasques){
  const cfg=cfgGlobale.fiches&&cfgGlobale.fiches[cle];
  if(!cfg)return map;
  const champs=cfg.champs||{};const deplace=cfg.deplace||{};const ajouts=cfg.ajouts||[];
  const out={};
  const transforme=c=>{
    const o=champs[c.id];
    if(!o)return c;
    const n={...c};
    if(o.label)n.label=o.label;
    if(o.required!==undefined&&o.required!==null)n.required=!!o.required;
    if(Array.isArray(o.options)&&o.options.length&&Array.isArray(c.options))n.options=o.options;
    if(o.note!==undefined)n.note=(String(o.note).trim())||undefined;
    if(o.masque)n._masque=true;
    return n;
  };
  // champs du code envoyés dans une autre étape (deplace[id].etape) : id → étape d'arrivée ; ils quittent leur étape du code
  const origine={},nb={};Object.keys(map).forEach(e=>map[e].forEach(c=>{origine[c.id]=e;nb[c.id]=(nb[c.id]||0)+1;}));
  const vers={};
  Object.keys(deplace).forEach(id=>{const t=deplace[id]&&deplace[id].etape;if(t&&origine[id]&&nb[id]===1&&origine[id]!==t&&map[t])vers[id]=t;});
  const arrivees={};
  Object.keys(map).forEach(e=>map[e].forEach(c=>{if(vers[c.id])arrivees[c.id]={...transforme(c),_depuis:e};}));
  Object.keys(map).forEach(etape=>{
    let liste=map[etape].filter(c=>!vers[c.id]).map(transforme);
    const poser=a=>{
      const c=champDepuisAjout(a);
      const j=a.apres==="__debut"?-1:liste.findIndex(x=>x.id===a.apres);
      if(a.apres==="__debut")liste.unshift(c);else if(j>=0)liste.splice(j+1,0,c);else liste.push(c);
    };
    // champs ajoutés : un champ posé après un autre champ ajouté attend que celui-ci soit en place
    let reste=ajouts.filter(a=>a.etape===etape);
    for(let passe=0;reste.length&&passe<50;passe++){
      const attente=reste.filter(a=>a.apres&&a.apres!=="__debut"&&!liste.some(c=>c.id===a.apres)&&reste.some(x=>x.id===a.apres));
      if(attente.length===reste.length){reste.forEach(poser);reste=[];break;}
      reste.filter(a=>!attente.includes(a)).forEach(poser);
      reste=attente;
    }
    // déplacements de champs du code : dans l'étape, ou arrivée d'un champ venu d'une autre étape (posé après le champ voulu, sinon à la fin)
    // (un champ posé après un autre champ lui-même déplacé attend que celui-ci soit en place)
    const placer=id=>{
      let i,c;
      if(vers[id]===etape){c=arrivees[id];i=liste.length;}
      else{i=liste.findIndex(x=>x.id===id);if(i<0||liste[i].ajoute)return;[c]=liste.splice(i,1);}
      const ap=deplace[id].apres;
      const j=ap==="__debut"?-1:liste.findIndex(x=>x.id===ap);
      if(ap==="__debut")liste.unshift(c);else if(j>=0)liste.splice(j+1,0,c);else liste.splice(i,0,c);
    };
    let attente=Object.keys(deplace).filter(id=>vers[id]===etape||liste.some(x=>x.id===id&&!x.ajoute));
    for(let passe=0;attente.length&&passe<50;passe++){
      let prets=attente.filter(id=>{const ap=deplace[id].apres;return ap==="__debut"||ap===id||!attente.includes(ap);});
      if(!prets.length)prets=attente.slice();
      prets.forEach(placer);
      attente=attente.filter(id=>!prets.includes(id));
    }
    out[etape]=garderMasques?liste:liste.filter(c=>!c._masque);
  });
  return out;
}
// Version utilisée par l'application (mémorisée tant que la configuration ne change pas : mêmes tableaux d'un rendu à l'autre)
export function appliquerConfig(map,cle){
  if(!config.fiches[cle])return map;
  const k=cle+"|"+version;
  if(!memo.has(k))memo.set(k,construire(map,cle,config,false));
  return memo.get(k);
}
// Version de l'éditeur : champs masqués conservés (signalés par _masque), sur une configuration en cours de modification
export function appliquerConfigEditeur(map,cle,cfgBrouillon){return construire(map,cle,cfgBrouillon,true);}

// ── colonnes du planning (statuts de chantier) ──
function teinte(hex){
  const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex||"");
  if(!m)return "#F5F6F8";
  const t=[1,2,3].map(i=>Math.round(255-(255-parseInt(m[i],16))*0.1).toString(16).padStart(2,"0"));
  return "#"+t.join("");
}
export function statutsAvecConfig(base,cfgStatuts){
  const liste=base.map(s=>({...s}));
  if(!Array.isArray(cfgStatuts)||!cfgStatuts.length)return liste;
  const par=new Map(cfgStatuts.map(x=>[x.id,x]));
  liste.forEach(s=>{const o=par.get(s.id);if(o){if(o.label)s.label=o.label;if(o.color){s.color=o.color;s.bg=teinte(o.color);}}});
  cfgStatuts.forEach(o=>{if(!liste.find(s=>s.id===o.id))liste.push({id:o.id,label:o.label||"Nouveau statut",color:o.color||"#6B7280",bg:teinte(o.color||"#6B7280")});});
  const rang=id=>{const i=cfgStatuts.findIndex(x=>x.id===id);return i<0?9999:i;};
  return liste.map((s,i)=>({s,i})).sort((a,b)=>(rang(a.s.id)-rang(b.s.id))||(a.i-b.i)).map(x=>x.s);
}
// remplace le contenu du tableau STATUTS_CHANTIER (même objet : tout le code qui l'importe voit le changement)
export function appliquerStatuts(tableau,base){
  tableau.splice(0,tableau.length,...statutsAvecConfig(base,config.statuts));
}
