import {SUPA_URL, H, db} from "./supabase";

// Résumé quotidien par mail (EmailJS) : une seule alerte par jour qui regroupe le matériel en attente et les stocks
// sous leur minimum (le quota gratuit d'EmailJS est de 200 mails par mois, d'où pas de mail à chaque action).
// Aucun serveur : le résumé part depuis le premier appareil qui ouvre l'appli ce jour-là, après l'heure réglée.
export const NOMS_JOURS=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

export async function chargerParamsApp(){
  try{
    const rows=await db.get("parametres_app","?select=cle,valeur");
    const p={};if(Array.isArray(rows))rows.forEach(r=>{p[r.cle]=r.valeur;});
    return p;
  }catch(e){return {};}
}
export function configMailDepuisParams(p){
  const jours=String(p.resume_jours==null?"1,2,3,4,5":p.resume_jours).split(",").map(x=>parseInt(x,10)).filter(n=>n>=0&&n<=6);
  return {resumeActif:p.alerte_resume_actif==="1",jours,heure:p.resume_heure||"07:30",adresse:p.alerte_mail_adresse||"",service:p.emailjs_service_id||"",template:p.emailjs_template_id||"",cle:p.emailjs_public_key||""};
}
export async function envoyerViaEmailJS(cfg,params){
  const r=await fetch("https://api.emailjs.com/api/v1.0/email/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service_id:cfg.service,template_id:cfg.template,user_id:cfg.cle,template_params:params})});
  const txt=await r.text();
  return {ok:r.ok,detail:txt};
}

const MAX_LIGNES=60;
const ilYa=iso=>{const j=Math.floor((Date.now()-new Date(iso).getTime())/86400000);return isNaN(j)?"":j<=0?"aujourd'hui":j===1?"hier":"il y a "+j+" j";};
const origine=l=>{
  const id=String(l.demande_id||"");
  if(id.startsWith("ch-"))return "fiche chantier";
  if(id.startsWith("stock-")||String(l.commentaire||"").startsWith("Stock bas"))return "stock";
  return "demande";
};
// Lit l'état du matériel et du stock et compose le mail. Renvoie null si rien n'a pu être lu (hors ligne).
export async function composerResume(){
  let lectures=0;
  const lire=async chemin=>{
    try{const r=await fetch(SUPA_URL+"/rest/v1/"+chemin,{headers:H});const d=await r.json();if(Array.isArray(d)){lectures++;return d;}}catch(e){/* hors ligne */}
    return [];
  };
  const [dem,pieces,arts]=await Promise.all([
    lire("demandes_materiel?statut=eq.a_commander&order=created_at.asc&limit=500"),
    lire("suivi_pieces?or=(statut.eq.A_recommander,statut.is.null)&order=created_at.asc&limit=500"),
    lire("stock_articles?select=reference,dimensions,quantite,stock_mini,stock_maxi&order=reference&limit=2000"),
  ]);
  if(!lectures)return null;
  const aCommander=dem.filter(l=>l.type==="commander");
  const aRenouveler=dem.filter(l=>l.type!=="commander");
  const bas=arts.filter(a=>{const q=a.quantite||0;return a.stock_mini!=null&&q<=a.stock_mini&&(a.stock_maxi==null||q<a.stock_maxi);})
    .sort((a,b)=>((a.quantite||0)>0)-((b.quantite||0)>0));
  const ligneDemande=l=>"• "+(l.categorie?l.categorie+" : ":"")+l.designation+" × "+l.quantite+" — "+[l.demandeur,l.chantier,origine(l)].filter(Boolean).join(", ")+" ("+ilYa(l.created_at)+")";
  const lignePiece=p=>"• "+p.designation+(p.reference?" ("+p.reference+")":"")+" — fiche atelier"+(p.de?" "+p.de:"")+(p.client?" · "+p.client:"");
  const ligneStock=a=>{
    const q=a.quantite||0,cible=a.stock_maxi!=null?a.stock_maxi:a.stock_mini;
    return "• "+a.reference+(a.dimensions?" ("+a.dimensions+")":"")+" : reste "+q+" (minimum "+a.stock_mini+(a.stock_maxi!=null?", maximum "+a.stock_maxi:"")+") — à commander : "+Math.max(0,cible-q)+(q<=0?"  ⚠ RUPTURE":"");
  };
  const bloc=(titre,lignes)=>lignes.length?titre+" ("+lignes.length+")\n"+lignes.slice(0,MAX_LIGNES).join("\n")+(lignes.length>MAX_LIGNES?"\n… et "+(lignes.length-MAX_LIGNES)+" autres (voir l'appli)":"")+"\n\n":"";
  const renouveler=aRenouveler.map(ligneDemande).concat(pieces.map(lignePiece));
  const vide=!aCommander.length&&!renouveler.length&&!bas.length;
  const message="Résumé du "+new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})+"\n\n"
    +(vide?"Rien à signaler : aucun matériel en attente et aucun stock sous son minimum.\n\n"
          :bloc("À COMMANDER",aCommander.map(ligneDemande))+bloc("À RENOUVELER",renouveler)+bloc("STOCK SOUS LE MINIMUM",bas.map(ligneStock)))
    +"À traiter dans l'appli : "+window.location.origin+" (onglets Matériel et Stock)";
  const parties=[aCommander.length&&aCommander.length+" à commander",renouveler.length&&renouveler.length+" à renouveler",bas.length&&bas.length+" stock bas"].filter(Boolean);
  return {vide,message,sujet:"Résumé du jour — "+(parties.length?parties.join(", "):"rien à signaler")};
}

const dateLocale=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
let verificationEnCours=false;
// À appeler à l'ouverture de l'appli (et de temps en temps) : envoie le résumé du jour s'il est dû, une seule fois par jour
// quel que soit le nombre d'appareils. Renvoie un mot qui dit ce qui s'est passé (utile pour les essais).
export async function verifierResumeQuotidien(){
  if(verificationEnCours)return "occupe";
  verificationEnCours=true;
  try{
    const p=await chargerParamsApp();
    const cfg=configMailDepuisParams(p);
    if(!cfg.resumeActif)return "desactive";
    if(!cfg.adresse||!cfg.service||!cfg.template||!cfg.cle)return "non_configure";
    const maintenant=new Date(),aujourdhui=dateLocale(maintenant);
    if(!cfg.jours.includes(maintenant.getDay()))return "jour_exclu";
    if(maintenant.toTimeString().slice(0,5)<cfg.heure)return "trop_tot";
    if(String(p.resume_dernier||"").split("|")[0]===aujourdhui)return "deja_envoye";
    const resume=await composerResume();
    if(!resume)return "lecture_impossible";
    if(resume.vide)return "rien_a_signaler"; // pas de mail pour rien ; on réessaiera à la prochaine ouverture
    // On réserve l'envoi du jour, puis on relit : si un autre appareil a réservé juste avant, on laisse faire.
    const jeton=aujourdhui+"|"+Math.random().toString(36).slice(2,8);
    await db.upsert("parametres_app",[{cle:"resume_dernier",valeur:jeton}],"cle");
    await new Promise(r=>setTimeout(r,1500));
    const apres=await chargerParamsApp();
    if(apres.resume_dernier!==jeton)return "pris_par_un_autre";
    const r=await envoyerViaEmailJS(cfg,{to_email:cfg.adresse,sujet:resume.sujet,message:resume.message,demandeur:"",chantier:""});
    if(!r.ok){
      try{await db.upsert("parametres_app",[{cle:"resume_dernier",valeur:""}],"cle");}catch(e){/* tant pis */}
      return "echec";
    }
    return "envoye";
  }catch(e){return "erreur";}
  finally{verificationEnCours=false;}
}
