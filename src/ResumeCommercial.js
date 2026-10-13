import React, {useState, useEffect} from "react";
import {SUPA_URL, H, db} from "./supabase";
import {chargerParamsApp, configMailDepuisParams, envoyerViaEmailJS, NOMS_JOURS} from "./Alertes";
import {etatRelance, etatRdv, texteRelance, frDate, euros, aujourdhui} from "./SuiviClients";

// Résumé du matin pour le commercial (relances de devis et de prospection, rendez-vous), envoyé à SA propre adresse, différente de celle
// des alertes matériel. Même principe que l'alerte matériel (voir Alertes.js) : aucun serveur, le mail part depuis le premier appareil qui
// ouvre l'appli après l'heure réglée, une seule fois par jour, seulement s'il y a quelque chose à faire ; il réutilise le service EmailJS
// déjà réglé pour l'alerte matériel (service, modèle, clé publique).
export function configResumeCommercial(p){
  const jours=String(p.resume_commercial_jours==null?"1,2,3,4,5":p.resume_commercial_jours).split(",").map(x=>parseInt(x,10)).filter(n=>n>=0&&n<=6);
  return {actif:p.resume_commercial_actif==="1",adresse:p.resume_commercial_adresse||"",jours,heure:p.resume_commercial_heure||"07:30"};
}

const MAX_LIGNES=40;
async function lireTable(chemin){
  try{const r=await fetch(SUPA_URL+"/rest/v1/"+chemin,{headers:H});const d=await r.json();if(Array.isArray(d))return d;}catch(e){/* hors ligne ou table absente */}
  return null;
}
const heureRdv=r=>r.heure?r.heure+" — ":"";

// Lit les devis, prospects et rendez-vous et compose le mail. Renvoie null si rien n'a pu être lu.
export async function composerResumeCommercial(){
  const [devis,pros,rdv]=await Promise.all([
    lireTable("suivi_devis?select=*&statut=eq.envoye&order=relance_le.asc.nullslast&limit=1000"),
    lireTable("suivi_prospects?select=*&or=(statut.eq.a_demarcher,statut.eq.demarche)&limit=1000"),
    lireTable("suivi_rdv?select=*&statut=eq.prevu&order=date_rdv.asc&limit=1000"),
  ]);
  if(devis===null&&pros===null&&rdv===null)return null;
  const D=devis||[],P=pros||[],R=rdv||[];
  const aFaire=l=>{const e=etatRelance(l);return e==="retard"||e==="aujourdhui";};
  const devisRelance=D.filter(aFaire),prosRelance=P.filter(aFaire);
  const rdvAuj=R.filter(r=>etatRdv(r)==="aujourdhui"),rdvDemain=R.filter(r=>etatRdv(r)==="demain"),rdvPasses=R.filter(r=>etatRdv(r)==="passe");
  const bientot=[...D,...P].filter(l=>etatRelance(l)==="bientot");
  const aDemarcher=P.filter(p=>p.statut==="a_demarcher").length;

  const joindre=(...x)=>x.filter(Boolean).join(" · ");
  const ligneDevis=l=>"• "+l.de+" — "+l.client+" — "+joindre(l.contact,l.telephone,l.mail)+" — "+texteRelance(l)+(l.objet||l.montant?" ("+joindre(l.objet,l.montant!=null&&l.montant!==""?euros(l.montant)+" HT":"")+")":"");
  const ligneProspect=p=>"• "+p.entreprise+" — "+(joindre(p.contact,p.telephone,p.mail)||"pas de contact noté")+" — "+texteRelance(p)+(p.secteur?" ("+p.secteur+")":"");
  const ligneRdv=r=>"• "+heureRdv(r)+r.entreprise+(r.contact?" — "+r.contact:"")+(r.telephone?" · "+r.telephone:"")+(r.lieu?" — "+r.lieu:"")+(r.objet?" ("+r.objet+")":"");
  const lignePasse=r=>"• "+frDate(r.date_rdv)+" — "+r.entreprise+(r.objet?" ("+r.objet+")":"")+" : compte rendu à noter dans l'appli";
  const ligneBientot=l=>"• "+(l.de?l.de+" — "+l.client:l.entreprise)+" — "+texteRelance(l);
  const bloc=(titre,lignes)=>lignes.length?titre+" ("+lignes.length+")\n"+lignes.slice(0,MAX_LIGNES).join("\n")+(lignes.length>MAX_LIGNES?"\n… et "+(lignes.length-MAX_LIGNES)+" autres (voir l'appli)":"")+"\n\n":"";

  const vide=!devisRelance.length&&!prosRelance.length&&!rdvAuj.length&&!rdvDemain.length&&!rdvPasses.length;
  const message="Résumé commercial du "+new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})+"\n\n"
    +(vide?"Rien à signaler : aucune relance en retard et aucun rendez-vous aujourd'hui ni demain.\n\n"
          :bloc("RELANCES DE DEVIS À FAIRE",devisRelance.map(ligneDevis))
          +bloc("PROSPECTS À RELANCER",prosRelance.map(ligneProspect))
          +bloc("RENDEZ-VOUS AUJOURD'HUI",rdvAuj.map(ligneRdv))
          +bloc("RENDEZ-VOUS DEMAIN",rdvDemain.map(ligneRdv))
          +bloc("RENDEZ-VOUS PASSÉS À CLÔTURER",rdvPasses.map(lignePasse))
          +bloc("RELANCES PRÉVUES DANS LES 7 JOURS",bientot.map(ligneBientot))
          +(aDemarcher?aDemarcher+" entreprise"+(aDemarcher>1?"s":"")+" à démarcher dans la liste de prospection.\n\n":""))
    +"À traiter dans l'appli : "+window.location.origin+" (onglet Suivi clients)";
  const parties=[
    devisRelance.length&&devisRelance.length+" relance"+(devisRelance.length>1?"s":"")+" de devis",
    prosRelance.length&&prosRelance.length+" prospect"+(prosRelance.length>1?"s":"")+" à relancer",
    rdvAuj.length&&rdvAuj.length+" RDV aujourd'hui",rdvDemain.length&&rdvDemain.length+" RDV demain",
    rdvPasses.length&&rdvPasses.length+" RDV à clôturer",
  ].filter(Boolean);
  return {vide,message,sujet:"Résumé commercial — "+(parties.length?parties.join(", "):"rien à signaler")};
}

let verificationEnCours=false;
// À appeler à l'ouverture de l'appli (et de temps en temps) : envoie le résumé du jour s'il est dû, une seule fois par jour tous appareils
// confondus. Renvoie un mot qui dit ce qui s'est passé (utile pour les essais).
export async function verifierResumeCommercial(){
  if(verificationEnCours)return "occupe";
  verificationEnCours=true;
  try{
    const p=await chargerParamsApp();
    const cfg=configResumeCommercial(p),mail=configMailDepuisParams(p);
    if(!cfg.actif)return "desactive";
    if(!cfg.adresse||!mail.service||!mail.template||!mail.cle)return "non_configure";
    const maintenant=new Date(),jourJ=aujourdhui();
    if(!cfg.jours.includes(maintenant.getDay()))return "jour_exclu";
    if(maintenant.toTimeString().slice(0,5)<cfg.heure)return "trop_tot";
    if(String(p.resume_commercial_dernier||"").split("|")[0]===jourJ)return "deja_envoye";
    const resume=await composerResumeCommercial();
    if(!resume)return "lecture_impossible";
    if(resume.vide)return "rien_a_signaler"; // pas de mail pour rien ; on réessaiera à la prochaine ouverture
    // On réserve l'envoi du jour, puis on relit : si un autre appareil a réservé juste avant, on laisse faire.
    const jeton=jourJ+"|"+Math.random().toString(36).slice(2,8);
    await db.upsert("parametres_app",[{cle:"resume_commercial_dernier",valeur:jeton}],"cle");
    await new Promise(r=>setTimeout(r,1500));
    const apres=await chargerParamsApp();
    if(apres.resume_commercial_dernier!==jeton)return "pris_par_un_autre";
    const r=await envoyerViaEmailJS({service:mail.service,template:mail.template,cle:mail.cle},{to_email:cfg.adresse,sujet:resume.sujet,message:resume.message,demandeur:"",chantier:""});
    if(!r.ok){
      try{await db.upsert("parametres_app",[{cle:"resume_commercial_dernier",valeur:""}],"cle");}catch(e){/* tant pis */}
      return "echec";
    }
    return "envoye";
  }catch(e){return "erreur";}
  finally{verificationEnCours=false;}
}

// ── réglages (administrateur, page Matériel, sous le bloc des alertes matériel) ──────────────────
const CARTE={background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"10px 14px",marginBottom:14};
const INP={width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid #D1D5DB",fontSize:13,boxSizing:"border-box",background:"#fff"};
const LBL={fontSize:11,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:3};
const BTN1={background:"#1B4F8A",color:"#fff",border:"none",padding:"9px 20px",borderRadius:6,fontWeight:600,fontSize:14,cursor:"pointer"};
const BTN2={background:"#fff",color:"#1B4F8A",border:"1.5px solid #1B4F8A",padding:"8px 18px",borderRadius:6,fontWeight:600,fontSize:14,cursor:"pointer"};

export function PanneauResumeCommercial(){
  const [ouvert,setOuvert]=useState(false);
  const [p,setP]=useState(null);
  const [envoi,setEnvoi]=useState(null); // réglages EmailJS partagés avec l'alerte matériel
  const [enregistre,setEnregistre]=useState(false);
  const [test,setTest]=useState(null);
  useEffect(()=>{let a=false;chargerParamsApp().then(x=>{if(!a){setP(configResumeCommercial(x));setEnvoi(configMailDepuisParams(x));}});return()=>{a=true;};},[]);
  if(!p||!envoi)return null;
  const envoiPret=!!(envoi.service.trim()&&envoi.template.trim()&&envoi.cle.trim());
  const pret=envoiPret&&!!p.adresse.trim();
  const joursTxt=[1,2,3,4,5,6,0].filter(j=>p.jours.includes(j)).map(j=>NOMS_JOURS[j].toLowerCase()).join(", ");
  const statut=!p.actif?"Résumé du matin pour le commercial désactivé":pret?"Résumé du matin pour le commercial activé → "+p.adresse+" ("+(joursTxt||"aucun jour")+", dès "+p.heure+")":"Résumé du matin pour le commercial activé, configuration incomplète";
  const maj=patch=>setP(x=>({...x,...patch}));
  const basculerJour=j=>setP(x=>({...x,jours:x.jours.includes(j)?x.jours.filter(n=>n!==j):x.jours.concat([j])}));
  const cfgEnvoi=()=>({service:envoi.service.trim(),template:envoi.template.trim(),cle:envoi.cle.trim()});
  async function enregistrer(){
    const rows=[["resume_commercial_actif",p.actif?"1":"0"],["resume_commercial_adresse",p.adresse.trim()],["resume_commercial_jours",p.jours.join(",")],["resume_commercial_heure",p.heure||"07:30"]].map(([cle,valeur])=>({cle,valeur}));
    try{await db.upsert("parametres_app",rows,"cle");setEnregistre(true);setTimeout(()=>setEnregistre(false),2500);}
    catch(e){setTest({ok:false,detail:"Enregistrement impossible : "+e.message});}
  }
  async function tester(){
    setTest({enCours:true});
    try{
      const r=await envoyerViaEmailJS(cfgEnvoi(),{to_email:p.adresse.trim(),sujet:"Test — résumé commercial Atelier PMV",message:"Ceci est un message de test envoyé depuis l'appli Atelier PMV.\n\nSi vous le recevez, le résumé du matin du commercial arrivera bien à cette adresse.",demandeur:"Test",chantier:""});
      setTest({ok:r.ok,detail:r.ok?"Mail de test envoyé à "+p.adresse.trim():r.detail});
    }catch(e){setTest({ok:false,detail:String((e&&e.message)||e)});}
  }
  async function envoyerMaintenant(){
    setTest({enCours:true});
    try{
      const resume=await composerResumeCommercial();
      if(!resume){setTest({ok:false,detail:"Lecture du suivi clients impossible (connexion, ou tables du suivi clients pas encore activées)."});return;}
      const r=await envoyerViaEmailJS(cfgEnvoi(),{to_email:p.adresse.trim(),sujet:resume.sujet,message:resume.message,demandeur:"",chantier:""});
      setTest({ok:r.ok,detail:r.ok?"Résumé envoyé à "+p.adresse.trim()+(resume.vide?" (rien à signaler pour le moment)":" : "+resume.sujet.replace("Résumé commercial — ","")):r.detail});
    }catch(e){setTest({ok:false,detail:String((e&&e.message)||e)});}
  }
  return(<div style={CARTE}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
      <span style={{fontSize:13,fontWeight:600,color:p.actif&&pret?"#22863A":"#4B5563"}}>📅 {statut}</span>
      <button onClick={()=>setOuvert(!ouvert)} style={{...BTN2,fontSize:12,padding:"6px 12px"}}>{ouvert?"Fermer":"Régler"}</button>
    </div>
    {ouvert&&<div style={{marginTop:12,display:"flex",flexDirection:"column",gap:10}}>
      <label style={{display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:600,cursor:"pointer"}}><input type="checkbox" checked={p.actif} onChange={e=>maj({actif:e.target.checked})}/>Envoyer chaque matin au commercial un résumé de ses relances et rendez-vous</label>
      <div><label style={LBL}>Adresse du commercial (différente de celle des alertes matériel)</label><input type="email" value={p.adresse} onChange={e=>maj({adresse:e.target.value})} style={INP} placeholder="commercial@pmvservices.fr" autoComplete="off"/></div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}}>
        <span style={{fontSize:12,color:"#6B7280",marginRight:4}}>Jours d'envoi :</span>
        {[1,2,3,4,5,6,0].map(j=>(<button key={j} type="button" onClick={()=>basculerJour(j)} aria-pressed={p.jours.includes(j)} style={{padding:"6px 12px",borderRadius:20,border:"1.5px solid "+(p.jours.includes(j)?"#1B4F8A":"#D1D5DB"),background:p.jours.includes(j)?"#EEF4FF":"#fff",color:p.jours.includes(j)?"#1B4F8A":"#6B7280",fontSize:12,fontWeight:p.jours.includes(j)?700:500,cursor:"pointer"}}>{NOMS_JOURS[j]}</button>))}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
        <span style={{fontSize:12,color:"#6B7280"}}>À partir de :</span>
        <input type="time" value={p.heure} onChange={e=>maj({heure:e.target.value})} style={{...INP,width:120}}/>
      </div>
      <div style={{fontSize:12,color:"#6B7280",lineHeight:1.5}}>Le résumé liste les relances de devis et de prospection à faire (date dépassée ou aujourd'hui), les rendez-vous d'aujourd'hui et de demain, les rendez-vous passés à clôturer et les relances des 7 prochains jours. Il part à la première ouverture de l'appli après cette heure, les jours cochés, seulement s'il y a quelque chose à faire : au plus un mail par jour. Si personne n'ouvre l'appli ce jour-là, aucun mail ne part.</div>
      <div style={{fontSize:12,color:envoiPret?"#22863A":"#B42318",lineHeight:1.5}}>{envoiPret?"✓ L'envoi utilise le même compte EmailJS que l'alerte matériel (réglé dans le bloc ci-dessus).":"L'envoi utilise le compte EmailJS de l'alerte matériel : renseignez d'abord Service ID, Template ID et Public Key dans le bloc ci-dessus."}</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <button onClick={enregistrer} style={BTN1}>Enregistrer</button>
        <button onClick={tester} disabled={!pret||(test&&test.enCours)} style={{...BTN2,opacity:pret?1:0.5}}>{test&&test.enCours?"Envoi…":"Envoyer un mail de test"}</button>
        <button onClick={envoyerMaintenant} disabled={!pret||(test&&test.enCours)} style={{...BTN2,opacity:pret?1:0.5}}>📨 Envoyer le résumé maintenant</button>
        {enregistre&&<span style={{fontSize:12,color:"#22863A",fontWeight:600}}>✓ Enregistré</span>}
      </div>
      {test&&!test.enCours&&<div style={{fontSize:12,color:test.ok?"#22863A":"#B42318",wordBreak:"break-word"}}>{test.ok?"✓ ":"✕ "}{test.detail}</div>}
    </div>}
  </div>);
}
