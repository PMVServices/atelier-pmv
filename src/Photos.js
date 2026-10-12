// Photos des fiches : dépôt par glisser-déposer, petite croix de suppression, suppression en base.
// Partagé par App.js (fiche atelier, fiche chantier, liste atelier) et Chantier.js (liste chantier).
import React, {useState} from "react";
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
      if(fs.length)onFichiers(fs);
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
