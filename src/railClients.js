// PMV Rail (filiale) : les clients du rail ont des numéros DV0000 au lieu de DE0000.
// Module sans dépendance, pour pouvoir être lu partout (fiches, chantier, suivi clients) sans import circulaire.
export const TYPE_CHEMINEE="Cheminée de freinage";
export const ISOLATEURS_SNCF_PAR_CHEMINEE=520; // une cheminée SNCF : tous les isolateurs sont changés
const CLIENTS_RAIL_DEFAUT=["PATRY","EIFFAGE RAIL SAS","IMATEQ"];
const norm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
let clientsRail=CLIENTS_RAIL_DEFAUT.slice();
export const listeClientsRail=()=>clientsRail.slice();
export function definirClientsRail(liste){clientsRail=Array.isArray(liste)?liste.map(x=>String(x).trim()).filter(Boolean):CLIENTS_RAIL_DEFAUT.slice();}
// « Eiffage Rail », « EIFFAGE RAIL SAS » ou « Patry SA » reconnus ; un nom trop court ne se reconnaît que s'il est identique
export function estClientRail(client){
  const a=norm(client);if(!a)return false;
  return clientsRail.some(c=>{const b=norm(c);return a===b||(a.length>=6&&b.length>=6&&(a.startsWith(b)||b.startsWith(a)));});
}
// « DV » pour un client du rail, « DE » pour les autres
export const prefixeNumero=client=>estClientRail(client)?"DV":"DE";
// "7945", "de7945", "DE 7945", "dv 40" -> DE7945 / DV0040…  : sans préfixe saisi, celui du client ; un préfixe saisi est conservé
export function normaliserNumero(t,client,prefixeForce){
  const s=String(t||"").trim();
  const m=s.match(/^(de|dv)?\s*(\d+)$/i);
  if(!m)return s;
  return (m[1]?m[1].toUpperCase():(prefixeForce||prefixeNumero(client)))+m[2];
}
