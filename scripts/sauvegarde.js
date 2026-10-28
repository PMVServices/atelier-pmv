// Sauvegarde (LECTURE SEULE) de toutes les tables de la base Supabase dans des fichiers JSON, un dossier daté par sauvegarde.
// À lancer : node scripts/sauvegarde.js                 → crée « ../sauvegardes-pmv/AAAA-MM-JJ_HHMM » (hors du dépôt, jamais envoyé sur GitHub)
//            node scripts/sauvegarde.js --compter        → compte seulement les lignes de chaque table (n'écrit aucun fichier)
//            node scripts/sauvegarde.js --dest D:\NAS\PMV   → autre dossier de destination (un sous-dossier daté y est créé)
//            node scripts/sauvegarde.js --garder 30      → ne garde que les 30 sauvegardes les plus récentes du dossier de destination
// N'écrit jamais dans la base ; la clé utilisée est la clé publique déjà dans src/supabase.js. Les photos (stockage) ne sont pas copiées : seule leur liste (table fiche_photos) l'est.
// ATTENTION : les fichiers contiennent des données clients (noms, contacts, prix) : les ranger comme la base elle-même.
const fs=require("fs");
const path=require("path");

const src=fs.readFileSync(path.join(__dirname,"..","src","supabase.js"),"utf8");
const URL_=(src.match(/SUPA_URL\s*=\s*"([^"]+)"/)||[])[1];
const KEY=(src.match(/SUPA_KEY\s*=\s*"([^"]+)"/)||[])[1];
if(!URL_||!KEY){console.error("Impossible de lire SUPA_URL / SUPA_KEY dans src/supabase.js");process.exit(1);}

// toutes les tables utilisées par l'appli (relevées dans le code le 28/10/2026) ; une table absente est signalée, pas bloquante
const TABLES=["fiches","fiche_valeurs","fiche_photos","fiche_historique","fiches_chantier","fiches_chantier_valeurs","fiches_chantier_photos","clients","techniciens","categories_photos",
  "parametres_app","stock_articles","stock_mouvements","stock_codes","rail_stock","demandes_materiel","suivi_pieces","suivi_devis","suivi_rdv","suivi_prospects","calendriers",
  "carnet_contacts","commandes_fournisseurs","fournisseurs_commandes","commandes_modeles"];

const args=process.argv.slice(2);
const option=nom=>{const i=args.indexOf(nom);return i>=0?args[i+1]:null;};
const compterSeulement=args.includes("--compter");
const racineDepot=path.resolve(__dirname,"..");
const parent=path.resolve(option("--dest")||path.join(racineDepot,"..","sauvegardes-pmv"));
const garder=parseInt(option("--garder"),10);
if(!compterSeulement&&(parent===racineDepot||parent.startsWith(racineDepot+path.sep))){console.error("Le dossier de destination ne doit pas être dans le dépôt du projet (données clients) : "+parent);process.exit(1);}

const entetes=extra=>({apikey:KEY,Authorization:"Bearer "+KEY,...(extra||{})});
async function demander(table,from,to,compter){
  const r=await fetch(URL_+"/rest/v1/"+table+"?select=*",{headers:entetes({Range:from+"-"+to,"Range-Unit":"items",...(compter?{Prefer:"count=exact"}:{})})});
  if(r.status===404||r.status===400){const t=await r.json().catch(()=>({}));if(t&&t.code==="PGRST205")return {absente:true};}
  if(!r.ok&&r.status!==206)throw new Error(table+" : lecture impossible (HTTP "+r.status+")");
  const rows=await r.json();
  const cr=r.headers.get("content-range")||"";const total=parseInt((cr.split("/")[1]||""),10);
  return {rows:Array.isArray(rows)?rows:[],total:isNaN(total)?null:total};
}
async function toutLire(table){
  const tout=[];
  for(let debut=0;;debut+=1000){
    const p=await demander(table,debut,debut+999,false);
    if(p.absente)return {absente:true};
    tout.push(...p.rows);
    if(p.rows.length<1000)break;
  }
  return {rows:tout};
}
const horodatage=()=>{const d=new Date();const z=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+z(d.getMonth()+1)+"-"+z(d.getDate())+"_"+z(d.getHours())+z(d.getMinutes());};

(async()=>{
  if(compterSeulement){
    console.log("Lignes par table (comptage seul, rien n'est écrit) :");
    let total=0,absentes=0;
    for(const t of TABLES){
      const p=await demander(t,0,0,true);
      if(p.absente){console.log("  "+t.padEnd(26)+"absente de la base");absentes++;continue;}
      console.log("  "+t.padEnd(26)+String(p.total==null?"?":p.total).padStart(7));total+=p.total||0;
    }
    console.log("Total : "+total+" lignes"+(absentes?" ("+absentes+" table(s) absente(s))":""));
    return;
  }
  const dossier=path.join(parent,horodatage());
  fs.mkdirSync(dossier,{recursive:true});
  const manifeste={date:new Date().toISOString(),base:URL_,tables:{}};
  let total=0;
  for(const t of TABLES){
    const r=await toutLire(t);
    if(r.absente){manifeste.tables[t]={statut:"absente"};console.log("  "+t.padEnd(26)+"absente de la base");continue;}
    fs.writeFileSync(path.join(dossier,t+".json"),JSON.stringify(r.rows));
    manifeste.tables[t]={statut:"ok",lignes:r.rows.length};total+=r.rows.length;
    console.log("  "+t.padEnd(26)+String(r.rows.length).padStart(7));
  }
  fs.writeFileSync(path.join(dossier,"_manifeste.json"),JSON.stringify(manifeste,null,2));
  console.log("Sauvegarde terminée : "+total+" lignes dans "+dossier);
  if(garder>0){
    const anciens=fs.readdirSync(parent).filter(n=>/^\d{4}-\d{2}-\d{2}_\d{4}$/.test(n)&&fs.statSync(path.join(parent,n)).isDirectory()).sort().reverse().slice(garder);
    anciens.forEach(n=>{fs.rmSync(path.join(parent,n),{recursive:true,force:true});console.log("Ancienne sauvegarde supprimée : "+n);});
  }
})().catch(e=>{console.error("Erreur : "+e.message);process.exit(1);});
