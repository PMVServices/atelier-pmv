import React, { useState, useCallback, useEffect, useRef } from "react";

const SUPA_URL = "https://pupbzngvudprcweukuoi.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1cGJ6bmd2dWRwcmN3ZXVrdW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxODY3NDAsImV4cCI6MjA5Nzc2Mjc0MH0.jn025v42M3qNpAKfvy49cdCySBdTqwRz99b1EfaKYoo";
const H = {"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":`Bearer ${SUPA_KEY}`};
const db = {
  async get(t,p=""){const r=await fetch(`${SUPA_URL}/rest/v1/${t}${p}`,{headers:{...H,"Prefer":"return=representation"}});return r.json();},
  async post(t,b){const r=await fetch(`${SUPA_URL}/rest/v1/${t}`,{method:"POST",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify(b)});return r.json();},
  async patch(t,p,b){const r=await fetch(`${SUPA_URL}/rest/v1/${t}${p}`,{method:"PATCH",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify(b)});return r.json();},
  async del(t,p){await fetch(`${SUPA_URL}/rest/v1/${t}${p}`,{method:"DELETE",headers:H});},
  async uploadPhoto(path,file){
    const r=await fetch(`${SUPA_URL}/storage/v1/object/photos/${path}`,{method:"POST",headers:{"apikey":SUPA_KEY,"Authorization":`Bearer ${SUPA_KEY}`,"Content-Type":file.type,"x-upsert":"true"},body:file});
    if(!r.ok){const e=await r.text();throw new Error(e);}return true;
  },
  photoUrl(path){return `${SUPA_URL}/storage/v1/object/public/photos/${path}`;}
};

const PIN_CODE="3739",PIN_KEY="pmv_pin_ok";
const TECHNICIENS_FB=["AD","CB","JM","KD","CD","RC","MC","DN","EL","Autre"];
const CLIENTS_FB=[];
const CATS_FB=["Vue d'ensemble","Plaque moteur","Plaque pompe","Plaque ventilation","Plaque réducteur","Autre plaque","Stator avant","Stator arrière","Rotor","Flasque avant","Flasque arrière","Arbre avant","Arbre arrière","Divers"];
const ROULEMENTS=["608 ZZ C3","608 RSH","6000 ZZ C3","6001 ZZ C3","6002 ZZ C3","6003 ZZ C3","6004 ZZ C3","6005 ZZ C3","6006 ZZ C3","6007 ZZ C3","6008 ZZ C3","6009 ZZ C3","6010 ZZ C3","6011 ZZ C3","6200 ZZ C3","6201 ZZ C3","6202 ZZ C3","6203 ZZ C3","6204 ZZ C3","6205 ZZ C3","6206 ZZ C3","6207 ZZ C3","6208 ZZ C3","6209 ZZ C3","6210 ZZ C3","6211 ZZ C3","6212 ZZ C3","6213 ZZ C3","6214 ZZ C3","6215 ZZ C3","6216 ZZ C3","6217 ZZ C3","6217 C3","6218 ZZ C3","6218 C3","6219 ZZ C3","6219 C3","6300 ZZ C3","6301 ZZ C3","6302 ZZ C3","6303 ZZ C3","6304 ZZ C3","6305 ZZ C3","6306 ZZ C3","6307 ZZ C3","6308 ZZ C3","6309 ZZ C3","6310 ZZ C3","6311 ZZ C3","6312 ZZ C3","6313 ZZ C3","6314 ZZ C3","6315 ZZ C3","6316 ZZ C3","6317 ZZ C3","6317 C3","6318 ZZ C3","6318 C3","6319 ZZ C3","6319 C3","NU 206 C3","NU 208 C3","NU 209 C3","NU 210 C3","NU 212 C3","NU 213 C3","NU 214 C3","NU 215 C3","NU 308 C3","NU 309 C3","NU 310 C3","NU 311 C3","NU 312 C3","NU 313 C3","NU 314 C3","NU 315 C3","NU 316 C3","NU 319 C3","NU 322 C3","Autre"];
const SEUIL_OMEGA=300;
const ETAPES=["Entrée","Infos électriques","Information rotation avant démontage","Information matériel au démontage","Information des essais après remontage"];

// ─── NOMMAGE DOSSIERS ───────────────────────────────────────────────────
// Structure : Client / DE / Matériel_Lieu
function slug(s){return (s||"").replace(/\s+/g,"_").replace(/[^a-zA-Z0-9_\-]/g,"").substring(0,30);}
function deSlug(de){return (de||"").replace(/-/g,"");}  // DE-1042 → DE1042
function cheminFiche(v){
  const client=slug(v.client||"Client");
  const de=deSlug(v.de||"DE");
  const mat=slug((v.materiel_lieu||v.type_moteur||"Materiel"));
  return {client,de,mat,chemin:`${client}/${de}/${mat}`};
}

const CHAMPS={
  "Entrée":[
    {id:"date_entree",label:"Date d'entrée",type:"date",required:true},
    {id:"client",label:"Client",type:"client",required:true},
    {id:"de",label:"N° DE",type:"text",required:true,note:"Généré automatiquement"},
    {id:"mail",label:"Mail du client",type:"text",required:true},
    {id:"telephone",label:"Téléphone",type:"text",required:true},
    {id:"materiel_lieu",label:"Matériel / Identification lieux",type:"text",required:true},
    {id:"marque_moteur",label:"Marque moteur",type:"text",required:false},
    {id:"puissance",label:"Puissance",type:"text",required:false,unite:"kW"},
    {id:"vitesse",label:"Vitesse",type:"select",options:["1000","1500","3000","Autre"],required:false,unite:"tr/mn",autreTexte:true},
    {id:"type_moteur",label:"Type",type:"text",required:false},
    {id:"numero_serie",label:"Numéro de série",type:"text",required:false},
    {id:"fixation",label:"Fixation",type:"select",options:["B3 (pattes)","B5 (bride)","B14","Spécial"],required:false,autreTexte:true},
    {id:"tension",label:"Tension",type:"select",options:["230/400","400/690","Autre"],required:true,unite:"V",autreTexte:true},
    {id:"depose_nos_soins",label:"Déposé par nos soins",type:"oui_non",required:true},
    {id:"enleve_nos_soins",label:"Enlevé par nos soins",type:"oui_non",required:true},
    {id:"tech_entree",label:"Technicien",type:"technicien",required:true},
  ],
  "Infos électriques":[
    {id:"couplage",label:"Couplage",type:"select",options:["Étoile","Triangle","Absent"],required:true},
    {id:"isol_masse",label:"Isolement enroulement/masse",type:"mesure",unite:"MΩ",seuilMin:SEUIL_OMEGA,required:true},
    {id:"isol_uv",label:"Isolement U-V",type:"mesure",unite:"MΩ",seuilMin:SEUIL_OMEGA,required:true},
    {id:"isol_vw",label:"Isolement V-W",type:"mesure",unite:"MΩ",seuilMin:SEUIL_OMEGA,required:true},
    {id:"isol_wu",label:"Isolement W-U",type:"mesure",unite:"MΩ",seuilMin:SEUIL_OMEGA,required:true},
    {id:"adx_resultat",label:"ADX mesure isol. — résultat",type:"select",options:["PASS","Douteux","Hors Tolérance"],required:true},
    {id:"adx_valeur",label:"ADX mesure isol. — valeur",type:"mesure",unite:"MΩ",seuilMin:SEUIL_OMEGA,required:true},
    {id:"plaque_bornes_etat",label:"Plaque à bornes — état",type:"select",options:["OK","HS"],required:true},
    {id:"plaque_bornes_taille",label:"Plaque à bornes — taille",type:"text",required:true,condition:{champ:"plaque_bornes_etat",valeur:"HS"}},
    {id:"sonde_presence",label:"Résistance sonde — présence",type:"select",options:["Absente","Présente"],required:true},
    {id:"sonde_valeur",label:"Résistance sonde — valeur",type:"mesure",unite:"Ω",seuilMin:null,required:true,condition:{champ:"sonde_presence",valeur:"Présente"}},
    {id:"tech_elec",label:"Technicien",type:"technicien",required:true},
  ],
  "Information rotation avant démontage":[
    {id:"essai_vide_avant",label:"Essai à vide possible",type:"select",options:["Oui","Non"],required:true},
    {id:"essai_vide_avant_pourquoi",label:"Pourquoi essai à vide impossible",type:"text",required:true,condition:{champ:"essai_vide_avant",valeur:"Non"}},
    {id:"rotor_cc_realise",label:"Vérif rotor court-circuit — réalisée",type:"select",options:["Oui","Non"],required:true},
    {id:"rotor_cc_resultat",label:"Vérif rotor court-circuit — résultat",type:"select",options:["OK","HS"],required:true,condition:{champ:"rotor_cc_realise",valeur:"Oui"}},
    {id:"int_p1_avant",label:"Intensité Phase 1",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_avant"},
    {id:"int_p2_avant",label:"Intensité Phase 2",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_avant"},
    {id:"int_p3_avant",label:"Intensité Phase 3",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_avant"},
    {id:"vib_av_mms_avant",label:"Vibration avant à 400V — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_avant"},
    {id:"vib_av_ge_avant",label:"Vibration avant à 400V — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_avant"},
    {id:"vib_ar_mms_avant",label:"Vibration arrière à 400V — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_arriere"},
    {id:"vib_ar_ge_avant",label:"Vibration arrière à 400V — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_arriere"},
    {id:"int_560_p1_avant",label:"Intensité 560V — Ph.1",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_avant"},
    {id:"int_560_p2_avant",label:"Intensité 560V — Ph.2",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_avant"},
    {id:"int_560_p3_avant",label:"Intensité 560V — Ph.3",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_avant"},
    {id:"nettoyage_hp",label:"Nettoyage HP",type:"select",options:["Oui","Non"],required:true},
    {id:"etuvage_stator",label:"Étuvage du stator",type:"select",options:["Oui","Non"],required:true},
    {id:"isol_masse_hp",label:"Mesure isolement masse (suite HP)",type:"mesure",unite:"MΩ",seuilMin:SEUIL_OMEGA,required:true,condition:{champ:"etuvage_stator",valeur:"Oui"}},
    {id:"isol_enroul_min",label:"Isolement enroulements — plus petite valeur",type:"mesure",unite:"MΩ",seuilMin:SEUIL_OMEGA,required:true},
    {id:"tech_mesure_avant",label:"Qui a mesuré",type:"technicien",required:true},
  ],
  "Information matériel au démontage":[
    {id:"ventilateur_present",label:"Présence d'un ventilateur",type:"oui_non",required:true},
    {id:"circlips_avant",label:"Circlips avant",type:"text",required:false},
    {id:"circlips_arriere",label:"Circlips arrière",type:"text",required:false},
    {id:"rondelle_presence",label:"Rondelle souplesse — présence",type:"select",options:["Oui","Non"],required:false},
    {id:"rondelle_avant",label:"Rondelle souplesse avant",type:"select",options:["Oui","Non"],required:false,condition:{champ:"rondelle_presence",valeur:"Oui"}},
    {id:"rondelle_arriere",label:"Rondelle souplesse arrière",type:"select",options:["Oui","Non"],required:false,condition:{champ:"rondelle_presence",valeur:"Oui"}},
    {id:"etat_ventilateur",label:"État ventilateur",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,condition:{champ:"ventilateur_present",valeur:"Oui"}},
    {id:"taille_ventilateur",label:"Taille ventilateur",type:"text",required:false,condition:{champ:"ventilateur_present",valeur:"Oui"}},
    {id:"type_roulement_av",label:"Type roulement avant",type:"roulement",required:true},
    {id:"etat_roulement_av",label:"État roulement avant",type:"select",options:["RAS","Usé","HS","Cassé"],required:true},
    {id:"etat_flasque_av",label:"État visuel flasque avant",type:"select",options:["OK","Marqué"],required:true},
    {id:"etat_arbre_av",label:"État visuel arbre avant",type:"select",options:["OK","Marqué"],required:true},
    {id:"mesure_flasque_av",label:"Mesure flasque avant",type:"number",unite:"mm",required:true},
    {id:"mesure_arbre_av",label:"Mesure arbre avant",type:"number",unite:"mm",required:true},
    {id:"joint_av_int",label:"Joint avant — Ø int.",type:"number",unite:"mm",required:true,groupe:"joint_av"},
    {id:"joint_av_ext",label:"Joint avant — Ø ext.",type:"number",unite:"mm",required:true,groupe:"joint_av"},
    {id:"joint_av_ep",label:"Joint avant — ép.",type:"number",unite:"mm",required:true,groupe:"joint_av"},
    {id:"joint_av_levres",label:"Joint avant — lèvres",type:"select",options:["Simple","Double"],required:true,groupe:"joint_av"},
    {id:"type_roulement_ar",label:"Type roulement arrière",type:"roulement",required:true},
    {id:"etat_roulement_ar",label:"État roulement arrière",type:"select",options:["RAS","Usé","HS","Cassé"],required:true},
    {id:"etat_flasque_ar",label:"État visuel flasque arrière",type:"select",options:["OK","Marqué"],required:true},
    {id:"etat_arbre_ar",label:"État visuel arbre arrière",type:"select",options:["OK","Marqué"],required:true},
    {id:"mesure_flasque_ar",label:"Mesure flasque arrière",type:"number",unite:"mm",required:true},
    {id:"mesure_arbre_ar",label:"Mesure arbre arrière",type:"number",unite:"mm",required:true},
    {id:"joint_ar_int",label:"Joint arrière — Ø int.",type:"number",unite:"mm",required:true,groupe:"joint_ar"},
    {id:"joint_ar_ext",label:"Joint arrière — Ø ext.",type:"number",unite:"mm",required:true,groupe:"joint_ar"},
    {id:"joint_ar_ep",label:"Joint arrière — ép.",type:"number",unite:"mm",required:true,groupe:"joint_ar"},
    {id:"joint_ar_levres",label:"Joint arrière — lèvres",type:"select",options:["Simple","Double"],required:true,groupe:"joint_ar"},
    {id:"peinture",label:"Peinture à faire",type:"oui_non",required:true},
    {id:"etat_bobinage",label:"État visuel bobinage",type:"select",options:["RAS","Cuit","Sale","Vieux","HS"],required:true},
    {id:"etat_rotor",label:"État visuel rotor",type:"select",options:["RAS","Bleui","HS"],required:false},
    {id:"tech_demontage",label:"Qui a démonté",type:"technicien",required:true},
  ],
  "Information des essais après remontage":[
    {id:"tech_remontage",label:"Qui a remonté",type:"technicien",required:true},
    {id:"essai_vide_apres",label:"Essai à vide possible",type:"select",options:["Oui","Non"],required:true},
    {id:"essai_vide_apres_pourquoi",label:"Pourquoi essai à vide impossible",type:"text",required:true,condition:{champ:"essai_vide_apres",valeur:"Non"}},
    {id:"int_p1_apres",label:"Intensité Phase 1",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_apres"},
    {id:"int_p2_apres",label:"Intensité Phase 2",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_apres"},
    {id:"int_p3_apres",label:"Intensité Phase 3",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_apres"},
    {id:"int_560_p1_apres",label:"Intensité 560V — Ph.1",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_apres"},
    {id:"int_560_p2_apres",label:"Intensité 560V — Ph.2",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_apres"},
    {id:"int_560_p3_apres",label:"Intensité 560V — Ph.3",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_apres"},
    {id:"vib_av_mms_apres",label:"Vibration avant — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_av_apres"},
    {id:"vib_av_ge_apres",label:"Vibration avant — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_av_apres"},
    {id:"vib_ar_mms_apres",label:"Vibration arrière — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_ar_apres"},
    {id:"vib_ar_ge_apres",label:"Vibration arrière — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_ar_apres"},
    {id:"resserage_plaque",label:"Resserrage plaque à bornes",type:"text",required:false},
    {id:"tech_essai",label:"Qui a essayé",type:"technicien",required:true},
  ],
};

function champVisible(c,v){return !c.condition||v[c.condition.champ]===c.condition.valeur;}
function etapeOk(nom,v,nr){if(nr)return true;for(const c of(CHAMPS[nom]||[])){if(!c.required||!champVisible(c,v))continue;if(!v[c.id])return false;}return true;}
function enErreur(c,val){if(c.type!=="mesure"||c.seuilMin==null)return false;const vv=parseFloat(val);return !isNaN(vv)&&vv<c.seuilMin;}
function genDE(){return "DE-"+String(Math.floor(1000+Math.random()*9000));}
function today(){return new Date().toISOString().split("T")[0];}
function fmt(iso){if(!iso)return "—";return new Date(iso).toLocaleDateString("fr-FR");}
function slugCat(s){return s.toLowerCase().replace(/['\s]/g,"_").replace(/é|è|ê/g,"e").replace(/à|â/g,"a").replace(/[^a-z0-9_]/g,"");}
function useWidth(){const [w,setW]=useState(window.innerWidth);useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return w;}
function grilleCols(n,width){if(width<600)return 1;if(width>=900)return n;return Math.min(n,2);}

const S={
  app:{fontFamily:"system-ui,-apple-system,sans-serif",background:"#F5F6F8",minHeight:"100vh",color:"#1A1A2E"},
  hdr:{background:"#1B4F8A",color:"#fff",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"},
  p1:{background:"#1B4F8A",color:"#fff",border:"none",padding:"9px 20px",borderRadius:6,fontWeight:600,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:6},
  p2:{background:"#fff",color:"#1B4F8A",border:"1.5px solid #1B4F8A",padding:"8px 18px",borderRadius:6,fontWeight:600,fontSize:14,cursor:"pointer"},
  pDanger:{background:"#D73A49",color:"#fff",border:"none",padding:"7px 14px",borderRadius:6,fontWeight:600,fontSize:13,cursor:"pointer"},
  card:{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"16px 20px",marginBottom:16},
  cAct:{background:"#fff",borderRadius:10,border:"2px solid #1B4F8A",padding:"16px 20px",marginBottom:16},
  cDone:{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",marginBottom:12,overflow:"hidden"},
  cLock:{background:"#F5F6F8",borderRadius:10,border:"1px solid #E2E6EA",padding:"12px 20px",marginBottom:12,opacity:0.5},
  lbl:{fontSize:11,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:3},
  inp:{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid #D1D5DB",fontSize:13,boxSizing:"border-box",background:"#fff"},
  inpErr:{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid #D73A49",fontSize:13,boxSizing:"border-box",background:"#FFF5F5"},
  sel:{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid #D1D5DB",fontSize:13,background:"#fff"},
  alert:{background:"#FFF5F5",border:"1.5px solid #D73A49",borderRadius:6,padding:"5px 9px",fontSize:11,color:"#D73A49",display:"flex",alignItems:"center",gap:5,marginTop:3},
  ok:{background:"#F0FFF4",border:"1px solid #22863A",borderRadius:6,padding:"8px 14px",fontSize:13,color:"#22863A",display:"flex",alignItems:"center",gap:8,marginBottom:14},
  info:{background:"#EEF4FF",border:"1px solid #1B4F8A",borderRadius:6,padding:"8px 14px",fontSize:13,color:"#1B4F8A",display:"flex",alignItems:"center",gap:8,marginBottom:14},
  tech:{background:"#EEF4FF",borderRadius:8,padding:"8px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:14},
  nr:{border:"1.5px solid #E2E6EA",borderRadius:8,padding:"8px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:14,cursor:"pointer"},
};

function ModalPin({onSuccess}){
  const [s,setS]=useState("");const [err,setErr]=useState(false);
  function tap(c){if(s.length>=4)return;const n=s+c;setS(n);if(n.length===4){if(n===PIN_CODE){localStorage.setItem(PIN_KEY,"1");onSuccess();}else{setErr(true);setTimeout(()=>{setS("");setErr(false);},800);}}}
  const touches=["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return(<div style={{position:"fixed",inset:0,background:"#1B4F8A",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
    <div style={{background:"#fff",borderRadius:16,padding:"32px 28px",width:300,textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,0.3)"}}>
      <div style={{fontSize:32,marginBottom:8}}>🔒</div>
      <p style={{fontSize:17,fontWeight:700,margin:"0 0 4px"}}>Atelier PMV</p>
      <p style={{fontSize:13,color:"#6B7280",margin:"0 0 24px"}}>Entrez le code PIN</p>
      <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:24}}>
        {[0,1,2,3].map(i=><div key={i} style={{width:16,height:16,borderRadius:"50%",background:s.length>i?(err?"#D73A49":"#1B4F8A"):"#E2E6EA",transition:"background 0.15s"}}/>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {touches.map((t,i)=>t===""?<div key={i}/>:<button key={i} onClick={()=>t==="⌫"?setS(ss=>ss.slice(0,-1)):tap(t)} style={{padding:"14px",fontSize:18,fontWeight:600,borderRadius:10,border:"1.5px solid #E2E6EA",background:t==="⌫"?"#F5F6F8":"#fff",cursor:"pointer",color:t==="⌫"?"#6B7280":"#1A1A2E"}}>{t}</button>)}
      </div>
      {err&&<p style={{color:"#D73A49",fontSize:13,marginTop:12,fontWeight:600}}>Code incorrect</p>}
    </div>
  </div>);
}

function ChampClient({valeur,onChange,clients,onAddClient}){
  const [q,setQ]=useState(valeur||"");const [ouvert,setOuvert]=useState(false);const [modeAutre,setModeAutre]=useState(false);const ref=useRef(null);
  useEffect(()=>{function close(e){if(ref.current&&!ref.current.contains(e.target))setOuvert(false);}document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close);},[]);
  const filtres=q.length>0?clients.filter(c=>c.toLowerCase().includes(q.toLowerCase())):clients.slice(0,8);
  function select(c){if(c==="Autre"){setModeAutre(true);setQ("");onChange("");}else{setQ(c);onChange(c);setOuvert(false);setModeAutre(false);}}
  async function enregistrer(){if(!q.trim())return;try{await db.post("clients",{nom:q.trim()});onAddClient(q.trim());}catch(e){}onChange(q.trim());setModeAutre(false);setOuvert(false);}
  if(modeAutre)return(<div>
    <div style={{display:"flex",gap:8}}>
      <input type="text" value={q} onChange={e=>{setQ(e.target.value);onChange(e.target.value);}} placeholder="Nom du client..." style={{...S.inp,flex:1}}/>
      <button onClick={enregistrer} style={{...S.p1,fontSize:12,padding:"6px 12px",whiteSpace:"nowrap"}}>+ Enregistrer</button>
      <button onClick={()=>{setModeAutre(false);setQ("");}} style={{...S.p2,fontSize:12,padding:"6px 10px"}}>✕</button>
    </div>
  </div>);
  return(<div ref={ref} style={{position:"relative"}}>
    <input type="text" value={q} onChange={e=>{setQ(e.target.value);setOuvert(true);onChange(e.target.value);}} onFocus={()=>setOuvert(true)} placeholder="Tapez pour rechercher..." style={S.inp}/>
    {ouvert&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1.5px solid #D1D5DB",borderRadius:6,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:50,maxHeight:200,overflowY:"auto"}}>
      {filtres.map(c=><div key={c} onClick={()=>select(c)} style={{padding:"7px 12px",cursor:"pointer",fontSize:13,borderBottom:"1px solid #F3F4F6"}} onMouseOver={e=>e.currentTarget.style.background="#F5F6F8"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>{c}</div>)}
      <div onClick={()=>select("Autre")} style={{padding:"7px 12px",cursor:"pointer",fontSize:13,color:"#E8720C",fontWeight:600,borderTop:"1px solid #E2E6EA"}}>+ Autre (nouveau client)</div>
    </div>}
  </div>);
}

function ChampTechnicien({valeur,onChange,techs}){
  const knownTechs=techs.filter(t=>t!=="Autre");
  const isAutre=valeur&&!knownTechs.includes(valeur);
  const [autreVal,setAutreVal]=useState(isAutre?valeur:"");
  return(<div>
    <select value={isAutre?"Autre":(valeur||"")} onChange={e=>{if(e.target.value==="Autre")onChange("");else onChange(e.target.value);}} style={S.sel}>
      <option value="">— Sélectionner</option>
      {techs.map(t=><option key={t}>{t}</option>)}
    </select>
    {isAutre&&<div style={{marginTop:6}}>
      <input type="text" value={autreVal} onChange={e=>{setAutreVal(e.target.value);onChange(e.target.value);}} placeholder="Initiales..." style={{...S.inp,width:120}}/>
    </div>}
  </div>);
}

function ChampRoulement({valeur,onChange}){
  const isAutre=valeur&&!ROULEMENTS.slice(0,-1).includes(valeur);
  return(<div style={{display:"flex",flexDirection:"column",gap:6}}>
    <select value={isAutre?"Autre":(valeur||"")} onChange={e=>{if(e.target.value==="Autre")onChange("Autre:");else onChange(e.target.value);}} style={S.sel}>
      <option value="">— Sélectionner</option>
      {ROULEMENTS.map(r=><option key={r}>{r}</option>)}
    </select>
    {(isAutre||valeur?.startsWith("Autre:"))&&<input type="text" placeholder="Référence précise..." value={valeur?.replace("Autre:","")||""} onChange={e=>onChange("Autre:"+e.target.value)} style={S.inp}/>}
  </div>);
}

function SectionPhotos({etape,ficheId,cheminBase,categories,photos,onPhotoAdded}){
  const [uploading,setUploading]=useState(false);const [cat,setCat]=useState("");const [apercu,setApercu]=useState(null);const [errMsg,setErrMsg]=useState("");const inputRef=useRef(null);
  const photosEtape=photos.filter(p=>p.etape===etape);
  async function handleFile(e){
    const file=e.target.files[0];if(!file||!cat)return;
    setUploading(true);setErrMsg("");
    try{
      const catObj=categories.find(c=>c.nom===cat)||{slug:slugCat(cat),nom:cat};
      const count=photos.filter(p=>p.categorie_slug===catObj.slug).length+1;
      const ext=file.name.match(/\.[^.]+$/)?.[0]||".jpg";
      const nomFichier=`${catObj.slug}_${count}${ext}`;
      // Chemin : Client/DE1042/Materiel_Lieu/nomFichier
      const path=`${cheminBase}/${nomFichier}`;
      await db.uploadPhoto(path,file);
      const photoData={fiche_id:ficheId||null,etape,categorie_slug:catObj.slug,categorie_nom:catObj.nom,nom_fichier:nomFichier,storage_path:path};
      if(ficheId)await db.post("fiche_photos",photoData);
      onPhotoAdded({...photoData,url:db.photoUrl(path)});
      setCat("");
    }catch(err){setErrMsg("Erreur upload : "+err.message);}
    setUploading(false);
    if(inputRef.current)inputRef.current.value="";
  }
  return(<div style={{background:"#F8F9FA",borderRadius:8,padding:"10px 12px",marginTop:6,marginBottom:14}}>
    <p style={{fontSize:11,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:".05em",margin:"0 0 8px"}}>📷 Photos — {etape}</p>
    {photosEtape.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
      {photosEtape.map((p,i)=><div key={i} onClick={()=>setApercu(p)} style={{cursor:"pointer",position:"relative"}}>
        <img src={p.url} alt={p.categorie_nom} style={{width:60,height:60,objectFit:"cover",borderRadius:5,border:"1.5px solid #E2E6EA",display:"block"}} onError={e=>e.target.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23eee'/%3E%3C/svg%3E"}/>
        <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.6)",borderRadius:"0 0 4px 4px",padding:"2px 3px",fontSize:8,color:"#fff",textAlign:"center"}}>{p.categorie_nom}</div>
      </div>)}
    </div>}
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      <select value={cat} onChange={e=>setCat(e.target.value)} style={{...S.sel,flex:1,minWidth:130,fontSize:12}}>
        <option value="">— Catégorie</option>
        {categories.map(c=><option key={c.nom}>{c.nom}</option>)}
      </select>
      <button onClick={()=>{if(!cat){setErrMsg("Choisissez une catégorie");return;}inputRef.current?.click();}} style={{...S.p2,fontSize:12,padding:"6px 12px",opacity:cat?1:0.5,whiteSpace:"nowrap"}}>
        {uploading?"⏳…":"📷 Photo"}
      </button>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{display:"none"}}/>
    </div>
    {errMsg&&<p style={{fontSize:11,color:"#D73A49",marginTop:4}}>{errMsg}</p>}
    {apercu&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:500,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}} onClick={()=>setApercu(null)}>
      <img src={apercu.url} alt={apercu.categorie_nom} style={{maxWidth:"92vw",maxHeight:"82vh",objectFit:"contain",borderRadius:8}}/>
      <p style={{color:"#fff",marginTop:10,fontSize:13}}>{apercu.categorie_nom} — {apercu.nom_fichier}</p>
      <p style={{color:"rgba(255,255,255,0.5)",fontSize:11,marginTop:4}}>Appuyez pour fermer</p>
    </div>}
  </div>);
}

function UnChamp({c,v,onChange,techs,clients,onAddClient}){
  if(!champVisible(c,v))return null;
  const val=v[c.id]||"";const manque=c.required&&!val;const err=enErreur(c,val);
  const lbl=<label style={{...S.lbl,color:manque?"#D73A49":"#6B7280"}}>
    {c.label}{c.required&&<span style={{color:"#D73A49"}}> *</span>}
    {c.unite&&<span style={{color:"#9CA3AF",fontWeight:400,textTransform:"none"}}> ({c.unite})</span>}
    {c.note&&<span style={{color:"#9CA3AF",fontWeight:400,textTransform:"none",fontSize:10}}> — {c.note}</span>}
  </label>;
  let ctrl;
  if(c.type==="client")ctrl=<ChampClient valeur={val} onChange={nv=>onChange(c.id,nv)} clients={clients} onAddClient={onAddClient}/>;
  else if(c.type==="technicien")ctrl=<ChampTechnicien valeur={val} onChange={nv=>onChange(c.id,nv)} techs={techs}/>;
  else if(c.type==="roulement")ctrl=<ChampRoulement valeur={val} onChange={nv=>onChange(c.id,nv)}/>;
  else if(c.type==="select"){
    const isAutre=val&&!c.options.includes(val)&&c.autreTexte;
    ctrl=<div style={{display:"flex",flexDirection:"column",gap:5}}>
      <select value={isAutre?"Autre":(val||"")} onChange={e=>{if(e.target.value==="Autre")onChange(c.id,"Autre:");else onChange(c.id,e.target.value);}} style={S.sel}>
        <option value="">— Sélectionner</option>
        {c.options.map(o=><option key={o}>{o}</option>)}
      </select>
      {(isAutre||val?.startsWith("Autre:"))&&c.autreTexte&&<input type="text" placeholder="Préciser..." value={val?.replace("Autre:","")||""} onChange={e=>onChange(c.id,"Autre:"+e.target.value)} style={S.inp}/>}
    </div>;
  }
  else if(c.type==="mesure")ctrl=<div>
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <input type="number" value={val||""} onChange={e=>onChange(c.id,e.target.value)} style={err?{...S.inpErr,flex:1}:{...S.inp,flex:1}} placeholder="—"/>
      {c.unite&&<span style={{fontSize:12,color:"#6B7280",whiteSpace:"nowrap"}}>{c.unite}</span>}
    </div>
    {err&&<div style={S.alert}>⚠ Sous le seuil ({c.seuilMin} {c.unite})</div>}
  </div>;
  else if(c.type==="oui_non")ctrl=<div style={{display:"flex",gap:16}}>
    {["Oui","Non"].map(opt=><label key={opt} style={{display:"flex",alignItems:"center",gap:5,fontSize:13,cursor:"pointer"}}><input type="radio" checked={val===opt} onChange={()=>onChange(c.id,opt)}/> {opt}</label>)}
  </div>;
  else if(c.type==="date")ctrl=<input type="date" value={val} onChange={e=>onChange(c.id,e.target.value)} style={S.inp}/>;
  else if(c.type==="number")ctrl=<div style={{display:"flex",alignItems:"center",gap:6}}>
    <input type="number" value={val} onChange={e=>onChange(c.id,e.target.value)} style={{...S.inp,flex:1}} placeholder="—"/>
    {c.unite&&<span style={{fontSize:12,color:"#6B7280",whiteSpace:"nowrap"}}>{c.unite}</span>}
  </div>;
  else ctrl=<input type="text" value={val} onChange={e=>onChange(c.id,e.target.value)} style={manque?S.inpErr:S.inp} placeholder="—"/>;
  return <div style={{marginBottom:12}}>{lbl}{ctrl}{manque&&<div style={{fontSize:10,color:"#D73A49",marginTop:2}}>Champ obligatoire</div>}</div>;
}

function RenduChamps({nom,v,onChange,techs,clients,onAddClient,ficheId,cheminBase,categories,photos,onPhotoAdded}){
  const width=useWidth();
  const champs=CHAMPS[nom]||[];const rendus=[];const vus=new Set();
  for(let i=0;i<champs.length;i++){
    const c=champs[i];if(vus.has(c.id))continue;
    if(!champVisible(c,v)){vus.add(c.id);continue;}
    if(c.groupe){
      const grp=champs.filter(cc=>cc.groupe===c.groupe&&champVisible(cc,v));
      grp.forEach(cc=>vus.add(cc.id));
      const nCols=grilleCols(grp.length===3?3:2,width);
      rendus.push(<div key={c.groupe} style={{display:"grid",gridTemplateColumns:`repeat(${nCols},1fr)`,gap:8,marginBottom:4}}>
        {grp.map(cc=><UnChamp key={cc.id} c={cc} v={v} onChange={onChange} techs={techs} clients={clients} onAddClient={onAddClient}/>)}
      </div>);
    }else{
      vus.add(c.id);
      rendus.push(<UnChamp key={c.id} c={c} v={v} onChange={onChange} techs={techs} clients={clients} onAddClient={onAddClient}/>);
    }
  }
  rendus.push(<SectionPhotos key="photos" etape={nom} ficheId={ficheId} cheminBase={cheminBase} categories={categories} photos={photos.filter(p=>p.etape===nom)} onPhotoAdded={p=>onPhotoAdded({...p,etape:nom})}/>);
  return <>{rendus}</>;
}

function SectionEtape({nom,idx,actif,validees,v,nr,onChange,onNR,onValider,sessionTech,techs,clients,onAddClient,saving,ficheId,cheminBase,categories,photos,onPhotoAdded}){
  const [ouvert,setOuvert]=useState(false);
  const estAct=idx===actif,estVal=validees.includes(idx),estLock=idx>actif;
  const ok=etapeOk(nom,v,nr);
  const techEtape=(CHAMPS[nom]||[]).filter(c=>c.type==="technicien").map(c=>v[c.id]||"—")[0]||"—";
  const nbPhotos=photos.filter(p=>p.etape===nom).length;
  function resume(){return(CHAMPS[nom]||[]).filter(c=>c.type!=="technicien"&&champVisible(c,v)&&v[c.id]).slice(0,3).map(c=>`${c.label}: ${v[c.id]}${c.unite?" "+c.unite:""}`).join(" · ");}
  if(estLock)return<div style={S.cLock}><div style={{display:"flex",alignItems:"center",gap:10}}><span>🔒</span><span style={{fontSize:14,color:"#9CA3AF"}}>{idx+1}. {nom}</span></div></div>;
  if(estVal&&!estAct)return(<div style={S.cDone}>
    <div onClick={()=>setOuvert(!ouvert)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 16px",cursor:"pointer",background:ouvert?"#F0FFF4":"#fff"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span>✅</span>
        <div><span style={{fontSize:14,fontWeight:600}}>{idx+1}. {nom}</span><span style={{fontSize:12,color:"#9CA3AF",marginLeft:8}}>— {techEtape}{nbPhotos>0?` · 📷 ${nbPhotos}`:""}</span></div>
      </div>
      <span style={{fontSize:12,color:"#6B7280"}}>{ouvert?"▲":"▼"}</span>
    </div>
    {ouvert?(<div style={{padding:"14px 16px",borderTop:"1px solid #E2E6EA"}}>
      <div style={S.info}>✏️ Modification tracée dans l'historique.</div>
      <RenduChamps nom={nom} v={v} onChange={onChange} techs={techs} clients={clients} onAddClient={onAddClient} ficheId={ficheId} cheminBase={cheminBase} categories={categories} photos={photos} onPhotoAdded={onPhotoAdded}/>
    </div>):<div style={{padding:"3px 16px 10px",fontSize:12,color:"#6B7280"}}>{resume()}</div>}
  </div>);
  return(<div style={S.cAct}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
      <div><span style={{fontSize:11,fontWeight:700,color:"#1B4F8A",textTransform:"uppercase",letterSpacing:".07em"}}>En cours</span><p style={{fontSize:16,fontWeight:700,margin:"2px 0 0"}}>{idx+1}. {nom}</p></div>
      <span style={{fontSize:12,color:"#9CA3AF"}}>{idx+1}/{ETAPES.length}</span>
    </div>
    <div style={S.tech}><span>👤</span><span style={{fontSize:13,color:"#1B4F8A"}}>Session : <strong>{sessionTech}</strong></span></div>
    <div style={S.nr} onClick={onNR}>
      <input type="checkbox" checked={nr} onChange={onNR} onClick={e=>e.stopPropagation()}/>
      <div><span style={{fontSize:13,fontWeight:600}}>Étape non réalisable</span><p style={{fontSize:11,color:"#9CA3AF",margin:"1px 0 0"}}>Si coché, les champs ne sont plus obligatoires</p></div>
    </div>
    <div style={{opacity:nr?0.4:1,pointerEvents:nr?"none":"auto"}}>
      <RenduChamps nom={nom} v={v} onChange={onChange} techs={techs} clients={clients} onAddClient={onAddClient} ficheId={ficheId} cheminBase={cheminBase} categories={categories} photos={photos} onPhotoAdded={onPhotoAdded}/>
    </div>
    {!ok&&!nr&&<div style={{...S.alert,marginBottom:10}}>⚠ Des champs obligatoires (*) sont manquants.</div>}
    <button style={{...S.p1,width:"100%",justifyContent:"center",opacity:ok?1:0.5,marginTop:12}} disabled={!ok||saving} onClick={onValider}>
      {saving?"Enregistrement…":"Enregistrer et continuer →"}
    </button>
  </div>);
}

function ModalIdent({techs,onConfirm}){
  const [t,setT]=useState("");
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
    <div style={{background:"#fff",borderRadius:14,padding:"32px 28px",width:340,boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:36,marginBottom:8}}>🏷️</div>
        <p style={{fontSize:17,fontWeight:700,margin:0}}>Qui ouvre cette fiche ?</p>
        <p style={{fontSize:13,color:"#6B7280",margin:"4px 0 0"}}>Votre identité sera tracée pour cette session.</p>
      </div>
      <select value={t} onChange={e=>setT(e.target.value)} style={{...S.sel,marginBottom:16}}>
        <option value="">— Sélectionner</option>
        {techs.map(x=><option key={x}>{x}</option>)}
      </select>
      <button style={{...S.p1,width:"100%",justifyContent:"center",opacity:t?1:0.5}} disabled={!t} onClick={()=>onConfirm(t)}>Ouvrir la fiche</button>
    </div>
  </div>);
}

function genHtml(v,photos){
  function row2(l1,v1,l2,v2,e1,e2){const s1=e1?"color:#D73A49;font-weight:bold":"";const s2=e2?"color:#D73A49;font-weight:bold":"";return `<tr><td class="lbl">${l1}</td><td class="val" style="${s1}">${v1||"—"}</td><td class="lbl">${l2}</td><td class="val" style="${s2}">${v2||"—"}</td></tr>`;}
  function sec(n,t,tech){return `<tr class="sec"><td colspan="4"><span class="sn">${n}.</span> ${t}<span class="st">${tech?"Technicien : "+tech:""}</span></td></tr>`;}
  const css=`*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:9.5pt;color:#1A1A2E;background:#fff;}.page{max-width:210mm;margin:0 auto;padding:12mm;}.hdr{background:#1B4F8A;color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}.ht{font-size:15pt;font-weight:bold;}.hs{font-size:8pt;opacity:.75;margin-top:2px;}.hd{font-size:18pt;font-weight:bold;color:#E8720C;text-align:right;}.hdate{font-size:8pt;opacity:.75;text-align:right;}table{width:100%;border-collapse:collapse;margin-bottom:4px;}td{padding:5px 7px;border:.4px solid #DEE2E6;vertical-align:top;}tr:nth-child(even) td{background:#F8F9FA;}.lbl{font-weight:bold;font-size:9.5pt;width:22%;}.val{font-size:9.5pt;width:28%;}.sec td{background:#1B4F8A;color:#fff;font-weight:bold;padding:6px 8px;}.sn{margin-right:6px;}.st{float:right;font-size:8pt;opacity:.8;font-weight:normal;}.sub td{background:#D6E4F7;color:#1B4F8A;font-weight:bold;padding:5px 8px;}.ft{border-top:.5px solid #DEE2E6;margin-top:10px;padding-top:5px;font-size:7pt;color:#6B7280;text-align:center;}.pg{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0;}.pi img{width:80px;height:80px;object-fit:cover;border-radius:4px;border:.5px solid #DEE2E6;}.pi p{font-size:7pt;color:#6B7280;margin-top:2px;text-align:center;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.np{display:none!important;}}`;
  const ch=cheminFiche(v);
  const jav=`${v.joint_av_int||"?"}×${v.joint_av_ext||"?"}×${v.joint_av_ep||"?"} ${v.joint_av_levres==="Double"?"DL":"SL"}`;
  const jar=`${v.joint_ar_int||"?"}×${v.joint_ar_ext||"?"}×${v.joint_ar_ep||"?"} ${v.joint_ar_levres==="Double"?"DL":"SL"}`;
  const now=new Date().toLocaleDateString("fr-FR");
  const photosHtml=photos.length>0?`<p style="font-weight:bold;margin:10px 0 4px;font-size:9.5pt;">Photos (${photos.length})</p><div class="pg">${photos.map(p=>`<div class="pi"><img src="${p.url}" alt="${p.categorie_nom}"/><p>${p.categorie_nom}</p></div>`).join("")}</div>`:"";
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><title>Fiche ${v.de||""}</title><style>${css}</style></head><body><div class="page">
<button class="np" onclick="window.print()" style="margin-bottom:10px;background:#1B4F8A;color:#fff;border:none;padding:7px 16px;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600;">📄 Imprimer / PDF</button>
<button class="np" onclick="window.close()" style="margin-bottom:10px;margin-left:8px;background:#fff;color:#1B4F8A;border:1.5px solid #1B4F8A;padding:7px 16px;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600;">✕ Fermer</button>
<div class="hdr"><div><div class="ht">FICHE D'ENTRETIEN / EXPERTISE</div><div class="hs">Atelier PMV — ${ch.client} / ${ch.de} / ${ch.mat}</div></div><div><div class="hd">${v.de||"—"}</div><div class="hdate">${v.date_entree||now}</div></div></div>
<table>${sec("1","ENTRÉE",v.tech_entree)}${row2("Client",v.client,"Téléphone",v.telephone)}${row2("Mail",v.mail,"Matériel / Lieux",v.materiel_lieu)}${row2("Marque",v.marque_moteur,"Type",v.type_moteur)}${row2("N° série",v.numero_serie,"Fixation",v.fixation)}${row2("Puissance",v.puissance?v.puissance+" kW":"","Vitesse",v.vitesse?v.vitesse+" tr/mn":"")}${row2("Tension",v.tension?v.tension+" V":"","Déposé / Enlevé",(v.depose_nos_soins||"—")+" / "+(v.enleve_nos_soins||"—"))}</table>
<table>${sec("2","INFOS ÉLECTRIQUES",v.tech_elec)}${row2("Couplage",v.couplage,"ADX résultat",v.adx_resultat,false,v.adx_resultat==="Hors Tolérance")}${row2("Isol. masse",v.isol_masse?v.isol_masse+" MΩ":"","ADX valeur",v.adx_valeur?v.adx_valeur+" MΩ":"")}${row2("Isol. U-V",v.isol_uv?v.isol_uv+" MΩ":"","Isol. V-W",v.isol_vw?v.isol_vw+" MΩ":"",false,parseFloat(v.isol_vw)<300)}${row2("Isol. W-U",v.isol_wu?v.isol_wu+" MΩ":"","Plaque bornes",v.plaque_bornes_etat,false,v.plaque_bornes_etat==="HS")}${row2("Sonde",v.sonde_presence,"Valeur sonde",v.sonde_valeur?v.sonde_valeur+" Ω":"")}</table>
<table>${sec("3","ROTATION AVANT DÉMONTAGE",v.tech_mesure_avant)}${row2("Essai à vide",v.essai_vide_avant,"Rotor CC",v.rotor_cc_realise+(v.rotor_cc_resultat?" — "+v.rotor_cc_resultat:""))}${row2("Int. Ph.1",v.int_p1_avant?v.int_p1_avant+" A":"","Int. Ph.2",v.int_p2_avant?v.int_p2_avant+" A":"")}${row2("Int. Ph.3",v.int_p3_avant?v.int_p3_avant+" A":"","560V Ph.1",v.int_560_p1_avant?v.int_560_p1_avant+" A":"")}${row2("560V Ph.2",v.int_560_p2_avant?v.int_560_p2_avant+" A":"","560V Ph.3",v.int_560_p3_avant?v.int_560_p3_avant+" A":"")}${row2("Vib. av. mm/s",v.vib_av_mms_avant?v.vib_av_mms_avant+" mm/s":"","Vib. av. GE",v.vib_av_ge_avant?v.vib_av_ge_avant+" GE":"")}${row2("Vib. ar. mm/s",v.vib_ar_mms_avant?v.vib_ar_mms_avant+" mm/s":"","Vib. ar. GE",v.vib_ar_ge_avant?v.vib_ar_ge_avant+" GE":"")}${row2("HP",v.nettoyage_hp,"Étuvage",v.etuvage_stator)}${row2("Isol. enroul. min.",v.isol_enroul_min?v.isol_enroul_min+" MΩ":"","","")}</table>
<table>${sec("4","MATÉRIEL AU DÉMONTAGE",v.tech_demontage)}${row2("Ventilateur",v.ventilateur_present,"État vent.",v.etat_ventilateur)}${row2("Taille vent.",v.taille_ventilateur,"Peinture",v.peinture)}${row2("Circlips av./ar.",(v.circlips_avant||"—")+" / "+(v.circlips_arriere||"—"),"Rondelle",v.rondelle_presence)}${row2("Bobinage",v.etat_bobinage,"Rotor",v.etat_rotor)}<tr class="sub"><td colspan="2">ROULEMENT AVANT</td><td colspan="2">ROULEMENT ARRIÈRE</td></tr>${row2("Type",v.type_roulement_av?.replace("Autre:",""),"Type",v.type_roulement_ar?.replace("Autre:",""))}${row2("État",v.etat_roulement_av,"État",v.etat_roulement_ar,["HS","Cassé"].includes(v.etat_roulement_av),["HS","Cassé"].includes(v.etat_roulement_ar))}${row2("Flasque av.",v.etat_flasque_av+(v.mesure_flasque_av?" — "+v.mesure_flasque_av+" mm":""),"Flasque ar.",v.etat_flasque_ar+(v.mesure_flasque_ar?" — "+v.mesure_flasque_ar+" mm":""))}${row2("Arbre av.",v.etat_arbre_av+(v.mesure_arbre_av?" — "+v.mesure_arbre_av+" mm":""),"Arbre ar.",v.etat_arbre_ar+(v.mesure_arbre_ar?" — "+v.mesure_arbre_ar+" mm":""))}${row2("Joint av.",jav,"Joint ar.",jar)}</table>
<table>${sec("5","ESSAIS APRÈS REMONTAGE","Remonté: "+(v.tech_remontage||"—")+" / Essayé: "+(v.tech_essai||"—"))}${row2("Essai à vide",v.essai_vide_apres,"Resserrage",v.resserage_plaque)}${row2("Int. Ph.1",v.int_p1_apres?v.int_p1_apres+" A":"","Int. Ph.2",v.int_p2_apres?v.int_p2_apres+" A":"")}${row2("Int. Ph.3",v.int_p3_apres?v.int_p3_apres+" A":"","560V Ph.1",v.int_560_p1_apres?v.int_560_p1_apres+" A":"")}${row2("560V Ph.2",v.int_560_p2_apres?v.int_560_p2_apres+" A":"","560V Ph.3",v.int_560_p3_apres?v.int_560_p3_apres+" A":"")}${row2("Vib. av. mm/s",v.vib_av_mms_apres?v.vib_av_mms_apres+" mm/s":"","Vib. av. GE",v.vib_av_ge_apres?v.vib_av_ge_apres+" GE":"")}${row2("Vib. ar. mm/s",v.vib_ar_mms_apres?v.vib_ar_mms_apres+" mm/s":"","Vib. ar. GE",v.vib_ar_ge_apres?v.vib_ar_ge_apres+" GE":"")}}</table>
${photosHtml}<div class="ft">Fiche ${v.de||"—"} · ${ch.client}/${ch.de}/${ch.mat} · ${now} · Atelier PMV</div>
</div></body></html>`;
}

function imprimerFiche(v,photos){const w=window.open("","_blank","width=900,height=700");w.document.write(genHtml(v,photos));w.document.close();setTimeout(()=>w.print(),800);}
function ApercuFiche({v,photos,onClose}){
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:300,display:"flex",flexDirection:"column"}}>
    <div style={{background:"#1B4F8A",color:"#fff",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
      <span style={{fontWeight:700}}>Aperçu — {v.de}</span>
      <div style={{display:"flex",gap:10}}>
        <button style={{background:"#E8720C",color:"#fff",border:"none",padding:"7px 14px",borderRadius:6,fontWeight:600,cursor:"pointer"}} onClick={()=>imprimerFiche(v,photos)}>📄 Imprimer / PDF</button>
        <button style={{background:"rgba(255,255,255,0.2)",color:"#fff",border:"none",padding:"7px 14px",borderRadius:6,fontWeight:600,cursor:"pointer"}} onClick={onClose}>✕ Fermer</button>
      </div>
    </div>
    <iframe srcDoc={genHtml(v,photos)} style={{flex:1,border:"none",background:"#fff"}} title="Aperçu"/>
  </div>);
}

// ─── PAGE ACCUEIL — EXPLORATEUR ─────────────────────────────────────────
function statutStyle(s){if(s==="Terminée")return{background:"#F0FFF4",color:"#22863A"};if(s==="En cours")return{background:"#FFF8E1",color:"#E8720C"};if(s==="Modifiée")return{background:"#EEF4FF",color:"#1B4F8A"};return{};}

// Sous-dossier : une fiche individuelle dans un DE
function SousDossierFiche({f,onOpen,onDelete}){
  const [ouvert,setOuvert]=useState(false);
  const [photos,setPhotos]=useState([]);
  const [loadingP,setLoadingP]=useState(false);
  const [confirmSuppr,setConfirmSuppr]=useState(false);
  const ch=cheminFiche({client:f.client,de:f.de,materiel_lieu:f.materiel});

  async function toggle(){
    if(!ouvert&&photos.length===0){
      setLoadingP(true);
      try{const p=await db.get("fiche_photos",`?fiche_id=eq.${f.id}&order=created_at`);if(Array.isArray(p))setPhotos(p.map(pp=>({...pp,url:db.photoUrl(pp.storage_path)})));}catch(e){}
      setLoadingP(false);
    }
    setOuvert(!ouvert);
  }

  async function supprimer(){
    try{
      await db.del("fiche_photos",`?fiche_id=eq.${f.id}`);
      await db.del("fiche_valeurs",`?fiche_id=eq.${f.id}`);
      await db.del("fiche_historique",`?fiche_id=eq.${f.id}`);
      await db.del("fiches",`?id=eq.${f.id}`);
      onDelete(f.id);
    }catch(e){alert("Erreur : "+e.message);}
  }

  return(<div style={{marginLeft:16,marginBottom:8,borderLeft:"2px solid #E2E6EA",paddingLeft:12}}>
    <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 10px",background:ouvert?"#EEF4FF":"#F8F9FA",borderRadius:8}} onClick={toggle}>
      <span style={{fontSize:16}}>{ouvert?"📂":"📁"}</span>
      <div style={{flex:1,minWidth:0}}>
        <p style={{margin:0,fontSize:13,fontWeight:600,color:"#1B4F8A",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ch.mat}</p>
        <p style={{margin:0,fontSize:11,color:"#9CA3AF"}}>{f.materiel} · {fmt(f.created_at)}</p>
      </div>
      <span style={{...statutStyle(f.statut),fontSize:11,fontWeight:600,padding:"2px 7px",borderRadius:4,whiteSpace:"nowrap"}}>{f.statut}</span>
      <span style={{fontSize:14,color:"#9CA3AF"}}>{ouvert?"▲":"▼"}</span>
    </div>
    {ouvert&&<div style={{padding:"10px 12px",background:"#fff",borderRadius:"0 0 8px 8px",border:"1px solid #E2E6EA",borderTop:"none"}}>
      <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,background:"#F5F6F8",borderRadius:7,padding:"7px 12px",flex:1,minWidth:180,cursor:"pointer"}} onClick={()=>onOpen(f)}>
          <span style={{fontSize:18}}>📋</span>
          <div><p style={{margin:0,fontSize:13,fontWeight:600}}>{f.de} — Fiche d'entretien</p><p style={{margin:0,fontSize:11,color:"#9CA3AF"}}>Ouvrir et modifier</p></div>
        </div>
      </div>
      {loadingP&&<p style={{fontSize:12,color:"#9CA3AF"}}>Chargement photos…</p>}
      {photos.length>0&&<div style={{marginBottom:10}}>
        <p style={{fontSize:11,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:".05em",margin:"0 0 6px"}}>📷 {photos.length} photo{photos.length>1?"s":""}</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {photos.map((p,i)=><div key={i} style={{textAlign:"center"}}>
            <img src={p.url} alt={p.categorie_nom} style={{width:68,height:68,objectFit:"cover",borderRadius:6,border:"1.5px solid #E2E6EA",display:"block",cursor:"pointer"}}
              onClick={()=>window.open(p.url,"_blank")}
              onError={e=>e.target.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='68' height='68'%3E%3Crect width='68' height='68' fill='%23eee'/%3E%3C/svg%3E"}/>
            <p style={{fontSize:9,color:"#6B7280",marginTop:2,maxWidth:68,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.categorie_nom}</p>
          </div>)}
        </div>
      </div>}
      {photos.length===0&&!loadingP&&<p style={{fontSize:12,color:"#9CA3AF",margin:"0 0 8px"}}>Aucune photo</p>}
      <div style={{paddingTop:8,borderTop:"1px solid #F3F4F6",display:"flex",justifyContent:"flex-end"}}>
        {!confirmSuppr
          ?<button onClick={()=>setConfirmSuppr(true)} style={S.pDanger}>🗑 Supprimer</button>
          :<div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,color:"#D73A49",fontWeight:600}}>Supprimer fiche + photos ?</span>
            <button onClick={supprimer} style={S.pDanger}>Confirmer</button>
            <button onClick={()=>setConfirmSuppr(false)} style={S.p2}>Annuler</button>
          </div>}
      </div>
    </div>}
  </div>);
}

// Sous-dossier DE : contient une ou plusieurs fiches
function DossierDE({de,fiches,onOpen,onDelete}){
  const [ouvert,setOuvert]=useState(false);
  return(<div style={{marginLeft:16,marginBottom:10,borderLeft:"2px solid #D6E4F7",paddingLeft:12}}>
    <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"9px 12px",background:ouvert?"#D6E4F7":"#EEF4FF",borderRadius:8}} onClick={()=>setOuvert(!ouvert)}>
      <span style={{fontSize:18}}>{ouvert?"📂":"📁"}</span>
      <div style={{flex:1}}>
        <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1B4F8A"}}>{de}</p>
        <p style={{margin:0,fontSize:11,color:"#6B7280"}}>{fiches.length} fiche{fiches.length>1?"s":""}</p>
      </div>
      <span style={{fontSize:14,color:"#9CA3AF"}}>{ouvert?"▲":"▼"}</span>
    </div>
    {ouvert&&<div style={{marginTop:6}}>
      {fiches.map(f=><SousDossierFiche key={f.id} f={f} onOpen={onOpen} onDelete={onDelete}/>)}
    </div>}
  </div>);
}

// Dossier client racine
function DossierClient({client,fiches,onOpen,onDelete}){
  const [ouvert,setOuvert]=useState(false);
  // Grouper par DE
  const parDE={};
  fiches.forEach(f=>{const de=deSlug(f.de||"DE");if(!parDE[de])parDE[de]=[];parDE[de].push(f);});
  const deList=Object.keys(parDE).sort();
  const nbFiches=fiches.length;

  return(<div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",marginBottom:10,overflow:"hidden"}}>
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"13px 16px",cursor:"pointer"}} onClick={()=>setOuvert(!ouvert)}>
      <span style={{fontSize:22}}>{ouvert?"📂":"📁"}</span>
      <div style={{flex:1,minWidth:0}}>
        <p style={{margin:0,fontSize:14,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{client}</p>
        <p style={{margin:0,fontSize:11,color:"#9CA3AF"}}>{deList.length} N° DE · {nbFiches} fiche{nbFiches>1?"s":""}</p>
      </div>
      <span style={{fontSize:16,color:"#9CA3AF"}}>{ouvert?"▲":"▼"}</span>
    </div>
    {ouvert&&<div style={{borderTop:"1px solid #F3F4F6",padding:"10px 0 10px"}}>
      {deList.map(de=><DossierDE key={de} de={de} fiches={parDE[de]} onOpen={onOpen} onDelete={onDelete}/>)}
    </div>}
  </div>);
}

function PageAccueil({onNew,onOpen}){
  const [fiches,setFiches]=useState([]);const [loading,setLoading]=useState(true);const [q,setQ]=useState("");const [fs,setFs]=useState("Tous");
  useEffect(()=>{db.get("fiches","?order=created_at.desc").then(d=>{setFiches(Array.isArray(d)?d:[]);setLoading(false);}).catch(()=>setLoading(false));},[]);
  function onDelete(id){setFiches(prev=>prev.filter(f=>f.id!==id));}

  const fichesFiltrees=fiches.filter(f=>{
    const qq=q.toLowerCase();
    return(!qq||(f.de||"").replace("-","").toLowerCase().includes(qq)||(f.client||"").toLowerCase().includes(qq)||(f.materiel||"").toLowerCase().includes(qq))&&(fs==="Tous"||f.statut===fs);
  });

  // Grouper par client
  const parClient={};
  fichesFiltrees.forEach(f=>{const c=f.client||"Sans client";if(!parClient[c])parClient[c]=[];parClient[c].push(f);});
  const clientList=Object.keys(parClient).sort();

  return(<div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
      <div><h1 style={{fontSize:22,fontWeight:800,margin:0}}>Fiches atelier</h1><p style={{fontSize:13,color:"#6B7280",margin:"3px 0 0"}}>{clientList.length} client{clientList.length>1?"s":`s`} · {fiches.length} fiche{fiches.length>1?"s":""}</p></div>
      <button style={S.p1} onClick={onNew}>+ Nouvelle fiche</button>
    </div>
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"12px 16px",marginBottom:16,display:"flex",gap:10,flexWrap:"wrap"}}>
      <input type="text" placeholder="🔍 Client, N° DE, matériel..." value={q} onChange={e=>setQ(e.target.value)} style={{...S.inp,flex:1,minWidth:160}}/>
      <select value={fs} onChange={e=>setFs(e.target.value)} style={{...S.sel,width:150}}>
        <option value="Tous">Tous statuts</option>
        <option>En cours</option><option>Terminée</option><option>Modifiée</option>
      </select>
    </div>
    {loading&&<div style={{textAlign:"center",padding:"32px",color:"#9CA3AF"}}>Chargement…</div>}
    {!loading&&clientList.length===0&&<div style={{textAlign:"center",padding:"32px",color:"#9CA3AF"}}>{fiches.length===0?"Aucune fiche — créez la première !":"Aucun résultat."}</div>}
    {clientList.map(c=><DossierClient key={c} client={c} fiches={parClient[c]} onOpen={onOpen} onDelete={onDelete}/>)}
  </div>);
}

function PageChoix({onChoisir,onRetour}){
  const mats=[{id:"Moteur",emoji:"⚙️",desc:"Moteur électrique seul"},{id:"Pompe",emoji:"💧",desc:"Corps de pompe + moteur",soon:true},{id:"Ventilation",emoji:"🌀",desc:"Ventilateur + moteur",soon:true},{id:"Réducteur",emoji:"🔩",desc:"Réducteur + moteur",soon:true},{id:"Moto-réducteur",emoji:"🔧",desc:"Moto-réducteur complet",soon:true}];
  return(<div style={{maxWidth:700,margin:"0 auto",padding:"20px 16px"}}>
    <button style={{...S.p2,marginBottom:20}} onClick={onRetour}>← Retour</button>
    <h2 style={{fontSize:20,fontWeight:800,margin:"0 0 6px"}}>Nouvelle fiche — quel matériel ?</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:14}}>
      {mats.map(m=><div key={m.id} onClick={()=>onChoisir(m.id)} style={{...S.card,textAlign:"center",cursor:m.soon?"default":"pointer",opacity:m.soon?0.6:1}}>
        <div style={{fontSize:32,marginBottom:8}}>{m.emoji}</div>
        <p style={{fontWeight:700,fontSize:15,margin:"0 0 4px"}}>{m.id}</p>
        <p style={{fontSize:12,color:"#9CA3AF",margin:0}}>{m.desc}</p>
        {m.soon&&<p style={{fontSize:11,color:"#E8720C",margin:"6px 0 0"}}>Bientôt disponible</p>}
      </div>)}
    </div>
  </div>);
}

function PageFiche({ficheInit,sessionTech,techs,clients,onAddClient,categories,onRetour}){
  const [ficheId,setFicheId]=useState(ficheInit?.id||null);
  const [v,setV]=useState({de:ficheInit?.de||genDE(),date_entree:today()});
  const [actif,setActif]=useState(ficheInit?.etape_active||0);
  const [validees,setValidees]=useState(ficheInit?.etapes_validees||[]);
  const [nrMap,setNrMap]=useState({});
  const [saving,setSaving]=useState(false);
  const [flash,setFlash]=useState(null);
  const [erreur,setErreur]=useState(null);
  const [apercu,setApercu]=useState(false);
  const [photos,setPhotos]=useState([]);

  useEffect(()=>{
    if(!ficheInit?.id)return;
    db.get("fiche_valeurs",`?fiche_id=eq.${ficheInit.id}`).then(rows=>{if(!Array.isArray(rows))return;const m={};rows.forEach(r=>{m[r.champ_id]=r.valeur;});setV(p=>({...p,...m}));});
    db.get("fiche_photos",`?fiche_id=eq.${ficheInit.id}&order=created_at`).then(rows=>{if(!Array.isArray(rows))return;setPhotos(rows.map(p=>({...p,url:db.photoUrl(p.storage_path)})));});
  },[ficheInit?.id]);

  const onChange=useCallback((id,val)=>setV(p=>({...p,[id]:val})),[]);
  const onPhotoAdded=useCallback(p=>setPhotos(prev=>[...prev,p]),[]);

  // Chemin Storage basé sur les valeurs actuelles
  const chem=cheminFiche(v);

  async function save(idx){
    setSaving(true);setErreur(null);
    try{
      let fid=ficheId;
      const newVal=[...new Set([...validees,idx])];
      const toutFini=newVal.length===ETAPES.length;
      if(!fid){
        const res=await db.post("fiches",{de:v.de,materiel:v.materiel_lieu||"Moteur",client:v.client||"",statut:"En cours",etape_active:idx+1,etapes_validees:newVal});
        fid=Array.isArray(res)?res[0]?.id:res?.id;
        if(!fid)throw new Error("Impossible de créer la fiche");
        setFicheId(fid);
        for(const p of photos){
          if(!p.fiche_id)try{await db.post("fiche_photos",{fiche_id:fid,etape:p.etape,categorie_slug:p.categorie_slug,categorie_nom:p.categorie_nom,nom_fichier:p.nom_fichier,storage_path:p.storage_path});}catch(e){}
        }
      }else{
        await db.patch("fiches",`?id=eq.${fid}`,{client:v.client||"",materiel:v.materiel_lieu||"Moteur",statut:toutFini?"Terminée":"En cours",etape_active:Math.min(idx+1,ETAPES.length-1),etapes_validees:newVal});
      }
      await db.del("fiche_valeurs",`?fiche_id=eq.${fid}`);
      const vals=Object.entries(v).filter(([,val])=>val!==undefined&&val!=="").map(([champ_id,valeur])=>({fiche_id:fid,champ_id,valeur:String(valeur)}));
      if(vals.length>0)await db.post("fiche_valeurs",vals);
      await db.post("fiche_historique",{fiche_id:fid,technicien:sessionTech,action:"Étape validée",etape:ETAPES[idx]});
      setValidees(newVal);
      if(idx+1<ETAPES.length)setActif(idx+1);
      setFlash(idx);setTimeout(()=>setFlash(null),3000);
    }catch(e){setErreur("Erreur : "+e.message);}
    finally{setSaving(false);}
  }

  const prog=Math.round((validees.length/ETAPES.length)*100);
  const info=`${v.de} · ${v.client||"Client"} · ${v.materiel_lieu||"Moteur"}`;

  return(<div style={{maxWidth:800,margin:"0 auto",paddingBottom:40}}>
    {apercu&&<ApercuFiche v={v} photos={photos} onClose={()=>setApercu(false)}/>}
    <div style={{background:"#1B4F8A",color:"#fff",padding:"10px 16px",position:"sticky",top:48,zIndex:90}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div>
          <p style={{margin:0,fontSize:12,fontWeight:700}}>{info}</p>
          <p style={{margin:0,fontSize:10,opacity:0.7}}>📁 {chem.client}/{chem.de}/{chem.mat} · Session : {sessionTech}</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{background:"rgba(255,255,255,0.2)",borderRadius:20,height:6,width:100}}><div style={{background:"#E8720C",height:6,borderRadius:20,width:`${prog}%`,transition:"width .4s"}}/></div>
          <span style={{fontSize:12,opacity:0.85}}>{prog}%</span>
          <button style={{...S.p2,fontSize:12,padding:"5px 12px"}} onClick={onRetour}>← Liste</button>
        </div>
      </div>
    </div>
    <div style={{padding:"16px 16px 0"}}>
      {flash!==null&&<div style={S.ok}>✅ Étape "{ETAPES[flash]}" enregistrée.</div>}
      {erreur&&<div style={{...S.alert,marginBottom:14}}>{erreur}</div>}
      {ETAPES.map((nom,i)=><SectionEtape key={nom} nom={nom} idx={i} actif={actif} validees={validees} v={v} nr={!!nrMap[i]} onChange={onChange} onNR={()=>setNrMap(p=>({...p,[i]:!p[i]}))} onValider={()=>save(i)} sessionTech={sessionTech} techs={techs} clients={clients} onAddClient={onAddClient} saving={saving} ficheId={ficheId} cheminBase={chem.chemin} categories={categories} photos={photos} onPhotoAdded={onPhotoAdded}/>)}
      {validees.length===ETAPES.length&&<div style={{...S.card,textAlign:"center",border:"2px solid #22863A"}}>
        <div style={{fontSize:40,marginBottom:10}}>🎉</div>
        <p style={{fontSize:18,fontWeight:800,color:"#22863A",margin:"0 0 4px"}}>Fiche complète !</p>
        <p style={{fontSize:12,color:"#6B7280",margin:"0 0 4px"}}>📁 {chem.client} / {chem.de} / {chem.mat}</p>
        <p style={{fontSize:12,color:"#9CA3AF",margin:"0 0 20px"}}>{photos.length} photo{photos.length>1?"s":""}</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button style={S.p1} onClick={()=>setApercu(true)}>👁 Aperçu fiche</button>
          <button style={{...S.p1,background:"#22863A"}} onClick={()=>imprimerFiche(v,photos)}>📄 Imprimer / PDF</button>
          <button style={S.p2}>📧 Rapport client (bientôt)</button>
          <button style={S.p2} onClick={onRetour}>← Retour à l'accueil</button>
        </div>
      </div>}
    </div>
  </div>);
}

export default function App(){
  const [pinOk,setPinOk]=useState(()=>localStorage.getItem(PIN_KEY)==="1");
  const [page,setPage]=useState("accueil");
  const [sessionTech,setSessionTech]=useState(null);
  const [ficheOuverte,setFicheOuverte]=useState(null);
  const [demandeIdent,setDemandeIdent]=useState(false);
  const [pending,setPending]=useState(null);
  const [techs,setTechs]=useState(TECHNICIENS_FB);
  const [clients,setClients]=useState(CLIENTS_FB);
  const [categories,setCategories]=useState(CATS_FB.map(n=>({nom:n,slug:slugCat(n)})));

  useEffect(()=>{
    db.get("techniciens","?actif=eq.true&order=initiales").then(d=>{if(Array.isArray(d)&&d.length>0)setTechs(d.map(t=>t.initiales));}).catch(()=>{});
    db.get("clients","?order=nom").then(d=>{if(Array.isArray(d)&&d.length>0)setClients(d.map(c=>c.nom));}).catch(()=>{});
    db.get("categories_photos","?actif=eq.true&order=ordre").then(d=>{if(Array.isArray(d)&&d.length>0)setCategories(d);}).catch(()=>{});
  },[]);

  function onAddClient(nom){setClients(prev=>[...prev,nom].sort());}
  function askIdent(fn){setDemandeIdent(true);setPending(()=>fn);}
  function confirmIdent(t){setSessionTech(t);setDemandeIdent(false);if(pending){pending(t);setPending(null);}}

  if(!pinOk)return <ModalPin onSuccess={()=>setPinOk(true)}/>;

  return(<div style={S.app}>
    <div style={S.hdr}>
      <div><p style={{fontSize:16,fontWeight:700,margin:0}}>⚡ Atelier PMV — Fiches d'entretien</p><p style={{fontSize:12,opacity:0.75,margin:"2px 0 0"}}>Expertise moteurs & matériels électriques</p></div>
      {sessionTech&&<div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:12,opacity:0.75}}>Session :</span>
        <span style={{background:"rgba(255,255,255,0.2)",padding:"3px 10px",borderRadius:5,fontSize:13,fontWeight:700}}>{sessionTech}</span>
        <button style={{background:"transparent",border:"1px solid rgba(255,255,255,0.4)",color:"#fff",padding:"3px 8px",borderRadius:5,fontSize:11,cursor:"pointer"}} onClick={()=>setSessionTech(null)}>Changer</button>
      </div>}
    </div>
    {demandeIdent&&<ModalIdent techs={techs} onConfirm={confirmIdent}/>}
    {page==="accueil"&&<PageAccueil onNew={()=>askIdent(t=>{setSessionTech(t);setPage("choix");})} onOpen={f=>askIdent(t=>{setSessionTech(t);setFicheOuverte(f);setPage("fiche");})}/>}
    {page==="choix"&&<PageChoix onChoisir={m=>{if(m!=="Moteur"){alert("Bientôt disponible.");return;}setFicheOuverte(null);setPage("fiche");}} onRetour={()=>setPage("accueil")}/>}
    {page==="fiche"&&<PageFiche ficheInit={ficheOuverte} sessionTech={sessionTech||"—"} techs={techs} clients={clients} onAddClient={onAddClient} categories={categories} onRetour={()=>{setPage("accueil");setFicheOuverte(null);}}/>}
  </div>);
}
