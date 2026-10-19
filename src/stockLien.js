// Lien entre les fiches atelier et le stock : retrouver la référence d'une pièce dans le stock, décompter 1 pièce « prise du stock »,
// la remettre si le choix change, et savoir si le stock passe sous le mini.
// Chaque décompte est un mouvement de stock « sortie » (ou « annulation » pour la remise) du N° DE de la fiche, avec un commentaire repère
// « Fiche atelier DE0000 : <pièce> » : enregistrer plusieurs fois la fiche ne décompte donc jamais deux fois.
import {SUPA_URL, H} from "./supabase";
import {reunirStocks, qteEff, miniEff, maxiEff, groupeStock} from "./stockGroupes";

const cle=s=>String(s==null?"":s).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/×/g,"X").replace(/\s+/g," ").trim().toUpperCase();

// Articles du stock (références réunies comme dans la page Stock). {ok:false} si la table n'existe pas ou hors ligne.
export async function lireStock(){
  try{
    const r=await fetch(SUPA_URL+"/rest/v1/stock_articles?select=id,reference,dimensions,emplacement,quantite,stock_mini,stock_maxi&order=reference&limit=5000",{headers:H});
    const rows=await r.json();
    if(Array.isArray(rows))return {ok:true,articles:reunirStocks(rows)};
    return {ok:false,absent:!!(rows&&rows.code==="PGRST205")};
  }catch(e){return {ok:false};}
}

// L'article du stock correspondant à la référence d'une pièce (roulements et garnitures mécaniques seulement) ; « 6217 C3 » et « 6217 ZZ C3 » sont interchangeables.
export function trouverArticle(articles,reference){
  const ref=cle(String(reference||"").replace(/^Autre:/,""));
  if(!ref)return null;
  const liste=articles||[];
  const exact=liste.find(a=>cle(a.reference)===ref);
  if(exact)return exact;
  const g=groupeStock(ref);
  if(g){
    const freres=liste.filter(a=>groupeStock(a.reference)===g);
    if(freres.length)return freres.slice().sort((a,b)=>(b.quantite||0)-(a.quantite||0))[0];
  }
  return null;
}

// Même règle que « à recommander » de la page Stock : quantité ≤ mini et < maxi (quantités réunies pour les roulements interchangeables).
export function sousMini(a,quantite){
  const q=quantite!==undefined?quantite:qteEff(a),mi=miniEff(a),ma=maxiEff(a);
  return mi!=null&&q<=mi&&(ma==null||q<ma);
}

export const marquePrelevement=(de,designation)=>"Fiche atelier "+de+" : "+designation;

// Somme des mouvements de cette fiche, par repère et article : {"Fiche atelier DE1 : Roulement…|<id article>": -1}
async function lireMouvements(de){
  const r=await fetch(SUPA_URL+"/rest/v1/stock_mouvements?select=article_id,delta,commentaire&chantier=eq."+encodeURIComponent(de)+"&commentaire=like."+encodeURIComponent("Fiche atelier "+de+" : *")+"&limit=1000",{headers:H});
  const rows=await r.json();
  if(!r.ok||!Array.isArray(rows))throw new Error("lecture des mouvements de stock");
  const net={};
  rows.forEach(m=>{const k=m.commentaire+"|"+m.article_id;net[k]=(net[k]||0)+(m.delta||0);});
  return net;
}
export async function lirePrelevements(de){
  if(!de)return null;
  try{return await lireMouvements(de);}catch(e){return null;}
}

// Met le stock d'accord avec les pièces de la fiche : retire 1 pièce pour chaque « prise du stock » pas encore décomptée,
// et remet au stock celles qui avaient été décomptées et ne le sont plus (autre choix, pièce retirée, pièce ignorée).
// pieces : [{designation, reference, etat}] ; lève une erreur si la lecture ou l'enregistrement échoue (rien n'est alors à moitié fait côté fiche).
export async function appliquerPrelevements({de,qui,pieces,articles}){
  const net=await lireMouvements(de);
  const voulus={};
  (pieces||[]).filter(p=>p.etat==="stock").forEach(p=>{
    const a=trouverArticle(articles,p.reference);
    if(a)voulus[marquePrelevement(de,p.designation)+"|"+a.id]=a;
  });
  const corps=[];
  Object.keys(voulus).forEach(k=>{
    if((net[k]||0)>-1){
      const i=k.lastIndexOf("|");
      corps.push({article_id:voulus[k].id,type:"sortie",delta:-1,chantier:de,utilisateur:qui||null,commentaire:k.slice(0,i)});
    }
  });
  Object.keys(net).forEach(k=>{
    if(net[k]<0&&!voulus[k]){
      const i=k.lastIndexOf("|");
      corps.push({article_id:k.slice(i+1),type:"annulation",delta:-net[k],chantier:de,utilisateur:qui||null,commentaire:k.slice(0,i)});
    }
  });
  if(!corps.length)return {nb:0};
  const r=await fetch(SUPA_URL+"/rest/v1/stock_mouvements",{method:"POST",headers:{...H,"Prefer":"return=minimal"},body:JSON.stringify(corps)});
  if(!r.ok)throw new Error("enregistrement des mouvements de stock");
  return {nb:corps.length};
}
