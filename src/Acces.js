import React, {useState, useEffect, useMemo} from "react";
import {db, SUPA_URL, H} from "./supabase";

// Accès par personne : à chaque ouverture l'appli demande « Qui ouvre l'application ? » (Nom Prénom) ;
// le profil de la personne choisie (Administrateur, Technicien, Commercial) décide de ce qu'elle voit.
// La liste des personnes est rangée dans la base (parametres_app, clé "acces_personnes") et se gère dans l'écran « Accès ».
// Barrière d'interface seulement : la base reste accessible à qui connaît la clé publique de l'appli.
export const PROFILS={
  admin:{label:"Administrateur",icone:"🔓"},
  tech:{label:"Technicien",icone:"🛠"},
  commercial:{label:"Commercial",icone:"💼"},
  maintenance:{label:"Maintenance",icone:"⚙️"}, // ne remplit aucune fiche : modifie seulement les champs, intitulés et colonnes du planning (page « Maintenance »)
};
export const LectureCtx=React.createContext(false);
// Personne connectée + « demander qui utilise l'appli » (fenêtre de choix par-dessus l'écran en cours, sans le fermer) : sert aux fiches
export const PersonneCtx=React.createContext(null); // la personne connectée (le profil Commercial a, comme un technicien, la main sur les fiches atelier et chantier et sur le planning)

const CLE="acces_personnes";
const CACHE="pmv_acces_cache";
export const CLE_PIN="pmv_pin_ok";            // appareil déverrouillé (code demandé une seule fois par appareil)
export const CLE_SESSION="pmv_moi";            // personne choisie pour cette ouverture (sessionStorage)
export const CLE_DERNIERE="pmv_derniere_personne"; // dernière personne sur cet appareil (localStorage)

const norm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
export const nomComplet=p=>p?(String(p.nom||"").toUpperCase()+" "+(p.prenom||"")).trim():"";
export const nomCourt=p=>p?((p.prenom||"")+(p.nom?" "+String(p.nom).charAt(0).toUpperCase()+".":"")).trim():"";
const nouvelId=()=>"p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

// Renvoie {liste} (tableau, éventuellement vide si personne n'est encore enregistré) ou {liste:null, erreur} si la base est injoignable sans copie locale.
export async function lirePersonnes(){
  try{
    const r=await fetch(SUPA_URL+"/rest/v1/parametres_app?select=cle,valeur&cle=eq."+CLE,{headers:H});
    const rows=await r.json();
    if(!r.ok||!Array.isArray(rows))throw new Error("lecture");
    let liste=[];
    if(rows[0]&&rows[0].valeur){try{const a=JSON.parse(rows[0].valeur);if(Array.isArray(a))liste=a.filter(p=>p&&p.id&&p.nom&&PROFILS[p.profil]);}catch(e){liste=[];}}
    try{localStorage.setItem(CACHE,JSON.stringify(liste));}catch(e){}
    return {liste};
  }catch(e){
    try{const c=JSON.parse(localStorage.getItem(CACHE)||"null");if(Array.isArray(c))return {liste:c,horsLigne:true};}catch(err){}
    return {liste:null,erreur:"Impossible de charger la liste des personnes (connexion ?)."};
  }
}
export async function ecrirePersonnes(liste){
  await db.upsert("parametres_app",[{cle:CLE,valeur:JSON.stringify(liste)}],"cle");
  try{localStorage.setItem(CACHE,JSON.stringify(liste));}catch(e){}
}

const OVERLAY={position:"fixed",inset:0,background:"#1B4F8A",display:"flex",zIndex:999,padding:8,overflowY:"auto",boxSizing:"border-box"};
const CARTE={background:"#fff",borderRadius:16,padding:"26px 22px",width:"100%",maxWidth:400,boxShadow:"0 8px 40px rgba(0,0,0,0.3)",boxSizing:"border-box",margin:"auto"};
const INP={width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid #D1D5DB",fontSize:15,boxSizing:"border-box",background:"#fff"};
const LBL={display:"block",fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".04em",marginBottom:4};
const BTN1={background:"#1B4F8A",color:"#fff",border:"none",padding:"10px 18px",borderRadius:8,fontWeight:700,fontSize:14,cursor:"pointer"};
const BTN2={background:"#fff",color:"#1B4F8A",border:"1.5px solid #1B4F8A",padding:"9px 14px",borderRadius:8,fontWeight:600,fontSize:13,cursor:"pointer"};

export function EcranChargement({erreur,onRetour}){
  return(<div style={OVERLAY}><div style={{...CARTE,textAlign:"center"}}>
    <div style={{fontSize:15,color:erreur?"#D73A49":"#6B7280",marginBottom:erreur?14:0}}>{erreur||"Chargement…"}</div>
    {erreur&&<button type="button" style={BTN1} onClick={onRetour}>Réessayer</button>}
  </div></div>);
}

// ── code de l'appareil (une seule fois par appareil) ───────────────────
export function EcranCode({code,logo,onSucces}){
  const [s,setS]=useState("");const [err,setErr]=useState(false);
  function tap(c){
    if(s.length>=4)return;
    const n=s+c;setS(n);
    if(n.length===4){
      if(n===code){try{localStorage.setItem(CLE_PIN,"1");}catch(e){}onSucces();}
      else{setErr(true);setTimeout(()=>{setS("");setErr(false);},800);}
    }
  }
  const touches=["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return(<div style={OVERLAY}><div style={{...CARTE,maxWidth:300,textAlign:"center",padding:"28px 24px"}}>
    {logo&&<img src={logo} alt="PMV Services" style={{height:56,marginBottom:10,objectFit:"contain"}}/>}
    <p style={{fontSize:13,color:"#6B7280",margin:"0 0 6px"}}>Code de l'appareil</p>
    <p style={{fontSize:11,color:"#9CA3AF",margin:"0 0 16px"}}>Demandé une seule fois sur cet appareil.</p>
    <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:20}}>
      {[0,1,2,3].map(i=><div key={i} style={{width:16,height:16,borderRadius:"50%",background:s.length>i?(err?"#D73A49":"#1B4F8A"):"#E2E6EA",transition:"background 0.15s"}}/>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
      {touches.map((t,i)=>t===""?<div key={i}/>:<button key={i} type="button" onClick={()=>t==="⌫"?setS(ss=>ss.slice(0,-1)):tap(t)} style={{padding:"14px",fontSize:18,fontWeight:600,borderRadius:10,border:"1.5px solid #E2E6EA",background:t==="⌫"?"#F5F6F8":"#fff",cursor:"pointer",color:t==="⌫"?"#6B7280":"#1A1A2E"}}>{t}</button>)}
    </div>
    {err&&<p style={{color:"#D73A49",fontSize:13,marginTop:12,fontWeight:600}}>Code incorrect</p>}
  </div></div>);
}

// ── « Qui ouvre l'application ? » ──────────────────────────────────────
export function EcranQui({personnes,derniereId,onChoisir,onAnnuler,titre,logo}){
  const [q,setQ]=useState("");
  const tri=useMemo(()=>[...personnes].sort((a,b)=>(String(a.nom)+" "+String(a.prenom)).localeCompare(String(b.nom)+" "+String(b.prenom),"fr")),[personnes]);
  const mots=norm(q).split(" ").filter(Boolean);
  const liste=tri.filter(p=>{const h=norm(nomComplet(p));return mots.every(m=>h.includes(m));});
  const derniere=personnes.find(p=>p.id===derniereId);
  return(<div style={OVERLAY}><div style={{...CARTE,maxWidth:760,padding:"14px 12px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:12}}>
      {logo&&<img src={logo} alt="PMV Services" style={{height:38,objectFit:"contain"}}/>}
      <div style={{fontSize:19,fontWeight:800,color:"#1A1A2E"}}>{titre||"Qui ouvre l'application ?"}</div>
    </div>
    {derniere&&!q&&<button type="button" onClick={()=>onChoisir(derniere)} style={{...BTN1,width:"100%",background:"#22863A",marginBottom:10,textAlign:"left",minHeight:54}}>
      Continuer : {nomComplet(derniere)}<span style={{fontSize:12,fontWeight:400,opacity:0.9}}> · {PROFILS[derniere.profil].label}</span>
    </button>}
    {tri.length>24&&<input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un nom…" style={{...INP,marginBottom:10}} autoComplete="off"/>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(132px,1fr))",gap:8}}>
      {liste.map(p=>(<button key={p.id} type="button" onClick={()=>onChoisir(p)} title={PROFILS[p.profil].label} style={{display:"flex",alignItems:"center",gap:8,background:"#F3F6FA",border:"1.5px solid #D6E0EE",borderRadius:10,padding:"6px 8px",minHeight:52,cursor:"pointer",textAlign:"left",color:"#1A1A2E",fontSize:14,fontWeight:600,lineHeight:1.2,overflowWrap:"anywhere"}}>
        <span style={{flex:"none",fontSize:15}}>{PROFILS[p.profil].icone}</span>
        <span style={{minWidth:0}}>{nomComplet(p)}</span>
      </button>))}
    </div>
    {liste.length===0&&<div style={{textAlign:"center",fontSize:13,color:"#9CA3AF",padding:12}}>Aucun nom ne correspond.</div>}
    {onAnnuler&&<div style={{textAlign:"center",marginTop:12}}><button type="button" onClick={onAnnuler} style={{background:"none",border:"none",color:"#6B7280",fontSize:13,cursor:"pointer",textDecoration:"underline"}}>Annuler</button></div>}
  </div></div>);
}

// ── première utilisation : l'administrateur se crée (code administrateur actuel demandé une seule fois) ──
export function EcranPremierDemarrage({codeAdmin,onCree,logo}){
  const [code,setCode]=useState("");const [nom,setNom]=useState("");const [prenom,setPrenom]=useState("");
  const [erreur,setErreur]=useState(null);const [occupe,setOccupe]=useState(false);
  async function creer(){
    if(code.trim()!==codeAdmin){setErreur("Code administrateur incorrect.");return;}
    if(!nom.trim()||!prenom.trim()){setErreur("Indiquez le nom et le prénom.");return;}
    setOccupe(true);setErreur(null);
    const p={id:nouvelId(),nom:nom.trim(),prenom:prenom.trim(),profil:"admin",initiales:""};
    try{await ecrirePersonnes([p]);onCree(p);}catch(e){setErreur("L'enregistrement n'a pas abouti (connexion ?).");}
    setOccupe(false);
  }
  return(<div style={OVERLAY}><div style={CARTE}>
    <div style={{textAlign:"center",marginBottom:12}}>
      {logo&&<img src={logo} alt="PMV Services" style={{height:54,objectFit:"contain",marginBottom:8}}/>}
      <div style={{fontSize:18,fontWeight:800,color:"#1A1A2E"}}>Première utilisation des accès</div>
    </div>
    <p style={{fontSize:13,color:"#4B5563",margin:"0 0 14px",lineHeight:1.5}}>L'application ne demande plus de code : elle demande qui ouvre. Aucune personne n'est encore enregistrée. L'administrateur se crée ici (code administrateur actuel demandé une seule fois), puis ajoute les autres personnes dans l'écran « Accès ».</p>
    <div style={{marginBottom:10}}><label style={LBL}>Code administrateur actuel</label><input type="password" inputMode="numeric" maxLength={4} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,""))} style={INP} autoComplete="off"/></div>
    <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
      <div style={{flex:"1 1 140px"}}><label style={LBL}>Nom</label><input type="text" value={nom} onChange={e=>setNom(e.target.value)} style={INP} autoComplete="off"/></div>
      <div style={{flex:"1 1 140px"}}><label style={LBL}>Prénom</label><input type="text" value={prenom} onChange={e=>setPrenom(e.target.value)} style={INP} autoComplete="off"/></div>
    </div>
    {erreur&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:6,padding:"7px 10px",fontSize:13,color:"#D73A49",marginBottom:10}}>{erreur}</div>}
    <button type="button" onClick={creer} disabled={occupe} style={{...BTN1,width:"100%",opacity:occupe?0.6:1}}>{occupe?"⏳ …":"Créer l'administrateur"}</button>
  </div></div>);
}

// ── fenêtre de la personne connectée ───────────────────────────────────
export function MenuPersonne({moi,onChanger,onAcces,onFermer}){
  return(<div onClick={onFermer} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:16}}>
    <div onClick={e=>e.stopPropagation()} style={{...CARTE,maxWidth:340,padding:"22px 20px"}}>
      <div style={{fontSize:12,color:"#6B7280",marginBottom:2}}>Connecté</div>
      <div style={{fontSize:18,fontWeight:800,color:"#1A1A2E",overflowWrap:"anywhere"}}>{nomComplet(moi)}</div>
      <div style={{fontSize:13,color:"#1B4F8A",fontWeight:600,marginBottom:16}}>{PROFILS[moi.profil].icone} {PROFILS[moi.profil].label}</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <button type="button" onClick={onChanger} style={BTN1}>🔁 Changer de personne</button>
        {moi.profil==="admin"&&<button type="button" onClick={onAcces} style={BTN2}>🔑 Gérer les accès</button>}
        <button type="button" onClick={onFermer} style={{...BTN2,border:"1.5px solid #D1D5DB",color:"#6B7280"}}>Fermer</button>
      </div>
    </div>
  </div>);
}

// ── écran « Accès » (administrateur) : personnes et profils ────────────
export function PageAcces({personnes,techs,moi,onEnregistre,onRetour}){
  const [liste,setListe]=useState(()=>personnes.map(p=>({...p})));
  const [nouveau,setNouveau]=useState({nom:"",prenom:"",profil:"tech",initiales:""});
  const [lot,setLot]=useState("");const [lotProfil,setLotProfil]=useState("tech");
  const [occupe,setOccupe]=useState(false);const [message,setMessage]=useState(null);const [erreur,setErreur]=useState(null);
  const modifie=JSON.stringify(liste)!==JSON.stringify(personnes);
  const maj=(id,champs)=>setListe(l=>l.map(p=>p.id===id?{...p,...champs}:p));
  const existe=(nom,prenom,sauf)=>liste.some(p=>p.id!==sauf&&norm(p.nom)===norm(nom)&&norm(p.prenom)===norm(prenom));
  const techsListe=(techs||[]).filter(t=>t&&t!=="Autre");
  function ajouter(){
    if(!nouveau.nom.trim()||!nouveau.prenom.trim()){setErreur("Indiquez le nom et le prénom.");return;}
    if(existe(nouveau.nom,nouveau.prenom)){setErreur("Cette personne existe déjà.");return;}
    setErreur(null);setListe(l=>[...l,{id:nouvelId(),nom:nouveau.nom.trim(),prenom:nouveau.prenom.trim(),profil:nouveau.profil,initiales:nouveau.initiales}]);
    setNouveau({nom:"",prenom:"",profil:nouveau.profil,initiales:""});
  }
  function ajouterLot(){
    const lignes=lot.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);const ajoutes=[];
    lignes.forEach(l=>{
      const m=l.split(/\s+/);if(m.length<2)return;
      const nom=m[0],prenom=m.slice(1).join(" ");
      if(existe(nom,prenom)||ajoutes.some(p=>norm(p.nom)===norm(nom)&&norm(p.prenom)===norm(prenom)))return;
      ajoutes.push({id:nouvelId(),nom,prenom,profil:lotProfil,initiales:""});
    });
    if(!ajoutes.length){setErreur("Rien à ajouter : une personne par ligne, « Nom Prénom », sans doublon.");return;}
    setErreur(null);setListe(l=>[...l,...ajoutes]);setLot("");
    setMessage(ajoutes.length+" personne"+(ajoutes.length>1?"s":"")+" ajoutée"+(ajoutes.length>1?"s":"")+" (pas encore enregistrée"+(ajoutes.length>1?"s":"")+").");
  }
  const retirer=id=>setListe(l=>l.filter(p=>p.id!==id));
  async function enregistrer(){
    setErreur(null);setMessage(null);
    if(!liste.some(p=>p.profil==="admin")){setErreur("Il faut garder au moins un administrateur.");return;}
    if(liste.some(p=>!String(p.nom).trim()||!String(p.prenom).trim())){setErreur("Chaque personne doit avoir un nom et un prénom.");return;}
    setOccupe(true);
    try{await ecrirePersonnes(liste);onEnregistre(liste);setMessage("✓ Accès enregistrés.");}
    catch(e){setErreur("L'enregistrement n'a pas abouti (connexion ?).");}
    setOccupe(false);
  }
  const tri=[...liste].sort((a,b)=>(String(a.nom)+" "+String(a.prenom)).localeCompare(String(b.nom)+" "+String(b.prenom),"fr"));
  const carte={background:"#fff",border:"1px solid #E2E6EA",borderRadius:12,padding:"14px 16px",marginBottom:12};
  return(<div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:6}}>
      <h1 style={{fontSize:22,fontWeight:800,margin:0}}>🔑 Accès</h1>
      <button type="button" onClick={onRetour} style={BTN2}>← Retour</button>
    </div>
    <p style={{fontSize:13,color:"#6B7280",margin:"0 0 14px",lineHeight:1.5}}>À chaque ouverture, l'appli demande qui ouvre. Le profil de la personne décide de ce qu'elle voit : <b>Administrateur</b> (tout), <b>Technicien</b> (fiches, planning, matériel, stock…), <b>Commercial</b> (suivi clients, calendrier, rapports, et fiches atelier, fiches chantier et planning comme un technicien). Les initiales servent à préremplir « qui a fait la fiche » pour un technicien.</p>

    <div style={carte}>
      {tri.map(p=>(<div key={p.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderBottom:"1px solid #F3F4F6"}}>
        <div style={{flex:"2 1 170px",minWidth:0}}>
          <div style={{fontWeight:700,overflowWrap:"anywhere"}}>{nomComplet(p)}{p.id===moi.id&&<span style={{marginLeft:6,fontSize:11,color:"#22863A",fontWeight:600}}>(vous)</span>}</div>
        </div>
        <select value={p.profil} onChange={e=>maj(p.id,{profil:e.target.value})} style={{...INP,flex:"1 1 130px",width:"auto",padding:"7px 8px",fontSize:14}} aria-label={"Profil de "+nomComplet(p)}>
          {Object.keys(PROFILS).map(k=><option key={k} value={k}>{PROFILS[k].label}</option>)}
        </select>
        <select value={p.initiales||""} onChange={e=>maj(p.id,{initiales:e.target.value})} style={{...INP,flex:"0 1 100px",width:"auto",padding:"7px 8px",fontSize:14}} aria-label={"Initiales de "+nomComplet(p)}>
          <option value="">Initiales</option>
          {techsListe.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <button type="button" onClick={()=>retirer(p.id)} disabled={p.id===moi.id} title={p.id===moi.id?"Vous ne pouvez pas vous retirer vous-même":"Retirer cette personne"} aria-label={"Retirer "+nomComplet(p)} style={{background:"transparent",border:"none",fontSize:16,cursor:p.id===moi.id?"not-allowed":"pointer",opacity:p.id===moi.id?0.3:1,padding:"4px 8px"}}>🗑</button>
      </div>))}
    </div>

    <div style={carte}>
      <div style={{fontSize:14,fontWeight:800,color:"#1B4F8A",marginBottom:10}}>➕ Ajouter une personne</div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
        <div style={{flex:"1 1 140px"}}><label style={LBL}>Nom</label><input type="text" value={nouveau.nom} onChange={e=>setNouveau(n=>({...n,nom:e.target.value}))} style={INP} autoComplete="off"/></div>
        <div style={{flex:"1 1 140px"}}><label style={LBL}>Prénom</label><input type="text" value={nouveau.prenom} onChange={e=>setNouveau(n=>({...n,prenom:e.target.value}))} style={INP} autoComplete="off"/></div>
        <div style={{flex:"1 1 140px"}}><label style={LBL}>Profil</label><select value={nouveau.profil} onChange={e=>setNouveau(n=>({...n,profil:e.target.value}))} style={INP}>{Object.keys(PROFILS).map(k=><option key={k} value={k}>{PROFILS[k].label}</option>)}</select></div>
        <div style={{flex:"1 1 110px"}}><label style={LBL}>Initiales</label><select value={nouveau.initiales} onChange={e=>setNouveau(n=>({...n,initiales:e.target.value}))} style={INP}><option value="">—</option>{techsListe.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
      </div>
      <button type="button" onClick={ajouter} style={BTN2}>Ajouter à la liste</button>
      <details style={{marginTop:14}}>
        <summary style={{cursor:"pointer",fontSize:13,fontWeight:600,color:"#1B4F8A"}}>Ajouter plusieurs personnes d'un coup</summary>
        <div style={{marginTop:8}}>
          <label style={LBL}>Une personne par ligne : Nom Prénom</label>
          <textarea value={lot} onChange={e=>setLot(e.target.value)} rows={5} placeholder={"DUPONT Jean\nMARTIN Claire"} style={{...INP,fontFamily:"inherit",resize:"vertical"}}/>
          <div style={{display:"flex",gap:10,alignItems:"center",marginTop:8,flexWrap:"wrap"}}>
            <select value={lotProfil} onChange={e=>setLotProfil(e.target.value)} style={{...INP,width:"auto"}}>{Object.keys(PROFILS).map(k=><option key={k} value={k}>{PROFILS[k].label}</option>)}</select>
            <button type="button" onClick={ajouterLot} style={BTN2}>Ajouter ces personnes</button>
          </div>
        </div>
      </details>
    </div>

    {erreur&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#D73A49",marginBottom:12}}>{erreur}</div>}
    {message&&<div style={{background:"#F0FFF4",border:"1px solid #22863A",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#22863A",marginBottom:12}}>{message}</div>}
    <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:30}}>
      <button type="button" onClick={enregistrer} disabled={occupe||!modifie} style={{...BTN1,opacity:occupe||!modifie?0.5:1}}>{occupe?"⏳ …":"💾 Enregistrer les accès"}</button>
      {modifie&&<span style={{fontSize:12,color:"#8A4B00"}}>Modifications non enregistrées.</span>}
    </div>
  </div>);
}
