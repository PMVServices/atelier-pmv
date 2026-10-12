import React, {useState, useEffect, useMemo} from "react";
import {db, SUPA_URL, H} from "./supabase";
import {NoticeActivation} from "./Activation";
import {ChampContact, useCarnet} from "./Contacts";

// Suivi de la distribution des calendriers annuels : à qui on en a donné, combien (grands / petits) et quand,
// pour ne pas en redonner deux fois au même client ou à la même personne.
export const SQL_CALENDRIER=`create table if not exists calendriers (
  id uuid primary key default gen_random_uuid(),
  edition int not null,
  donne_le date not null default current_date,
  client text not null,
  contact text not null default '',
  grands int not null default 0,
  petits int not null default 0,
  par text,
  created_at timestamptz default now()
);
alter table calendriers enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'calendriers' and policyname = 'allow anon all') then
    create policy "allow anon all" on calendriers for all using (true) with check (true);
  end if;
end $$;
create index if not exists calendriers_edition_client on calendriers (edition, lower(client));

notify pgrst, 'reload schema';`;

const norm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const frDate=d=>{try{const x=new Date(String(d).slice(0,10)+"T12:00:00");return isNaN(x.getTime())?"":x.toLocaleDateString("fr-FR");}catch(e){return "";}};
const frMois=d=>{try{const x=new Date(String(d).slice(0,10)+"T12:00:00");return isNaN(x.getTime())?"":x.toLocaleDateString("fr-FR",{month:"long",year:"numeric"});}catch(e){return "";}};
const aujourdhui=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
// Les calendriers de l'année suivante se distribuent à partir de septembre
const editionParDefaut=()=>{const d=new Date();return d.getMonth()>=8?d.getFullYear()+1:d.getFullYear();};
const pluriel=(n,mot)=>n+" "+mot+(n>1?"s":"");
const libelleQte=(g,p)=>[g?pluriel(g,"grand"):"",p?pluriel(p,"petit"):""].filter(Boolean).join(" + ")||"—";

async function lire(){
  const out=[];
  for(let debut=0;debut<20000;debut+=1000){
    const r=await fetch(SUPA_URL+"/rest/v1/calendriers?select=*&order=donne_le.desc,created_at.desc&limit=1000&offset="+debut,{headers:H});
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

const CARTE={background:"#fff",border:"1px solid #E2E6EA",borderRadius:12,padding:"14px 16px",marginBottom:12};
const INP={width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid #D1D5DB",fontSize:14,boxSizing:"border-box",background:"#fff"};
const LBL={display:"block",fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".04em",marginBottom:4};
const BTN1={background:"#1B4F8A",color:"#fff",border:"none",padding:"9px 18px",borderRadius:8,fontWeight:700,fontSize:14,cursor:"pointer"};
const BTN2={background:"#fff",color:"#1B4F8A",border:"1.5px solid #1B4F8A",padding:"8px 14px",borderRadius:8,fontWeight:600,fontSize:13,cursor:"pointer"};

function Compteur({libelle,valeur,onChange}){
  const bouton={background:"#F3F4F6",border:"1px solid #D1D5DB",borderRadius:6,width:40,padding:0,fontSize:20,fontWeight:700,color:"#1B4F8A",cursor:"pointer"};
  return(<div>
    <label style={LBL}>{libelle}</label>
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <button type="button" onClick={()=>onChange(Math.max(0,valeur-1))} style={bouton} aria-label={"Un "+libelle.toLowerCase()+" de moins"}>−</button>
      <input type="number" min="0" value={valeur} onChange={e=>onChange(Math.max(0,parseInt(e.target.value,10)||0))} style={{...INP,width:64,textAlign:"center",padding:"8px 4px"}}/>
      <button type="button" onClick={()=>onChange(valeur+1)} style={bouton} aria-label={"Un "+libelle.toLowerCase()+" de plus"}>+</button>
    </div>
  </div>);
}

// ── formulaire : un client, un ou plusieurs contacts ──────────────────
function FormulaireDon({lignes,champClient,sessionTech,editionsConnues,onEnregistre,onAnnuler}){
  const carnet=useCarnet();
  const [client,setClient]=useState("");
  const [cleClient,setCleClient]=useState(0);
  const [date,setDate]=useState(aujourdhui());
  const [edition,setEdition]=useState(editionParDefaut());
  const [rows,setRows]=useState([{id:1,contact:"",grands:1,petits:0}]);
  const [suiv,setSuiv]=useState(2);
  const [occupe,setOccupe]=useState(false);
  const [erreur,setErreur]=useState(null);

  const majRow=(id,champs)=>setRows(rs=>rs.map(r=>r.id===id?{...r,...champs}:r));
  const ajouterRow=(contact)=>{setRows(rs=>{
    if(contact){const vide=rs.find(r=>!r.contact.trim());if(vide)return rs.map(r=>r===vide?{...r,contact}:r);}
    return [...rs,{id:suiv,contact:contact||"",grands:1,petits:0}];
  });setSuiv(n=>n+1);};
  const retirerRow=id=>setRows(rs=>rs.length>1?rs.filter(r=>r.id!==id):rs);

  const cl=norm(client);
  // ce que ce client a déjà reçu pour cette édition
  const dejaClient=useMemo(()=>cl?lignes.filter(l=>l.edition===edition&&norm(l.client)===cl):[],[lignes,edition,cl]);
  // contacts proposés : ceux à qui on a déjà donné (ce client), puis ceux du carnet rattachés à cette société
  const proposes=useMemo(()=>{
    if(!cl)return [];
    const vus=new Set();const out=[];
    lignes.filter(l=>norm(l.client)===cl&&l.contact).forEach(l=>{const k=norm(l.contact);if(!vus.has(k)){vus.add(k);out.push(l.contact);}});
    const premier=cl.split(" ").find(m=>m.length>=4)||cl;
    carnet.liste.forEach(c=>{
      const s=norm(c.societe);if(!s)return;
      if(cl.includes(s)||s.includes(cl)||s.split(" ")[0]===premier||premier===s){const k=norm(c.nom_affiche);if(!vus.has(k)){vus.add(k);out.push(c.nom_affiche);}}
    });
    return out.slice(0,10);
  },[lignes,carnet.liste,cl]);
  const dejaContact=nom=>{const k=norm(nom);return k?lignes.filter(l=>l.edition===edition&&norm(l.contact)===k):[];};

  const valides=rows.filter(r=>r.contact.trim()&&(r.grands+r.petits)>0);
  const pret=client.trim()&&valides.length>0;

  async function enregistrer(){
    if(!pret||occupe)return;
    setOccupe(true);setErreur(null);
    const corps=valides.map(r=>({edition,donne_le:date||aujourdhui(),client:client.trim(),contact:r.contact.trim(),grands:r.grands,petits:r.petits,par:sessionTech||null}));
    const rep=await db.post("calendriers",corps);
    if(Array.isArray(rep)&&rep.length===corps.length){onEnregistre(rep,client.trim());}
    else{setErreur("L'enregistrement n'a pas abouti (connexion ?). Rien n'a été noté.");}
    setOccupe(false);
  }

  return(<div style={{...CARTE,border:"2px solid #1B4F8A"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
      <div style={{fontSize:16,fontWeight:800,color:"#1B4F8A"}}>🗓 Donner un calendrier</div>
      <button type="button" onClick={onAnnuler} style={{...BTN2,padding:"5px 12px"}}>Annuler</button>
    </div>

    <div style={{marginBottom:12}}>
      <label style={LBL}>Client *</label>
      <div key={cleClient}>{champClient(client,v=>setClient(v))}</div>
      {dejaClient.length>0&&<div style={{marginTop:8,background:"#FFF8E1",border:"1px solid #E8720C",borderRadius:8,padding:"8px 10px",fontSize:13,color:"#8A4B00"}}>
        ⚠ Ce client a déjà reçu des calendriers pour l'édition {edition} :
        {dejaClient.map(l=><div key={l.id} style={{marginTop:2}}>• {l.contact||"(sans contact)"} — {libelleQte(l.grands,l.petits)} le {frDate(l.donne_le)}</div>)}
      </div>}
    </div>

    {proposes.length>0&&<div style={{marginBottom:12}}>
      <label style={LBL}>Contacts connus de ce client (touchez pour ajouter)</label>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {proposes.map(nom=>{const d=dejaContact(nom);return(<button key={nom} type="button" onClick={()=>ajouterRow(nom)} style={{background:d.length?"#FFF8E1":"#EEF4FF",border:"1.5px solid "+(d.length?"#E8720C":"#1B4F8A"),color:d.length?"#8A4B00":"#1B4F8A",borderRadius:20,padding:"5px 12px",fontSize:13,cursor:"pointer"}}>{nom}{d.length?" ✓ déjà reçu":""}</button>);})}
      </div>
    </div>}

    <div style={{marginBottom:6}}><label style={LBL}>Contacts qui reçoivent un calendrier *</label></div>
    {rows.map((r,i)=>{const d=dejaContact(r.contact);return(<div key={r.id} style={{background:"#F8F9FA",border:"1px solid #E2E6EA",borderRadius:10,padding:"10px 12px",marginBottom:8}}>
      <div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:8}}>
        <div style={{flex:1,minWidth:0}}><ChampContact valeur={r.contact} onChange={(id,val)=>majRow(r.id,{contact:val})} champ={{id:"contact"+r.id,remplit:{}}} v={{}}/></div>
        {rows.length>1&&<button type="button" onClick={()=>retirerRow(r.id)} style={{background:"#FFF5F5",border:"1px solid #D73A49",color:"#D73A49",borderRadius:6,padding:"0 10px",height:36,cursor:"pointer",flex:"none"}} aria-label={"Retirer le contact "+(i+1)}>✕</button>}
      </div>
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
        <Compteur libelle="Grands" valeur={r.grands} onChange={n=>majRow(r.id,{grands:n})}/>
        <Compteur libelle="Petits" valeur={r.petits} onChange={n=>majRow(r.id,{petits:n})}/>
      </div>
      {d.length>0&&<div style={{marginTop:8,fontSize:12,color:"#8A4B00",background:"#FFF8E1",border:"1px solid #E8720C",borderRadius:6,padding:"6px 8px"}}>⚠ A déjà reçu pour l'édition {edition} : {d.map(l=>libelleQte(l.grands,l.petits)+" le "+frDate(l.donne_le)+(l.client&&norm(l.client)!==cl?" ("+l.client+")":"")).join(" ; ")}</div>}
    </div>);})}
    <button type="button" onClick={()=>ajouterRow()} style={{...BTN2,marginBottom:14}}>➕ Ajouter un autre contact (même client)</button>

    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
      <div style={{flex:"1 1 150px"}}><label style={LBL}>Date de remise</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={INP}/></div>
      <div style={{flex:"1 1 150px"}}><label style={LBL}>Édition du calendrier</label>
        <select value={edition} onChange={e=>setEdition(parseInt(e.target.value,10))} style={INP}>{editionsConnues.map(y=><option key={y} value={y}>{y}</option>)}</select>
      </div>
    </div>

    {erreur&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:6,padding:"8px 10px",fontSize:13,color:"#D73A49",marginBottom:10}}>{erreur}</div>}
    <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
      <button type="button" onClick={enregistrer} disabled={!pret||occupe} style={{...BTN1,opacity:pret&&!occupe?1:0.5}}>{occupe?"⏳ Enregistrement…":"✓ Enregistrer"+(valides.length>1?" ("+valides.length+" contacts)":"")}</button>
      {!pret&&<span style={{fontSize:12,color:"#6B7280"}}>{!client.trim()?"Choisissez le client.":"Indiquez au moins un contact et une quantité."}</span>}
    </div>
  </div>);
}

// ── page ───────────────────────────────────────────────────────────────
export default function PageCalendrier({sessionTech,champClient}){
  const [donnees,setDonnees]=useState({lignes:[],dispo:null});
  const [charge,setCharge]=useState(false);
  const [erreur,setErreur]=useState(null);
  const [recherche,setRecherche]=useState("");
  const [edition,setEdition]=useState(editionParDefaut());
  const [formulaire,setFormulaire]=useState(false);
  const [aSupprimer,setASupprimer]=useState(null);
  const [message,setMessage]=useState(null);
  const [activation,setActivation]=useState(false);

  async function recharger(){
    try{const r=await lire();setDonnees(r);setErreur(null);setCharge(true);return r.dispo;}
    catch(e){setErreur("Lecture impossible pour le moment (connexion ?).");setCharge(true);return null;}
  }
  useEffect(()=>{recharger();},[]);
  const lignes=donnees.lignes;

  const editions=useMemo(()=>{
    const s=new Set(lignes.map(l=>l.edition));s.add(editionParDefaut());s.add(editionParDefaut()-1);
    return [...s].sort((a,b)=>b-a);
  },[lignes]);

  const deLEdition=useMemo(()=>lignes.filter(l=>edition==="toutes"||l.edition===edition),[lignes,edition]);
  const filtrees=useMemo(()=>{
    const mots=norm(recherche).split(" ").filter(Boolean);
    if(!mots.length)return deLEdition;
    return deLEdition.filter(l=>{const h=norm(l.client+" "+l.contact+" "+frDate(l.donne_le)+" "+frMois(l.donne_le)+" "+l.edition);return mots.every(m=>h.includes(m));});
  },[deLEdition,recherche]);

  const groupes=useMemo(()=>{
    const m=new Map();
    filtrees.forEach(l=>{const k=norm(l.client);if(!m.has(k))m.set(k,{client:l.client,lignes:[],grands:0,petits:0,dernier:""});const g=m.get(k);g.lignes.push(l);g.grands+=l.grands||0;g.petits+=l.petits||0;if(String(l.donne_le)>g.dernier)g.dernier=String(l.donne_le);});
    return [...m.values()].sort((a,b)=>b.dernier.localeCompare(a.dernier)||a.client.localeCompare(b.client,"fr"));
  },[filtrees]);
  const totalG=filtrees.reduce((n,l)=>n+(l.grands||0),0),totalP=filtrees.reduce((n,l)=>n+(l.petits||0),0);

  function apresEnregistrement(rows,client){
    setDonnees(d=>({...d,lignes:[...rows,...d.lignes]}));
    setFormulaire(false);
    setEdition(rows[0].edition);
    setMessage("✓ Noté pour "+client+" : "+rows.map(r=>r.contact+" ("+libelleQte(r.grands,r.petits)+")").join(", "));
    setTimeout(()=>setMessage(null),6000);
  }
  async function supprimer(){
    const l=aSupprimer;if(!l)return;
    try{
      const r=await fetch(SUPA_URL+"/rest/v1/calendriers?id=eq."+l.id,{method:"DELETE",headers:H});
      if(!r.ok)throw new Error("refus");
      setDonnees(d=>({...d,lignes:d.lignes.filter(x=>x.id!==l.id)}));setASupprimer(null);
    }catch(e){setErreur("La suppression n'a pas abouti (connexion ?).");}
  }

  if(donnees.dispo===false)return(<div style={{maxWidth:760,margin:"0 auto",padding:"20px 16px"}}>
    <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 12px"}}>🗓 Calendriers</h1>
    <NoticeActivation titre="Activer le suivi des calendriers" intro="La base de données doit recevoir une petite table pour noter les calendriers donnés. C'est à faire une seule fois, par le responsable (compte Supabase)." sql={SQL_CALENDRIER} onVerifier={recharger}/>
  </div>);

  return(<div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}>
      <div style={{minWidth:0}}>
        <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 2px"}}>🗓 Calendriers</h1>
        <div style={{fontSize:13,color:"#6B7280"}}>Qui a déjà reçu un calendrier, combien et quand.</div>
      </div>
      {!formulaire&&<button type="button" onClick={()=>setFormulaire(true)} style={BTN1}>➕ Donner un calendrier</button>}
    </div>

    {message&&<div style={{background:"#F0FFF4",border:"1px solid #22863A",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#22863A",marginBottom:12}}>{message}</div>}
    {erreur&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#D73A49",marginBottom:12}}>{erreur}</div>}

    {formulaire&&<FormulaireDon lignes={lignes} champClient={champClient} sessionTech={sessionTech} editionsConnues={editions} onEnregistre={apresEnregistrement} onAnnuler={()=>setFormulaire(false)}/>}

    <div style={CARTE}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:"3 1 220px",minWidth:0}}>
          <label style={LBL}>🔍 Rechercher un client ou un contact</label>
          <input type="search" value={recherche} onChange={e=>setRecherche(e.target.value)} placeholder="Ex : Circor, Dupont, septembre…" style={INP} autoComplete="off"/>
        </div>
        <div style={{flex:"1 1 130px"}}>
          <label style={LBL}>Édition</label>
          <select value={edition} onChange={e=>setEdition(e.target.value==="toutes"?"toutes":parseInt(e.target.value,10))} style={INP}>
            {editions.map(y=><option key={y} value={y}>{y}</option>)}
            <option value="toutes">Toutes</option>
          </select>
        </div>
      </div>
      <div style={{marginTop:10,fontSize:13,color:"#374151"}}>
        {!charge?"Chargement…":filtrees.length===0
          ?(recherche.trim()?<span>Aucun calendrier donné à « <b>{recherche.trim()}</b> » {edition==="toutes"?"":"pour l'édition "+edition}.</span>:"Aucun calendrier noté pour le moment.")
          :<span><b>{pluriel(totalG,"grand")}</b> et <b>{pluriel(totalP,"petit")}</b> — {pluriel(groupes.length,"client")}, {pluriel(filtrees.length,"remise")}{recherche.trim()?" correspondant à la recherche":""}{edition==="toutes"?"":" · édition "+edition}</span>}
      </div>
    </div>

    {aSupprimer&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:8,padding:"10px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <span style={{flex:1,minWidth:200,fontSize:13,color:"#D73A49"}}>Supprimer la ligne « {aSupprimer.client} — {aSupprimer.contact||"sans contact"} — {libelleQte(aSupprimer.grands,aSupprimer.petits)} » ?</span>
      <button type="button" onClick={supprimer} style={{...BTN1,background:"#D73A49",padding:"6px 14px"}}>🗑 Supprimer</button>
      <button type="button" onClick={()=>setASupprimer(null)} style={{...BTN2,padding:"5px 12px"}}>Annuler</button>
    </div>}

    {groupes.map(g=>(<div key={norm(g.client)} style={CARTE}>
      <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"baseline",flexWrap:"wrap",marginBottom:6}}>
        <div style={{fontSize:15,fontWeight:800,color:"#1B4F8A",minWidth:0,overflowWrap:"anywhere"}}>{g.client}</div>
        <div style={{fontSize:13,fontWeight:700,color:"#374151"}}>{libelleQte(g.grands,g.petits)}</div>
      </div>
      {g.lignes.map(l=>(<div key={l.id} style={{display:"flex",gap:10,alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderTop:"1px solid #F3F4F6",flexWrap:"wrap"}}>
        <div style={{minWidth:0,flex:"1 1 180px"}}>
          <div style={{fontSize:14,fontWeight:600,overflowWrap:"anywhere"}}>{l.contact||"(sans contact)"}</div>
          <div style={{fontSize:12,color:"#6B7280"}}>{frDate(l.donne_le)}{edition==="toutes"?" · édition "+l.edition:""}{l.par?" · noté par "+l.par:""}</div>
        </div>
        <div style={{fontSize:13,fontWeight:700,color:"#1B4F8A"}}>{libelleQte(l.grands,l.petits)}</div>
        <button type="button" onClick={()=>setASupprimer(l)} title="Supprimer cette ligne" aria-label="Supprimer cette ligne" style={{background:"transparent",border:"none",color:"#9CA3AF",cursor:"pointer",fontSize:15,padding:"4px 8px"}}>🗑</button>
      </div>))}
    </div>))}
  </div>);
}
