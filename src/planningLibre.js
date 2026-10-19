// Planning : chantiers « sans fiche » (description des travaux, client, N° de DE, contact), qui n'apparaissent que dans le Planning
// (jamais dans les fiches atelier, le tableau de bord ni les statistiques). Rangés dans `parametres_app` (clé « planning_libre », liste JSON) :
// aucune table à créer. Chaque modification relit d'abord la liste en base puis l'enregistre, pour ne pas écraser le travail d'une autre personne.
import {SUPA_URL, H, db} from "./supabase";

export const CLE_PLANNING_LIBRE="planning_libre";
export const PREFIXE_ID_LIBRE="pl_";
export const estIdLibre=id=>String(id||"").indexOf(PREFIXE_ID_LIBRE)===0;

const propre=e=>({
  id:String(e.id),
  de:String(e.de||"").trim(),
  client:String(e.client||"").trim(),
  description:String(e.description||"").trim(),
  contact:String(e.contact||"").trim(),
  statut:String(e.statut||"A_demonter"),
  cree:e.cree||new Date().toISOString(),
  par:String(e.par||""),
});

export function nouvelIdLibre(){return PREFIXE_ID_LIBRE+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}

// lit la liste ; lève une erreur si la base ne répond pas (pour ne jamais confondre « injoignable » et « vide »)
export async function lirePlanningLibre(){
  const r=await fetch(SUPA_URL+"/rest/v1/parametres_app?select=valeur&cle=eq."+CLE_PLANNING_LIBRE,{headers:H});
  if(!r.ok)throw new Error("Lecture du planning impossible ("+r.status+")");
  const rows=await r.json();
  const brut=Array.isArray(rows)&&rows[0]&&rows[0].valeur?rows[0].valeur:"[]";
  try{const l=JSON.parse(brut);return Array.isArray(l)?l.filter(e=>e&&e.id).map(propre):[];}catch(e){return [];}
}

// relit la liste, applique `modifier(liste) -> nouvelle liste`, enregistre, renvoie la nouvelle liste
export async function modifierPlanningLibre(modifier){
  const actuelle=await lirePlanningLibre();
  const nouvelle=modifier(actuelle).map(propre);
  await db.upsert("parametres_app",[{cle:CLE_PLANNING_LIBRE,valeur:JSON.stringify(nouvelle)}],"cle");
  return nouvelle;
}
