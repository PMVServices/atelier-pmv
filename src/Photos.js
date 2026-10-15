// Photos des fiches : dépôt par glisser-déposer, petite croix de suppression, suppression en base.
// Partagé par App.js (fiche atelier, fiche chantier, liste atelier) et Chantier.js (liste chantier).
import React, {useState, useRef, useEffect} from "react";
import {db, SUPA_URL, SUPA_KEY} from "./supabase";

const ENTETES={apikey:SUPA_KEY,Authorization:"Bearer "+SUPA_KEY};

// vrai sur un ordinateur avec souris (le glisser-déposer n'a pas de sens sur tablette/téléphone)
export function avecSouris(){
  return typeof window!=="undefined"&&!!window.matchMedia&&window.matchMedia("(pointer: fine)").matches;
}

function estImage(f){return /^image\//.test(f.type||"")||/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name||"");}

// Zone de dépôt : renvoie [survol, attributs à poser sur la zone]. onFichiers reçoit la liste des images déposées.
export function useDepotImages(onFichiers){
  const [survol,setSurvol]=useState(false);
  const attrs={
    onDragOver:e=>{
      const types=e.dataTransfer&&e.dataTransfer.types?Array.from(e.dataTransfer.types):[];
      if(types.includes("Files")){e.preventDefault();setSurvol(true);}
    },
    onDragLeave:e=>{if(!e.currentTarget.contains(e.relatedTarget))setSurvol(false);},
    onDrop:e=>{
      e.preventDefault();setSurvol(false);
      const fs=Array.from((e.dataTransfer&&e.dataTransfer.files)||[]).filter(estImage);
      if(fs.length){e.stopPropagation();onFichiers(fs);}
    }
  };
  return [survol,attrs];
}
export const styleDepot=survol=>survol?{outline:"2px dashed #1B4F8A",outlineOffset:2,background:"#EEF4FF"}:{};

// Petite croix en haut à droite d'une vignette (volontairement pas un <button> : sur tablette, les boutons sont agrandis)
export function CroixPhoto({onClick}){
  const agir=e=>{e.stopPropagation();onClick();};
  return <span role="button" tabIndex={0} aria-label="Supprimer la photo" title="Supprimer la photo" onClick={agir}
    onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();agir(e);}}}
    style={{position:"absolute",top:2,right:2,width:26,height:26,borderRadius:"50%",background:"rgba(0,0,0,0.65)",color:"#fff",fontSize:14,lineHeight:"26px",textAlign:"center",cursor:"pointer",userSelect:"none",zIndex:2}}>✕</span>;
}

// Supprime la photo de la fiche (ligne en base), puis le fichier s'il n'est plus utilisé par aucune ligne.
// ficheId vide = photo pas encore rattachée à une fiche : seul le fichier est concerné.
export async function supprimerPhotoEnBase(p,table,ficheId){
  if(!p||!p.storage_path)return;
  const chemin=encodeURIComponent(p.storage_path);
  if(ficheId){
    const r=await fetch(SUPA_URL+"/rest/v1/"+table+"?fiche_id=eq."+ficheId+"&storage_path=eq."+chemin,{method:"DELETE",headers:ENTETES});
    if(!r.ok)throw new Error("La photo n'a pas pu être retirée de la fiche (connexion ?).");
  }
  const r=await fetch(SUPA_URL+"/rest/v1/"+table+"?select=id&storage_path=eq."+chemin,{headers:ENTETES});
  if(r.ok){
    const reste=await r.json();
    if(Array.isArray(reste)&&reste.length===0)await db.deleteFile(p.storage_path);
  }
}

// Bandeau de confirmation affiché sous les vignettes
export function ConfirmerSuppressionPhoto({photo,occupe,onConfirmer,onAnnuler,styleBouton,styleBoutonDanger}){
  if(!photo)return null;
  return <div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:6,padding:"8px 10px",margin:"6px 0",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
    <span style={{fontSize:12,color:"#D73A49",flex:1,minWidth:150}}>Supprimer la photo « {photo.categorie_nom||photo.nom_fichier||"sans nom"} » ?</span>
    <button type="button" onClick={onConfirmer} disabled={occupe} style={{...styleBoutonDanger,fontSize:12,padding:"4px 10px"}}>{occupe?"…":"🗑 Supprimer"}</button>
    <button type="button" onClick={onAnnuler} disabled={occupe} style={{...styleBouton,fontSize:12,padding:"4px 10px"}}>Annuler</button>
  </div>;
}

// ── Quatre façons d'ajouter une photo, partout : choisir un fichier, prendre une photo, glisser-déposer, coller ─────────────
// Le collage (Ctrl+V) va à la dernière zone survolée ou cliquée ; il est ignoré quand on tape dans un champ de texte.
let zoneActive=null;let ecouteColler=false;
function surColler(e){
  const t=e.target;
  if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName||"")))return;
  const fs=Array.from((e.clipboardData&&e.clipboardData.files)||[]).filter(estImage);
  if(fs.length&&zoneActive){e.preventDefault();zoneActive(fs);}
}
const STYLE_BTN={border:"1.5px solid #1B4F8A",background:"#fff",color:"#1B4F8A",borderRadius:6,fontWeight:600,cursor:"pointer"};
export function SourcesPhoto({onFichiers,occupe=false,multiple=true,petit=false,gros=false,etiquetteFichier,styleBouton}){
  const fichierRef=useRef(null);const cameraRef=useRef(null);
  const [msg,setMsg]=useState("");
  const donner=fs=>{const l=(multiple?fs:fs.slice(0,1)).filter(estImage);if(l.length)onFichiers(l);};
  const donnerRef=useRef(donner);donnerRef.current=donner;
  const moiRef=useRef(fs=>donnerRef.current(fs)); // fonction stable : identifie cette zone pour le collage
  const [survol,zoneProps]=useDepotImages(fs=>donner(fs));
  useEffect(()=>{
    if(!ecouteColler){document.addEventListener("paste",surColler);ecouteColler=true;}
    const moi=moiRef.current;
    return()=>{if(zoneActive===moi)zoneActive=null;};
  },[]);
  const armer=()=>{zoneActive=moiRef.current;};
  const souris=avecSouris();
  function choisi(e){const fs=Array.from(e.target.files||[]);e.target.value="";if(fs.length){setMsg("");donner(fs);}}
  async function collerBouton(){
    setMsg("");
    try{
      if(!navigator.clipboard||!navigator.clipboard.read)throw new Error("indisponible");
      const items=await navigator.clipboard.read();const fichiers=[];
      for(const it of items){const t=it.types.find(x=>x.indexOf("image/")===0);if(t){const b=await it.getType(t);fichiers.push(new File([b],"photo-collee-"+Date.now()+"."+(t.split("/")[1]||"png"),{type:t}));}}
      if(!fichiers.length){setMsg("Aucune image copiée : copiez d'abord une photo, puis recliquez sur Coller.");return;}
      donner(fichiers);
    }catch(err){setMsg("Collage direct impossible ici : cliquez dans ce cadre puis faites Ctrl+V.");}
  }
  const bouton={...STYLE_BTN,...(styleBouton||{}),fontSize:petit?11:13,padding:petit?"4px 9px":"9px 14px",minHeight:petit?0:44,opacity:occupe?0.6:1};
  return(<div {...zoneProps} onMouseEnter={armer} onFocus={armer} onClick={armer} tabIndex={-1}
    style={{display:"flex",flexDirection:"column",gap:6,alignItems:petit?"center":"flex-start",padding:petit?2:0,outline:survol?"2px dashed #1B4F8A":"none",outlineOffset:2,background:survol?"#EEF4FF":"transparent",borderRadius:6}}>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:petit?"center":"flex-start"}}>
      {gros
        ?<button type="button" disabled={occupe} onClick={()=>fichierRef.current&&fichierRef.current.click()} aria-label="Ajouter une photo" style={{...bouton,width:92,height:92,minHeight:92,padding:0,borderStyle:"dashed",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}><span style={{fontSize:40,lineHeight:1,fontWeight:400}}>{occupe?"⏳":"+"}</span><span style={{fontSize:11}}>Ajouter</span></button>
        :<button type="button" disabled={occupe} onClick={()=>fichierRef.current&&fichierRef.current.click()} style={bouton}>{occupe?"⏳ Envoi…":(etiquetteFichier||(petit?"📁 Fichier":"📁 Choisir un fichier"))}</button>}
      <button type="button" disabled={occupe} onClick={()=>cameraRef.current&&cameraRef.current.click()} style={bouton}>{petit?"📷 Photo":"📷 Prendre une photo"}</button>
      {souris&&<button type="button" disabled={occupe} onClick={collerBouton} style={bouton} title="Coller une image copiée (ou Ctrl+V)">📋 Coller</button>}
    </div>
    {souris&&!petit&&<span style={{fontSize:10.5,color:"#9CA3AF"}}>ou glissez-déposez la photo ici · Ctrl+V pour coller</span>}
    {msg&&<span style={{fontSize:11,color:"#D73A49"}}>{msg}</span>}
    <input ref={fichierRef} type="file" accept="image/*" multiple={multiple} onChange={choisi} style={{display:"none"}}/>
    <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={choisi} style={{display:"none"}}/>
  </div>);
}
