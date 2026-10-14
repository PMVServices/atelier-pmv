import React, {useState, useEffect, useCallback, useMemo, useContext} from "react";
import {PersonneCtx} from "./Acces";
import {SUPA_URL, H, db} from "./supabase";
import {NoticeActivation} from "./Activation";
import {chargerParamsApp} from "./Alertes";
import PageStock from "./Stock";
import {listeClientsRail, definirClientsRail} from "./railClients";
export {listeClientsRail, definirClientsRail, estClientRail, prefixeNumero, normaliserNumero} from "./railClients";

// PMV Rail (filiale) : numéros DV au lieu de DE pour certains clients, et suivi des isolateurs des cheminées de freinage.
// Le stock RAIL est volontairement à part du stock général : deux compteurs (isolateurs SNCF et isolateurs IMATEQ), sans étiquette ni QR code.
import {TYPE_CHEMINEE, ISOLATEURS_SNCF_PAR_CHEMINEE} from "./railClients";
export {TYPE_CHEMINEE, ISOLATEURS_SNCF_PAR_CHEMINEE} from "./railClients";
export const STOCKS_RAIL=[{id:"SNCF",libelle:"Isolateurs SNCF"},{id:"IMATEQ",libelle:"Isolateurs IMATEQ"}];

// Lu au démarrage de l'appli (parametres_app, clé clients_rail ; liste par défaut tant qu'elle n'a jamais été modifiée)
export async function chargerClientsRail(){
  try{
    const p=await chargerParamsApp();
    if(p&&p.clients_rail){const l=JSON.parse(p.clients_rail);if(Array.isArray(l))definirClientsRail(l);}
  }catch(e){/* liste par défaut */}
}

// ── table du stock RAIL ─────────────────────────────────────────────────────────────────────
export const SQL_RAIL=`create table if not exists rail_stock (
  id uuid primary key default gen_random_uuid(),
  stock text not null,
  delta integer not null,
  motif text not null default 'ajustement',
  fiche_id text,
  dv text,
  cheminee text,
  commentaire text,
  par text,
  created_at timestamptz default now()
);
alter table rail_stock enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'rail_stock' and policyname = 'allow anon all') then
    create policy "allow anon all" on rail_stock for all using (true) with check (true);
  end if;
end $$;
create index if not exists rail_stock_stock on rail_stock (stock, created_at);
create index if not exists rail_stock_fiche on rail_stock (fiche_id);

notify pgrst, 'reload schema';`;

async function appel(methode,chemin,corps,prefer){
  try{
    const r=await fetch(SUPA_URL+"/rest/v1/"+chemin,{method:methode,headers:prefer?{...H,"Prefer":prefer}:H,body:corps!==undefined?JSON.stringify(corps):undefined});
    const data=await r.json().catch(()=>null);
    return {ok:r.ok,data,status:r.status};
  }catch(e){return {ok:false,data:null,status:0};}
}
const tableAbsente=r=>!r.ok&&r.data&&r.data.code==="PGRST205";

// Toutes les lignes du stock RAIL (lecture par pages de 1000)
async function lireTout(){
  const out=[];
  for(let debut=0;debut<50000;debut+=1000){
    const r=await appel("GET","rail_stock?select=*&order=created_at.desc&limit=1000&offset="+debut);
    if(tableAbsente(r))return {dispo:false,lignes:[]};
    if(!r.ok||!Array.isArray(r.data))return null;
    out.push(...r.data);
    if(r.data.length<1000)break;
  }
  return {dispo:true,lignes:out};
}

// Décompte automatique des isolateurs d'une fiche cheminée (une seule ligne « fiche » par cheminée, remise à jour à chaque enregistrement) :
// SNCF = 520 sur le stock SNCF dès que le choix est enregistré ; IMATEQ = le nombre saisi (isolateurs cassés) sur le stock IMATEQ.
export async function synchroniserIsolateursRail({ficheId,dv,cheminee,type,nb,par}){
  if(!ficheId)return {ok:false};
  const stock=type==="SNCF"||type==="IMATEQ"?type:null;
  const delta=type==="SNCF"?-ISOLATEURS_SNCF_PAR_CHEMINEE:type==="IMATEQ"?-Math.max(0,parseInt(nb,10)||0):0;
  const r=await appel("GET","rail_stock?select=*&motif=eq.fiche&fiche_id=eq."+encodeURIComponent(ficheId));
  if(tableAbsente(r))return {ok:false,absente:true};
  if(!r.ok||!Array.isArray(r.data))return {ok:false};
  const existants=r.data;
  if(!stock||delta===0){
    for(const x of existants)await appel("DELETE","rail_stock?id=eq."+x.id);
    return {ok:true,delta:0};
  }
  const corps={stock,delta,dv:dv||null,cheminee:cheminee||null,par:par||null};
  if(existants.length>=1){
    const [premier,...autres]=existants;
    if(premier.stock!==stock||premier.delta!==delta||premier.dv!==corps.dv||premier.cheminee!==corps.cheminee){
      const p=await appel("PATCH","rail_stock?id=eq."+premier.id,corps,"return=representation");
      if(!p.ok)return {ok:false};
    }
    for(const x of autres)await appel("DELETE","rail_stock?id=eq."+x.id);
    return {ok:true,delta};
  }
  const p=await appel("POST","rail_stock",{...corps,motif:"fiche",fiche_id:String(ficheId),commentaire:type==="SNCF"?"Cheminée SNCF : tous les isolateurs changés":"Cheminée IMATEQ : isolateurs cassés"},"return=representation");
  return {ok:p.ok,delta};
}
// Fiche supprimée : on rend les isolateurs au stock
export async function supprimerMouvementsRailFiche(ficheId){
  if(!ficheId)return;
  await appel("DELETE","rail_stock?motif=eq.fiche&fiche_id=eq."+encodeURIComponent(ficheId));
}

// ── page « RAIL » (administrateur) ───────────────────────────────────────────────────────────
const norm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const CARTE={background:"#fff",border:"1px solid #E2E6EA",borderRadius:12,padding:"14px 16px",marginBottom:12};
const INP={width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid #D1D5DB",fontSize:14,boxSizing:"border-box",background:"#fff"};
const LBL={display:"block",fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".04em",marginBottom:4};
const BTN1={background:"#1B4F8A",color:"#fff",border:"none",padding:"9px 18px",borderRadius:8,fontWeight:700,fontSize:14,cursor:"pointer"};
const BTN2={background:"#fff",color:"#1B4F8A",border:"1.5px solid #1B4F8A",padding:"8px 14px",borderRadius:8,fontWeight:600,fontSize:13,cursor:"pointer"};
const fmtDate=iso=>{const d=new Date(iso);return isNaN(d.getTime())?"":d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})+" "+d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});};
const MOTIFS={fiche:"Cheminée",initial:"Stock de départ",entree:"Arrivée de stock",ajustement:"Correction"};

function CarteStock({stock,total,nbCheminees,admin,qui,onMouvement}){
  const [mode,setMode]=useState(null); // null | "entree" | "correction"
  const [nb,setNb]=useState("");
  const [com,setCom]=useState("");
  const [occupe,setOccupe]=useState(false);
  const [erreur,setErreur]=useState(null);
  const n=parseInt(nb,10);
  const valide=!isNaN(n)&&(mode==="entree"?n>0:n>=0);
  async function valider(){
    if(!valide||occupe)return;
    setOccupe(true);setErreur(null);
    const delta=mode==="entree"?n:n-total;
    if(delta===0){setMode(null);setNb("");setOccupe(false);return;}
    const r=await appel("POST","rail_stock",{stock:stock.id,delta,motif:mode==="entree"?"entree":(total===0&&nbCheminees===0?"initial":"ajustement"),commentaire:com.trim()||null,par:qui||null},"return=representation");
    setOccupe(false);
    if(!r.ok){setErreur("L'enregistrement n'a pas abouti (connexion ?). Rien n'a été modifié.");return;}
    setMode(null);setNb("");setCom("");onMouvement();
  }
  return(<div style={{...CARTE,flex:"1 1 280px",minWidth:0,marginBottom:0}}>
    <div style={LBL}>{stock.libelle}</div>
    <div style={{display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap"}}>
      <span style={{fontSize:40,fontWeight:800,lineHeight:1.1,color:total<0?"#D73A49":total===0?"#E8720C":"#1B4F8A"}}>{total}</span>
      <span style={{fontSize:13,color:"#6B7280"}}>en stock</span>
    </div>
    {total<0&&<div style={{fontSize:12,color:"#D73A49",marginTop:4}}>Stock négatif : saisissez le stock de départ (« Corriger le stock ») pour que le compte soit juste.</div>}
    <div style={{fontSize:12,color:"#6B7280",marginTop:4}}>{stock.id==="SNCF"?"520 isolateurs sont décomptés automatiquement à chaque cheminée SNCF.":"Le nombre d'isolateurs changés est décompté à chaque cheminée IMATEQ."}{nbCheminees>0?" · "+nbCheminees+" cheminée"+(nbCheminees>1?"s":"")+" enregistrée"+(nbCheminees>1?"s":""):""}</div>
    {admin&&!mode&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
      <button type="button" onClick={()=>{setMode("entree");setNb("");}} style={BTN2}>➕ Arrivée de stock</button>
      <button type="button" onClick={()=>{setMode("correction");setNb(String(total));}} style={BTN2}>✏ Corriger le stock</button>
    </div>}
    {admin&&mode&&<div style={{marginTop:10,background:"#F8F9FA",border:"1px solid #E2E6EA",borderRadius:10,padding:"10px 12px"}}>
      <label style={LBL}>{mode==="entree"?"Nombre d'isolateurs reçus":"Stock réel (après comptage)"}</label>
      <input type="number" min="0" value={nb} onChange={e=>setNb(e.target.value)} style={{...INP,maxWidth:160}}/>
      <label style={{...LBL,marginTop:8}}>Commentaire (facultatif)</label>
      <input type="text" value={com} onChange={e=>setCom(e.target.value)} style={INP} autoComplete="off"/>
      {erreur&&<div style={{fontSize:12,color:"#D73A49",marginTop:6}}>{erreur}</div>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
        <button type="button" onClick={valider} disabled={!valide||occupe} style={{...BTN1,opacity:valide&&!occupe?1:0.5}}>{occupe?"⏳ …":"✓ Enregistrer"}</button>
        <button type="button" onClick={()=>{setMode(null);setNb("");setCom("");setErreur(null);}} style={BTN2}>Annuler</button>
      </div>
    </div>}
  </div>);
}

function ClientsRail({clients,admin}){
  const [liste,setListe]=useState(listeClientsRail());
  const [saisie,setSaisie]=useState("");
  const [message,setMessage]=useState(null);
  async function enregistrer(nouvelle){
    setListe(nouvelle);definirClientsRail(nouvelle);
    try{await db.upsert("parametres_app",[{cle:"clients_rail",valeur:JSON.stringify(nouvelle)}],"cle");setMessage("✓ Liste enregistrée.");}
    catch(e){setMessage("L'enregistrement n'a pas abouti (connexion ?).");}
    setTimeout(()=>setMessage(null),3000);
  }
  const suggestions=useMemo(()=>{const q=norm(saisie);return q?(clients||[]).filter(c=>norm(c).includes(q)&&!liste.some(l=>norm(l)===norm(c))).slice(0,6):[];},[saisie,clients,liste]);
  function ajouter(nom){const n=String(nom||saisie).trim();if(!n||liste.some(l=>norm(l)===norm(n)))return;enregistrer([...liste,n]);setSaisie("");}
  return(<div style={CARTE}>
    <div style={{fontSize:15,fontWeight:800,color:"#1B4F8A",marginBottom:4}}>Clients PMV Rail — numéros DV</div>
    <div style={{fontSize:13,color:"#6B7280",marginBottom:10}}>Pour ces clients, le numéro de chantier s'écrit <strong>DV0000</strong> (et non DE0000) dans toutes les fiches, les devis et le suivi.</div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:admin?10:0}}>
      {liste.length===0&&<span style={{fontSize:13,color:"#9CA3AF"}}>Aucun client.</span>}
      {liste.map(c=><span key={c} style={{display:"inline-flex",alignItems:"center",gap:6,background:"#EEF4FF",border:"1.5px solid #1B4F8A",color:"#1B4F8A",borderRadius:20,padding:"4px 12px",fontSize:13}}>{c}{admin&&<span role="button" tabIndex={0} aria-label={"Retirer "+c} onClick={()=>enregistrer(liste.filter(x=>x!==c))} style={{cursor:"pointer",color:"#D73A49",fontWeight:700}}>✕</span>}</span>)}
    </div>
    {admin&&<div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <input type="text" value={saisie} onChange={e=>setSaisie(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();ajouter();}}} placeholder="Ajouter un client (tapez son nom)" style={{...INP,flex:"1 1 220px",width:"auto"}} autoComplete="off"/>
        <button type="button" onClick={()=>ajouter()} disabled={!saisie.trim()} style={{...BTN2,opacity:saisie.trim()?1:0.5}}>Ajouter</button>
      </div>
      {suggestions.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>{suggestions.map(s=><button key={s} type="button" onClick={()=>ajouter(s)} style={{...BTN2,padding:"4px 10px",fontSize:12}}>{s}</button>)}</div>}
    </div>}
    {message&&<div style={{fontSize:12,color:message.startsWith("✓")?"#22863A":"#D73A49",marginTop:8}}>{message}</div>}
  </div>);
}

export function PageRail({admin,clients,sessionTech}){
  const ctx=useContext(PersonneCtx);
  const qui=sessionTech||(ctx&&ctx.moi&&ctx.moi.initiales)||"";
  const [etat,setEtat]=useState({dispo:null,lignes:[]});
  const recharger=useCallback(async()=>{
    const r=await lireTout();
    if(r){setEtat(r);return r.dispo;}
    return null;
  },[]);
  useEffect(()=>{recharger();},[recharger]);
  const totaux=useMemo(()=>{
    const t={SNCF:0,IMATEQ:0},ch={SNCF:0,IMATEQ:0};
    etat.lignes.forEach(l=>{if(t[l.stock]!==undefined){t[l.stock]+=l.delta||0;if(l.motif==="fiche")ch[l.stock]++;}});
    return {t,ch};
  },[etat.lignes]);
  const historique=etat.lignes.slice(0,40);
  return(<div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
    <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 4px"}}>🚆 RAIL — isolateurs des cheminées</h1>
    <div style={{fontSize:13,color:"#6B7280",marginBottom:14}}>Deux stocks séparés, sans étiquette ni scan : les cheminées décomptent toutes seules, vous ajoutez les arrivées et corrigez après comptage.</div>
    {etat.dispo===false?(admin
      ?<NoticeActivation titre="Activer le stock RAIL" intro="La base de données doit recevoir une petite table pour suivre les isolateurs. C'est à faire une seule fois, par le responsable (compte Supabase)." sql={SQL_RAIL} onVerifier={recharger}/>
      :<div style={CARTE}>Le stock RAIL n'est pas encore activé : prévenez l'administration.</div>)
    :<>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
        {STOCKS_RAIL.map(s=><CarteStock key={s.id} stock={s} total={totaux.t[s.id]} nbCheminees={totaux.ch[s.id]} admin={admin} qui={qui} onMouvement={recharger}/>)}
      </div>
      <div style={CARTE}>
        <div style={{fontSize:15,fontWeight:800,color:"#1B4F8A",marginBottom:6}}>Derniers mouvements</div>
        {etat.dispo===null&&<div style={{fontSize:13,color:"#6B7280"}}>Chargement…</div>}
        {etat.dispo===true&&historique.length===0&&<div style={{fontSize:13,color:"#6B7280"}}>Aucun mouvement pour le moment.</div>}
        {historique.map(l=><div key={l.id} style={{display:"flex",gap:10,alignItems:"baseline",flexWrap:"wrap",padding:"6px 0",borderTop:"1px solid #F0F1F3",fontSize:13}}>
          <span style={{color:"#6B7280",minWidth:92}}>{fmtDate(l.created_at)}</span>
          <strong style={{minWidth:64,color:l.delta<0?"#D73A49":"#22863A"}}>{l.delta>0?"+":""}{l.delta}</strong>
          <span style={{color:"#374151"}}>{l.stock} · {MOTIFS[l.motif]||l.motif}{l.dv?" · "+l.dv:""}{l.cheminee?" · cheminée "+l.cheminee:""}{l.par?" · "+l.par:""}{l.commentaire&&l.motif!=="fiche"?" · "+l.commentaire:""}</span>
        </div>)}
      </div>
    </>}
    <ClientsRail clients={clients} admin={admin}/>
  </div>);
}

// Page « Stock » : le stock général (QR codes) et, pour l'administrateur, l'onglet « RAIL » (isolateurs, à part)
export default function PageStockRail({techs,sessionTech,admin,clients,modePoste}){
  const [vue,setVue]=useState("stock");
  if(!admin)return <PageStock techs={techs} sessionTech={sessionTech} admin={admin} modePoste={modePoste}/>;
  const pastille=(id,label)=><button type="button" onClick={()=>setVue(id)} style={{padding:"8px 18px",minHeight:44,borderRadius:22,border:"1.5px solid "+(vue===id?"#1B4F8A":"#D1D5DB"),background:vue===id?"#1B4F8A":"#fff",color:vue===id?"#fff":"#374151",fontSize:14,fontWeight:700,cursor:"pointer"}}>{label}</button>;
  return(<div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",maxWidth:900,margin:"0 auto",padding:"14px 16px 0"}}>
      {pastille("stock","🗃 Stock")}{pastille("rail","🚆 RAIL")}
    </div>
    {vue==="stock"?<PageStock techs={techs} sessionTech={sessionTech} admin={admin} modePoste={modePoste}/>:<PageRail admin={admin} clients={clients} sessionTech={sessionTech}/>}
  </div>);
}
