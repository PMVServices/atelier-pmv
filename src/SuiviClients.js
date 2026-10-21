import React, {useState, useEffect, useMemo, useCallback, useRef} from "react";
import {db, SUPA_URL, H} from "./supabase";
import {NoticeActivation} from "./Activation";
import {ChampContact} from "./Contacts";
import {normaliserDE} from "./Chantier";

// Suivi clients (profil Commercial), deux sous-onglets :
//  • Relance devis : un tableau où chaque ligne = un devis envoyé (N° de DE, client, contact, téléphone, mail, montant…)
//    avec une date de relance (ou un délai : « dans 8 semaines »). Date dépassée → ligne rouge, badge sur l'onglet et
//    relance listée sur le tableau de bord du Commercial.
//  • Prospection : entreprises à démarcher (secteur, potentiel de travail), puis entreprises démarchées à relancer
//    (contact, téléphone, mail, date ou délai de relance) ; mêmes alertes.
export const SQL_SUIVI_DEVIS=`create table if not exists suivi_devis (
  id uuid primary key default gen_random_uuid(),
  de text not null,
  client text not null,
  contact text not null default '',
  telephone text,
  mail text,
  objet text,
  montant numeric,
  date_devis date not null default current_date,
  relance_le date,
  relance_nb int,
  relance_unite text,
  statut text not null default 'envoye',
  motif_refus text,
  historique jsonb not null default '[]'::jsonb,
  commentaire text,
  par text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table suivi_devis enable row level security;
alter table suivi_devis add column if not exists motif_refus text;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'suivi_devis' and policyname = 'allow anon all') then
    create policy "allow anon all" on suivi_devis for all using (true) with check (true);
  end if;
end $$;
create index if not exists suivi_devis_statut_relance on suivi_devis (statut, relance_le);

notify pgrst, 'reload schema';`;

export const SQL_PROSPECTS=`create table if not exists suivi_prospects (
  id uuid primary key default gen_random_uuid(),
  entreprise text not null,
  contact text not null default '',
  telephone text,
  mail text,
  secteur text,
  potentiel text,
  statut text not null default 'a_demarcher',
  date_demarche date,
  relance_le date,
  relance_nb int,
  relance_unite text,
  historique jsonb not null default '[]'::jsonb,
  commentaire text,
  par text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table suivi_prospects enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'suivi_prospects' and policyname = 'allow anon all') then
    create policy "allow anon all" on suivi_prospects for all using (true) with check (true);
  end if;
end $$;
create index if not exists suivi_prospects_statut_relance on suivi_prospects (statut, relance_le);

notify pgrst, 'reload schema';`;
export const SQL_RDV=`create table if not exists suivi_rdv (
  id uuid primary key default gen_random_uuid(),
  date_rdv date not null,
  heure text,
  entreprise text not null,
  contact text not null default '',
  telephone text,
  mail text,
  lieu text,
  objet text,
  statut text not null default 'prevu',
  compte_rendu text,
  par text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table suivi_rdv enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'suivi_rdv' and policyname = 'allow anon all') then
    create policy "allow anon all" on suivi_rdv for all using (true) with check (true);
  end if;
end $$;
create index if not exists suivi_rdv_statut_date on suivi_rdv (statut, date_rdv);

notify pgrst, 'reload schema';`;
// Un seul texte à coller pour tout le « Suivi clients » (devis, prospection, rendez-vous) ; il peut être rejoué sans risque
export const SQL_SUIVI_CLIENTS=SQL_SUIVI_DEVIS+"\n\n"+SQL_PROSPECTS+"\n\n"+SQL_RDV;

export const STATUTS_DEVIS=[
  {id:"a_envoyer",label:"À envoyer",couleur:"#6B7280",fond:"#F3F4F6"},
  {id:"envoye",label:"Envoyé — en attente",couleur:"#1B4F8A",fond:"#EEF4FF"},
  {id:"accepte",label:"Accepté",couleur:"#22863A",fond:"#F0FFF4"},
  {id:"refuse",label:"Refusé",couleur:"#D73A49",fond:"#FFF5F5"},
  {id:"sans_suite",label:"Sans suite",couleur:"#9B59B6",fond:"#F5EEF8"},
];
export const statutInfo=id=>STATUTS_DEVIS.find(s=>s.id===id)||STATUTS_DEVIS[1];
export const STATUTS_PROSPECT=[
  {id:"a_demarcher",label:"À démarcher",couleur:"#6B7280",fond:"#F3F4F6"},
  {id:"demarche",label:"Démarché",couleur:"#1B4F8A",fond:"#EEF4FF"},
  {id:"client",label:"Devenu client",couleur:"#22863A",fond:"#F0FFF4"},
  {id:"abandonne",label:"Pas intéressé",couleur:"#D73A49",fond:"#FFF5F5"},
];
const statutProspect=id=>STATUTS_PROSPECT.find(s=>s.id===id)||STATUTS_PROSPECT[0];
export const STATUTS_RDV=[
  {id:"prevu",label:"Prévu",couleur:"#1B4F8A",fond:"#EEF4FF"},
  {id:"fait",label:"Fait",couleur:"#22863A",fond:"#F0FFF4"},
  {id:"annule",label:"Annulé",couleur:"#6B7280",fond:"#F3F4F6"},
];
const statutRdv=id=>STATUTS_RDV.find(s=>s.id===id)||STATUTS_RDV[0];
export const COUL_RDV={passe:"#D73A49",aujourdhui:"#E8720C",demain:"#CA8A04",semaine:"#1B4F8A",ok:"#6B7280"};
// état d'un rendez-vous prévu : null (pas prévu), "passe" (date dépassée, à clôturer), "aujourdhui", "demain", "semaine" (≤ 7 jours), "ok"
export function etatRdv(r){
  if(!r||r.statut!=="prevu"||!r.date_rdv)return null;
  const j=joursEntre(aujourdhui(),r.date_rdv);
  return j<0?"passe":j===0?"aujourdhui":j===1?"demain":j<=7?"semaine":"ok";
}
export const MOTIFS_REFUS=[
  {id:"prix",label:"Prix trop élevé"},
  {id:"delai",label:"Délai trop long"},
  {id:"concurrent",label:"Concurrent retenu"},
  {id:"budget",label:"Pas de budget / projet reporté"},
  {id:"abandon",label:"Projet abandonné"},
  {id:"silence",label:"Plus de réponse"},
  {id:"autre",label:"Autre"},
];
export const motifInfo=id=>MOTIFS_REFUS.find(m=>m.id===id)||{id:"inconnu",label:"Motif non noté"};
const UNITES=[{id:"jours",label:"jours"},{id:"semaines",label:"semaines"},{id:"mois",label:"mois"}];

export const norm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const isoDe=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
export const aujourdhui=()=>isoDe(new Date());
export const frDate=d=>{try{const x=new Date(String(d).slice(0,10)+"T12:00:00");return isNaN(x.getTime())?"":x.toLocaleDateString("fr-FR");}catch(e){return "";}};
export const euros=n=>(n===null||n===undefined||n==="")?"":Number(n).toLocaleString("fr-FR",{maximumFractionDigits:2})+" €";
export function ajouterDuree(dateStr,n,unite){
  const d=new Date(String(dateStr||aujourdhui()).slice(0,10)+"T12:00:00");
  if(isNaN(d.getTime()))return null;
  if(unite==="jours")d.setDate(d.getDate()+n);
  else if(unite==="semaines")d.setDate(d.getDate()+7*n);
  else d.setMonth(d.getMonth()+n);
  return isoDe(d);
}
export const joursEntre=(a,b)=>Math.round((new Date(String(b).slice(0,10)+"T12:00:00")-new Date(String(a).slice(0,10)+"T12:00:00"))/86400000);
// état de la relance d'une ligne (devis « envoyé » ou prospect « démarché ») : null (rien à suivre), "sans" (pas de date),
// "retard", "aujourdhui", "bientot" (≤ 7 jours), "ok"
export function etatRelance(l){
  if(!l||(l.statut!=="envoye"&&l.statut!=="demarche"))return null;
  if(!l.relance_le)return "sans";
  const j=joursEntre(aujourdhui(),l.relance_le);
  return j<0?"retard":j===0?"aujourdhui":j<=7?"bientot":"ok";
}
export const texteRelance=l=>{
  const e=etatRelance(l);if(!l.relance_le||e===null)return "";
  const j=joursEntre(aujourdhui(),l.relance_le);
  return frDate(l.relance_le)+(e==="retard"?" · en retard de "+(-j)+" j":e==="aujourdhui"?" · aujourd'hui":" · dans "+j+" j");
};
export const COUL_RELANCE={retard:"#D73A49",aujourdhui:"#E8720C",bientot:"#CA8A04",ok:"#22863A",sans:"#9CA3AF"};

// ── données partagées (onglet, badge, tableau de bord) ────────────────
async function lire(table,ordre){
  const out=[];
  for(let debut=0;debut<20000;debut+=1000){
    const r=await fetch(SUPA_URL+"/rest/v1/"+table+"?select=*&order="+(ordre||"relance_le.asc.nullslast,created_at.desc")+"&limit=1000&offset="+debut,{headers:H});
    const rows=await r.json();
    if(!Array.isArray(rows)){
      if(rows&&rows.code==="PGRST205")return {lignes:[],dispo:false};
      throw new Error("lecture impossible");
    }
    out.push(...rows);
    if(rows.length<1000)break;
  }
  return {lignes:out,dispo:true};
}
// Une colonne ajoutée après coup manque-t-elle ? (PostgREST répond 42703) : sert à détecter un SQL d'une version précédente.
async function colonneAbsente(table,colonne){
  try{const r=await fetch(SUPA_URL+"/rest/v1/"+table+"?select="+colonne+"&limit=1",{headers:H});const d=await r.json();return !Array.isArray(d)&&!!d&&d.code==="42703";}
  catch(e){return false;}
}
// dispo / dispoProspects / dispoRdv : null = pas encore su, false = table absente, true = ok. Si la table des devis existe mais sans la colonne
// motif_refus (ancien SQL), dispo=false et miseAJour=true. recharger() renvoie true quand TOUT est en place.
export function useSuiviClients(actif){
  const [etat,setEtat]=useState({lignes:[],dispo:null,prospects:[],dispoProspects:null,rdv:[],dispoRdv:null,miseAJour:false,charge:false});
  const recharger=useCallback(async()=>{
    try{
      const [d,p,r]=await Promise.all([lire("suivi_devis"),lire("suivi_prospects"),lire("suivi_rdv","date_rdv.asc,created_at.desc")]);
      const miseAJour=d.dispo&&await colonneAbsente("suivi_devis","motif_refus");
      setEtat({lignes:d.lignes,dispo:d.dispo&&!miseAJour,miseAJour,prospects:p.lignes,dispoProspects:p.dispo,rdv:r.lignes,dispoRdv:r.dispo,charge:true});
      return d.dispo&&!miseAJour&&p.dispo&&r.dispo;
    }
    catch(e){setEtat(x=>({...x,charge:true,erreur:true}));return null;}
  },[]);
  useEffect(()=>{if(actif)recharger();},[actif,recharger]);
  const aRelancer=useMemo(()=>etat.lignes.filter(l=>{const e=etatRelance(l);return e==="retard"||e==="aujourdhui";}),[etat.lignes]);
  const prospectsARelancer=useMemo(()=>etat.prospects.filter(l=>{const e=etatRelance(l);return e==="retard"||e==="aujourdhui";}),[etat.prospects]);
  const setLignes=useCallback(fn=>setEtat(x=>({...x,lignes:fn(x.lignes)})),[]);
  const rdvAlertes=useMemo(()=>etat.rdv.filter(r=>{const e=etatRdv(r);return e==="aujourdhui"||e==="passe";}),[etat.rdv]);
  const setProspects=useCallback(fn=>setEtat(x=>({...x,prospects:fn(x.prospects)})),[]);
  const setRdv=useCallback(fn=>setEtat(x=>({...x,rdv:fn(x.rdv)})),[]);
  return {...etat,recharger,setLignes,setProspects,setRdv,aRelancer,prospectsARelancer,rdvAlertes,nbAlertes:aRelancer.length+prospectsARelancer.length+rdvAlertes.length};
}

// ── styles ───────────────────────────────────────────────────────────────
const CARTE={background:"#fff",border:"1px solid #E2E6EA",borderRadius:12,padding:"14px 16px",marginBottom:12};
const INP={width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid #D1D5DB",fontSize:14,boxSizing:"border-box",background:"#fff"};
const LBL={display:"block",fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".04em",marginBottom:4};
const BTN1={background:"#1B4F8A",color:"#fff",border:"none",padding:"9px 18px",borderRadius:8,fontWeight:700,fontSize:14,cursor:"pointer"};
const BTN2={background:"#fff",color:"#1B4F8A",border:"1.5px solid #1B4F8A",padding:"8px 14px",borderRadius:8,fontWeight:600,fontSize:13,cursor:"pointer"};
const LIEN={color:"#1B4F8A",textDecoration:"none",fontSize:13,overflowWrap:"anywhere"};

function useLargeur(){
  const [w,setW]=useState(typeof window!=="undefined"?window.innerWidth:1024);
  useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return w;
}

// ── choix d'une durée ou d'une date de relance ─────────────────────────
function ChoixRelance({valeur,onChange,dateReference}){
  const {mode,nb,unite,date}=valeur;
  const calculee=mode==="duree"&&nb>0?ajouterDuree(dateReference,nb,unite):mode==="date"?date:null;
  const maj=c=>onChange({...valeur,...c});
  const chip=(id,label)=><button type="button" onClick={()=>maj({mode:id})} style={{padding:"6px 12px",borderRadius:20,border:"1.5px solid "+(mode===id?"#1B4F8A":"#D1D5DB"),background:mode===id?"#EEF4FF":"#fff",color:mode===id?"#1B4F8A":"#374151",fontSize:13,fontWeight:mode===id?700:500,cursor:"pointer"}}>{label}</button>;
  return(<div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{chip("duree","Dans un délai")}{chip("date","À une date")}{chip("aucune","Pas de relance")}</div>
    {mode==="duree"&&<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <span style={{fontSize:13}}>Relancer dans</span>
      <input type="number" min="1" value={nb||""} onChange={e=>maj({nb:Math.max(0,parseInt(e.target.value,10)||0)})} style={{...INP,width:80}} placeholder="8"/>
      <select value={unite} onChange={e=>maj({unite:e.target.value})} style={{...INP,width:"auto"}}>{UNITES.map(u=><option key={u.id} value={u.id}>{u.label}</option>)}</select>
    </div>}
    {mode==="date"&&<input type="date" value={date||""} onChange={e=>maj({date:e.target.value})} style={{...INP,maxWidth:200}}/>}
    {calculee&&<div style={{marginTop:8,fontSize:13,color:"#1B4F8A",fontWeight:600}}>→ Relance prévue le {frDate(calculee)}</div>}
  </div>);
}
const relanceVersChamps=(r,dateRef)=>{
  if(r.mode==="duree"&&r.nb>0)return {relance_le:ajouterDuree(dateRef,r.nb,r.unite),relance_nb:r.nb,relance_unite:r.unite};
  if(r.mode==="date"&&r.date)return {relance_le:r.date,relance_nb:null,relance_unite:null};
  return {relance_le:null,relance_nb:null,relance_unite:null};
};

// ── formulaire (nouveau suivi / modification) ───────────────────────────
function Formulaire({initial,fiches,champClient,par,onEnregistre,onAnnuler}){
  const edition=!!(initial&&initial.id);
  const [f,setF]=useState(()=>({
    de:initial?.de||"",client:initial?.client||"",contact:initial?.contact||"",telephone:initial?.telephone||"",mail:initial?.mail||"",
    objet:initial?.objet||"",montant:initial&&initial.montant!==null&&initial.montant!==undefined?String(initial.montant):"",
    date_devis:initial?.date_devis?String(initial.date_devis).slice(0,10):aujourdhui(),
    statut:initial?.statut||"envoye",commentaire:initial?.commentaire||"",motif_refus:initial?.motif_refus||"",
  }));
  const [rel,setRel]=useState(()=>initial&&initial.relance_nb&&initial.relance_unite?{mode:"duree",nb:initial.relance_nb,unite:initial.relance_unite,date:""}:initial&&initial.relance_le?{mode:"date",nb:8,unite:"semaines",date:String(initial.relance_le).slice(0,10)}:edition?{mode:"aucune",nb:8,unite:"semaines",date:""}:{mode:"duree",nb:8,unite:"semaines",date:""});
  const [cleClient,setCleClient]=useState(0);
  const [chantiers,setChantiers]=useState([]);
  const [occupe,setOccupe]=useState(false);const [erreur,setErreur]=useState(null);
  const maj=(id,val)=>setF(x=>({...x,[id]:val}));
  useEffect(()=>{db.get("fiches_chantier","?select=de,client,materiel&order=created_at.desc&limit=1000").then(d=>{if(Array.isArray(d))setChantiers(d);}).catch(()=>{});},[]);
  const deNorm=normaliserDE(f.de,f.client);
  const trouvees=useMemo(()=>{
    if(!deNorm||deNorm.length<4)return [];
    return [...fiches.map(x=>({type:"atelier",de:x.de,client:x.client,lieu:x.materiel_lieu||x.materiel})),...chantiers.map(x=>({type:"chantier",de:x.de,client:x.client,lieu:x.materiel}))]
      .filter(x=>x.de&&normaliserDE(x.de)===deNorm&&x.client);
  },[fiches,chantiers,deNorm]);
  const clientsTrouves=[...new Map(trouvees.map(x=>[norm(x.client),x])).values()];

  async function enregistrer(){
    if(occupe)return;
    if(!deNorm||!f.client.trim()||!f.contact.trim()){setErreur("Indiquez le N° de DE, le client et le contact.");return;}
    const montant=f.montant.trim()===""?null:parseFloat(f.montant.replace(",","."));
    if(montant!==null&&isNaN(montant)){setErreur("Le montant doit être un nombre.");return;}
    setOccupe(true);setErreur(null);
    const corps={de:deNorm,client:f.client.trim(),contact:f.contact.trim(),telephone:f.telephone.trim()||null,mail:f.mail.trim()||null,objet:f.objet.trim()||null,montant,date_devis:f.date_devis||aujourdhui(),statut:f.statut,commentaire:f.commentaire.trim()||null,motif_refus:["refuse","sans_suite"].includes(f.statut)?(f.motif_refus||null):null,...relanceVersChamps(rel,f.date_devis),updated_at:new Date().toISOString()};
    let rep;
    if(edition)rep=await db.patch("suivi_devis","?id=eq."+initial.id,corps);
    else rep=await db.post("suivi_devis",[{...corps,par:par||null}]);
    if(Array.isArray(rep)&&rep[0])onEnregistre(rep[0],edition);
    else setErreur("L'enregistrement n'a pas abouti (connexion ?). Rien n'a été noté.");
    setOccupe(false);
  }

  return(<div style={{...CARTE,border:"2px solid #1B4F8A"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
      <div style={{fontSize:16,fontWeight:800,color:"#1B4F8A"}}>{edition?"✏ Modifier le suivi":"➕ Nouveau suivi de devis"}</div>
      <button type="button" onClick={onAnnuler} style={{...BTN2,padding:"5px 12px"}}>Annuler</button>
    </div>

    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
      <div style={{flex:"1 1 160px"}}>
        <label style={LBL}>N° de DE *</label>
        <input type="text" value={f.de} onChange={e=>maj("de",e.target.value)} onBlur={()=>{if(deNorm&&deNorm!==f.de)maj("de",deNorm);}} placeholder="DE7591" style={INP} autoComplete="off"/>
      </div>
      <div style={{flex:"1 1 150px"}}>
        <label style={LBL}>Date du devis</label>
        <input type="date" value={f.date_devis} onChange={e=>maj("date_devis",e.target.value)} style={INP}/>
      </div>
      <div style={{flex:"1 1 120px"}}>
        <label style={LBL}>Montant HT (€)</label>
        <input type="text" inputMode="decimal" value={f.montant} onChange={e=>maj("montant",e.target.value)} placeholder="facultatif" style={INP}/>
      </div>
    </div>
    {clientsTrouves.length>0&&!f.client&&<div style={{marginBottom:12,fontSize:13,background:"#F0FFF4",border:"1px solid #22863A",borderRadius:8,padding:"8px 10px"}}>
      Ce DE existe déjà : {clientsTrouves.map(x=><button key={x.client} type="button" onClick={()=>{maj("client",x.client);setCleClient(k=>k+1);}} style={{marginLeft:6,background:"#fff",border:"1.5px solid #22863A",color:"#22863A",borderRadius:20,padding:"3px 10px",fontSize:13,cursor:"pointer"}}>{x.client}{x.lieu?" — "+x.lieu:""}</button>)}
    </div>}

    <div style={{marginBottom:12}}>
      <label style={LBL}>Client *</label>
      <div key={cleClient}>{champClient(f.client,v=>maj("client",v))}</div>
    </div>
    <div style={{marginBottom:12}}>
      <label style={LBL}>Contact * <span style={{textTransform:"none",fontWeight:400}}>(choisi dans le carnet ; un nouveau contact peut être ajouté avec son numéro et son mail)</span></label>
      <ChampContact valeur={f.contact} onChange={maj} champ={{id:"contact",remplit:{telephone:"telephone",mail:"mail"}}} v={f}/>
    </div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
      <div style={{flex:"1 1 160px"}}><label style={LBL}>Téléphone</label><input type="tel" value={f.telephone} onChange={e=>maj("telephone",e.target.value)} style={INP} autoComplete="off"/></div>
      <div style={{flex:"1 1 200px"}}><label style={LBL}>Mail</label><input type="email" value={f.mail} onChange={e=>maj("mail",e.target.value)} style={INP} autoComplete="off"/></div>
    </div>
    <div style={{marginBottom:12}}><label style={LBL}>Objet du devis</label><input type="text" value={f.objet} onChange={e=>maj("objet",e.target.value)} placeholder="Ex : remplacement moteur 15 kW" style={INP}/></div>

    <div style={{marginBottom:12,background:"#F8F9FA",border:"1px solid #E2E6EA",borderRadius:10,padding:"10px 12px"}}>
      <label style={LBL}>Relance</label>
      <ChoixRelance valeur={rel} onChange={setRel} dateReference={f.date_devis}/>
    </div>

    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
      <div style={{flex:"1 1 180px"}}><label style={LBL}>Statut</label>
        <select value={f.statut} onChange={e=>maj("statut",e.target.value)} style={INP}>{STATUTS_DEVIS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
      </div>
      <div style={{flex:"2 1 240px"}}><label style={LBL}>Commentaire</label><input type="text" value={f.commentaire} onChange={e=>maj("commentaire",e.target.value)} style={INP}/></div>
    </div>
    {["refuse","sans_suite"].includes(f.statut)&&<div style={{marginBottom:12}}>
      <label style={LBL}>Motif du refus</label>
      <select value={f.motif_refus} onChange={e=>maj("motif_refus",e.target.value)} style={INP}><option value="">— Choisir —</option>{MOTIFS_REFUS.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select>
    </div>}

    {erreur&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:6,padding:"8px 10px",fontSize:13,color:"#D73A49",marginBottom:10}}>{erreur}</div>}
    <button type="button" onClick={enregistrer} disabled={occupe} style={{...BTN1,opacity:occupe?0.6:1}}>{occupe?"⏳ Enregistrement…":"✓ Enregistrer"}</button>
  </div>);
}

// ── « Relancé » : note + prochaine relance ──────────────────────────────
function DialogRelance({ligne,resume,titre="✓ Relance faite",bouton="Enregistrer la relance",defaut={nb:8,unite:"semaines"},onValide,onAnnuler}){
  const [note,setNote]=useState("");
  const [rel,setRel]=useState(()=>ligne.relance_nb&&ligne.relance_unite?{mode:"duree",nb:ligne.relance_nb,unite:ligne.relance_unite,date:""}:{mode:"duree",nb:defaut.nb,unite:defaut.unite,date:""});
  const [occupe,setOccupe]=useState(false);
  async function valider(){
    setOccupe(true);
    await onValide({note:note.trim(),...relanceVersChamps(rel,aujourdhui())});
    setOccupe(false);
  }
  return(<div onClick={onAnnuler} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",zIndex:300,padding:12,overflowY:"auto"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,padding:"20px 18px",width:"100%",maxWidth:420,margin:"auto",boxSizing:"border-box"}}>
      <div style={{fontSize:16,fontWeight:800,color:"#1B4F8A",marginBottom:2}}>{titre}</div>
      <div style={{fontSize:13,color:"#6B7280",marginBottom:12,overflowWrap:"anywhere"}}>{resume||ligne.de+" — "+ligne.client+" — "+ligne.contact}</div>
      <div style={{marginBottom:12}}><label style={LBL}>Note (facultatif)</label><input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex : doit en parler à sa direction" style={INP} autoComplete="off"/></div>
      <div style={{marginBottom:14,background:"#F8F9FA",border:"1px solid #E2E6EA",borderRadius:10,padding:"10px 12px"}}>
        <label style={LBL}>Prochaine relance</label>
        <ChoixRelance valeur={rel} onChange={setRel} dateReference={aujourdhui()}/>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button type="button" onClick={valider} disabled={occupe} style={{...BTN1,opacity:occupe?0.6:1}}>{occupe?"⏳ …":bouton}</button>
        <button type="button" onClick={onAnnuler} style={BTN2}>Annuler</button>
      </div>
    </div>
  </div>);
}

// ── lignes d'actions rapides ─────────────────────────────────────────────
export function Contacter({l}){
  const prospect=l.entreprise!==undefined&&l.de===undefined;
  const sujet=prospect?"PMV Services — suite à notre échange":"Devis "+l.de+(l.objet?" — "+l.objet:"");
  const corps=prospect
    ?"Bonjour,\n\nJe me permets de revenir vers vous suite à notre échange. Je reste à votre disposition pour étudier vos besoins et vous présenter ce que PMV Services peut vous apporter.\n\nCordialement"
    :"Bonjour,\n\nJe me permets de revenir vers vous au sujet de notre devis "+l.de+(l.date_devis?" du "+frDate(l.date_devis):"")+(l.objet?" ("+l.objet+")":"")+".\nAvez-vous pu l'étudier ? Je reste à votre disposition pour en discuter.\n\nCordialement";
  return(<span style={{display:"inline-flex",gap:10,flexWrap:"wrap"}}>
    {l.telephone&&<a href={"tel:"+String(l.telephone).replace(/\s+/g,"")} style={LIEN}>📞 {l.telephone}</a>}
    {l.mail&&<a href={"mailto:"+l.mail+"?subject="+encodeURIComponent(sujet)+"&body="+encodeURIComponent(corps)} style={LIEN} title="Ouvre un mail de relance prérempli">✉ {l.mail}</a>}
  </span>);
}

// ── page ─────────────────────────────────────────────────────────────────
function RelanceDevis({suivi,fiches,champClient,par,onVoirRefuses,onOuvrirFiche,onOuvrirClient}){
  const largeur=useLargeur();
  const [formulaire,setFormulaire]=useState(null); // null | {} (nouveau) | ligne (modification)
  const [recherche,setRecherche]=useState("");
  const [filtre,setFiltre]=useState("actifs");
  const [tri,setTri]=useState("relance");
  const [relancer,setRelancer]=useState(null);
  const [refuser,setRefuser]=useState(null); // {l,statut} : on demande le motif d'un refus
  const [aSupprimer,setASupprimer]=useState(null);
  const [message,setMessage]=useState(null);
  const [erreur,setErreur]=useState(null);
  const {lignes,dispo,charge,setLignes}=suivi;
  const fichesParDe=useFichesParDe(fiches);

  const filtrees=useMemo(()=>{
    const mots=norm(recherche).split(" ").filter(Boolean);
    let l=lignes.filter(x=>{
      if(["refuse","sans_suite"].includes(x.statut))return false; // les refusés ont leur propre sous-onglet
      if(filtre==="actifs"&&!["a_envoyer","envoye"].includes(x.statut))return false;
      if(filtre==="relancer"&&!["retard","aujourdhui"].includes(etatRelance(x)))return false;
      if(!["actifs","relancer","tous"].includes(filtre)&&x.statut!==filtre)return false;
      if(!mots.length)return true;
      const h=norm([x.de,x.client,x.contact,x.telephone,x.mail,x.objet,x.commentaire].join(" "));
      return mots.every(m=>h.includes(m));
    });
    const cle={
      relance:x=>(etatRelance(x)===null?"9":"0")+(x.relance_le?String(x.relance_le):"8")+x.client,
      client:x=>norm(x.client),
      date:x=>String(x.date_devis||"")+"",
      montant:x=>String(1e9-Number(x.montant||0)).padStart(12,"0"),
    }[tri];
    l=[...l].sort((a,b)=>tri==="date"?String(b.date_devis).localeCompare(String(a.date_devis)):String(cle(a)).localeCompare(String(cle(b)),"fr"));
    return l;
  },[lignes,recherche,filtre,tri]);

  const nbRetard=lignes.filter(x=>["retard","aujourdhui"].includes(etatRelance(x))).length;
  const enCours=lignes.filter(x=>x.statut==="envoye");
  const totalEnCours=enCours.reduce((n,x)=>n+Number(x.montant||0),0);
  const acceptes=lignes.filter(x=>x.statut==="accepte").length,refusesStrict=lignes.filter(x=>x.statut==="refuse").length;
  const refuses=lignes.filter(x=>["refuse","sans_suite"].includes(x.statut)).length;
  const taux=acceptes+refusesStrict>0?Math.round(acceptes/(acceptes+refusesStrict)*100):null;

  function flash(t){setMessage(t);setTimeout(()=>setMessage(null),5000);}
  function apresEnregistrement(row,edition){
    setLignes(ls=>edition?ls.map(x=>x.id===row.id?row:x):[row,...ls]);
    setFormulaire(null);flash(edition?"✓ Suivi modifié.":"✓ Suivi enregistré pour "+row.client+" ("+row.de+").");
  }
  async function patch(l,champs,libelleHisto){
    const hist=Array.isArray(l.historique)?l.historique:[];
    const corps={...champs,updated_at:new Date().toISOString()};
    if(libelleHisto)corps.historique=[...hist,{date:aujourdhui(),texte:libelleHisto}];
    const rep=await db.patch("suivi_devis","?id=eq."+l.id,corps);
    if(Array.isArray(rep)&&rep[0]){setLignes(ls=>ls.map(x=>x.id===l.id?rep[0]:x));return true;}
    setErreur("La modification n'a pas abouti (connexion ?).");return false;
  }
  async function validerRelance({note,relance_le,relance_nb,relance_unite}){
    const l=relancer;
    const ok=await patch(l,{relance_le,relance_nb,relance_unite},"Relancé"+(note?" : "+note:"")+(relance_le?" — prochaine relance le "+frDate(relance_le):""));
    if(ok){setRelancer(null);flash("✓ Relance notée"+(relance_le?" — prochaine le "+frDate(relance_le):"")+".");}
  }
  async function changerStatut(l,statut){
    if(statut===l.statut)return;
    if(["refuse","sans_suite"].includes(statut)){setRefuser({l,statut});return;} // on note d'abord pourquoi
    await patch(l,{statut,motif_refus:null},"Statut : "+statutInfo(statut).label);
  }
  async function validerRefus({motif,note}){
    const {l,statut}=refuser;
    const ok=await patch(l,{statut,motif_refus:motif},"Statut : "+statutInfo(statut).label+" — "+motifInfo(motif).label+(note?" : "+note:""));
    if(ok){setRefuser(null);flash("✓ "+l.de+" est passé dans « Devis refusés ».");}
  }
  async function supprimer(){
    const l=aSupprimer;if(!l)return;
    try{
      const r=await fetch(SUPA_URL+"/rest/v1/suivi_devis?id=eq."+l.id,{method:"DELETE",headers:H});
      if(!r.ok)throw new Error("refus");
      setLignes(ls=>ls.filter(x=>x.id!==l.id));setASupprimer(null);
    }catch(e){setErreur("La suppression n'a pas abouti (connexion ?).");}
  }
  function exporterCsv(){
    const ent=["N° DE","Client","Contact","Téléphone","Mail","Objet","Montant HT","Date du devis","Relance","Statut","Commentaire"];
    const cel=v=>{const t=String(v===null||v===undefined?"":v).replace(/"/g,'""');return /[;"\n]/.test(t)?'"'+t+'"':t;};
    const lignesCsv=[ent.join(";"),...filtrees.map(x=>[x.de,x.client,x.contact,x.telephone,x.mail,x.objet,x.montant,frDate(x.date_devis),x.relance_le?frDate(x.relance_le):"",statutInfo(x.statut).label,x.commentaire].map(cel).join(";"))];
    const blob=new Blob(["﻿"+lignesCsv.join("\r\n")],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="suivi-devis-"+aujourdhui()+".csv";a.click();
  }

  if(dispo===false)return(<div style={{maxWidth:760}}>
    <NoticeActivation titre="Activer le suivi clients" intro={suivi.miseAJour?"La base de données doit être mise à jour (motif de refus, rendez-vous). C'est à faire une seule fois, par le responsable (compte Supabase) ; le texte SQL peut être rejoué sans risque.":"La base de données doit recevoir quelques petites tables : devis suivis, prospection, rendez-vous. C'est à faire une seule fois, par le responsable (compte Supabase)."} sql={SQL_SUIVI_CLIENTS} onVerifier={suivi.recharger}/>
  </div>);

  const tuile=(id,titre,valeur,sous,couleur)=><button type="button" onClick={()=>setFiltre(id)} style={{flex:"1 1 130px",minWidth:0,textAlign:"left",background:filtre===id?"#EEF4FF":"#fff",border:"1.5px solid "+(filtre===id?"#1B4F8A":"#E2E6EA"),borderRadius:12,padding:"10px 12px",cursor:"pointer"}}>
    <div style={{fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".04em"}}>{titre}</div>
    <div style={{fontSize:26,fontWeight:800,color:couleur,lineHeight:1.15}}>{valeur}</div>
    <div style={{fontSize:12,color:"#6B7280"}}>{sous}</div>
  </button>;

  const etatBadge=l=>{const e=etatRelance(l);return e&&l.relance_le?<span style={{fontSize:12,fontWeight:700,color:COUL_RELANCE[e]}}>{texteRelance(l)}</span>:e==="sans"?<span style={{fontSize:12,color:"#9CA3AF"}}>pas de relance</span>:null;};
  const fondLigne=l=>{const e=etatRelance(l);return e==="retard"?"#FFF5F5":e==="aujourdhui"?"#FFF8E1":"#fff";};
  const selecteurStatut=l=>{const s=statutInfo(l.statut);return <select value={l.statut} onChange={e=>changerStatut(l,e.target.value)} style={{padding:"4px 8px",borderRadius:20,border:"1.5px solid "+s.couleur,fontSize:12,fontWeight:700,color:s.couleur,background:s.fond,cursor:"pointer",maxWidth:"100%"}} aria-label={"Statut du devis "+l.de}>{STATUTS_DEVIS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select>;};
  const actions=l=><span style={{display:"inline-flex",gap:6,flexWrap:"wrap"}}>
    {l.statut==="envoye"&&<button type="button" onClick={()=>setRelancer(l)} style={{...BTN2,padding:"4px 10px",fontSize:12}}>✓ Relancé</button>}
    <button type="button" onClick={()=>{setFormulaire(l);window.scrollTo&&window.scrollTo({top:0,behavior:"smooth"});}} style={{...BTN2,padding:"4px 10px",fontSize:12}} aria-label={"Modifier "+l.de}>✏</button>
    <button type="button" onClick={()=>setASupprimer(l)} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9CA3AF",fontSize:15,padding:"4px 6px"}} aria-label={"Supprimer "+l.de}>🗑</button>
  </span>;
  const historique=l=>Array.isArray(l.historique)&&l.historique.length>0&&<details style={{marginTop:4}}><summary style={{cursor:"pointer",fontSize:12,color:"#6B7280"}}>Historique ({l.historique.length})</summary>{l.historique.map((h,i)=><div key={i} style={{fontSize:12,color:"#374151",marginTop:2}}>• {frDate(h.date)} — {h.texte}</div>)}</details>;

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}>
      <div style={{minWidth:0}}>
        <h2 style={{fontSize:17,fontWeight:800,margin:"0 0 2px"}}>Relance devis</h2>
        <div style={{fontSize:13,color:"#6B7280"}}>Devis envoyés, relances et réponses.</div>
      </div>
      {!formulaire&&<button type="button" onClick={()=>setFormulaire({})} style={BTN1}>➕ Nouveau suivi</button>}
    </div>

    {message&&<div style={{background:"#F0FFF4",border:"1px solid #22863A",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#22863A",marginBottom:12}}>{message}</div>}
    {erreur&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#D73A49",marginBottom:12}} onClick={()=>setErreur(null)}>{erreur}</div>}

    {formulaire&&<Formulaire key={formulaire.id||"nouveau"} initial={formulaire.id?formulaire:null} fiches={fiches} champClient={champClient} par={par} onEnregistre={apresEnregistrement} onAnnuler={()=>setFormulaire(null)}/>}

    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
      {tuile("relancer","À relancer",nbRetard,nbRetard?"date dépassée ou aujourd'hui":"rien en retard",nbRetard?"#D73A49":"#22863A")}
      {tuile("envoye","En attente",enCours.length,totalEnCours?euros(totalEnCours)+" HT":"devis envoyés","#1B4F8A")}
      {tuile("accepte","Acceptés",acceptes,taux!==null?taux+" % de réponses positives":"—","#22863A")}
      <TuileFiltre titre="Refusés" valeur={refuses} sous="voir « Devis refusés »" couleur="#D73A49" actif={false} onClick={onVoirRefuses}/>
    </div>

    <div style={CARTE}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"3 1 220px",minWidth:0}}><label style={LBL}>🔍 Rechercher (DE, client, contact, mail…)</label><input type="search" value={recherche} onChange={e=>setRecherche(e.target.value)} style={INP} autoComplete="off"/></div>
        <div style={{flex:"1 1 150px"}}><label style={LBL}>Afficher</label>
          <select value={filtre} onChange={e=>setFiltre(e.target.value)} style={INP}>
            <option value="actifs">En cours</option><option value="relancer">À relancer</option>
            {STATUTS_DEVIS.filter(s=>!["refuse","sans_suite"].includes(s.id)).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}<option value="tous">Tout</option>
          </select></div>
        <div style={{flex:"1 1 140px"}}><label style={LBL}>Trier par</label>
          <select value={tri} onChange={e=>setTri(e.target.value)} style={INP}><option value="relance">Date de relance</option><option value="client">Client</option><option value="date">Date du devis</option><option value="montant">Montant</option></select></div>
        <button type="button" onClick={exporterCsv} style={{...BTN2,flex:"none"}} title="Télécharge la liste affichée (ouvrable dans Excel)">⬇ Exporter</button>
      </div>
      <div style={{marginTop:8,fontSize:13,color:"#374151"}}>{!charge?"Chargement…":filtrees.length===0?(recherche.trim()?"Aucun suivi ne correspond à « "+recherche.trim()+" ».":"Aucun suivi dans cette liste."):filtrees.length+" suivi"+(filtrees.length>1?"s":"")}</div>
    </div>

    {aSupprimer&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:8,padding:"10px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <span style={{flex:1,minWidth:200,fontSize:13,color:"#D73A49"}}>Supprimer le suivi « {aSupprimer.de} — {aSupprimer.client} » ?</span>
      <button type="button" onClick={supprimer} style={{...BTN1,background:"#D73A49",padding:"6px 14px"}}>🗑 Supprimer</button>
      <button type="button" onClick={()=>setASupprimer(null)} style={{...BTN2,padding:"5px 12px"}}>Annuler</button>
    </div>}

    {largeur>=1000
      ?<div style={{...CARTE,padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr style={{background:"#F3F6FA",textAlign:"left",color:"#1B4F8A"}}>{["DE","Client","Contact","Devis","Montant","Relance","Statut",""].map((h,i)=><th key={i} style={{padding:"9px 10px",fontSize:11,textTransform:"uppercase",letterSpacing:".04em",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
        <tbody>{filtrees.map(l=><tr key={l.id} style={{background:fondLigne(l),borderTop:"1px solid #E2E6EA",verticalAlign:"top"}}>
          <td style={{padding:"9px 10px",fontWeight:700,whiteSpace:"nowrap"}}>{l.de}{fichesParDe.get(l.de)&&<div style={{fontWeight:400,fontSize:12}}><LienAction onClick={()=>onOuvrirFiche(fichesParDe.get(l.de))} title="Ouvrir la fiche atelier qui porte ce DE">📂 fiche atelier</LienAction></div>}</td>
          <td style={{padding:"9px 10px",minWidth:140}}><LienAction onClick={()=>onOuvrirClient(l.client)} title="Ouvrir la fiche client">{l.client}</LienAction>{l.objet&&<div style={{fontSize:12,color:"#6B7280"}}>{l.objet}</div>}</td>
          <td style={{padding:"9px 10px",minWidth:170}}><div style={{fontWeight:600}}>{l.contact}</div><Contacter l={l}/></td>
          <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>{frDate(l.date_devis)}</td>
          <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>{euros(l.montant)}</td>
          <td style={{padding:"9px 10px",minWidth:150}}>{etatBadge(l)}{l.commentaire&&<div style={{fontSize:12,color:"#6B7280",marginTop:2}}>{l.commentaire}</div>}{historique(l)}</td>
          <td style={{padding:"9px 10px"}}>{selecteurStatut(l)}</td>
          <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>{actions(l)}</td>
        </tr>)}</tbody></table></div>
      :filtrees.map(l=><div key={l.id} style={{...CARTE,background:fondLigne(l),borderColor:etatRelance(l)==="retard"?"#D73A49":etatRelance(l)==="aujourdhui"?"#E8720C":"#E2E6EA"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"baseline",flexWrap:"wrap"}}>
          <div style={{fontSize:15,fontWeight:800,color:"#1B4F8A",overflowWrap:"anywhere"}}>{l.de} — <LienAction onClick={()=>onOuvrirClient(l.client)}>{l.client}</LienAction></div>
          <div style={{fontSize:13,fontWeight:700}}>{euros(l.montant)}</div>
        </div>
        {l.objet&&<div style={{fontSize:13,color:"#6B7280"}}>{l.objet}</div>}
        {fichesParDe.get(l.de)&&<div style={{fontSize:12,marginTop:2}}><LienAction onClick={()=>onOuvrirFiche(fichesParDe.get(l.de))}>📂 fiche atelier</LienAction></div>}
        <div style={{marginTop:6,fontSize:14,fontWeight:600,overflowWrap:"anywhere"}}>{l.contact}</div>
        <div style={{marginTop:2}}><Contacter l={l}/></div>
        <div style={{marginTop:6,fontSize:12,color:"#6B7280"}}>Devis du {frDate(l.date_devis)}</div>
        <div style={{marginTop:2}}>{etatBadge(l)}</div>
        {l.commentaire&&<div style={{fontSize:12,color:"#6B7280",marginTop:2}}>{l.commentaire}</div>}
        {historique(l)}
        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:10}}>{selecteurStatut(l)}{actions(l)}</div>
      </div>)}

    {relancer&&<DialogRelance ligne={relancer} onValide={validerRelance} onAnnuler={()=>setRelancer(null)}/>}
    {refuser&&<DialogRefus ligne={refuser.l} statut={refuser.statut} onValide={validerRefus} onAnnuler={()=>setRefuser(null)}/>}
  </div>);
}

// ── Prospection : entreprises à démarcher, puis entreprises démarchées à relancer ────────
// Nom d'entreprise : se complète avec la liste des clients ; un nom qui n'y figure pas est marqué « Prospect »
function ChampEntreprise({valeur,onChange,clients,suggestions}){
  const [ouvert,setOuvert]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{
    function ferme(e){if(ref.current&&!ref.current.contains(e.target))setOuvert(false);}
    document.addEventListener("mousedown",ferme);
    return()=>document.removeEventListener("mousedown",ferme);
  },[]);
  const q=norm(valeur);
  const liste=clients||[];
  const connu=!!q&&liste.some(c=>norm(c)===q);
  const propositions=q&&!connu?(suggestions||liste).filter(c=>norm(c).includes(q)).slice(0,8):[];
  return(<div ref={ref} style={{position:"relative"}}>
    <input type="text" value={valeur} onChange={e=>{onChange(e.target.value);setOuvert(true);}} onFocus={()=>setOuvert(true)} placeholder="Nom de l'entreprise" style={INP} autoComplete="off"/>
    {ouvert&&propositions.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1.5px solid #D1D5DB",borderRadius:6,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:50,maxHeight:220,overflowY:"auto"}}>
      {propositions.map(c=><div key={c} onClick={()=>{onChange(c);setOuvert(false);}} style={{padding:"8px 12px",cursor:"pointer",fontSize:13,borderBottom:"1px solid #F3F4F6"}}>{c}</div>)}
    </div>}
    {q&&<div style={{marginTop:4,fontSize:12,fontWeight:700,color:connu?"#22863A":"#E8720C"}}>{connu?"✓ Déjà dans la liste des clients":"🎯 Prospect — pas encore dans la liste des clients"}</div>}
  </div>);
}
const Etiquette=({client})=><span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em",padding:"1px 7px",borderRadius:10,border:"1px solid "+(client?"#22863A":"#E8720C"),color:client?"#22863A":"#E8720C",marginLeft:6,whiteSpace:"nowrap",verticalAlign:"middle"}}>{client?"Client":"Prospect"}</span>;
const BadgeRelance=({l})=>{const e=etatRelance(l);return e&&l.relance_le?<span style={{fontSize:12,fontWeight:700,color:COUL_RELANCE[e]}}>{texteRelance(l)}</span>:e==="sans"?<span style={{fontSize:12,color:"#9CA3AF"}}>pas de relance</span>:null;};
const fondRelance=l=>{const e=etatRelance(l);return e==="retard"?"#FFF5F5":e==="aujourdhui"?"#FFF8E1":"#fff";};
const HistoriqueLigne=({l})=>Array.isArray(l.historique)&&l.historique.length>0?<details style={{marginTop:4}}><summary style={{cursor:"pointer",fontSize:12,color:"#6B7280"}}>Historique ({l.historique.length})</summary>{l.historique.map((h,i)=><div key={i} style={{fontSize:12,color:"#374151",marginTop:2}}>• {frDate(h.date)} — {h.texte}</div>)}</details>:null;
function TuileFiltre({titre,valeur,sous,couleur,actif,onClick}){
  return(<button type="button" onClick={onClick} style={{flex:"1 1 130px",minWidth:0,textAlign:"left",background:actif?"#EEF4FF":"#fff",border:"1.5px solid "+(actif?"#1B4F8A":"#E2E6EA"),borderRadius:12,padding:"10px 12px",cursor:"pointer"}}>
    <div style={{fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".04em"}}>{titre}</div>
    <div style={{fontSize:26,fontWeight:800,color:couleur,lineHeight:1.15}}>{valeur}</div>
    <div style={{fontSize:12,color:"#6B7280"}}>{sous}</div>
  </button>);
}

// formulaire d'un prospect (nouveau / modification) ; statutInitial : liste dans laquelle on l'ajoute
function FormulaireProspect({initial,statutInitial,clients,secteurs,par,onEnregistre,onAnnuler}){
  const edition=!!(initial&&initial.id);
  const [f,setF]=useState(()=>({
    entreprise:initial?.entreprise||"",contact:initial?.contact||"",telephone:initial?.telephone||"",mail:initial?.mail||"",
    secteur:initial?.secteur||"",potentiel:initial?.potentiel||"",commentaire:initial?.commentaire||"",
    statut:initial?.statut||statutInitial||"a_demarcher",
    date_demarche:initial?.date_demarche?String(initial.date_demarche).slice(0,10):aujourdhui(),
  }));
  const [rel,setRel]=useState(()=>initial&&initial.relance_nb&&initial.relance_unite?{mode:"duree",nb:initial.relance_nb,unite:initial.relance_unite,date:""}:initial&&initial.relance_le?{mode:"date",nb:4,unite:"semaines",date:String(initial.relance_le).slice(0,10)}:edition&&initial.statut==="demarche"?{mode:"aucune",nb:4,unite:"semaines",date:""}:{mode:"duree",nb:4,unite:"semaines",date:""});
  const [occupe,setOccupe]=useState(false);const [erreur,setErreur]=useState(null);
  const maj=(id,val)=>setF(x=>({...x,[id]:val}));
  const demarche=f.statut==="demarche";

  async function enregistrer(){
    if(occupe)return;
    if(!f.entreprise.trim()){setErreur("Indiquez le nom de l'entreprise.");return;}
    setOccupe(true);setErreur(null);
    const corps={
      entreprise:f.entreprise.trim(),contact:f.contact.trim(),telephone:f.telephone.trim()||null,mail:f.mail.trim()||null,
      secteur:f.secteur.trim()||null,potentiel:f.potentiel.trim()||null,commentaire:f.commentaire.trim()||null,statut:f.statut,
      date_demarche:f.statut==="a_demarcher"?null:(f.date_demarche||aujourdhui()),
      ...(demarche?relanceVersChamps(rel,f.date_demarche||aujourdhui()):{relance_le:null,relance_nb:null,relance_unite:null}),
      updated_at:new Date().toISOString(),
    };
    let rep;
    if(edition)rep=await db.patch("suivi_prospects","?id=eq."+initial.id,corps);
    else rep=await db.post("suivi_prospects",[{...corps,par:par||null}]);
    if(Array.isArray(rep)&&rep[0])onEnregistre(rep[0],edition);
    else setErreur("L'enregistrement n'a pas abouti (connexion ?). Rien n'a été noté.");
    setOccupe(false);
  }

  return(<div style={{...CARTE,border:"2px solid #1B4F8A"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
      <div style={{fontSize:16,fontWeight:800,color:"#1B4F8A"}}>{edition?"✏ Modifier le prospect":f.statut==="a_demarcher"?"➕ Entreprise à démarcher":"➕ Entreprise déjà démarchée"}</div>
      <button type="button" onClick={onAnnuler} style={{...BTN2,padding:"5px 12px"}}>Annuler</button>
    </div>
    <div style={{marginBottom:12}}>
      <label style={LBL}>Nom de l'entreprise *</label>
      <ChampEntreprise valeur={f.entreprise} onChange={v=>maj("entreprise",v)} clients={clients}/>
    </div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
      <div style={{flex:"1 1 200px"}}>
        <label style={LBL}>Secteur d'activité</label>
        <input type="text" list="secteurs-prospects" value={f.secteur} onChange={e=>maj("secteur",e.target.value)} placeholder="Ex : agroalimentaire, hôpital…" style={INP} autoComplete="off"/>
        <datalist id="secteurs-prospects">{secteurs.map(s=><option key={s} value={s}/>)}</datalist>
      </div>
      <div style={{flex:"2 1 260px"}}>
        <label style={LBL}>Potentiel de travail</label>
        <input type="text" value={f.potentiel} onChange={e=>maj("potentiel",e.target.value)} placeholder="Ex : 12 moteurs, contrat de maintenance annuel" style={INP}/>
      </div>
    </div>
    <div style={{marginBottom:12}}>
      <label style={LBL}>Contact <span style={{textTransform:"none",fontWeight:400}}>(carnet de contacts ; un nouveau contact peut être ajouté avec son numéro et son mail)</span></label>
      <ChampContact valeur={f.contact} onChange={maj} champ={{id:"contact",remplit:{telephone:"telephone",mail:"mail"}}} v={f}/>
    </div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
      <div style={{flex:"1 1 160px"}}><label style={LBL}>Téléphone</label><input type="tel" value={f.telephone} onChange={e=>maj("telephone",e.target.value)} style={INP} autoComplete="off"/></div>
      <div style={{flex:"1 1 200px"}}><label style={LBL}>Mail</label><input type="email" value={f.mail} onChange={e=>maj("mail",e.target.value)} style={INP} autoComplete="off"/></div>
    </div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
      <div style={{flex:"1 1 200px"}}><label style={LBL}>Statut</label>
        <select value={f.statut} onChange={e=>maj("statut",e.target.value)} style={INP}>{STATUTS_PROSPECT.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
      </div>
      {demarche&&<div style={{flex:"1 1 160px"}}><label style={LBL}>Date du démarchage</label><input type="date" value={f.date_demarche} onChange={e=>maj("date_demarche",e.target.value)} style={INP}/></div>}
    </div>
    {demarche&&<div style={{marginBottom:12,background:"#F8F9FA",border:"1px solid #E2E6EA",borderRadius:10,padding:"10px 12px"}}>
      <label style={LBL}>Relance</label>
      <ChoixRelance valeur={rel} onChange={setRel} dateReference={f.date_demarche}/>
    </div>}
    <div style={{marginBottom:12}}><label style={LBL}>Commentaire</label><input type="text" value={f.commentaire} onChange={e=>maj("commentaire",e.target.value)} style={INP}/></div>
    {erreur&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:6,padding:"8px 10px",fontSize:13,color:"#D73A49",marginBottom:10}}>{erreur}</div>}
    <button type="button" onClick={enregistrer} disabled={occupe} style={{...BTN1,opacity:occupe?0.6:1}}>{occupe?"⏳ Enregistrement…":"✓ Enregistrer"}</button>
  </div>);
}

function Prospection({suivi,clients,par,onOuvrirClient}){
  const largeur=useLargeur();
  const {prospects,dispoProspects,charge,setProspects}=suivi;
  const [formulaire,setFormulaire]=useState(null); // null | {statut} (nouveau) | ligne (modification)
  const [recherche,setRecherche]=useState("");
  const [filtre,setFiltre]=useState(()=>suivi.prospectsARelancer.length>0?"relancer":"a_demarcher");
  const [tri,setTri]=useState("relance");
  const [dialogue,setDialogue]=useState(null); // {type:"demarche"|"relance", p}
  const [aSupprimer,setASupprimer]=useState(null);
  const [message,setMessage]=useState(null);
  const [erreur,setErreur]=useState(null);
  const clientsNorm=useMemo(()=>new Set((clients||[]).map(norm)),[clients]);
  const estClient=nom=>clientsNorm.has(norm(nom));
  const secteurs=useMemo(()=>[...new Set(prospects.map(p=>String(p.secteur||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr")),[prospects]);

  const filtrees=useMemo(()=>{
    const mots=norm(recherche).split(" ").filter(Boolean);
    const l=prospects.filter(x=>{
      if(filtre==="relancer"){if(!["retard","aujourdhui"].includes(etatRelance(x)))return false;}
      else if(filtre!=="tous"&&x.statut!==filtre)return false;
      if(!mots.length)return true;
      const h=norm([x.entreprise,x.contact,x.telephone,x.mail,x.secteur,x.potentiel,x.commentaire].join(" "));
      return mots.every(m=>h.includes(m));
    });
    const cle={
      relance:x=>(etatRelance(x)===null?"9":"0")+(x.relance_le?String(x.relance_le):"8")+norm(x.entreprise),
      entreprise:x=>norm(x.entreprise),
      secteur:x=>norm(x.secteur)+" "+norm(x.entreprise),
    }[tri];
    return [...l].sort(tri==="recent"?(a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||"")):(a,b)=>String(cle(a)).localeCompare(String(cle(b)),"fr"));
  },[prospects,recherche,filtre,tri]);

  const nbDemarcher=prospects.filter(x=>x.statut==="a_demarcher").length;
  const nbDemarches=prospects.filter(x=>x.statut==="demarche").length;
  const nbRetard=prospects.filter(x=>["retard","aujourdhui"].includes(etatRelance(x))).length;
  const nbClients=prospects.filter(x=>x.statut==="client").length;

  function flash(t){setMessage(t);setTimeout(()=>setMessage(null),5000);}
  function apresEnregistrement(row,edition){
    setProspects(ls=>edition?ls.map(x=>x.id===row.id?row:x):[row,...ls]);
    setFormulaire(null);flash(edition?"✓ Prospect modifié.":"✓ "+row.entreprise+" ajouté"+(row.statut==="a_demarcher"?" à la liste à démarcher.":"."));
    // on affiche la liste où il vient d'être rangé (en modification : seulement s'il a quitté la liste affichée)
    const reste=filtre==="tous"||filtre===row.statut||(filtre==="relancer"&&["retard","aujourdhui"].includes(etatRelance(row)));
    if(!edition||!reste)setFiltre(row.statut);
  }
  async function patch(p,champs,libelleHisto){
    const hist=Array.isArray(p.historique)?p.historique:[];
    const corps={...champs,updated_at:new Date().toISOString()};
    if(libelleHisto)corps.historique=[...hist,{date:aujourdhui(),texte:libelleHisto}];
    const rep=await db.patch("suivi_prospects","?id=eq."+p.id,corps);
    if(Array.isArray(rep)&&rep[0]){setProspects(ls=>ls.map(x=>x.id===p.id?rep[0]:x));return true;}
    setErreur("La modification n'a pas abouti (connexion ?).");return false;
  }
  async function validerDialogue({note,relance_le,relance_nb,relance_unite}){
    const {type,p}=dialogue;
    const champs=type==="demarche"?{statut:"demarche",date_demarche:aujourdhui(),relance_le,relance_nb,relance_unite}:{relance_le,relance_nb,relance_unite};
    const ok=await patch(p,champs,(type==="demarche"?"Démarché":"Relancé")+(note?" : "+note:"")+(relance_le?" — prochaine relance le "+frDate(relance_le):""));
    if(ok){setDialogue(null);flash((type==="demarche"?"✓ Démarchage noté":"✓ Relance notée")+(relance_le?" — prochaine le "+frDate(relance_le):"")+".");}
  }
  async function changerStatut(p,statut){
    if(statut===p.statut)return;
    if(statut==="demarche"){setDialogue({type:"demarche",p});return;}
    const champs=statut==="a_demarcher"?{statut,date_demarche:null,relance_le:null,relance_nb:null,relance_unite:null}:{statut};
    await patch(p,champs,"Statut : "+statutProspect(statut).label);
  }
  async function supprimer(){
    const p=aSupprimer;if(!p)return;
    try{
      const r=await fetch(SUPA_URL+"/rest/v1/suivi_prospects?id=eq."+p.id,{method:"DELETE",headers:H});
      if(!r.ok)throw new Error("refus");
      setProspects(ls=>ls.filter(x=>x.id!==p.id));setASupprimer(null);
    }catch(e){setErreur("La suppression n'a pas abouti (connexion ?).");}
  }
  function exporterCsv(){
    const ent=["Entreprise","Prospect / Client","Contact","Téléphone","Mail","Secteur","Potentiel de travail","Démarché le","Relance","Statut","Commentaire"];
    const cel=v=>{const t=String(v===null||v===undefined?"":v).replace(/"/g,'""');return /[;"\n]/.test(t)?'"'+t+'"':t;};
    const lignesCsv=[ent.join(";"),...filtrees.map(x=>[x.entreprise,estClient(x.entreprise)?"Client":"Prospect",x.contact,x.telephone,x.mail,x.secteur,x.potentiel,x.date_demarche?frDate(x.date_demarche):"",x.relance_le?frDate(x.relance_le):"",statutProspect(x.statut).label,x.commentaire].map(cel).join(";"))];
    const blob=new Blob(["﻿"+lignesCsv.join("\r\n")],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="prospection-"+aujourdhui()+".csv";a.click();
  }

  if(dispoProspects===false)return(<div style={{maxWidth:760}}>
    <NoticeActivation titre="Activer la prospection" intro="La base de données doit recevoir une petite table pour ranger les prospects (le texte ci-dessous crée aussi les autres tables du suivi clients si elles manquent). C'est à faire une seule fois, par le responsable (compte Supabase)." sql={SQL_SUIVI_CLIENTS} onVerifier={suivi.recharger}/>
  </div>);

  const selecteurStatut=p=>{const s=statutProspect(p.statut);return <select value={p.statut} onChange={e=>changerStatut(p,e.target.value)} style={{padding:"4px 8px",borderRadius:20,border:"1.5px solid "+s.couleur,fontSize:12,fontWeight:700,color:s.couleur,background:s.fond,cursor:"pointer",maxWidth:"100%"}} aria-label={"Statut de "+p.entreprise}>{STATUTS_PROSPECT.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select>;};
  const actions=(p,sansRetour)=><span style={{display:"inline-flex",gap:6,flexWrap:sansRetour?"nowrap":"wrap"}}>
    {p.statut==="a_demarcher"&&<button type="button" onClick={()=>setDialogue({type:"demarche",p})} style={{...BTN2,padding:"4px 10px",fontSize:12}}>✓ Démarché</button>}
    {p.statut==="demarche"&&<button type="button" onClick={()=>setDialogue({type:"relance",p})} style={{...BTN2,padding:"4px 10px",fontSize:12}}>✓ Relancé</button>}
    <button type="button" onClick={()=>{setFormulaire(p);window.scrollTo&&window.scrollTo({top:0,behavior:"smooth"});}} style={{...BTN2,padding:"4px 10px",fontSize:12}} aria-label={"Modifier "+p.entreprise}>✏</button>
    <button type="button" onClick={()=>setASupprimer(p)} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9CA3AF",fontSize:15,padding:"4px 6px"}} aria-label={"Supprimer "+p.entreprise}>🗑</button>
  </span>;
  const demarcheLe=p=>p.statut==="demarche"&&p.date_demarche?<div style={{fontSize:12,color:"#6B7280"}}>Démarché le {frDate(p.date_demarche)}</div>:null;

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}>
      <div style={{minWidth:0}}>
        <h2 style={{fontSize:17,fontWeight:800,margin:"0 0 2px"}}>Prospection</h2>
        <div style={{fontSize:13,color:"#6B7280"}}>Entreprises à démarcher, puis démarchées à relancer.</div>
      </div>
      {!formulaire&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button type="button" onClick={()=>setFormulaire({statut:"a_demarcher"})} style={BTN1}>➕ À démarcher</button>
        <button type="button" onClick={()=>setFormulaire({statut:"demarche"})} style={{...BTN1,background:"#fff",color:"#1B4F8A",border:"1.5px solid #1B4F8A"}}>➕ Déjà démarché</button>
      </div>}
    </div>

    {message&&<div style={{background:"#F0FFF4",border:"1px solid #22863A",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#22863A",marginBottom:12}}>{message}</div>}
    {erreur&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#D73A49",marginBottom:12}} onClick={()=>setErreur(null)}>{erreur}</div>}

    {formulaire&&<FormulaireProspect key={formulaire.id||"nouveau-"+formulaire.statut} initial={formulaire.id?formulaire:null} statutInitial={formulaire.statut} clients={clients} secteurs={secteurs} par={par} onEnregistre={apresEnregistrement} onAnnuler={()=>setFormulaire(null)}/>}

    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
      <TuileFiltre titre="À démarcher" valeur={nbDemarcher} sous="entreprises à aller voir" couleur="#6B7280" actif={filtre==="a_demarcher"} onClick={()=>setFiltre("a_demarcher")}/>
      <TuileFiltre titre="À relancer" valeur={nbRetard} sous={nbRetard?"date dépassée ou aujourd'hui":"rien en retard"} couleur={nbRetard?"#D73A49":"#22863A"} actif={filtre==="relancer"} onClick={()=>setFiltre("relancer")}/>
      <TuileFiltre titre="Démarchés" valeur={nbDemarches} sous="en attente de réponse" couleur="#1B4F8A" actif={filtre==="demarche"} onClick={()=>setFiltre("demarche")}/>
      <TuileFiltre titre="Devenus clients" valeur={nbClients} sous="" couleur="#22863A" actif={filtre==="client"} onClick={()=>setFiltre("client")}/>
    </div>

    <div style={CARTE}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"3 1 220px",minWidth:0}}><label style={LBL}>🔍 Rechercher (entreprise, contact, secteur…)</label><input type="search" value={recherche} onChange={e=>setRecherche(e.target.value)} style={INP} autoComplete="off"/></div>
        <div style={{flex:"1 1 150px"}}><label style={LBL}>Afficher</label>
          <select value={filtre} onChange={e=>setFiltre(e.target.value)} style={INP}>
            <option value="a_demarcher">À démarcher</option><option value="demarche">Démarchés</option><option value="relancer">À relancer (en retard)</option>
            <option value="client">Devenus clients</option><option value="abandonne">Pas intéressés</option><option value="tous">Tout</option>
          </select></div>
        <div style={{flex:"1 1 140px"}}><label style={LBL}>Trier par</label>
          <select value={tri} onChange={e=>setTri(e.target.value)} style={INP}><option value="relance">Date de relance</option><option value="entreprise">Entreprise</option><option value="secteur">Secteur</option><option value="recent">Dernier ajouté</option></select></div>
        <button type="button" onClick={exporterCsv} style={{...BTN2,flex:"none"}} title="Télécharge la liste affichée (ouvrable dans Excel)">⬇ Exporter</button>
      </div>
      <div style={{marginTop:8,fontSize:13,color:"#374151"}}>{!charge?"Chargement…":filtrees.length===0?(recherche.trim()?"Aucun prospect ne correspond à « "+recherche.trim()+" ».":"Aucun prospect dans cette liste."):filtrees.length+" prospect"+(filtrees.length>1?"s":"")}</div>
    </div>

    {aSupprimer&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:8,padding:"10px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <span style={{flex:1,minWidth:200,fontSize:13,color:"#D73A49"}}>Supprimer « {aSupprimer.entreprise} » de la prospection ?</span>
      <button type="button" onClick={supprimer} style={{...BTN1,background:"#D73A49",padding:"6px 14px"}}>🗑 Supprimer</button>
      <button type="button" onClick={()=>setASupprimer(null)} style={{...BTN2,padding:"5px 12px"}}>Annuler</button>
    </div>}

    {largeur>=1000
      ?<div style={{...CARTE,padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr style={{background:"#F3F6FA",textAlign:"left",color:"#1B4F8A"}}>{["Entreprise","Contact","Secteur et potentiel","Relance","Statut",""].map((h,i)=><th key={i} style={{padding:"9px 10px",fontSize:11,textTransform:"uppercase",letterSpacing:".04em",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
        <tbody>{filtrees.map(p=><tr key={p.id} style={{background:fondRelance(p),borderTop:"1px solid #E2E6EA",verticalAlign:"top"}}>
          <td style={{padding:"9px 10px",minWidth:150}}><strong>{estClient(p.entreprise)?<LienAction onClick={()=>onOuvrirClient(p.entreprise)} title="Ouvrir la fiche client">{p.entreprise}</LienAction>:p.entreprise}</strong><Etiquette client={estClient(p.entreprise)}/>{p.commentaire&&<div style={{fontSize:12,color:"#6B7280",marginTop:2}}>{p.commentaire}</div>}</td>
          <td style={{padding:"9px 10px",minWidth:170}}>{p.contact?<div style={{fontWeight:600}}>{p.contact}</div>:<div style={{color:"#9CA3AF"}}>—</div>}<Contacter l={p}/></td>
          <td style={{padding:"9px 10px",minWidth:160}}>{p.secteur&&<div style={{fontWeight:600}}>{p.secteur}</div>}{p.potentiel&&<div style={{fontSize:12,color:"#6B7280"}}>{p.potentiel}</div>}{!p.secteur&&!p.potentiel&&<div style={{color:"#9CA3AF"}}>—</div>}</td>
          <td style={{padding:"9px 10px",minWidth:150}}>{p.statut==="demarche"?<><BadgeRelance l={p}/>{demarcheLe(p)}</>:<span style={{color:"#9CA3AF"}}>—</span>}<HistoriqueLigne l={p}/></td>
          <td style={{padding:"9px 10px"}}>{selecteurStatut(p)}</td>
          <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>{actions(p,true)}</td>
        </tr>)}</tbody></table></div>
      :filtrees.map(p=><div key={p.id} style={{...CARTE,background:fondRelance(p),borderColor:etatRelance(p)==="retard"?"#D73A49":etatRelance(p)==="aujourdhui"?"#E8720C":"#E2E6EA"}}>
        <div style={{fontSize:15,fontWeight:800,color:"#1B4F8A",overflowWrap:"anywhere"}}>{estClient(p.entreprise)?<LienAction onClick={()=>onOuvrirClient(p.entreprise)}>{p.entreprise}</LienAction>:p.entreprise}<Etiquette client={estClient(p.entreprise)}/></div>
        {(p.secteur||p.potentiel)&&<div style={{fontSize:13,color:"#6B7280",overflowWrap:"anywhere"}}>{[p.secteur,p.potentiel].filter(Boolean).join(" · ")}</div>}
        {p.contact&&<div style={{marginTop:6,fontSize:14,fontWeight:600,overflowWrap:"anywhere"}}>{p.contact}</div>}
        <div style={{marginTop:2}}><Contacter l={p}/></div>
        {p.statut==="demarche"&&<div style={{marginTop:6}}><BadgeRelance l={p}/>{demarcheLe(p)}</div>}
        {p.commentaire&&<div style={{fontSize:12,color:"#6B7280",marginTop:2}}>{p.commentaire}</div>}
        <HistoriqueLigne l={p}/>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:10}}>{selecteurStatut(p)}{actions(p)}</div>
      </div>)}

    {dialogue&&<DialogRelance ligne={dialogue.p} resume={dialogue.p.entreprise+(dialogue.p.contact?" — "+dialogue.p.contact:"")} titre={dialogue.type==="demarche"?"✓ Entreprise démarchée":"✓ Relance faite"} bouton={dialogue.type==="demarche"?"Enregistrer le démarchage":"Enregistrer la relance"} defaut={{nb:4,unite:"semaines"}} onValide={validerDialogue} onAnnuler={()=>setDialogue(null)}/>}
  </div>);
}

// ── petit lien d'action (un span : les gros boutons tactiles ne conviennent pas dans une ligne de tableau) ──
function LienAction({onClick,children,title,style}){
  return <span role="button" tabIndex={0} title={title} onClick={onClick} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onClick(e);}}} style={{color:"#1B4F8A",cursor:"pointer",textDecoration:"underline",textDecorationColor:"#B7C9E2",...style}}>{children}</span>;
}
function useFichesParDe(fiches){
  return useMemo(()=>{const m=new Map();(fiches||[]).forEach(f=>{const k=normaliserDE(f.de||"",f.client);if(k&&!m.has(k))m.set(k,f);});return m;},[fiches]);
}
const FenetreFond=({onFermer,children,largeur=440})=><div onClick={onFermer} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",zIndex:300,padding:12,overflowY:"auto"}}>
  <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,padding:"20px 18px",width:"100%",maxWidth:largeur,margin:"auto",boxSizing:"border-box"}}>{children}</div>
</div>;
const Puce=({actif,onClick,children})=><button type="button" onClick={onClick} style={{padding:"6px 12px",borderRadius:20,border:"1.5px solid "+(actif?"#1B4F8A":"#D1D5DB"),background:actif?"#EEF4FF":"#fff",color:actif?"#1B4F8A":"#374151",fontSize:13,fontWeight:actif?700:500,cursor:"pointer"}}>{children}</button>;
const Message=({texte})=>texte?<div style={{background:"#F0FFF4",border:"1px solid #22863A",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#22863A",marginBottom:12}}>{texte}</div>:null;
const Erreur=({texte,onFermer})=>texte?<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#D73A49",marginBottom:12}} onClick={onFermer}>{texte}</div>:null;

// ── refus d'un devis : on note pourquoi ───────────────────────────────────
function DialogRefus({ligne,statut,onValide,onAnnuler}){
  const [motif,setMotif]=useState(ligne.motif_refus||"");
  const [note,setNote]=useState("");
  const [occupe,setOccupe]=useState(false);
  async function valider(){if(!motif)return;setOccupe(true);await onValide({motif,note:note.trim()});setOccupe(false);}
  return(<FenetreFond onFermer={onAnnuler}>
    <div style={{fontSize:16,fontWeight:800,color:"#D73A49",marginBottom:2}}>{statut==="refuse"?"🚫 Devis refusé":"💤 Devis sans suite"}</div>
    <div style={{fontSize:13,color:"#6B7280",marginBottom:12,overflowWrap:"anywhere"}}>{ligne.de} — {ligne.client}</div>
    <label style={LBL}>Pourquoi ?</label>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{MOTIFS_REFUS.map(m=><Puce key={m.id} actif={motif===m.id} onClick={()=>setMotif(m.id)}>{m.label}</Puce>)}</div>
    <div style={{marginBottom:14}}><label style={LBL}>Précision (facultatif)</label><input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex : 15 % moins cher chez le concurrent" style={INP} autoComplete="off"/></div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <button type="button" onClick={valider} disabled={!motif||occupe} style={{...BTN1,opacity:!motif||occupe?0.5:1}}>{occupe?"⏳ …":"Enregistrer"}</button>
      <button type="button" onClick={onAnnuler} style={BTN2}>Annuler</button>
    </div>
    {!motif&&<div style={{marginTop:8,fontSize:12,color:"#6B7280"}}>Choisissez un motif pour enregistrer (il sert aux statistiques).</div>}
  </FenetreFond>);
}

// ── sous-onglet « Devis refusés » : les devis perdus sortent de la liste de relance ───────────
function DevisRefuses({suivi,fiches,champClient,par,onOuvrirClient,onOuvrirFiche}){
  const largeur=useLargeur();
  const {lignes,charge,setLignes}=suivi;
  const [recherche,setRecherche]=useState("");
  const [motif,setMotif]=useState("tous");
  const [formulaire,setFormulaire]=useState(null);
  const [aSupprimer,setASupprimer]=useState(null);
  const [message,setMessage]=useState(null);
  const [erreur,setErreur]=useState(null);
  const fichesParDe=useFichesParDe(fiches);
  const refus=useMemo(()=>lignes.filter(l=>["refuse","sans_suite"].includes(l.statut)),[lignes]);
  const parMotif=useMemo(()=>{const m={};refus.forEach(l=>{const k=l.motif_refus||"inconnu";m[k]=(m[k]||0)+1;});return m;},[refus]);
  const filtrees=useMemo(()=>{
    const mots=norm(recherche).split(" ").filter(Boolean);
    return refus.filter(x=>{
      if(motif!=="tous"&&(x.motif_refus||"inconnu")!==motif)return false;
      if(!mots.length)return true;
      const h=norm([x.de,x.client,x.contact,x.objet,x.commentaire,motifInfo(x.motif_refus).label].join(" "));
      return mots.every(m=>h.includes(m));
    }).sort((a,b)=>String(b.updated_at||b.created_at||"").localeCompare(String(a.updated_at||a.created_at||"")));
  },[refus,recherche,motif]);
  const perdu=refus.filter(x=>x.statut==="refuse").reduce((n,x)=>n+Number(x.montant||0),0);

  function flash(t){setMessage(t);setTimeout(()=>setMessage(null),5000);}
  async function patch(l,champs,libelleHisto){
    const hist=Array.isArray(l.historique)?l.historique:[];
    const corps={...champs,updated_at:new Date().toISOString()};
    if(libelleHisto)corps.historique=[...hist,{date:aujourdhui(),texte:libelleHisto}];
    const rep=await db.patch("suivi_devis","?id=eq."+l.id,corps);
    if(Array.isArray(rep)&&rep[0]){setLignes(ls=>ls.map(x=>x.id===l.id?rep[0]:x));return true;}
    setErreur("La modification n'a pas abouti (connexion ?).");return false;
  }
  async function remettre(l){
    const relance_le=ajouterDuree(aujourdhui(),4,"semaines");
    const ok=await patch(l,{statut:"envoye",motif_refus:null,relance_le,relance_nb:4,relance_unite:"semaines"},"Remis en suivi — prochaine relance le "+frDate(relance_le));
    if(ok)flash("✓ "+l.de+" est de nouveau dans « Relance devis » (relance le "+frDate(relance_le)+").");
  }
  async function supprimer(){
    const l=aSupprimer;if(!l)return;
    try{
      const r=await fetch(SUPA_URL+"/rest/v1/suivi_devis?id=eq."+l.id,{method:"DELETE",headers:H});
      if(!r.ok)throw new Error("refus");
      setLignes(ls=>ls.filter(x=>x.id!==l.id));setASupprimer(null);
    }catch(e){setErreur("La suppression n'a pas abouti (connexion ?).");}
  }
  function apresEnregistrement(row){
    setLignes(ls=>ls.map(x=>x.id===row.id?row:x));setFormulaire(null);
    flash(["refuse","sans_suite"].includes(row.statut)?"✓ Suivi modifié.":"✓ "+row.de+" est repassé dans « Relance devis ».");
  }
  const actions=(l,sansRetour)=><span style={{display:"inline-flex",gap:6,flexWrap:sansRetour?"nowrap":"wrap"}}>
    <button type="button" onClick={()=>remettre(l)} style={{...BTN2,padding:"4px 10px",fontSize:12}} title="Le devis repasse dans « Relance devis » avec une relance dans 4 semaines">↩ Remettre en suivi</button>
    <button type="button" onClick={()=>{setFormulaire(l);window.scrollTo&&window.scrollTo({top:0,behavior:"smooth"});}} style={{...BTN2,padding:"4px 10px",fontSize:12}} aria-label={"Modifier "+l.de}>✏</button>
    <button type="button" onClick={()=>setASupprimer(l)} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9CA3AF",fontSize:15,padding:"4px 6px"}} aria-label={"Supprimer "+l.de}>🗑</button>
  </span>;
  const badgeStatut=l=>{const s=statutInfo(l.statut);return <span style={{padding:"3px 9px",borderRadius:20,border:"1.5px solid "+s.couleur,fontSize:12,fontWeight:700,color:s.couleur,background:s.fond,whiteSpace:"nowrap"}}>{s.label}</span>;};
  const ficheDe=l=>fichesParDe.get(l.de);

  if(suivi.dispo===false)return(<div style={{maxWidth:760}}>
    <NoticeActivation titre="Activer le suivi clients" intro="La base de données doit être mise à jour (une seule fois, par le responsable). Le texte SQL peut être rejoué sans risque." sql={SQL_SUIVI_CLIENTS} onVerifier={suivi.recharger}/>
  </div>);

  return(<div>
    <div style={{marginBottom:12}}>
      <h2 style={{fontSize:17,fontWeight:800,margin:"0 0 2px"}}>Devis refusés ou sans suite</h2>
      <div style={{fontSize:13,color:"#6B7280"}}>Ils ne gênent plus la liste de relance ; le motif sert à comprendre pourquoi on perd des devis.</div>
    </div>
    <Message texte={message}/><Erreur texte={erreur} onFermer={()=>setErreur(null)}/>
    {formulaire&&<Formulaire key={formulaire.id} initial={formulaire} fiches={fiches} champClient={champClient} par={par} onEnregistre={apresEnregistrement} onAnnuler={()=>setFormulaire(null)}/>}

    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
      <div style={{...CARTE,flex:"1 1 130px",marginBottom:0}}><div style={{fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".04em"}}>Refusés / sans suite</div><div style={{fontSize:26,fontWeight:800,color:"#D73A49",lineHeight:1.15}}>{refus.length}</div></div>
      <div style={{...CARTE,flex:"1 1 130px",marginBottom:0}}><div style={{fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".04em"}}>Montant refusé</div><div style={{fontSize:26,fontWeight:800,color:"#374151",lineHeight:1.15}}>{perdu?euros(perdu):"—"}</div><div style={{fontSize:12,color:"#6B7280"}}>HT, devis « Refusé »</div></div>
    </div>

    <div style={CARTE}>
      <div style={LBL}>Motif</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        <Puce actif={motif==="tous"} onClick={()=>setMotif("tous")}>Tous ({refus.length})</Puce>
        {[...MOTIFS_REFUS,{id:"inconnu",label:"Motif non noté"}].filter(m=>parMotif[m.id]).map(m=><Puce key={m.id} actif={motif===m.id} onClick={()=>setMotif(m.id)}>{m.label} ({parMotif[m.id]})</Puce>)}
      </div>
      <label style={LBL}>🔍 Rechercher (DE, client, contact, motif…)</label>
      <input type="search" value={recherche} onChange={e=>setRecherche(e.target.value)} style={INP} autoComplete="off"/>
      <div style={{marginTop:8,fontSize:13,color:"#374151"}}>{!charge?"Chargement…":filtrees.length===0?(refus.length===0?"Aucun devis refusé pour le moment.":"Aucun devis ne correspond."):filtrees.length+" devis"}</div>
    </div>

    {aSupprimer&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:8,padding:"10px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <span style={{flex:1,minWidth:200,fontSize:13,color:"#D73A49"}}>Supprimer le suivi « {aSupprimer.de} — {aSupprimer.client} » ?</span>
      <button type="button" onClick={supprimer} style={{...BTN1,background:"#D73A49",padding:"6px 14px"}}>🗑 Supprimer</button>
      <button type="button" onClick={()=>setASupprimer(null)} style={{...BTN2,padding:"5px 12px"}}>Annuler</button>
    </div>}

    {largeur>=1000
      ?<div style={{...CARTE,padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr style={{background:"#F3F6FA",textAlign:"left",color:"#1B4F8A"}}>{["DE","Client","Contact","Devis","Montant","Motif","Statut",""].map((h,i)=><th key={i} style={{padding:"9px 10px",fontSize:11,textTransform:"uppercase",letterSpacing:".04em",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
        <tbody>{filtrees.map(l=><tr key={l.id} style={{borderTop:"1px solid #E2E6EA",verticalAlign:"top"}}>
          <td style={{padding:"9px 10px",fontWeight:700,whiteSpace:"nowrap"}}>{l.de}{ficheDe(l)&&<div style={{fontWeight:400,fontSize:12}}><LienAction onClick={()=>onOuvrirFiche(ficheDe(l))}>📂 fiche atelier</LienAction></div>}</td>
          <td style={{padding:"9px 10px",minWidth:140}}><LienAction onClick={()=>onOuvrirClient(l.client)}>{l.client}</LienAction>{l.objet&&<div style={{fontSize:12,color:"#6B7280"}}>{l.objet}</div>}</td>
          <td style={{padding:"9px 10px",minWidth:170}}><div style={{fontWeight:600}}>{l.contact}</div><Contacter l={l}/></td>
          <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>{frDate(l.date_devis)}</td>
          <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>{euros(l.montant)}</td>
          <td style={{padding:"9px 10px",minWidth:150}}><strong>{motifInfo(l.motif_refus).label}</strong>{l.commentaire&&<div style={{fontSize:12,color:"#6B7280",marginTop:2}}>{l.commentaire}</div>}<HistoriqueLigne l={l}/></td>
          <td style={{padding:"9px 10px"}}>{badgeStatut(l)}</td>
          <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>{actions(l,true)}</td>
        </tr>)}</tbody></table></div>
      :filtrees.map(l=><div key={l.id} style={CARTE}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"baseline",flexWrap:"wrap"}}>
          <div style={{fontSize:15,fontWeight:800,color:"#1B4F8A",overflowWrap:"anywhere"}}>{l.de} — <LienAction onClick={()=>onOuvrirClient(l.client)}>{l.client}</LienAction></div>
          <div style={{fontSize:13,fontWeight:700}}>{euros(l.montant)}</div>
        </div>
        {l.objet&&<div style={{fontSize:13,color:"#6B7280"}}>{l.objet}</div>}
        {ficheDe(l)&&<div style={{fontSize:12,marginTop:2}}><LienAction onClick={()=>onOuvrirFiche(ficheDe(l))}>📂 fiche atelier</LienAction></div>}
        <div style={{marginTop:6,fontSize:14,fontWeight:600,overflowWrap:"anywhere"}}>{l.contact}</div>
        <div style={{marginTop:2}}><Contacter l={l}/></div>
        <div style={{marginTop:6,fontSize:13}}><strong>{motifInfo(l.motif_refus).label}</strong> <span style={{fontSize:12,color:"#6B7280"}}>· devis du {frDate(l.date_devis)}</span></div>
        {l.commentaire&&<div style={{fontSize:12,color:"#6B7280",marginTop:2}}>{l.commentaire}</div>}
        <HistoriqueLigne l={l}/>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:10}}>{badgeStatut(l)}{actions(l)}</div>
      </div>)}
  </div>);
}

// ── sous-onglet « RDV » : rendez-vous chez les clients et prospects ─────────────────────────
function libelleJour(d){
  const j=joursEntre(aujourdhui(),d);
  if(j===0)return "Aujourd'hui";if(j===1)return "Demain";if(j===-1)return "Hier";
  const x=new Date(String(d).slice(0,10)+"T12:00:00");
  return isNaN(x.getTime())?"":x.toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"});
}
function FormulaireRdv({initial,suggestions,clients,par,onEnregistre,onAnnuler}){
  const edition=!!(initial&&initial.id);
  const [f,setF]=useState(()=>({
    entreprise:initial?.entreprise||"",contact:initial?.contact||"",telephone:initial?.telephone||"",mail:initial?.mail||"",
    date_rdv:initial?.date_rdv?String(initial.date_rdv).slice(0,10):aujourdhui(),heure:initial?.heure||"",
    lieu:initial?.lieu||"",objet:initial?.objet||"",statut:initial?.statut||"prevu",compte_rendu:initial?.compte_rendu||"",
  }));
  const [occupe,setOccupe]=useState(false);const [erreur,setErreur]=useState(null);
  const maj=(id,val)=>setF(x=>({...x,[id]:val}));
  async function enregistrer(){
    if(occupe)return;
    if(!f.entreprise.trim()||!f.date_rdv){setErreur("Indiquez l'entreprise et la date du rendez-vous.");return;}
    setOccupe(true);setErreur(null);
    const corps={entreprise:f.entreprise.trim(),contact:f.contact.trim(),telephone:f.telephone.trim()||null,mail:f.mail.trim()||null,date_rdv:f.date_rdv,heure:f.heure||null,lieu:f.lieu.trim()||null,objet:f.objet.trim()||null,statut:f.statut,compte_rendu:f.statut==="fait"?(f.compte_rendu.trim()||null):null,updated_at:new Date().toISOString()};
    let rep;
    if(edition)rep=await db.patch("suivi_rdv","?id=eq."+initial.id,corps);
    else rep=await db.post("suivi_rdv",[{...corps,par:par||null}]);
    if(Array.isArray(rep)&&rep[0])onEnregistre(rep[0],edition);
    else setErreur("L'enregistrement n'a pas abouti (connexion ?). Rien n'a été noté.");
    setOccupe(false);
  }
  return(<div style={{...CARTE,border:"2px solid #1B4F8A"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
      <div style={{fontSize:16,fontWeight:800,color:"#1B4F8A"}}>{edition?"✏ Modifier le rendez-vous":"➕ Nouveau rendez-vous"}</div>
      <button type="button" onClick={onAnnuler} style={{...BTN2,padding:"5px 12px"}}>Annuler</button>
    </div>
    <div style={{marginBottom:12}}><label style={LBL}>Entreprise (client ou prospect) *</label><ChampEntreprise valeur={f.entreprise} onChange={v=>maj("entreprise",v)} clients={clients} suggestions={suggestions}/></div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
      <div style={{flex:"1 1 160px"}}><label style={LBL}>Date *</label><input type="date" value={f.date_rdv} onChange={e=>maj("date_rdv",e.target.value)} style={INP}/></div>
      <div style={{flex:"1 1 120px"}}><label style={LBL}>Heure</label><input type="time" value={f.heure} onChange={e=>maj("heure",e.target.value)} style={INP}/></div>
      <div style={{flex:"2 1 240px"}}><label style={LBL}>Lieu</label><input type="text" value={f.lieu} onChange={e=>maj("lieu",e.target.value)} placeholder="Adresse ou site" style={INP} autoComplete="off"/></div>
    </div>
    <div style={{marginBottom:12}}><label style={LBL}>Objet du rendez-vous</label><input type="text" value={f.objet} onChange={e=>maj("objet",e.target.value)} placeholder="Ex : visite de site, présentation, remise de devis" style={INP}/></div>
    <div style={{marginBottom:12}}>
      <label style={LBL}>Contact <span style={{textTransform:"none",fontWeight:400}}>(carnet de contacts ; un nouveau contact peut être ajouté avec son numéro et son mail)</span></label>
      <ChampContact valeur={f.contact} onChange={maj} champ={{id:"contact",remplit:{telephone:"telephone",mail:"mail"}}} v={f}/>
    </div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
      <div style={{flex:"1 1 160px"}}><label style={LBL}>Téléphone</label><input type="tel" value={f.telephone} onChange={e=>maj("telephone",e.target.value)} style={INP} autoComplete="off"/></div>
      <div style={{flex:"1 1 200px"}}><label style={LBL}>Mail</label><input type="email" value={f.mail} onChange={e=>maj("mail",e.target.value)} style={INP} autoComplete="off"/></div>
    </div>
    {edition&&<div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
      <div style={{flex:"1 1 180px"}}><label style={LBL}>Statut</label><select value={f.statut} onChange={e=>maj("statut",e.target.value)} style={INP}>{STATUTS_RDV.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
      {f.statut==="fait"&&<div style={{flex:"2 1 260px"}}><label style={LBL}>Compte rendu</label><input type="text" value={f.compte_rendu} onChange={e=>maj("compte_rendu",e.target.value)} style={INP}/></div>}
    </div>}
    {erreur&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:6,padding:"8px 10px",fontSize:13,color:"#D73A49",marginBottom:10}}>{erreur}</div>}
    <button type="button" onClick={enregistrer} disabled={occupe} style={{...BTN1,opacity:occupe?0.6:1}}>{occupe?"⏳ Enregistrement…":"✓ Enregistrer"}</button>
  </div>);
}
function DialogRdvFait({rdv,onValide,onAnnuler}){
  const [cr,setCr]=useState(rdv.compte_rendu||"");
  const [occupe,setOccupe]=useState(false);
  async function valider(){setOccupe(true);await onValide(cr.trim());setOccupe(false);}
  return(<FenetreFond onFermer={onAnnuler} largeur={420}>
    <div style={{fontSize:16,fontWeight:800,color:"#22863A",marginBottom:2}}>✓ Rendez-vous fait</div>
    <div style={{fontSize:13,color:"#6B7280",marginBottom:12,overflowWrap:"anywhere"}}>{rdv.entreprise} — {libelleJour(rdv.date_rdv)}{rdv.heure?" à "+rdv.heure:""}</div>
    <div style={{marginBottom:14}}><label style={LBL}>Compte rendu (facultatif)</label><input type="text" value={cr} onChange={e=>setCr(e.target.value)} placeholder="Ex : intéressé par un contrat annuel, devis à envoyer" style={INP} autoComplete="off"/></div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <button type="button" onClick={valider} disabled={occupe} style={{...BTN1,opacity:occupe?0.6:1}}>{occupe?"⏳ …":"Enregistrer"}</button>
      <button type="button" onClick={onAnnuler} style={BTN2}>Annuler</button>
    </div>
  </FenetreFond>);
}
function Rdv({suivi,clients,par,onOuvrirClient}){
  const largeur=useLargeur();
  const {rdv,dispoRdv,charge,setRdv}=suivi;
  const [formulaire,setFormulaire]=useState(null);
  const [recherche,setRecherche]=useState("");
  const [filtre,setFiltre]=useState(()=>suivi.rdv.some(r=>etatRdv(r)==="passe")?"cloturer":"avenir");
  const [fait,setFait]=useState(null);
  const [aSupprimer,setASupprimer]=useState(null);
  const [message,setMessage]=useState(null);
  const [erreur,setErreur]=useState(null);
  const clientsNorm=useMemo(()=>new Set((clients||[]).map(norm)),[clients]);
  const estClient=nom=>clientsNorm.has(norm(nom));
  const suggestions=useMemo(()=>[...new Set([...(clients||[]),...suivi.prospects.map(p=>p.entreprise)])],[clients,suivi.prospects]);
  const auj=aujourdhui();
  const cleTri=r=>String(r.date_rdv||"")+" "+String(r.heure||"99:99");

  const filtrees=useMemo(()=>{
    const mots=norm(recherche).split(" ").filter(Boolean);
    const l=rdv.filter(x=>{
      const d=String(x.date_rdv||"").slice(0,10);
      if(filtre==="avenir"&&!(x.statut==="prevu"&&d>=auj))return false;
      if(filtre==="cloturer"&&!(x.statut==="prevu"&&d<auj))return false;
      if(filtre==="fait"&&x.statut!=="fait")return false;
      if(filtre==="annule"&&x.statut!=="annule")return false;
      if(!mots.length)return true;
      const h=norm([x.entreprise,x.contact,x.telephone,x.mail,x.lieu,x.objet,x.compte_rendu].join(" "));
      return mots.every(m=>h.includes(m));
    });
    const asc=filtre==="avenir"||filtre==="cloturer";
    return [...l].sort((a,b)=>asc?cleTri(a).localeCompare(cleTri(b)):cleTri(b).localeCompare(cleTri(a)));
  },[rdv,recherche,filtre,auj]);

  const prevus=rdv.filter(x=>x.statut==="prevu");
  const nbAvenir=prevus.filter(x=>String(x.date_rdv).slice(0,10)>=auj).length;
  const nbAujourdhui=prevus.filter(x=>String(x.date_rdv).slice(0,10)===auj).length;
  const nbCloturer=prevus.filter(x=>String(x.date_rdv).slice(0,10)<auj).length;
  const nbFaits=rdv.filter(x=>x.statut==="fait").length,nbAnnules=rdv.filter(x=>x.statut==="annule").length;

  function flash(t){setMessage(t);setTimeout(()=>setMessage(null),5000);}
  function apresEnregistrement(row,edition){
    setRdv(ls=>edition?ls.map(x=>x.id===row.id?row:x):[row,...ls]);
    setFormulaire(null);flash(edition?"✓ Rendez-vous modifié.":"✓ Rendez-vous noté : "+row.entreprise+", "+libelleJour(row.date_rdv).toLowerCase()+(row.heure?" à "+row.heure:"")+".");
    if(!edition)setFiltre(row.statut==="prevu"&&String(row.date_rdv).slice(0,10)<auj?"cloturer":"avenir");
  }
  async function patch(r,champs){
    const rep=await db.patch("suivi_rdv","?id=eq."+r.id,{...champs,updated_at:new Date().toISOString()});
    if(Array.isArray(rep)&&rep[0]){setRdv(ls=>ls.map(x=>x.id===r.id?rep[0]:x));return true;}
    setErreur("La modification n'a pas abouti (connexion ?).");return false;
  }
  async function validerFait(cr){
    const r=fait;
    const ok=await patch(r,{statut:"fait",compte_rendu:cr||null});
    if(ok){setFait(null);flash("✓ Rendez-vous noté comme fait.");}
  }
  async function changerStatut(r,statut){
    if(statut===r.statut)return;
    if(statut==="fait"){setFait(r);return;}
    await patch(r,{statut,compte_rendu:null});
  }
  async function supprimer(){
    const r=aSupprimer;if(!r)return;
    try{
      const rep=await fetch(SUPA_URL+"/rest/v1/suivi_rdv?id=eq."+r.id,{method:"DELETE",headers:H});
      if(!rep.ok)throw new Error("refus");
      setRdv(ls=>ls.filter(x=>x.id!==r.id));setASupprimer(null);
    }catch(e){setErreur("La suppression n'a pas abouti (connexion ?).");}
  }

  if(dispoRdv===false)return(<div style={{maxWidth:760}}>
    <NoticeActivation titre="Activer les rendez-vous" intro="La base de données doit recevoir une petite table pour ranger les rendez-vous (le texte ci-dessous recrée sans risque les autres tables du suivi clients). C'est à faire une seule fois, par le responsable (compte Supabase)." sql={SQL_SUIVI_CLIENTS} onVerifier={suivi.recharger}/>
  </div>);

  const couleurJour=r=>COUL_RDV[etatRdv(r)]||"#6B7280";
  const fondRdv=r=>{const e=etatRdv(r);return e==="passe"?"#FFF5F5":e==="aujourdhui"?"#FFF8E1":"#fff";};
  const selecteurStatut=r=>{const s=statutRdv(r.statut);return <select value={r.statut} onChange={e=>changerStatut(r,e.target.value)} style={{padding:"4px 8px",borderRadius:20,border:"1.5px solid "+s.couleur,fontSize:12,fontWeight:700,color:s.couleur,background:s.fond,cursor:"pointer",maxWidth:"100%"}} aria-label={"Statut du rendez-vous "+r.entreprise}>{STATUTS_RDV.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select>;};
  const actions=(r,sansRetour)=><span style={{display:"inline-flex",gap:6,flexWrap:sansRetour?"nowrap":"wrap"}}>
    {r.statut==="prevu"&&<button type="button" onClick={()=>setFait(r)} style={{...BTN2,padding:"4px 10px",fontSize:12}}>✓ Fait</button>}
    <button type="button" onClick={()=>{setFormulaire(r);window.scrollTo&&window.scrollTo({top:0,behavior:"smooth"});}} style={{...BTN2,padding:"4px 10px",fontSize:12}} aria-label={"Modifier le rendez-vous "+r.entreprise}>✏</button>
    <button type="button" onClick={()=>setASupprimer(r)} style={{background:"transparent",border:"none",cursor:"pointer",color:"#9CA3AF",fontSize:15,padding:"4px 6px"}} aria-label={"Supprimer le rendez-vous "+r.entreprise}>🗑</button>
  </span>;
  const quand=r=><div><div style={{fontWeight:700,color:couleurJour(r)}}>{libelleJour(r.date_rdv)}{r.heure?" · "+r.heure:""}</div><div style={{fontSize:12,color:"#6B7280"}}>{frDate(r.date_rdv)}{etatRdv(r)==="passe"?" · à clôturer":""}</div></div>;
  const lieuObjet=r=><div>
    {r.lieu&&<a href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(r.lieu)} target="_blank" rel="noopener noreferrer" style={LIEN}>📍 {r.lieu}</a>}
    {r.objet&&<div style={{fontSize:12,color:"#6B7280"}}>{r.objet}</div>}
    {r.compte_rendu&&<div style={{fontSize:12,color:"#22863A",marginTop:2}}>Compte rendu : {r.compte_rendu}</div>}
    {!r.lieu&&!r.objet&&!r.compte_rendu&&<span style={{color:"#9CA3AF"}}>—</span>}
  </div>;
  const nomEntreprise=r=>estClient(r.entreprise)?<LienAction onClick={()=>onOuvrirClient(r.entreprise)}>{r.entreprise}</LienAction>:r.entreprise;
  const contactTel=r=><span style={{display:"inline-flex",gap:10,flexWrap:"wrap"}}>{r.telephone&&<a href={"tel:"+String(r.telephone).replace(/\s+/g,"")} style={LIEN}>📞 {r.telephone}</a>}{r.mail&&<a href={"mailto:"+r.mail} style={LIEN}>✉ {r.mail}</a>}</span>;

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}>
      <div style={{minWidth:0}}>
        <h2 style={{fontSize:17,fontWeight:800,margin:"0 0 2px"}}>Rendez-vous</h2>
        <div style={{fontSize:13,color:"#6B7280"}}>Visites et rendez-vous chez les clients et prospects.</div>
      </div>
      {!formulaire&&<button type="button" onClick={()=>setFormulaire({})} style={BTN1}>➕ Nouveau RDV</button>}
    </div>
    <Message texte={message}/><Erreur texte={erreur} onFermer={()=>setErreur(null)}/>
    {formulaire&&<FormulaireRdv key={formulaire.id||"nouveau"} initial={formulaire.id?formulaire:null} suggestions={suggestions} clients={clients} par={par} onEnregistre={apresEnregistrement} onAnnuler={()=>setFormulaire(null)}/>}

    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
      <TuileFiltre titre="À venir" valeur={nbAvenir} sous={nbAujourdhui?nbAujourdhui+" aujourd'hui":"rien aujourd'hui"} couleur={nbAujourdhui?"#E8720C":"#1B4F8A"} actif={filtre==="avenir"} onClick={()=>setFiltre("avenir")}/>
      <TuileFiltre titre="À clôturer" valeur={nbCloturer} sous={nbCloturer?"passés, sans compte rendu":"rien en attente"} couleur={nbCloturer?"#D73A49":"#22863A"} actif={filtre==="cloturer"} onClick={()=>setFiltre("cloturer")}/>
      <TuileFiltre titre="Faits" valeur={nbFaits} sous="" couleur="#22863A" actif={filtre==="fait"} onClick={()=>setFiltre("fait")}/>
      <TuileFiltre titre="Annulés" valeur={nbAnnules} sous="" couleur="#6B7280" actif={filtre==="annule"} onClick={()=>setFiltre("annule")}/>
    </div>

    <div style={CARTE}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"3 1 220px",minWidth:0}}><label style={LBL}>🔍 Rechercher (entreprise, contact, lieu, objet…)</label><input type="search" value={recherche} onChange={e=>setRecherche(e.target.value)} style={INP} autoComplete="off"/></div>
        <div style={{flex:"1 1 150px"}}><label style={LBL}>Afficher</label>
          <select value={filtre} onChange={e=>setFiltre(e.target.value)} style={INP}>
            <option value="avenir">À venir</option><option value="cloturer">À clôturer</option><option value="fait">Faits</option><option value="annule">Annulés</option><option value="tous">Tout</option>
          </select></div>
      </div>
      <div style={{marginTop:8,fontSize:13,color:"#374151"}}>{!charge?"Chargement…":filtrees.length===0?(recherche.trim()?"Aucun rendez-vous ne correspond à « "+recherche.trim()+" ».":"Aucun rendez-vous dans cette liste."):filtrees.length+" rendez-vous"}</div>
    </div>

    {aSupprimer&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:8,padding:"10px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <span style={{flex:1,minWidth:200,fontSize:13,color:"#D73A49"}}>Supprimer le rendez-vous « {aSupprimer.entreprise} » du {frDate(aSupprimer.date_rdv)} ?</span>
      <button type="button" onClick={supprimer} style={{...BTN1,background:"#D73A49",padding:"6px 14px"}}>🗑 Supprimer</button>
      <button type="button" onClick={()=>setASupprimer(null)} style={{...BTN2,padding:"5px 12px"}}>Annuler</button>
    </div>}

    {largeur>=1000
      ?<div style={{...CARTE,padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr style={{background:"#F3F6FA",textAlign:"left",color:"#1B4F8A"}}>{["Quand","Entreprise","Contact","Lieu et objet","Statut",""].map((h,i)=><th key={i} style={{padding:"9px 10px",fontSize:11,textTransform:"uppercase",letterSpacing:".04em",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
        <tbody>{filtrees.map(r=><tr key={r.id} style={{background:fondRdv(r),borderTop:"1px solid #E2E6EA",verticalAlign:"top"}}>
          <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>{quand(r)}</td>
          <td style={{padding:"9px 10px",minWidth:150,fontWeight:700}}>{nomEntreprise(r)}</td>
          <td style={{padding:"9px 10px",minWidth:170}}>{r.contact?<div style={{fontWeight:600}}>{r.contact}</div>:<div style={{color:"#9CA3AF"}}>—</div>}{contactTel(r)}</td>
          <td style={{padding:"9px 10px",minWidth:180}}>{lieuObjet(r)}</td>
          <td style={{padding:"9px 10px"}}>{selecteurStatut(r)}</td>
          <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>{actions(r,true)}</td>
        </tr>)}</tbody></table></div>
      :filtrees.map(r=><div key={r.id} style={{...CARTE,background:fondRdv(r),borderColor:etatRdv(r)==="passe"?"#D73A49":etatRdv(r)==="aujourdhui"?"#E8720C":"#E2E6EA"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"baseline",flexWrap:"wrap"}}>
          <div style={{fontSize:15,fontWeight:800,color:couleurJour(r)}}>{libelleJour(r.date_rdv)}{r.heure?" · "+r.heure:""}</div>
          <div style={{fontSize:12,color:"#6B7280"}}>{frDate(r.date_rdv)}{etatRdv(r)==="passe"?" · à clôturer":""}</div>
        </div>
        <div style={{fontSize:15,fontWeight:800,color:"#1B4F8A",overflowWrap:"anywhere"}}>{nomEntreprise(r)}</div>
        {r.contact&&<div style={{marginTop:4,fontSize:14,fontWeight:600,overflowWrap:"anywhere"}}>{r.contact}</div>}
        <div style={{marginTop:2}}>{contactTel(r)}</div>
        <div style={{marginTop:6}}>{lieuObjet(r)}</div>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:10}}>{selecteurStatut(r)}{actions(r)}</div>
      </div>)}

    {fait&&<DialogRdvFait rdv={fait} onValide={validerFait} onAnnuler={()=>setFait(null)}/>}
  </div>);
}

// ── page « Suivi clients » : quatre sous-onglets ──────────────────────────────────────────
let ongletDemande=null; // sous-onglet à ouvrir à la prochaine arrivée sur la page (demandé par le tableau de bord)
export function ouvrirSuivi(onglet,onNaviguer){ongletDemande=onglet;onNaviguer("devis");}

export function PageSuiviClients({suivi,fiches,champClient,clients,par,onOuvrirFiche,onOuvrirClient}){
  const [onglet,setOnglet]=useState(()=>{
    if(ongletDemande)return ongletDemande;
    if(suivi.aRelancer.length>0)return "devis";
    if(suivi.rdvAlertes.length>0)return "rdv";
    if(suivi.prospectsARelancer.length>0)return "prospection";
    return "devis";
  });
  useEffect(()=>{ongletDemande=null;},[]); // demande consommée une fois la page affichée (le calcul de l'état initial est rejoué deux fois en développement)
  const pastille=(id,label,n)=><button type="button" onClick={()=>setOnglet(id)} style={{padding:"9px 16px",minHeight:44,borderRadius:22,border:"1.5px solid "+(onglet===id?"#1B4F8A":"#D1D5DB"),background:onglet===id?"#1B4F8A":"#fff",color:onglet===id?"#fff":"#374151",fontSize:14,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:8}}>{label}{n>0&&<span style={{background:"#D73A49",color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:11}}>{n}</span>}</button>;
  const ouvrirClient=onOuvrirClient||(()=>{});
  const ouvrirFiche=fi=>{ongletDemande=onglet;if(onOuvrirFiche)onOuvrirFiche(fi);}; // au retour de la fiche, on retombe sur le même sous-onglet
  return(<div style={{maxWidth:"var(--lp,1100px)",margin:"0 auto",padding:"20px 16px"}}>
    <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 10px"}}>📞 Suivi clients</h1>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
      {pastille("devis","📄 Relance devis",suivi.aRelancer.length)}
      {pastille("prospection","🎯 Prospection",suivi.prospectsARelancer.length)}
      {pastille("rdv","📅 RDV",suivi.rdvAlertes.length)}
      {pastille("refuses","🚫 Devis refusés",0)}
    </div>
    {onglet==="devis"&&<RelanceDevis suivi={suivi} fiches={fiches} champClient={champClient} par={par} onVoirRefuses={()=>setOnglet("refuses")} onOuvrirFiche={ouvrirFiche} onOuvrirClient={ouvrirClient}/>}
    {onglet==="prospection"&&<Prospection suivi={suivi} clients={clients} par={par} onOuvrirClient={ouvrirClient}/>}
    {onglet==="rdv"&&<Rdv suivi={suivi} clients={clients} par={par} onOuvrirClient={ouvrirClient}/>}
    {onglet==="refuses"&&<DevisRefuses suivi={suivi} fiches={fiches} champClient={champClient} par={par} onOuvrirFiche={ouvrirFiche} onOuvrirClient={ouvrirClient}/>}
  </div>);
}

// ── tableau de bord du Commercial ────────────────────────────────────────
export function DashboardCommercial({suivi,items,onNaviguer}){
  const aRelancer=suivi.aRelancer,prosRelancer=suivi.prospectsARelancer,totalRel=aRelancer.length+prosRelancer.length;
  const bientot=[...suivi.lignes,...suivi.prospects].filter(l=>etatRelance(l)==="bientot");
  const nbDemarcher=suivi.prospects.filter(p=>p.statut==="a_demarcher").length;
  const rdvProches=suivi.rdv.filter(r=>["passe","aujourdhui","demain"].includes(etatRdv(r))).sort((a,b)=>String(a.date_rdv).slice(0,10).localeCompare(String(b.date_rdv).slice(0,10))||String(a.heure||"99").localeCompare(String(b.heure||"99")));
  const ligneBloc={display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",background:"#fff",border:"1px solid #F5C2C7",borderRadius:8,padding:"8px 10px",marginBottom:6};
  return(<div style={{maxWidth:"var(--lp,900px)",margin:"0 auto",padding:"20px 16px"}}>
    <h2 style={{fontSize:20,fontWeight:700,margin:"0 0 16px"}}>🏠 Tableau de bord</h2>

    {(suivi.dispo===true||suivi.dispoProspects===true)&&(totalRel>0
      ?<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:12,padding:"12px 14px",marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:800,color:"#D73A49",marginBottom:8}}>📞 Relances à faire ({totalRel})</div>
        {aRelancer.slice(0,8).map(l=><div key={l.id} style={ligneBloc}>
          <div style={{minWidth:0,fontSize:13,overflowWrap:"anywhere"}}><strong>{l.de}</strong> — {l.client}<div style={{fontSize:12,color:"#6B7280"}}>Devis · {l.contact} · <span style={{color:COUL_RELANCE[etatRelance(l)],fontWeight:700}}>{texteRelance(l)}</span></div></div>
          <Contacter l={l}/>
        </div>)}
        {aRelancer.length>8&&<div style={{fontSize:12,color:"#6B7280",marginBottom:6}}>… et {aRelancer.length-8} autre{aRelancer.length-8>1?"s":""} devis</div>}
        {prosRelancer.slice(0,8).map(p=><div key={p.id} style={ligneBloc}>
          <div style={{minWidth:0,fontSize:13,overflowWrap:"anywhere"}}><strong>{p.entreprise}</strong><div style={{fontSize:12,color:"#6B7280"}}>Prospection · {p.contact||"pas de contact noté"} · <span style={{color:COUL_RELANCE[etatRelance(p)],fontWeight:700}}>{texteRelance(p)}</span></div></div>
          <Contacter l={p}/>
        </div>)}
        {prosRelancer.length>8&&<div style={{fontSize:12,color:"#6B7280",marginBottom:6}}>… et {prosRelancer.length-8} autre{prosRelancer.length-8>1?"s":""} prospect{prosRelancer.length-8>1?"s":""}</div>}
        <button type="button" onClick={()=>onNaviguer("devis")} style={{...BTN1,fontSize:13,padding:"7px 14px"}}>Ouvrir le suivi clients →</button>
      </div>
      :<div style={{background:"#F0FFF4",border:"1px solid #22863A",borderRadius:12,padding:"12px 14px",marginBottom:16,color:"#22863A",fontWeight:600,fontSize:14}}>✅ Aucune relance en retard{bientot.length?" — "+bientot.length+" prévue"+(bientot.length>1?"s":"")+" dans les 7 jours":""}</div>)}

    {suivi.dispoRdv===true&&rdvProches.length>0&&<div style={{background:"#EEF4FF",border:"1px solid #1B4F8A",borderRadius:12,padding:"12px 14px",marginBottom:16}}>
      <div style={{fontSize:14,fontWeight:800,color:"#1B4F8A",marginBottom:8}}>📅 Rendez-vous ({rdvProches.length})</div>
      {rdvProches.slice(0,8).map(r=><div key={r.id} style={{...ligneBloc,border:"1px solid #C9D9F0"}}>
        <div style={{minWidth:0,fontSize:13,overflowWrap:"anywhere"}}>
          <span style={{fontWeight:700,color:COUL_RDV[etatRdv(r)]}}>{etatRdv(r)==="passe"?"À clôturer · "+frDate(r.date_rdv):libelleJour(r.date_rdv)}{r.heure&&etatRdv(r)!=="passe"?" · "+r.heure:""}</span> — <strong>{r.entreprise}</strong>
          <div style={{fontSize:12,color:"#6B7280"}}>{[r.contact,r.lieu,r.objet].filter(Boolean).join(" · ")||"—"}</div>
        </div>
        {r.telephone&&<a href={"tel:"+String(r.telephone).replace(/\s+/g,"")} style={LIEN}>📞 {r.telephone}</a>}
      </div>)}
      <button type="button" onClick={()=>ouvrirSuivi("rdv",onNaviguer)} style={{...BTN1,fontSize:13,padding:"7px 14px"}}>Ouvrir les rendez-vous →</button>
    </div>}

    {suivi.dispoProspects===true&&nbDemarcher>0&&<button type="button" onClick={()=>ouvrirSuivi("prospection",onNaviguer)} style={{...BTN2,marginBottom:16,display:"block"}}>🎯 {nbDemarcher} prospect{nbDemarcher>1?"s":""} à démarcher →</button>}
    {(suivi.dispo===false||suivi.dispoProspects===false||suivi.dispoRdv===false)&&<button type="button" onClick={()=>onNaviguer("devis")} style={{...BTN2,marginBottom:16,borderStyle:"dashed",color:"#8A4B00",borderColor:"#E8720C"}}>⚙ Suivi clients à activer ou à mettre à jour (une seule fois)</button>}

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:14}}>
      {items.filter(n=>n.id!=="dashboard").map(n=>{
        const sep=n.label.indexOf(" ");const icone=n.label.slice(0,sep);const texte=n.label.slice(sep+1);
        return(<button key={n.id} type="button" onClick={()=>onNaviguer(n.id)} style={{position:"relative",background:"#fff",border:"1px solid #E2E6EA",borderRadius:14,padding:"22px 12px",minHeight:110,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer",boxShadow:"0 2px 6px rgba(0,0,0,0.06)"}}>
          <span style={{fontSize:36,lineHeight:1}}>{icone}</span>
          <span style={{fontSize:16,fontWeight:700,color:"#1A1A2E"}}>{texte}</span>
          {n.id==="devis"&&suivi.nbAlertes>0&&<span style={{position:"absolute",top:8,right:10,background:"#D73A49",color:"#fff",borderRadius:12,padding:"2px 8px",fontSize:12,fontWeight:700}}>{suivi.nbAlertes}</span>}
        </button>);
      })}
    </div>
  </div>);
}
