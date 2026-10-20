// Configuration des rapports client modifiable par la Maintenance (page « Maintenance » → onglet « Rapports »), sans passer par le code.
// Stockée dans parametres_app, clé « config_rapports », et appliquée PAR-DESSUS les rapports écrits dans le code (rapportPerso.js) :
//   rapports[<type de matériel>] = {
//     masques : [id de rubrique…]                    rubriques du rapport masquées (la rubrique et son contenu ne sont pas imprimés)
//     textes  : {id: "nouveau texte"}                titres renommés, textes fixes modifiés
//     ajouts  : [{id, avant, type, texte, style, condition, masquerSiVide, photo}]   blocs ajoutés, posés « avant » une rubrique (ou « __fin »)
//   }
// Sans configuration, rien ne change : les rapports sont exactement ceux du code. Même principe que configFiches.js (brouillon, publication, 20 versions).
import {SUPA_URL, H, db} from "./supabase";

const CLE="config_rapports";
const CLE_HISTO="config_rapports_historique";
const CACHE="pmv_config_rapports";
const VIDE={v:1,rapports:{}};

function normaliser(c){
  if(!c||typeof c!=="object")return VIDE;
  return {v:1,rapports:(c.rapports&&typeof c.rapports==="object")?c.rapports:{}};
}
let config=(()=>{try{return normaliser(JSON.parse(localStorage.getItem(CACHE)||"null"));}catch(e){return VIDE;}})();
const abonnes=new Set();

export function configRapportsActuelle(){return config;}
export function surChangementConfigRapports(fn){abonnes.add(fn);return()=>abonnes.delete(fn);}
function adopter(c){
  config=normaliser(c);
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
export async function chargerConfigRapports(){
  try{
    const val=await lireValeur(CLE);
    const c=val?normaliser(JSON.parse(val)):VIDE;
    if(JSON.stringify(c)!==JSON.stringify(config))adopter(c);
  }catch(e){/* hors ligne : configuration en mémoire conservée */}
}
async function histoStrict(){const val=await lireValeur(CLE_HISTO);const a=val?JSON.parse(val):[];return Array.isArray(a)?a:[];}
export async function lireHistoriqueRapports(){
  try{return await histoStrict();}catch(e){return [];}
}
// Publie une nouvelle configuration ; l'ancienne est rangée dans l'historique (20 versions) pour pouvoir revenir en arrière.
export async function publierConfigRapports(nouvelle,qui,note){
  const ancienne=JSON.stringify(config);
  const histo=await histoStrict(); // si l'historique ne peut pas être lu, on ne publie pas (il serait écrasé)
  histo.unshift({t:new Date().toISOString(),qui:qui||"",note:note||"",config:ancienne});
  await db.upsert("parametres_app",[{cle:CLE_HISTO,valeur:JSON.stringify(histo.slice(0,20))}],"cle");
  await db.upsert("parametres_app",[{cle:CLE,valeur:JSON.stringify(normaliser(nouvelle))}],"cle");
  adopter(nouvelle);
}

// configuration d'un type de matériel (toujours un objet complet) ; `surcharge` = brouillon de l'éditeur
export function configDuType(type,surcharge){
  const c=normaliser(surcharge||config).rapports[type]||{};
  return {masques:Array.isArray(c.masques)?c.masques:[],textes:(c.textes&&typeof c.textes==="object")?c.textes:{},ajouts:Array.isArray(c.ajouts)?c.ajouts:[]};
}
