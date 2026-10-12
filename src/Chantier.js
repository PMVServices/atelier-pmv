import React, {useState, useRef} from "react";
import {db} from "./supabase";
import {genHtml, afficherApercu, telechargerZip} from "./pdfUtils";
import {useDepotImages, styleDepot, CroixPhoto, supprimerPhotoEnBase, ConfirmerSuppressionPhoto, avecSouris} from "./Photos";

// Fiche chantier : liste en dossiers (client > N° DE > lieu) comme la fiche atelier, mais dans une autre couleur
// (vert pétrole) pour ne jamais confondre les deux. Le formulaire lui-même (FicheChantier) reste dans App.js.
export const COULEUR_CHANTIER="#0F766E";
const TEINTE={fond:"#E6F4F1",bord:"#99D5CC",bandeau:"#F1F9F7"};
const INP={width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid #D1D5DB",fontSize:13,boxSizing:"border-box",background:"#fff"};
const BTN={background:COULEUR_CHANTIER,color:"#fff",border:"none",padding:"6px 12px",borderRadius:6,fontWeight:600,fontSize:12,cursor:"pointer"};
const BTN_O={background:"#fff",color:COULEUR_CHANTIER,border:"1.5px solid "+COULEUR_CHANTIER,padding:"5px 11px",borderRadius:6,fontWeight:600,fontSize:12,cursor:"pointer"};
const BTN_R={background:"#fff",color:"#D73A49",border:"1.5px solid #D73A49",padding:"5px 11px",borderRadius:6,fontWeight:600,fontSize:12,cursor:"pointer"};

// "7945", "de7945", "DE 7945" -> "DE7945" (même règle que la fiche atelier : toujours DE + chiffres)
export function normaliserDE(t){
  const s=String(t==null?"":t).trim();
  const m=s.match(/^(?:de)?\s*(\d+)$/i);
  return m?"DE"+m[1]:s;
}
const slug=s=>String(s||"").replace(/[^a-z0-9]/gi,"_");
const fmtDate=iso=>{const d=new Date(iso);return isNaN(d)?"":d.toLocaleDateString("fr-FR");};

export const OPTS_DOC={titre:"FICHE CHANTIER",couleur:COULEUR_CHANTIER,statut:""};

// ── Matériel de la fiche : à renouveler / à commander / utilisé (à ne pas renouveler) ──
// La saisie (catégories et listes de références) est dans App.js : ChampMaterielChantier.
export const STATUTS_MATERIEL=[
  {id:"renouveler",label:"À renouveler",color:"#8A4B00",bg:"#FFF3DC"},
  {id:"commander",label:"À commander",color:"#1B4F8A",bg:"#EAF1FB"},
  {id:"utilise",label:"Utilisé, à ne pas renouveler",color:"#22863A",bg:"#E9F6EC"},
];
export function lireMateriel(valeur){try{const a=JSON.parse(valeur||"[]");return Array.isArray(a)?a:[];}catch(e){return [];}}

// ── Case "Entretien en atelier" : ouvre une fiche atelier préremplie ──
export const TYPES_AVEC_FICHE_ATELIER=["Pompe","Moteur","Moto-réducteur"];
export function graineAtelier(v,type){
  const g={};
  const mets=(k,x)=>{if(x!==undefined&&x!==null&&String(x).trim()!=="")g[k]=String(x).trim();};
  mets("client",v.ch_client);mets("de",normaliserDE(v.ch_de));mets("materiel_lieu",v.ch_eq_nom);
  mets("contact",v.ch_contact);mets("telephone",v.ch_tel);mets("mail",v.ch_mail);
  mets("puissance",v.ch_eq_puissance);
  if(type==="Moteur"){mets("marque_moteur",v.ch_eq_marque);mets("type_moteur",v.ch_eq_type);mets("numero_serie",v.ch_eq_serie);mets("vitesse",v.ch_eq_vitesse);mets("fixation",v.ch_eq_fixation);}
  if(type==="Pompe"){mets("marque_pompe",v.ch_eq_marque);mets("modele_pompe",v.ch_eq_ref);mets("numero_serie_pompe",v.ch_eq_serie);mets("vitesse",v.ch_eq_vitesse);}
  if(type==="Moto-réducteur"){mets("marque_reducteur",v.ch_eq_marque);mets("modele_reducteur",v.ch_eq_ref);mets("numero_serie_reducteur",v.ch_eq_serie);mets("vitesse_sortie",v.ch_eq_vitesse);mets("rapport_reduction",v.ch_eq_rapport);mets("fixation",v.ch_eq_fixation);}
  return g;
}
export function CaseEntretienAtelier({valeur,onChange,v,type,onOuvrir}){
  const coche=valeur==="Oui";
  const dispo=TYPES_AVEC_FICHE_ATELIER.includes(type);
  return(<div style={{border:"1.5px solid "+(coche?COULEUR_CHANTIER:"#D1D5DB"),background:coche?TEINTE.fond:"#fff",borderRadius:8,padding:"10px 12px"}}>
    <label style={{display:"flex",alignItems:"center",gap:10,fontSize:14,fontWeight:600,cursor:"pointer"}}>
      <input type="checkbox" checked={coche} onChange={e=>onChange(e.target.checked?"Oui":"Non")} style={{width:20,height:20,accentColor:COULEUR_CHANTIER}}/>
      Entretien en atelier
    </label>
    {coche&&dispo&&<div style={{marginTop:8}}>
      <button type="button" onClick={()=>onOuvrir(graineAtelier(v,type),type)} style={BTN}>📂 Ouvrir la fiche atelier (préremplie)</button>
      <p style={{fontSize:11,color:"#6B7280",margin:"6px 0 0"}}>La fiche chantier est enregistrée d'abord. La fiche atelier reprend le client, le N° DE, le contact et l'identification du matériel.</p>
    </div>}
    {coche&&!dispo&&<p style={{fontSize:12,color:"#8A4B00",margin:"8px 0 0"}}>Pas encore de fiche atelier pour « {type} ».</p>}
  </div>);
}

// ── Aperçu / PDF / ZIP : même modèle que l'atelier, en vert pétrole ──
export function htmlChantier({v,fiche,photos,champsPour,etapes,type}){
  const t=type||(fiche&&fiche.type_equipement)||"Autre";
  const vv={...v,client:v.ch_client||(fiche&&fiche.client)||"",de:normaliserDE(v.ch_de||(fiche&&fiche.de)||""),materiel_lieu:v.ch_eq_nom||(fiche&&fiche.materiel)||t,_type:t};
  return genHtml(vv,photos||[],"","",[],{},champsPour(t),etapes,OPTS_DOC);
}
async function chargerFiche(f){
  const [vals,phs]=await Promise.all([db.get("fiches_chantier_valeurs","?fiche_id=eq."+f.id),db.get("fiches_chantier_photos","?fiche_id=eq."+f.id+"&order=created_at")]);
  const v={};(Array.isArray(vals)?vals:[]).forEach(r=>{v[r.champ_id]=r.valeur;});
  const photos=(Array.isArray(phs)?phs:[]).map(p=>({...p,url:db.photoUrl(p.storage_path)}));
  return {v,photos};
}

// ── Liste en dossiers ──
function ChFicheItem({f,categories,champsPour,etapes,onOuvrir,onDupliquer,onMaj,onSupprimee}){
  const [ouvert,setOuvert]=useState(false);
  const [photos,setPhotos]=useState(null);
  const [ajout,setAjout]=useState(false);const [cat,setCat]=useState("");
  const [occupe,setOccupe]=useState(null);const [erreur,setErreur]=useState(null);
  const [confP,setConfP]=useState(false);const [confF,setConfF]=useState(false);
  const [photoASuppr,setPhotoASuppr]=useState(null);const [supprEnCours,setSupprEnCours]=useState(false);
  const [survolDepot,depotProps]=useDepotImages(fs=>deposerPhotos(fs));
  const fileRef=useRef();
  const recup=f.statut_recuperation==="Récupéré";
  const type=f.type_equipement||"Autre";
  const de=normaliserDE(f.de);
  const nomDoc=[slug(f.client||"Client"),de||"DE",slug(f.materiel||type)].join("_");
  const echec=e=>setErreur((e&&e.message)||"L'action n'a pas abouti (connexion ?).");

  async function ouvrirBloc(){
    if(!ouvert&&photos===null){
      try{const p=await db.get("fiches_chantier_photos","?fiche_id=eq."+f.id+"&order=created_at");setPhotos(Array.isArray(p)?p.map(x=>({...x,url:db.photoUrl(x.storage_path)})):[]);}catch(e){setPhotos([]);}
    }
    setOuvert(!ouvert);
  }
  async function apercu(){
    setOccupe("apercu");setErreur(null);
    try{const {v,photos:ph}=await chargerFiche(f);afficherApercu(htmlChantier({v,fiche:f,photos:ph,champsPour,etapes,type}),nomDoc,COULEUR_CHANTIER);}catch(e){echec(e);}
    setOccupe(null);
  }
  async function zip(){
    setOccupe("zip");setErreur(null);
    try{
      const {v,photos:ph}=await chargerFiche(f);
      const vv={...v,client:v.ch_client||f.client||"",de:de,materiel_lieu:v.ch_eq_nom||f.materiel||type,_type:type};
      await telechargerZip(ph,vv,nomDoc,{...OPTS_DOC,champsData:champsPour(type),etapesData:etapes});
    }catch(e){echec(e);}
    setOccupe(null);
  }
  async function envoyerFichier(file,i){
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase();
    const path=slug(f.client||"client")+"/"+(de||"de")+"/"+slug(type)+"/"+slug(cat.toLowerCase())+"_"+Date.now()+(i?"_"+i:"")+"."+ext;
    await db.uploadPhoto(path,file);
    // la table des photos de chantier n'a pas de colonne "etape"
    const rec=await db.post("fiches_chantier_photos",{fiche_id:f.id,storage_path:path,nom_fichier:file.name,categorie_nom:cat});
    if(!(rec&&rec[0])){await db.deleteFile(path);throw new Error("La photo n'a pas pu être rattachée à la fiche.");}
    setPhotos(prev=>[...(prev||[]),{...rec[0],url:db.photoUrl(path)}]);
  }
  async function envoyerPhoto(e){
    const file=e.target.files[0];if(!file||!cat)return;
    setOccupe("photo");setErreur(null);
    try{await envoyerFichier(file,0);setAjout(false);setCat("");}catch(err){echec(err);}
    if(fileRef.current)fileRef.current.value="";
    setOccupe(null);
  }
  async function deposerPhotos(fs){
    if(!ajout||!cat){setErreur("Ouvrez « Ajouter photo », choisissez une catégorie, puis glissez la photo.");return;}
    setOccupe("photo");setErreur(null);
    try{for(let i=0;i<fs.length;i++)await envoyerFichier(fs[i],i);setAjout(false);setCat("");}catch(err){echec(err);}
    setOccupe(null);
  }
  async function supprimerUnePhoto(){
    const p=photoASuppr;if(!p)return;setSupprEnCours(true);
    try{await supprimerPhotoEnBase(p,"fiches_chantier_photos",f.id);setPhotos(prev=>(prev||[]).filter(x=>x!==p));setPhotoASuppr(null);}catch(err){echec(err);}
    setSupprEnCours(false);
  }
  async function supprPhotos(){
    setOccupe("sp");try{await db.del("fiches_chantier_photos","?fiche_id=eq."+f.id);setPhotos([]);setConfP(false);}catch(e){echec(e);}setOccupe(null);
  }
  async function supprFiche(){
    setOccupe("sf");
    try{
      await db.del("fiches_chantier_photos","?fiche_id=eq."+f.id);
      await db.del("fiches_chantier_valeurs","?fiche_id=eq."+f.id);
      await db.del("suivi_pieces","?fiche_id=eq."+f.id);
      await db.del("fiches_chantier","?id=eq."+f.id);
      onSupprimee(f.id);
    }catch(e){echec(e);setOccupe(null);}
  }
  async function basculerRecup(){
    const nouveau=recup?"En attente":"Récupéré";
    setErreur(null);
    try{await db.patch("fiches_chantier","?id=eq."+f.id,{statut_recuperation:nouveau});onMaj(f.id,{statut_recuperation:nouveau});}catch(e){echec(e);}
  }

  return(<div style={{marginLeft:20,marginBottom:6,borderLeft:"2px solid "+TEINTE.bord,paddingLeft:12}}>
    <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 10px",background:"#fff",borderRadius:8,border:"1px solid #E2E6EA"}} onClick={ouvrirBloc}>
      <span style={{fontSize:15}}>{ouvert?"📂":"📁"}</span>
      <div style={{flex:1,minWidth:0}}>
        <p style={{margin:0,fontSize:13,fontWeight:600,color:COULEUR_CHANTIER,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.materiel||"Sans identification"}</p>
        <p style={{margin:0,fontSize:11,color:"#9CA3AF"}}>{[type,fmtDate(f.created_at)].filter(Boolean).join(" · ")}</p>
      </div>
      <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:12,whiteSpace:"nowrap",background:recup?"#F0FFF4":"#FFF8E1",color:recup?"#22863A":"#E8720C"}}>{recup?"✅ Récupéré":"⏳ En attente"}</span>
      <span style={{fontSize:13,color:"#9CA3AF"}}>{ouvert?"▲":"▼"}</span>
    </div>
    {ouvert&&<div style={{padding:"10px 12px",background:"#fff",borderRadius:"0 0 8px 8px",border:"1px solid #E2E6EA",borderTop:"none"}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        <button type="button" style={BTN} onClick={()=>onOuvrir(f)}>📝 Ouvrir fiche</button>
        <button type="button" style={BTN_O} disabled={occupe==="apercu"} onClick={apercu}>{occupe==="apercu"?"…":"👁 Aperçu"}</button>
        <button type="button" style={BTN_O} onClick={()=>onDupliquer(f)}>📋 Dupliquer</button>
        <button type="button" style={BTN_O} disabled={occupe==="zip"} onClick={zip}>{occupe==="zip"?"…":"📥 ZIP + PDF"}</button>
        <button type="button" style={BTN_O} onClick={basculerRecup}>{recup?"↩ Remettre en attente":"✅ Marquer récupéré"}</button>
        <button type="button" style={BTN_O} onClick={()=>setAjout(!ajout)}>📷 Ajouter photo</button>
        <button type="button" style={{...BTN_O,color:"#E8720C",borderColor:"#E8720C"}} onClick={()=>setConfP(true)}>🗑 Suppr. photos</button>
        <button type="button" style={BTN_R} onClick={()=>setConfF(true)}>🗑 Suppr. fiche</button>
      </div>
      {erreur&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:6,padding:"6px 10px",fontSize:12,color:"#D73A49",marginBottom:8}}>{erreur}</div>}
      {ajout&&<div {...depotProps} style={{background:TEINTE.fond,border:"1px solid "+TEINTE.bord,borderRadius:8,padding:"10px 12px",marginBottom:10,...styleDepot(survolDepot)}}>
        {avecSouris()&&<div style={{fontSize:11,color:"#6B7280",marginBottom:6}}>Choisissez la catégorie, puis glissez-déposez la photo ici (ou utilisez le bouton).</div>}
        <select value={cat} onChange={e=>setCat(e.target.value)} style={{...INP,marginBottom:8,fontSize:12}}>
          <option value="">— Choisir une catégorie</option>
          {(categories||[]).map(c=><option key={c.nom} value={c.nom}>{c.nom}</option>)}
        </select>
        {cat&&<div style={{display:"flex",gap:8}}>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={envoyerPhoto} style={{display:"none"}}/>
          <button type="button" style={BTN} disabled={occupe==="photo"} onClick={()=>fileRef.current&&fileRef.current.click()}>{occupe==="photo"?"⏳ Envoi…":"📷 Choisir photo"}</button>
          <button type="button" style={BTN_O} onClick={()=>{setAjout(false);setCat("");}}>Annuler</button>
        </div>}
      </div>}
      {confP&&<div style={{background:"#FFF8E1",border:"1px solid #E8720C",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
        <p style={{fontSize:12,fontWeight:700,color:"#E8720C",margin:"0 0 6px"}}>⚠️ Supprimer les photos ?</p>
        <p style={{fontSize:11,color:"#6B7280",margin:"0 0 10px"}}>La fiche et toutes les données sont conservées.</p>
        <div style={{display:"flex",gap:8}}><button type="button" style={{...BTN,background:"#E8720C"}} onClick={supprPhotos}>✅ Confirmer</button><button type="button" style={BTN_O} onClick={()=>setConfP(false)}>Annuler</button></div>
      </div>}
      {confF&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
        <p style={{fontSize:12,fontWeight:700,color:"#D73A49",margin:"0 0 6px"}}>⚠️ Supprimer toute la fiche ?</p>
        <p style={{fontSize:11,color:"#6B7280",margin:"0 0 10px"}}>Irréversible : fiche, données et photos supprimées.</p>
        <div style={{display:"flex",gap:8}}><button type="button" style={{...BTN,background:"#D73A49"}} disabled={occupe==="sf"} onClick={supprFiche}>🗑 Oui, tout supprimer</button><button type="button" style={BTN_O} onClick={()=>setConfF(false)}>Annuler</button></div>
      </div>}
      <ConfirmerSuppressionPhoto photo={photoASuppr} occupe={supprEnCours} onConfirmer={supprimerUnePhoto} onAnnuler={()=>setPhotoASuppr(null)} styleBouton={BTN_O} styleBoutonDanger={BTN_R}/>
      {photos&&photos.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(72px,1fr))",gap:6,marginTop:6}}>
        {photos.map((p,i)=>(<div key={p.id||i} style={{position:"relative",cursor:"pointer"}} onClick={()=>window.open(p.url,"_blank")}>
          <CroixPhoto onClick={()=>setPhotoASuppr(p)}/>
          <img src={p.url} alt={p.categorie_nom||""} style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:6,border:"1px solid #E2E6EA"}}/>
          {p.categorie_nom&&<div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.6)",color:"#fff",fontSize:8,padding:"2px 3px",borderRadius:"0 0 6px 6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.categorie_nom}</div>}
        </div>))}
      </div>}
      {photos&&photos.length===0&&<div style={{fontSize:12,color:"#9CA3AF",textAlign:"center",padding:8}}>Aucune photo</div>}
    </div>}
  </div>);
}

function ChDossierDE({de,fiches,...reste}){
  const [ouvert,setOuvert]=useState(false);
  return(<div style={{marginLeft:16,marginBottom:6,borderLeft:"2px solid "+TEINTE.bord,paddingLeft:12}}>
    <div onClick={()=>setOuvert(!ouvert)} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 12px",background:TEINTE.fond,borderRadius:8,border:"1px solid "+TEINTE.bord}}>
      <span style={{fontSize:15}}>{ouvert?"📂":"📁"}</span>
      <span style={{fontSize:13,fontWeight:700,color:COULEUR_CHANTIER,flex:1}}>{de}</span>
      <span style={{fontSize:11,color:"#6B7280",background:"#fff",padding:"2px 8px",borderRadius:10,border:"1px solid #E2E6EA"}}>{fiches.length} fiche{fiches.length>1?"s":""}</span>
      <span style={{fontSize:13,color:"#9CA3AF"}}>{ouvert?"▲":"▼"}</span>
    </div>
    {ouvert&&<div style={{marginTop:6}}>{fiches.map(f=><ChFicheItem key={f.id} f={f} {...reste}/>)}</div>}
  </div>);
}

function ChDossierClient({client,fiches,...reste}){
  const [ouvert,setOuvert]=useState(false);
  const parDE={};fiches.forEach(f=>{const d=normaliserDE(f.de)||"Sans DE";(parDE[d]=parDE[d]||[]).push(f);});
  const deList=Object.keys(parDE).sort();
  return(<div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",marginBottom:8,overflow:"hidden"}}>
    <div onClick={()=>setOuvert(!ouvert)} style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:TEINTE.bandeau,borderLeft:"4px solid "+COULEUR_CHANTIER}}>
      <span style={{fontSize:16}}>{ouvert?"📂":"📁"}</span>
      <div style={{flex:1,minWidth:0}}>
        <p style={{margin:0,fontSize:14,fontWeight:700,color:"#1A1A2E",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{client}</p>
        <p style={{margin:0,fontSize:11,color:"#9CA3AF"}}>{deList.length} N° DE · {fiches.length} fiche{fiches.length>1?"s":""}</p>
      </div>
      <span style={{fontSize:13,color:"#9CA3AF"}}>{ouvert?"▲":"▼"}</span>
    </div>
    {ouvert&&<div style={{padding:"8px 0"}}>{deList.map(d=><ChDossierDE key={d} de={d} fiches={parDE[d]} {...reste}/>)}</div>}
  </div>);
}

export function ListeChantier({fiches,setFiches,loading,categories,champsPour,etapes,onNouvelle,onOuvrir,onDupliquer}){
  const [q,setQ]=useState("");const [filtre,setFiltre]=useState("tous");
  const qq=q.trim().toLowerCase();
  const filtrees=fiches.filter(f=>{
    const okQ=!qq||[f.de,normaliserDE(f.de),f.client,f.materiel,f.type_equipement].some(x=>String(x||"").toLowerCase().includes(qq));
    const recup=f.statut_recuperation==="Récupéré";
    return okQ&&(filtre==="tous"||(filtre==="attente"?!recup:recup));
  });
  const parClient={};filtrees.forEach(f=>{const c=f.client||"Sans client";(parClient[c]=parClient[c]||[]).push(f);});
  const clientList=Object.keys(parClient).sort((a,b)=>a.localeCompare(b,"fr"));
  const maj=(id,champs)=>setFiches(prev=>prev.map(f=>f.id===id?{...f,...champs}:f));
  const supprimee=id=>setFiches(prev=>prev.filter(f=>f.id!==id));
  return(<div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
      <div>
        <h1 style={{fontSize:22,fontWeight:800,margin:0,color:COULEUR_CHANTIER}}>Fiches chantier</h1>
        <p style={{fontSize:13,color:"#6B7280",margin:"3px 0 0"}}>{new Set(fiches.map(f=>f.client||"Sans client")).size} client{new Set(fiches.map(f=>f.client||"Sans client")).size>1?"s":""} · {fiches.length} fiche{fiches.length>1?"s":""}</p>
      </div>
      <button type="button" style={{...BTN,fontSize:14,padding:"9px 18px"}} onClick={onNouvelle}>+ Nouvelle fiche</button>
    </div>
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"12px 16px",marginBottom:16,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="🔍 Client, N° DE, lieu..." style={{...INP,flex:1,minWidth:160}}/>
      {[["tous","Tous"],["attente","⏳ En attente"],["recupere","✅ Récupérés"]].map(([id,lib])=>(
        <button type="button" key={id} onClick={()=>setFiltre(id)} style={{padding:"7px 12px",borderRadius:8,border:"1px solid "+(filtre===id?COULEUR_CHANTIER:"#E2E6EA"),background:filtre===id?COULEUR_CHANTIER:"#fff",color:filtre===id?"#fff":"#6B7280",fontSize:12,fontWeight:600,cursor:"pointer"}}>{lib}</button>
      ))}
    </div>
    {loading&&<div style={{textAlign:"center",padding:40,color:"#9CA3AF"}}>Chargement…</div>}
    {!loading&&clientList.length===0&&<div style={{textAlign:"center",padding:40,color:"#9CA3AF",background:"#fff",borderRadius:10,border:"1px solid #E2E6EA"}}>{fiches.length===0?"Aucune fiche chantier : créez la première !":"Aucun résultat."}</div>}
    {clientList.map(c=><ChDossierClient key={c} client={c} fiches={parClient[c]} categories={categories} champsPour={champsPour} etapes={etapes} onOuvrir={onOuvrir} onDupliquer={onDupliquer} onMaj={maj} onSupprimee={supprimee}/>)}
  </div>);
}
