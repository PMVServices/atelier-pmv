import React, {useState, useEffect, useMemo} from "react";
import {SUPA_URL, H} from "./supabase";
import {useCarnet} from "./Contacts";
import {norm, frDate, euros, texteRelance, etatRelance, etatRdv, statutInfo, STATUTS_PROSPECT, STATUTS_RDV, motifInfo, COUL_RELANCE, COUL_RDV} from "./SuiviClients";
import {normaliserDE} from "./Chantier";

// Base clients (profils Commercial et Administrateur, lecture seule) : une fiche par client qui rassemble ce que l'appli sait déjà de lui,
// sans rien saisir de plus : contacts (carnet, devis, fiches, calendriers, rendez-vous), devis suivis, fiches atelier et chantier,
// calendriers remis, prospection et rendez-vous. Elle se remplit donc toute seule au fur et à mesure de l'utilisation.
const CARTE={background:"#fff",border:"1px solid #E2E6EA",borderRadius:12,padding:"14px 16px",marginBottom:12};
const INP={width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid #D1D5DB",fontSize:14,boxSizing:"border-box",background:"#fff"};
const LBL={display:"block",fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".04em",marginBottom:4};
const BTN2={background:"#fff",color:"#1B4F8A",border:"1.5px solid #1B4F8A",padding:"8px 14px",borderRadius:8,fontWeight:600,fontSize:13,cursor:"pointer"};
const LIEN={color:"#1B4F8A",textDecoration:"none",fontSize:13,overflowWrap:"anywhere"};
const PAS=60; // clients affichés par « Afficher plus »

let clientDemande=null; // client à ouvrir à l'arrivée sur la page (demandé depuis le suivi clients)
export function ouvrirClient(nom,onNaviguer){clientDemande=nom;onNaviguer("clients");}

async function lireTable(chemin){
  const out=[];
  for(let debut=0;debut<20000;debut+=1000){
    const r=await fetch(SUPA_URL+"/rest/v1/"+chemin+"&limit=1000&offset="+debut,{headers:H});
    const rows=await r.json();
    if(!Array.isArray(rows))return null; // table absente ou erreur : on continue sans
    out.push(...rows);
    if(rows.length<1000)break;
  }
  return out;
}
async function lireValeurs(table,ids,champs){
  const out=[];
  for(let i=0;i<ids.length;i+=60){
    try{
      const r=await fetch(SUPA_URL+"/rest/v1/"+table+"?select=fiche_id,champ_id,valeur&fiche_id=in.("+ids.slice(i,i+60).join(",")+")&champ_id=in.("+champs.join(",")+")",{headers:H});
      const rows=await r.json();if(Array.isArray(rows))out.push(...rows);
    }catch(e){/* hors ligne : on garde ce qu'on a */}
  }
  return out;
}
const jour=d=>String(d||"").slice(0,10);

const Etiquette=({prospect})=><span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em",padding:"1px 7px",borderRadius:10,border:"1px solid "+(prospect?"#E8720C":"#22863A"),color:prospect?"#E8720C":"#22863A",whiteSpace:"nowrap",verticalAlign:"middle"}}>{prospect?"Prospect":"Client"}</span>;
const Puce=({children,couleur})=><span style={{fontSize:12,padding:"2px 9px",borderRadius:12,background:"#F3F4F6",color:couleur||"#374151",whiteSpace:"nowrap"}}>{children}</span>;
const LienAction=({onClick,children})=><span role="button" tabIndex={0} onClick={onClick} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onClick(e);}}} style={{color:"#1B4F8A",cursor:"pointer",textDecoration:"underline",textDecorationColor:"#B7C9E2"}}>{children}</span>;
function Section({titre,n,children}){
  if(!n)return null;
  return(<details open style={{...CARTE,padding:0}}>
    <summary style={{cursor:"pointer",padding:"12px 16px",fontSize:15,fontWeight:800,color:"#1B4F8A"}}>{titre} <span style={{background:"#EEF4FF",color:"#1B4F8A",borderRadius:10,padding:"1px 8px",fontSize:12,fontWeight:700}}>{n}</span></summary>
    <div style={{padding:"0 16px 12px"}}>{children}</div>
  </details>);
}
const Ligne=({children})=><div style={{padding:"8px 0",borderTop:"1px solid #F0F1F3",fontSize:13,overflowWrap:"anywhere"}}>{children}</div>;
const lienTel=t=>t?<a href={"tel:"+String(t).replace(/\s+/g,"")} style={LIEN}>📞 {t}</a>:null;
const lienMail=m=>m?<a href={"mailto:"+m} style={LIEN}>✉ {m}</a>:null;

// ── fiche d'un client ──────────────────────────────────────────────────────
function FicheClient({c,carnet,onRetour,onOuvrirFiche,fichesParDe}){
  const [valeurs,setValeurs]=useState({atelier:[],chantier:[]});
  useEffect(()=>{
    let ok=true;
    Promise.all([
      lireValeurs("fiche_valeurs",c.atelier.slice(0,150).map(f=>f.id),["contact","telephone","mail"]),
      lireValeurs("fiches_chantier_valeurs",c.chantier.slice(0,150).map(f=>f.id),["ch_contact","ch_tel","ch_mail"]),
    ]).then(([a,ch])=>{if(ok)setValeurs({atelier:a,chantier:ch});});
    return()=>{ok=false;};
  },[c]);

  const contacts=useMemo(()=>{
    const m=new Map();
    const ajouter=(nom,tel,mail,source)=>{
      const k=norm(nom);if(!k)return;
      const x=m.get(k)||{nom:String(nom).trim(),telephone:"",mail:"",sources:new Set()};
      if(tel&&!x.telephone)x.telephone=String(tel).trim();
      if(mail&&!x.mail)x.mail=String(mail).trim();
      x.sources.add(source);m.set(k,x);
    };
    c.devis.forEach(l=>ajouter(l.contact,l.telephone,l.mail,"devis"));
    c.prospects.forEach(p=>ajouter(p.contact,p.telephone,p.mail,"prospection"));
    c.rdv.forEach(r=>ajouter(r.contact,r.telephone,r.mail,"rendez-vous"));
    c.cal.forEach(l=>ajouter(l.contact,"","","calendrier"));
    const parFiche=(rows,cleContact,cleTel,cleMail,source)=>{
      const f=new Map();rows.forEach(r=>{const o=f.get(r.fiche_id)||{};o[r.champ_id]=r.valeur;f.set(r.fiche_id,o);});
      f.forEach(o=>ajouter(o[cleContact],o[cleTel],o[cleMail],source));
    };
    parFiche(valeurs.atelier,"contact","telephone","mail","fiche atelier");
    parFiche(valeurs.chantier,"ch_contact","ch_tel","ch_mail","fiche chantier");
    // carnet : les contacts rattachés à la société (même règle que l'onglet Calendrier), et numéros manquants des contacts déjà connus
    const cl=norm(c.nom);const premier=cl.split(" ").find(w=>w.length>=4)||cl;
    const parNom=new Map(carnet.liste.map(x=>[norm(x.nom_affiche),x]));
    carnet.liste.forEach(x=>{
      const s=norm(x.societe);if(s.length<3||cl.length<3)return;
      if(cl.includes(s)||s.includes(cl)||s.split(" ")[0]===premier||premier===s)ajouter(x.nom_affiche,x.telephone,x.mail,"carnet");
    });
    m.forEach((x,k)=>{const cn=parNom.get(k);if(cn){if(!x.telephone&&cn.telephone)x.telephone=cn.telephone;if(!x.mail&&cn.mail)x.mail=cn.mail;}});
    return [...m.values()].sort((a,b)=>b.sources.size-a.sources.size||a.nom.localeCompare(b.nom,"fr"));
  },[c,valeurs,carnet.liste]);

  const devisEnCours=c.devis.filter(l=>["a_envoyer","envoye"].includes(l.statut));
  const sansActivite=!c.devis.length&&!c.atelier.length&&!c.chantier.length&&!c.cal.length&&!c.prospects.length&&!c.rdv.length;
  const badge=(t,col,fond)=><span style={{padding:"2px 9px",borderRadius:20,border:"1.5px solid "+col,fontSize:12,fontWeight:700,color:col,background:fond,whiteSpace:"nowrap"}}>{t}</span>;
  const statutChantier=s=>String(s||"").replace(/_/g," ");

  return(<div>
    <button type="button" onClick={onRetour} style={{...BTN2,marginBottom:12}}>‹ Tous les clients</button>
    <div style={{...CARTE,borderColor:"#1B4F8A"}}>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <h2 style={{fontSize:20,fontWeight:800,margin:0,overflowWrap:"anywhere"}}>{c.nom}</h2><Etiquette prospect={c.prospect}/>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
        <Puce>👥 {contacts.length} contact{contacts.length>1?"s":""}</Puce>
        <Puce>📄 {c.devis.length} devis{devisEnCours.length?" ("+devisEnCours.length+" en cours)":""}</Puce>
        <Puce>🔧 {c.atelier.length} fiche{c.atelier.length>1?"s":""} atelier</Puce>
        <Puce>🏗 {c.chantier.length} fiche{c.chantier.length>1?"s":""} chantier</Puce>
        {c.cal.length>0&&<Puce>🗓 {c.cal.length} calendrier{c.cal.length>1?"s":""} remis</Puce>}
        {c.rdv.length>0&&<Puce>📅 {c.rdv.length} RDV</Puce>}
      </div>
      {c.derniere&&<div style={{marginTop:8,fontSize:12,color:"#6B7280"}}>Dernière activité : {frDate(c.derniere)}</div>}
    </div>
    {sansActivite&&<div style={{...CARTE,color:"#6B7280",fontSize:13}}>Rien n'est encore enregistré pour ce client. Sa fiche se remplira toute seule : devis, fiches atelier et chantier, calendriers remis, rendez-vous et contacts apparaîtront ici dès qu'ils seront saisis dans l'appli.</div>}

    <Section titre="👥 Contacts" n={contacts.length}>
      {contacts.map(x=><Ligne key={norm(x.nom)}>
        <div style={{display:"flex",gap:8,alignItems:"baseline",flexWrap:"wrap"}}><strong>{x.nom}</strong>{[...x.sources].map(s=><span key={s} style={{fontSize:11,color:"#6B7280",background:"#F3F4F6",borderRadius:10,padding:"1px 7px"}}>{s}</span>)}</div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:2}}>{lienTel(x.telephone)}{lienMail(x.mail)}{!x.telephone&&!x.mail&&<span style={{fontSize:12,color:"#9CA3AF"}}>pas de numéro ni de mail connu</span>}</div>
      </Ligne>)}
    </Section>

    <Section titre="📄 Devis suivis" n={c.devis.length}>
      {[...c.devis].sort((a,b)=>jour(b.date_devis).localeCompare(jour(a.date_devis))).map(l=>{
        const s=statutInfo(l.statut);const e=etatRelance(l);const fiche=fichesParDe.get(l.de);
        return(<Ligne key={l.id}>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><strong>{l.de}</strong>{badge(s.label,s.couleur,s.fond)}<span style={{color:"#6B7280"}}>{frDate(l.date_devis)}</span>{l.montant!==null&&l.montant!==undefined&&<span>{euros(l.montant)} HT</span>}</div>
          {l.objet&&<div style={{color:"#374151"}}>{l.objet}</div>}
          <div style={{fontSize:12,color:"#6B7280"}}>{l.contact}{e&&l.relance_le?" · ":""}{e&&l.relance_le&&<span style={{color:COUL_RELANCE[e],fontWeight:700}}>{texteRelance(l)}</span>}{["refuse","sans_suite"].includes(l.statut)?" · "+motifInfo(l.motif_refus).label:""}</div>
          {fiche&&<div style={{fontSize:12}}><LienAction onClick={()=>onOuvrirFiche(fiche)}>📂 fiche atelier {fiche.de}</LienAction></div>}
        </Ligne>);
      })}
    </Section>

    <Section titre="🔧 Fiches atelier" n={c.atelier.length}>
      {[...c.atelier].sort((a,b)=>jour(b.created_at).localeCompare(jour(a.created_at))).map(f=><Ligne key={f.id}>
        <div style={{display:"flex",gap:8,alignItems:"baseline",flexWrap:"wrap"}}><strong>{f.de||"sans DE"}</strong><span>{f.type_materiel||""}</span><span style={{color:"#6B7280"}}>{frDate(f.created_at)}</span>{f.statut_chantier&&<Puce>{statutChantier(f.statut_chantier)}</Puce>}</div>
        {f.materiel_lieu&&<div style={{color:"#374151"}}>{f.materiel_lieu}</div>}
        <div style={{fontSize:12}}><LienAction onClick={()=>onOuvrirFiche(f)}>Ouvrir la fiche</LienAction></div>
      </Ligne>)}
    </Section>

    <Section titre="🏗 Fiches chantier" n={c.chantier.length}>
      {[...c.chantier].sort((a,b)=>jour(b.created_at).localeCompare(jour(a.created_at))).map(f=><Ligne key={f.id}>
        <div style={{display:"flex",gap:8,alignItems:"baseline",flexWrap:"wrap"}}><strong>{f.de||"sans DE"}</strong><span>{f.type_equipement||""}</span><span style={{color:"#6B7280"}}>{frDate(f.created_at)}</span>{f.statut&&<Puce>{statutChantier(f.statut)}</Puce>}</div>
        {f.materiel&&<div style={{color:"#374151"}}>{f.materiel}</div>}
      </Ligne>)}
      {c.chantier.length>0&&<div style={{fontSize:12,color:"#6B7280",marginTop:6}}>À ouvrir depuis l'onglet Fiche Chantier.</div>}
    </Section>

    <Section titre="🗓 Calendriers remis" n={c.cal.length}>
      {c.cal.map(l=><Ligne key={l.id}><strong>Édition {l.edition}</strong> — {[l.grands?l.grands+" grand"+(l.grands>1?"s":""):"",l.petits?l.petits+" petit"+(l.petits>1?"s":""):""].filter(Boolean).join(" + ")||"—"} <span style={{color:"#6B7280"}}>· {l.contact||"contact non noté"} · {frDate(l.donne_le)}</span></Ligne>)}
    </Section>

    <Section titre="🎯 Prospection" n={c.prospects.length}>
      {c.prospects.map(p=>{const s=STATUTS_PROSPECT.find(x=>x.id===p.statut)||STATUTS_PROSPECT[0];const e=etatRelance(p);return(<Ligne key={p.id}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>{badge(s.label,s.couleur,s.fond)}{p.secteur&&<span>{p.secteur}</span>}{e&&p.relance_le&&<span style={{color:COUL_RELANCE[e],fontWeight:700}}>{texteRelance(p)}</span>}</div>
        {p.potentiel&&<div style={{color:"#374151"}}>{p.potentiel}</div>}
      </Ligne>);})}
    </Section>

    <Section titre="📅 Rendez-vous" n={c.rdv.length}>
      {[...c.rdv].sort((a,b)=>jour(b.date_rdv).localeCompare(jour(a.date_rdv))).map(r=>{const s=STATUTS_RDV.find(x=>x.id===r.statut)||STATUTS_RDV[0];const e=etatRdv(r);return(<Ligne key={r.id}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><strong style={{color:e?COUL_RDV[e]:"#374151"}}>{frDate(r.date_rdv)}{r.heure?" · "+r.heure:""}</strong>{badge(s.label,s.couleur,s.fond)}{r.objet&&<span>{r.objet}</span>}</div>
        {(r.lieu||r.compte_rendu)&&<div style={{fontSize:12,color:"#6B7280"}}>{[r.lieu,r.compte_rendu&&"Compte rendu : "+r.compte_rendu].filter(Boolean).join(" · ")}</div>}
      </Ligne>);})}
    </Section>
  </div>);
}

// ── page : liste des clients, puis fiche du client choisi ──────────────────────────────────
export default function PageClients({clients,fiches,suivi,onOuvrirFiche}){
  const carnet=useCarnet();
  const [choisi,setChoisi]=useState(()=>clientDemande?norm(clientDemande):null);
  const [nomDemande]=useState(()=>clientDemande);
  useEffect(()=>{clientDemande=null;},[]); // demande consommée une fois la page affichée
  const [recherche,setRecherche]=useState("");
  const [filtre,setFiltre]=useState("tous");
  const [nb,setNb]=useState(PAS);
  const [donnees,setDonnees]=useState({cal:[],chantiers:[],charge:false});
  useEffect(()=>{
    let ok=true;
    Promise.all([lireTable("calendriers?select=*&order=donne_le.desc"),lireTable("fiches_chantier?select=id,de,client,materiel,type_equipement,statut,created_at&order=created_at.desc")])
      .then(([cal,ch])=>{if(ok)setDonnees({cal:cal||[],chantiers:ch||[],charge:true});})
      .catch(()=>{if(ok)setDonnees(x=>({...x,charge:true}));});
    return()=>{ok=false;};
  },[]);

  const fichesParDe=useMemo(()=>{const m=new Map();(fiches||[]).forEach(f=>{const k=normaliserDE(f.de||"");if(k&&!m.has(k))m.set(k,f);});return m;},[fiches]);
  const {index,liste}=useMemo(()=>{
    const m=new Map();
    const nomsListe=new Set((clients||[]).map(norm));
    const get=nom=>{const k=norm(nom);if(!k)return null;if(!m.has(k))m.set(k,{cle:k,nom:String(nom).trim(),devis:[],atelier:[],chantier:[],cal:[],prospects:[],rdv:[],derniere:""});return m.get(k);};
    const vu=(c,d)=>{const j=jour(d);if(j&&j>c.derniere)c.derniere=j;};
    (clients||[]).forEach(get);
    suivi.lignes.forEach(l=>{const c=get(l.client);if(c){c.devis.push(l);vu(c,l.date_devis);}});
    (fiches||[]).forEach(f=>{const c=get(f.client);if(c){c.atelier.push(f);vu(c,f.created_at);}});
    donnees.chantiers.forEach(f=>{const c=get(f.client);if(c){c.chantier.push(f);vu(c,f.created_at);}});
    donnees.cal.forEach(l=>{const c=get(l.client);if(c){c.cal.push(l);vu(c,l.donne_le);}});
    suivi.prospects.forEach(p=>{const c=get(p.entreprise);if(c){c.prospects.push(p);vu(c,p.date_demarche);}});
    suivi.rdv.forEach(r=>{const c=get(r.entreprise);if(c){c.rdv.push(r);if(r.statut==="fait")vu(c,r.date_rdv);}});
    m.forEach(c=>{c.prospect=!nomsListe.has(c.cle)&&!c.devis.length&&!c.atelier.length&&!c.chantier.length&&!c.cal.length;});
    return {index:m,liste:[...m.values()].sort((a,b)=>a.nom.localeCompare(b.nom,"fr"))};
  },[clients,fiches,suivi.lignes,suivi.prospects,suivi.rdv,donnees]);

  const filtrees=useMemo(()=>{
    const mots=norm(recherche).split(" ").filter(Boolean);
    return liste.filter(c=>{
      if(filtre==="actifs"&&!(c.devis.some(l=>["a_envoyer","envoye"].includes(l.statut))||c.rdv.some(r=>r.statut==="prevu")||c.prospects.some(p=>["a_demarcher","demarche"].includes(p.statut))))return false;
      if(filtre==="prospects"&&!c.prospect)return false;
      if(!mots.length)return true;
      const h=norm(c.nom+" "+c.devis.map(l=>l.de).join(" ")+" "+c.atelier.map(f=>f.de).join(" "));
      return mots.every(m=>h.includes(m));
    });
  },[liste,recherche,filtre]);

  const courant=choisi?(index.get(choisi)||{cle:choisi,nom:nomDemande||choisi,devis:[],atelier:[],chantier:[],cal:[],prospects:[],rdv:[],derniere:"",prospect:false}):null;

  return(<div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
    <h1 style={{fontSize:22,fontWeight:800,margin:"0 0 4px"}}>👥 Clients</h1>
    {!courant&&<>
      <div style={{fontSize:13,color:"#6B7280",marginBottom:14}}>La fiche d'un client rassemble tout ce que l'appli sait de lui : contacts, devis, fiches, calendriers remis, rendez-vous. Elle se remplit toute seule au fur et à mesure.</div>
      <div style={CARTE}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div style={{flex:"3 1 220px",minWidth:0}}><label style={LBL}>🔍 Rechercher un client (nom, N° de DE…)</label><input type="search" value={recherche} onChange={e=>{setRecherche(e.target.value);setNb(PAS);}} style={INP} autoComplete="off"/></div>
          <div style={{flex:"1 1 170px"}}><label style={LBL}>Afficher</label>
            <select value={filtre} onChange={e=>{setFiltre(e.target.value);setNb(PAS);}} style={INP}><option value="tous">Tous les clients</option><option value="actifs">Avec un suivi en cours</option><option value="prospects">Prospects seulement</option></select></div>
        </div>
        <div style={{marginTop:8,fontSize:13,color:"#374151"}}>{!donnees.charge?"Chargement des fiches…":filtrees.length+" client"+(filtrees.length>1?"s":"")}</div>
      </div>
      {filtrees.slice(0,nb).map(c=><div key={c.cle} role="button" tabIndex={0} onClick={()=>setChoisi(c.cle)} onKeyDown={e=>{if(e.key==="Enter")setChoisi(c.cle);}} style={{...CARTE,cursor:"pointer",marginBottom:8}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><strong style={{fontSize:15,overflowWrap:"anywhere"}}>{c.nom}</strong><Etiquette prospect={c.prospect}/></div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
          {c.devis.length>0&&<Puce>📄 {c.devis.length} devis</Puce>}
          {c.atelier.length>0&&<Puce>🔧 {c.atelier.length} atelier</Puce>}
          {c.chantier.length>0&&<Puce>🏗 {c.chantier.length} chantier</Puce>}
          {c.cal.length>0&&<Puce>🗓 calendrier</Puce>}
          {c.rdv.some(r=>r.statut==="prevu")&&<Puce couleur="#1B4F8A">📅 RDV prévu</Puce>}
          {c.derniere&&<span style={{fontSize:12,color:"#6B7280",alignSelf:"center"}}>dernière activité {frDate(c.derniere)}</span>}
        </div>
      </div>)}
      {filtrees.length>nb&&<button type="button" onClick={()=>setNb(n=>n+PAS)} style={{...BTN2,width:"100%"}}>Afficher {Math.min(PAS,filtrees.length-nb)} clients de plus ({filtrees.length-nb} restants)</button>}
    </>}
    {courant&&<FicheClient c={courant} carnet={carnet} fichesParDe={fichesParDe} onOuvrirFiche={fi=>{clientDemande=courant.nom;onOuvrirFiche(fi);}} onRetour={()=>setChoisi(null)}/>}
  </div>);
}
