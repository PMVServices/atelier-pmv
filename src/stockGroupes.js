// Roulements interchangeables pour le stock : « 6217 C3 » et « 6217 ZZ C3 » (idem 6218, 6219, 6317, 6318, 6319) sont comptés ensemble.
// Chaque référence garde sa quantité, son étiquette et ses mouvements ; mais le stock mini et le stock maxi valent pour les DEUX réunis :
// l'alerte « à renouveler », la quantité à commander et le mail du matin se calculent sur le total des deux.
export const SERIES_REUNIES=["6217","6218","6219","6317","6318","6319"];
const nettoyer=s=>String(s==null?"":s).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").trim().toUpperCase();

// "6217" pour « 6217 C3 » et « 6217 ZZ C3 » (avec ou sans espaces), sinon null
export function groupeStock(reference){
  const m=/^(\d{4})\s*(?:ZZ\s*)?C3$/.exec(nettoyer(reference));
  return m&&SERIES_REUNIES.includes(m[1])?m[1]:null;
}

// Ajoute aux articles réunis : groupe, membres (références, « C3 » en premier), qteGroupe (somme), miniGroupe, maxiGroupe.
// Si les deux lignes ont des seuils différents, on garde le plus grand (alerte plus tôt). Si une seule des deux références existe
// dans la base, rien n'est réuni et elle garde ses propres seuils.
export function reunirStocks(articles){
  const groupes=new Map();
  (articles||[]).forEach(a=>{const g=groupeStock(a.reference);if(g){if(!groupes.has(g))groupes.set(g,[]);groupes.get(g).push(a);}});
  return (articles||[]).map(a=>{
    const g=groupeStock(a.reference),m=g&&groupes.get(g);
    if(!m||m.length<2)return a;
    const tri=m.slice().sort((x,y)=>String(x.reference).localeCompare(String(y.reference),"fr",{numeric:true}));
    const plusGrand=cle=>{const v=m.map(x=>x[cle]).filter(x=>x!=null);return v.length?Math.max(...v):null;};
    return {...a,groupe:g,membres:tri.map(x=>x.reference),qteGroupe:m.reduce((n,x)=>n+(x.quantite||0),0),miniGroupe:plusGrand("stock_mini"),maxiGroupe:plusGrand("stock_maxi")};
  });
}
// Valeurs à utiliser pour les alertes (réunies si l'article fait partie d'un groupe)
export const qteEff=a=>a.groupe?a.qteGroupe:(a.quantite||0);
export const miniEff=a=>a.groupe?a.miniGroupe:a.stock_mini;
export const maxiEff=a=>a.groupe?a.maxiGroupe:a.stock_maxi;
// Une seule ligne par groupe dans les listes « à renouveler » : la première référence (« … C3 »)
export const estPrincipal=a=>!a.groupe||a.reference===a.membres[0];
export const libelleGroupe=(a,sep)=>a.groupe?a.membres.join(sep||" + "):a.reference;
