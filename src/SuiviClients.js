import React, {useState, useEffect, useMemo, useCallback} from "react";
import {db, SUPA_URL, H} from "./supabase";
import {NoticeActivation} from "./Activation";
import {ChampContact} from "./Contacts";
import {normaliserDE} from "./Chantier";

// Suivi des devis clients (profil Commercial) : un tableau où chaque ligne = un devis envoyé (N° de DE, client, contact,
// téléphone, mail, montant…) avec une date de relance (ou un délai : « dans 8 semaines »). Quand la date est dépassée,
// la ligne passe en rouge, l'onglet affiche un badge et le tableau de bord du Commercial liste les relances à faire.
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
  historique jsonb not null default '[]'::jsonb,
  commentaire text,
  par text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table suivi_devis enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'suivi_devis' and policyname = 'allow anon all') then
    create policy "allow anon all" on suivi_devis for all using (true) with check (true);
  end if;
end $$;
create index if not exists suivi_devis_statut_relance on suivi_devis (statut, relance_le);

notify pgrst, 'reload schema';`;

export const STATUTS_DEVIS=[
  {id:"a_envoyer",label:"À envoyer",couleur:"#6B7280",fond:"#F3F4F6"},
  {id:"envoye",label:"Envoyé — en attente",couleur:"#1B4F8A",fond:"#EEF4FF"},
  {id:"accepte",label:"Accepté",couleur:"#22863A",fond:"#F0FFF4"},
  {id:"refuse",label:"Refusé",couleur:"#D73A49",fond:"#FFF5F5"},
  {id:"sans_suite",label:"Sans suite",couleur:"#9B59B6",fond:"#F5EEF8"},
];
const statutInfo=id=>STATUTS_DEVIS.find(s=>s.id===id)||STATUTS_DEVIS[1];
const UNITES=[{id:"jours",label:"jours"},{id:"semaines",label:"semaines"},{id:"mois",label:"mois"}];

const norm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const isoDe=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const aujourdhui=()=>isoDe(new Date());
const frDate=d=>{try{const x=new Date(String(d).slice(0,10)+"T12:00:00");return isNaN(x.getTime())?"":x.toLocaleDateString("fr-FR");}catch(e){return "";}};
const euros=n=>(n===null||n===undefined||n==="")?"":Number(n).toLocaleString("fr-FR",{maximumFractionDigits:2})+" €";
export function ajouterDuree(dateStr,n,unite){
  const d=new Date(String(dateStr||aujourdhui()).slice(0,10)+"T12:00:00");
  if(isNaN(d.getTime()))return null;
  if(unite==="jours")d.setDate(d.getDate()+n);
  else if(unite==="semaines")d.setDate(d.getDate()+7*n);
  else d.setMonth(d.getMonth()+n);
  return isoDe(d);
}
const joursEntre=(a,b)=>Math.round((new Date(String(b).slice(0,10)+"T12:00:00")-new Date(String(a).slice(0,10)+"T12:00:00"))/86400000);
// état de la relance d'une ligne : null (rien à suivre), "sans" (pas de date), "retard", "aujourdhui", "bientot" (≤ 7 jours), "ok"
export function etatRelance(l){
  if(!l||l.statut!=="envoye")return null;
  if(!l.relance_le)return "sans";
  const j=joursEntre(aujourdhui(),l.relance_le);
  return j<0?"retard":j===0?"aujourdhui":j<=7?"bientot":"ok";
}
const texteRelance=l=>{
  const e=etatRelance(l);if(!l.relance_le||e===null)return "";
  const j=joursEntre(aujourdhui(),l.relance_le);
  return frDate(l.relance_le)+(e==="retard"?" · en retard de "+(-j)+" j":e==="aujourdhui"?" · aujourd'hui":" · dans "+j+" j");
};
const COUL_RELANCE={retard:"#D73A49",aujourdhui:"#E8720C",bientot:"#CA8A04",ok:"#22863A",sans:"#9CA3AF"};

// ── données partagées (onglet, badge, tableau de bord) ────────────────
async function lire(){
  const out=[];
  for(let debut=0;debut<20000;debut+=1000){
    const r=await fetch(SUPA_URL+"/rest/v1/suivi_devis?select=*&order=relance_le.asc.nullslast,created_at.desc&limit=1000&offset="+debut,{headers:H});
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
export function useSuiviDevis(actif){
  const [etat,setEtat]=useState({lignes:[],dispo:null,charge:false});
  const recharger=useCallback(async()=>{
    try{const r=await lire();setEtat({...r,charge:true});return r.dispo;}
    catch(e){setEtat(x=>({...x,charge:true,erreur:true}));return null;}
  },[]);
  useEffect(()=>{if(actif)recharger();},[actif,recharger]);
  const aRelancer=useMemo(()=>etat.lignes.filter(l=>{const e=etatRelance(l);return e==="retard"||e==="aujourdhui";}),[etat.lignes]);
  const setLignes=useCallback(fn=>setEtat(x=>({...x,lignes:fn(x.lignes)})),[]);
  return {...etat,recharger,setLignes,aRelancer};
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
    statut:initial?.statut||"envoye",commentaire:initial?.commentaire||"",
  }));
  const [rel,setRel]=useState(()=>initial&&initial.relance_nb&&initial.relance_unite?{mode:"duree",nb:initial.relance_nb,unite:initial.relance_unite,date:""}:initial&&initial.relance_le?{mode:"date",nb:8,unite:"semaines",date:String(initial.relance_le).slice(0,10)}:edition?{mode:"aucune",nb:8,unite:"semaines",date:""}:{mode:"duree",nb:8,unite:"semaines",date:""});
  const [cleClient,setCleClient]=useState(0);
  const [chantiers,setChantiers]=useState([]);
  const [occupe,setOccupe]=useState(false);const [erreur,setErreur]=useState(null);
  const maj=(id,val)=>setF(x=>({...x,[id]:val}));
  useEffect(()=>{db.get("fiches_chantier","?select=de,client,materiel&order=created_at.desc&limit=1000").then(d=>{if(Array.isArray(d))setChantiers(d);}).catch(()=>{});},[]);
  const deNorm=normaliserDE(f.de);
  const trouvees=useMemo(()=>{
    if(!deNorm||deNorm.length<4)return [];
    return [...fiches.map(x=>({type:"atelier",de:x.de,client:x.client,lieu:x.materiel})),...chantiers.map(x=>({type:"chantier",de:x.de,client:x.client,lieu:x.materiel}))]
      .filter(x=>x.de&&normaliserDE(x.de)===deNorm&&x.client);
  },[fiches,chantiers,deNorm]);
  const clientsTrouves=[...new Map(trouvees.map(x=>[norm(x.client),x])).values()];

  async function enregistrer(){
    if(occupe)return;
    if(!deNorm||!f.client.trim()||!f.contact.trim()){setErreur("Indiquez le N° de DE, le client et le contact.");return;}
    const montant=f.montant.trim()===""?null:parseFloat(f.montant.replace(",","."));
    if(montant!==null&&isNaN(montant)){setErreur("Le montant doit être un nombre.");return;}
    setOccupe(true);setErreur(null);
    const corps={de:deNorm,client:f.client.trim(),contact:f.contact.trim(),telephone:f.telephone.trim()||null,mail:f.mail.trim()||null,objet:f.objet.trim()||null,montant,date_devis:f.date_devis||aujourdhui(),statut:f.statut,commentaire:f.commentaire.trim()||null,...relanceVersChamps(rel,f.date_devis),updated_at:new Date().toISOString()};
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

    {erreur&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:6,padding:"8px 10px",fontSize:13,color:"#D73A49",marginBottom:10}}>{erreur}</div>}
    <button type="button" onClick={enregistrer} disabled={occupe} style={{...BTN1,opacity:occupe?0.6:1}}>{occupe?"⏳ Enregistrement…":"✓ Enregistrer"}</button>
  </div>);
}

// ── « Relancé » : note + prochaine relance ──────────────────────────────
function DialogRelance({ligne,onValide,onAnnuler}){
  const [note,setNote]=useState("");
  const [rel,setRel]=useState(()=>ligne.relance_nb&&ligne.relance_unite?{mode:"duree",nb:ligne.relance_nb,unite:ligne.relance_unite,date:""}:{mode:"duree",nb:8,unite:"semaines",date:""});
  const [occupe,setOccupe]=useState(false);
  async function valider(){
    setOccupe(true);
    await onValide({note:note.trim(),...relanceVersChamps(rel,aujourdhui())});
    setOccupe(false);
  }
  return(<div onClick={onAnnuler} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",zIndex:300,padding:12,overflowY:"auto"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,padding:"20px 18px",width:"100%",maxWidth:420,margin:"auto",boxSizing:"border-box"}}>
      <div style={{fontSize:16,fontWeight:800,color:"#1B4F8A",marginBottom:2}}>✓ Relance faite</div>
      <div style={{fontSize:13,color:"#6B7280",marginBottom:12,overflowWrap:"anywhere"}}>{ligne.de} — {ligne.client} — {ligne.contact}</div>
      <div style={{marginBottom:12}}><label style={LBL}>Note (facultatif)</label><input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex : doit en parler à sa direction" style={INP} autoComplete="off"/></div>
      <div style={{marginBottom:14,background:"#F8F9FA",border:"1px solid #E2E6EA",borderRadius:10,padding:"10px 12px"}}>
        <label style={LBL}>Prochaine relance</label>
        <ChoixRelance valeur={rel} onChange={setRel} dateReference={aujourdhui()}/>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button type="button" onClick={valider} disabled={occupe} style={{...BTN1,opacity:occupe?0.6:1}}>{occupe?"⏳ …":"Enregistrer la relance"}</button>
        <button type="button" onClick={onAnnuler} style={BTN2}>Annuler</button>
      </div>
    </div>
  </div>);
}

// ── lignes d'actions rapides ─────────────────────────────────────────────
function Contacter({l}){
  const sujet="Devis "+l.de+(l.objet?" — "+l.objet:"");
  const corps="Bonjour,\n\nJe me permets de revenir vers vous au sujet de notre devis "+l.de+(l.date_devis?" du "+frDate(l.date_devis):"")+(l.objet?" ("+l.objet+")":"")+".\nAvez-vous pu l'étudier ? Je reste à votre disposition pour en discuter.\n\nCordialement";
  return(<span style={{display:"inline-flex",gap:10,flexWrap:"wrap"}}>
    {l.telephone&&<a href={"tel:"+String(l.telephone).replace(/\s+/g,"")} style={LIEN}>📞 {l.telephone}</a>}
    {l.mail&&<a href={"mailto:"+l.mail+"?subject="+encodeURIComponent(sujet)+"&body="+encodeURIComponent(corps)} style={LIEN} title="Ouvre un mail de relance prérempli">✉ {l.mail}</a>}
  </span>);
}

// ── page ─────────────────────────────────────────────────────────────────
export function PageSuiviClients({suivi,fiches,champClient,par}){
  const largeur=useLargeur();
  const [formulaire,setFormulaire]=useState(null); // null | {} (nouveau) | ligne (modification)
  const [recherche,setRecherche]=useState("");
  const [filtre,setFiltre]=useState("actifs");
  const [tri,setTri]=useState("relance");
  const [relancer,setRelancer]=useState(null);
  const [aSupprimer,setASupprimer]=useState(null);
  const [message,setMessage]=useState(null);
  const [erreur,setErreur]=useState(null);
  const {lignes,dispo,charge,setLignes}=suivi;

  const filtrees=useMemo(()=>{
    const mots=norm(recherche).split(" ").filter(Boolean);
    let l=lignes.filter(x=>{
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
  const acceptes=lignes.filter(x=>x.statut==="accepte").length,refuses=lignes.filter(x=>x.statut==="refuse").length;
  const taux=acceptes+refuses>0?Math.round(acceptes/(acceptes+refuses)*100):null;

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
    await patch(l,{statut},"Statut : "+statutInfo(statut).label);
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

  if(dispo===false)return(<div style={{maxWidth:760,margin:"0 auto",padding:"20px 16px"}}>
    <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 12px"}}>📞 Suivi clients</h1>
    <NoticeActivation titre="Activer le suivi des devis clients" intro="La base de données doit recevoir une petite table pour ranger les devis suivis. C'est à faire une seule fois, par le responsable (compte Supabase)." sql={SQL_SUIVI_DEVIS} onVerifier={suivi.recharger}/>
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

  return(<div style={{maxWidth:1100,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}>
      <div style={{minWidth:0}}>
        <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 2px"}}>📞 Suivi clients</h1>
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
      {tuile("refuse","Refusés",refuses,"","#D73A49")}
    </div>

    <div style={CARTE}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"3 1 220px",minWidth:0}}><label style={LBL}>🔍 Rechercher (DE, client, contact, mail…)</label><input type="search" value={recherche} onChange={e=>setRecherche(e.target.value)} style={INP} autoComplete="off"/></div>
        <div style={{flex:"1 1 150px"}}><label style={LBL}>Afficher</label>
          <select value={filtre} onChange={e=>setFiltre(e.target.value)} style={INP}>
            <option value="actifs">En cours</option><option value="relancer">À relancer</option>
            {STATUTS_DEVIS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}<option value="tous">Tout</option>
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

    {largeur>=900
      ?<div style={{...CARTE,padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr style={{background:"#F3F6FA",textAlign:"left",color:"#1B4F8A"}}>{["DE","Client","Contact","Devis","Montant","Relance","Statut",""].map((h,i)=><th key={i} style={{padding:"9px 10px",fontSize:11,textTransform:"uppercase",letterSpacing:".04em",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
        <tbody>{filtrees.map(l=><tr key={l.id} style={{background:fondLigne(l),borderTop:"1px solid #E2E6EA",verticalAlign:"top"}}>
          <td style={{padding:"9px 10px",fontWeight:700,whiteSpace:"nowrap"}}>{l.de}</td>
          <td style={{padding:"9px 10px",minWidth:140}}>{l.client}{l.objet&&<div style={{fontSize:12,color:"#6B7280"}}>{l.objet}</div>}</td>
          <td style={{padding:"9px 10px",minWidth:170}}><div style={{fontWeight:600}}>{l.contact}</div><Contacter l={l}/></td>
          <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>{frDate(l.date_devis)}</td>
          <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>{euros(l.montant)}</td>
          <td style={{padding:"9px 10px",minWidth:150}}>{etatBadge(l)}{l.commentaire&&<div style={{fontSize:12,color:"#6B7280",marginTop:2}}>{l.commentaire}</div>}{historique(l)}</td>
          <td style={{padding:"9px 10px"}}>{selecteurStatut(l)}</td>
          <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>{actions(l)}</td>
        </tr>)}</tbody></table></div>
      :filtrees.map(l=><div key={l.id} style={{...CARTE,background:fondLigne(l),borderColor:etatRelance(l)==="retard"?"#D73A49":etatRelance(l)==="aujourdhui"?"#E8720C":"#E2E6EA"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"baseline",flexWrap:"wrap"}}>
          <div style={{fontSize:15,fontWeight:800,color:"#1B4F8A",overflowWrap:"anywhere"}}>{l.de} — {l.client}</div>
          <div style={{fontSize:13,fontWeight:700}}>{euros(l.montant)}</div>
        </div>
        {l.objet&&<div style={{fontSize:13,color:"#6B7280"}}>{l.objet}</div>}
        <div style={{marginTop:6,fontSize:14,fontWeight:600,overflowWrap:"anywhere"}}>{l.contact}</div>
        <div style={{marginTop:2}}><Contacter l={l}/></div>
        <div style={{marginTop:6,fontSize:12,color:"#6B7280"}}>Devis du {frDate(l.date_devis)}</div>
        <div style={{marginTop:2}}>{etatBadge(l)}</div>
        {l.commentaire&&<div style={{fontSize:12,color:"#6B7280",marginTop:2}}>{l.commentaire}</div>}
        {historique(l)}
        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:10}}>{selecteurStatut(l)}{actions(l)}</div>
      </div>)}

    {relancer&&<DialogRelance ligne={relancer} onValide={validerRelance} onAnnuler={()=>setRelancer(null)}/>}
  </div>);
}

// ── tableau de bord du Commercial ────────────────────────────────────────
export function DashboardCommercial({suivi,items,onNaviguer}){
  const aRelancer=suivi.aRelancer;
  const bientot=suivi.lignes.filter(l=>etatRelance(l)==="bientot");
  return(<div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
    <h2 style={{fontSize:20,fontWeight:700,margin:"0 0 16px"}}>🏠 Tableau de bord</h2>

    {suivi.dispo===true&&(aRelancer.length>0
      ?<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:12,padding:"12px 14px",marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:800,color:"#D73A49",marginBottom:8}}>📞 Relances à faire ({aRelancer.length})</div>
        {aRelancer.slice(0,8).map(l=><div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",background:"#fff",border:"1px solid #F5C2C7",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
          <div style={{minWidth:0,fontSize:13,overflowWrap:"anywhere"}}><strong>{l.de}</strong> — {l.client}<div style={{fontSize:12,color:"#6B7280"}}>{l.contact} · <span style={{color:COUL_RELANCE[etatRelance(l)],fontWeight:700}}>{texteRelance(l)}</span></div></div>
          <Contacter l={l}/>
        </div>)}
        {aRelancer.length>8&&<div style={{fontSize:12,color:"#6B7280",marginBottom:6}}>… et {aRelancer.length-8} autre{aRelancer.length-8>1?"s":""}</div>}
        <button type="button" onClick={()=>onNaviguer("devis")} style={{...BTN1,fontSize:13,padding:"7px 14px"}}>Ouvrir le suivi clients →</button>
      </div>
      :<div style={{background:"#F0FFF4",border:"1px solid #22863A",borderRadius:12,padding:"12px 14px",marginBottom:16,color:"#22863A",fontWeight:600,fontSize:14}}>✅ Aucune relance en retard{bientot.length?" — "+bientot.length+" prévue"+(bientot.length>1?"s":"")+" dans les 7 jours":""}</div>)}
    {suivi.dispo===false&&<button type="button" onClick={()=>onNaviguer("devis")} style={{...BTN2,marginBottom:16,borderStyle:"dashed",color:"#8A4B00",borderColor:"#E8720C"}}>⚙ Suivi clients à activer (une seule fois)</button>}

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:14}}>
      {items.filter(n=>n.id!=="dashboard").map(n=>{
        const sep=n.label.indexOf(" ");const icone=n.label.slice(0,sep);const texte=n.label.slice(sep+1);
        return(<button key={n.id} type="button" onClick={()=>onNaviguer(n.id)} style={{position:"relative",background:"#fff",border:"1px solid #E2E6EA",borderRadius:14,padding:"22px 12px",minHeight:110,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer",boxShadow:"0 2px 6px rgba(0,0,0,0.06)"}}>
          <span style={{fontSize:36,lineHeight:1}}>{icone}</span>
          <span style={{fontSize:16,fontWeight:700,color:"#1A1A2E"}}>{texte}</span>
          {n.id==="devis"&&aRelancer.length>0&&<span style={{position:"absolute",top:8,right:10,background:"#D73A49",color:"#fff",borderRadius:12,padding:"2px 8px",fontSize:12,fontWeight:700}}>{aRelancer.length}</span>}
        </button>);
      })}
    </div>
  </div>);
}
