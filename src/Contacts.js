import React, {useState, useEffect, useRef} from "react";
import {SUPA_URL, H} from "./supabase";
import {NoticeActivation} from "./Activation";

// Carnet de contacts (import de l'export Google Contacts) : liste déroulante qui se filtre en tapant,
// comme le champ Client. Un contact = un nom affiché tel qu'il est écrit dans Google + un téléphone + un mail.
export const SQL_CONTACTS=`create table if not exists carnet_contacts (
  id bigint generated always as identity primary key,
  nom_affiche text not null,
  prenom text,
  nom text,
  societe text,
  telephone text,
  mail text,
  source text not null default 'google',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table carnet_contacts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'carnet_contacts' and policyname = 'allow anon all') then
    create policy "allow anon all" on carnet_contacts for all using (true) with check (true);
  end if;
end $$;
create index if not exists carnet_contacts_nom on carnet_contacts (lower(nom_affiche));

notify pgrst, 'reload schema';`;

const COLONNES="id,nom_affiche,prenom,nom,societe,telephone,mail";
const norm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const chiffres=s=>String(s||"").replace(/\D/g,"");
const prepare=c=>({...c,rech:norm(c.nom_affiche+" "+(c.societe||"")),tel:chiffres(c.telephone)});

// ── cache partagé entre tous les champs Contact (chargé à la première utilisation) ──
let etat={liste:[],disponible:null}; // disponible : null = pas encore su / réseau, false = table absente, true = ok
let chargement=null;
const abonnes=new Set();
const notifier=()=>abonnes.forEach(f=>f());

async function chargerDepuisBase(){
  const out=[];
  // Supabase renvoie au plus 1000 lignes par requête : on lit par pages
  for(let debut=0;debut<50000;debut+=1000){
    const r=await fetch(SUPA_URL+"/rest/v1/carnet_contacts?select="+COLONNES+"&order=nom_affiche&limit=1000&offset="+debut,{headers:H});
    const rows=await r.json();
    if(!Array.isArray(rows)){
      if(rows&&rows.code==="PGRST205")return {liste:[],disponible:false};
      throw new Error("lecture des contacts impossible");
    }
    out.push(...rows);
    if(rows.length<1000)break;
  }
  return {liste:out.map(prepare),disponible:true};
}
// Renvoie true (table présente), false (absente), null (réseau).
export async function recharger(){
  try{
    etat=await chargerDepuisBase();notifier();
    return etat.disponible;
  }catch(e){return null;}
}
function assurerChargement(){
  if(etat.disponible!==null||chargement)return;
  chargement=recharger().finally(()=>{chargement=null;});
}
async function ecrire(methode,url,corps){
  try{
    const r=await fetch(SUPA_URL+"/rest/v1/"+url,{method:methode,headers:{...H,"Prefer":"return=representation"},body:JSON.stringify(corps)});
    const data=await r.json().catch(()=>null);
    return r.ok&&Array.isArray(data)&&data[0]?data[0]:null;
  }catch(e){return null;}
}
async function ajouterContact(c){
  const row=await ecrire("POST","carnet_contacts",{nom_affiche:c.nom_affiche,telephone:c.telephone||null,mail:c.mail||null,source:"app"});
  if(row){etat={...etat,liste:[...etat.liste,prepare(row)]};notifier();}
  return row;
}
async function modifierContact(id,champs){
  const row=await ecrire("PATCH","carnet_contacts?id=eq."+id,{...champs,updated_at:new Date().toISOString()});
  if(row){etat={...etat,liste:etat.liste.map(x=>x.id===id?prepare(row):x)};notifier();}
  return row;
}
function useContacts(){
  const [,force]=useState(0);
  useEffect(()=>{
    const f=()=>force(n=>n+1);
    abonnes.add(f);assurerChargement();
    return()=>{abonnes.delete(f);};
  },[]);
  return etat;
}

// Cherche tous les mots (dans n'importe quel ordre, sans accents ni majuscules) ; 3 chiffres ou plus : cherche aussi dans le numéro.
function chercher(liste,q){
  const mots=norm(q).split(" ").filter(Boolean);
  const num=chiffres(q);
  if(!mots.length)return [];
  const ok=liste.filter(c=>mots.every(m=>c.rech.includes(m))||(num.length>=3&&c.tel.includes(num)));
  const premier=mots[0];
  return ok.sort((a,b)=>(b.rech.startsWith(premier)-a.rech.startsWith(premier))||a.nom_affiche.localeCompare(b.nom_affiche,"fr"));
}

const INP={width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid #D1D5DB",fontSize:13,boxSizing:"border-box",background:"#fff"};
const BTN={background:"#fff",color:"#1B4F8A",border:"1.5px solid #1B4F8A",padding:"5px 10px",borderRadius:6,fontWeight:600,fontSize:12,cursor:"pointer",textAlign:"left"};

// champ : {id, remplit:{telephone:"id du champ téléphone", mail:"id du champ mail"}} ; v : valeurs de la fiche ; onChange(id,valeur)
export function ChampContact({valeur,onChange,champ,v}){
  const {liste,disponible}=useContacts();
  const [q,setQ]=useState(valeur||"");
  const [ouvert,setOuvert]=useState(false);
  const [message,setMessage]=useState(null);
  const [activation,setActivation]=useState(false);
  const ref=useRef(null);
  const cibles=champ.remplit||{};
  useEffect(()=>{setQ(valeur||"");},[valeur]);
  useEffect(()=>{
    function ferme(e){if(ref.current&&!ref.current.contains(e.target))setOuvert(false);}
    document.addEventListener("mousedown",ferme);
    return()=>document.removeEventListener("mousedown",ferme);
  },[]);
  const trouves=chercher(liste,q);
  const exact=liste.find(c=>norm(c.nom_affiche)===norm(valeur));
  const telFiche=cibles.telephone?String(v[cibles.telephone]||"").trim():"";
  const mailFiche=cibles.mail?String(v[cibles.mail]||"").trim():"";
  const flash=t=>{setMessage(t);setTimeout(()=>setMessage(null),3000);};

  function choisir(c){
    setQ(c.nom_affiche);setOuvert(false);
    onChange(champ.id,c.nom_affiche);
    if(cibles.telephone&&c.telephone)onChange(cibles.telephone,c.telephone);
    if(cibles.mail&&c.mail)onChange(cibles.mail,c.mail);
  }
  async function creer(){
    const nom=q.trim();if(!nom)return;
    const row=await ajouterContact({nom_affiche:nom,telephone:telFiche,mail:mailFiche});
    if(row){onChange(champ.id,nom);setOuvert(false);flash("✓ « "+nom+" » ajouté aux contacts");}
    else flash("L'ajout n'a pas abouti (connexion ?). Rien n'a été enregistré.");
  }
  async function enrichir(champs,libelle){
    const row=await modifierContact(exact.id,champs);
    flash(row?"✓ "+libelle+" enregistré pour "+exact.nom_affiche:"L'enregistrement n'a pas abouti (connexion ?).");
  }

  const telDiffere=exact&&telFiche&&chiffres(telFiche)!==exact.tel;
  const mailDiffere=exact&&mailFiche&&mailFiche.toLowerCase()!==String(exact.mail||"").toLowerCase();
  const pasConnu=!exact&&q.trim()&&!trouves.some(c=>norm(c.nom_affiche)===norm(q));

  return(<div ref={ref} style={{position:"relative"}}>
    <input type="text" value={q} onChange={e=>{setQ(e.target.value);setOuvert(true);onChange(champ.id,e.target.value);}} onFocus={()=>setOuvert(true)} placeholder={disponible===false?"Nom du contact":"Tapez un nom, un prénom, une société…"} style={INP} autoComplete="off"/>
    {ouvert&&disponible&&q.trim()&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1.5px solid #D1D5DB",borderRadius:6,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:50,maxHeight:260,overflowY:"auto"}}>
      {trouves.slice(0,8).map(c=><div key={c.id} onClick={()=>choisir(c)} style={{padding:"8px 12px",cursor:"pointer",fontSize:13,borderBottom:"1px solid #F3F4F6"}} onMouseOver={e=>e.currentTarget.style.background="#F5F6F8"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
        <div style={{fontWeight:600}}>{c.nom_affiche}</div>
        <div style={{fontSize:11,color:"#6B7280"}}>{[c.telephone,c.mail].filter(Boolean).join(" · ")||"pas de numéro"}</div>
      </div>)}
      {trouves.length>8&&<div style={{padding:"6px 12px",fontSize:11,color:"#9CA3AF"}}>… et {trouves.length-8} autre{trouves.length-8>1?"s":""} : continuez à taper pour préciser</div>}
      {trouves.length===0&&<div style={{padding:"8px 12px",fontSize:12,color:"#9CA3AF"}}>Aucun contact ne correspond.</div>}
      {pasConnu&&<div onClick={creer} style={{padding:"8px 12px",cursor:"pointer",fontSize:13,color:"#E8720C",fontWeight:600,borderTop:"1px solid #E2E6EA"}}>➕ Ajouter « {q.trim()} » aux contacts{(telFiche||mailFiche)?" (avec le téléphone / mail saisi)":""}</div>}
    </div>}
    {(telDiffere||mailDiffere)&&<div style={{display:"flex",flexDirection:"column",gap:4,marginTop:6,alignItems:"flex-start"}}>
      {telDiffere&&<button type="button" style={BTN} onClick={()=>enrichir({telephone:telFiche},"numéro")}>💾 {exact.telephone?"Remplacer":"Ajouter"} le numéro de {exact.nom_affiche} ({telFiche})</button>}
      {mailDiffere&&<button type="button" style={BTN} onClick={()=>enrichir({mail:mailFiche},"mail")}>💾 {exact.mail?"Remplacer":"Ajouter"} le mail de {exact.nom_affiche} ({mailFiche})</button>}
    </div>}
    {message&&<div style={{fontSize:12,marginTop:4,color:message.startsWith("✓")?"#22863A":"#B42318"}}>{message}</div>}
    {disponible===false&&<div style={{marginTop:6}}>
      <button type="button" style={{...BTN,border:"1.5px dashed #E8720C",color:"#8A4B00"}} onClick={()=>setActivation(a=>!a)}>⚙ Carnet de contacts à activer (une seule fois)</button>
      {activation&&<div style={{marginTop:8}}><NoticeActivation titre="Activer le carnet de contacts" intro="La base de données doit recevoir une petite table pour ranger les contacts. C'est à faire une seule fois, par le responsable (compte Supabase)." sql={SQL_CONTACTS} onVerifier={recharger}/></div>}
    </div>}
  </div>);
}
