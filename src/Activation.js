import React, {useState} from "react";
import {SUPA_URL} from "./supabase";

// Écran d'activation partagé : tant que les tables d'une fonction n'existent pas dans Supabase, ses boutons
// restent visibles et mènent ici (3 étapes : copier le SQL, l'exécuter dans Supabase, vérifier).
// onVerifier doit renvoyer true (tables présentes), false (absentes) ou null (réseau).
const BTN1={background:"#1B4F8A",color:"#fff",border:"none",padding:"9px 20px",borderRadius:6,fontWeight:600,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:6};
const BTN2={background:"#fff",color:"#1B4F8A",border:"1.5px solid #1B4F8A",padding:"8px 18px",borderRadius:6,fontWeight:600,fontSize:14,cursor:"pointer"};
const ALERTE={background:"#FFF5F5",border:"1.5px solid #D73A49",borderRadius:6,padding:"8px 12px",fontSize:13,color:"#D73A49",marginBottom:12};

export function NoticeActivation({titre,intro,sql,onVerifier}){
  const [copie,setCopie]=useState(false);
  const [verif,setVerif]=useState(null); // null | "en_cours" | "absente" | "reseau"
  const lienSupabase="https://supabase.com/dashboard/project/"+SUPA_URL.replace("https://","").split(".")[0]+"/sql/new";
  async function copier(){
    try{await navigator.clipboard.writeText(sql);setCopie(true);setTimeout(()=>setCopie(false),2500);}catch(e){}
  }
  async function verifier(){
    if(!onVerifier)return;
    setVerif("en_cours");
    const ok=await onVerifier();
    setVerif(ok===true?null:ok===false?"absente":"reseau");
  }
  const num={flex:"none",width:28,height:28,borderRadius:"50%",background:"#E8720C",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14};
  const ligne={display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"};
  return(<div style={{background:"#FFF8E1",border:"1px solid #E8720C",borderRadius:12,padding:"16px 18px",fontSize:14,lineHeight:1.5}}>
    <div style={{fontWeight:700,color:"#8A4B00",fontSize:16,marginBottom:6}}>⚙ {titre}</div>
    <div style={{color:"#4B5563",marginBottom:16}}>{intro}</div>
    <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:14}}>
      <div style={ligne}><span style={num}>1</span><span style={{flex:"1 1 180px"}}>Copiez le texte SQL.</span><button onClick={copier} style={BTN1}>{copie?"✓ Copié":"📋 Copier le SQL"}</button></div>
      <div style={ligne}><span style={num}>2</span><span style={{flex:"1 1 180px"}}>Ouvrez l'éditeur SQL de Supabase, collez le texte (appui long, Coller), puis appuyez sur <strong>Run</strong>.</span><a href={lienSupabase} target="_blank" rel="noopener noreferrer" onClick={copier} style={{...BTN2,display:"inline-flex",alignItems:"center",minHeight:44,textDecoration:"none",boxSizing:"border-box"}}>Ouvrir Supabase ↗</a></div>
      <div style={ligne}><span style={num}>3</span><span style={{flex:"1 1 180px"}}>Revenez ici : la fonction s'active toute seule, ou touchez Vérifier.</span><button onClick={verifier} disabled={verif==="en_cours"} style={{...BTN2,opacity:verif==="en_cours"?0.6:1}}>{verif==="en_cours"?"Vérification…":"🔄 Vérifier"}</button></div>
    </div>
    {verif==="absente"&&<div style={ALERTE}>Les tables ne sont pas encore détectées. Vérifiez que Supabase a affiché « Success », patientez quelques secondes et touchez Vérifier de nouveau.</div>}
    {verif==="reseau"&&<div style={ALERTE}>Pas de connexion pour le moment. Réessayez dans un instant.</div>}
    <details>
      <summary style={{cursor:"pointer",color:"#8A4B00",fontWeight:600,fontSize:13}}>Voir le texte SQL</summary>
      <pre style={{margin:"10px 0 0",background:"#fff",border:"1px solid #F3D9A8",borderRadius:8,padding:10,fontSize:11,overflowX:"auto",maxHeight:240}}>{sql}</pre>
    </details>
  </div>);
}
