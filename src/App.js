import React, { useState, useCallback, useEffect, useRef } from "react";

// ─── SUPABASE ──────────────────────────────────────────────────────────
const SUPA_URL = "https://pupbzngvudprcweukuoi.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1cGJ6bmd2dWRwcmN3ZXVrdW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxODY3NDAsImV4cCI6MjA5Nzc2Mjc0MH0.jn025v42M3qNpAKfvy49cdCySBdTqwRz99b1EfaKYoo";
const H = { "Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":`Bearer ${SUPA_KEY}` };
const db = {
  async get(t,p=""){const r=await fetch(`${SUPA_URL}/rest/v1/${t}${p}`,{headers:{...H,"Prefer":"return=representation"}});return r.json();},
  async post(t,b){const r=await fetch(`${SUPA_URL}/rest/v1/${t}`,{method:"POST",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify(b)});return r.json();},
  async patch(t,p,b){const r=await fetch(`${SUPA_URL}/rest/v1/${t}${p}`,{method:"PATCH",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify(b)});return r.json();},
  async del(t,p){await fetch(`${SUPA_URL}/rest/v1/${t}${p}`,{method:"DELETE",headers:H});},
  async uploadPhoto(path,file){
    const r=await fetch(`${SUPA_URL}/storage/v1/object/photos/${path}`,{method:"POST",headers:{"apikey":SUPA_KEY,"Authorization":`Bearer ${SUPA_KEY}`,"Content-Type":file.type},body:file});
    return r.ok;
  },
  photoUrl(path){return `${SUPA_URL}/storage/v1/object/public/photos/${path}`;}
};

// ─── PIN ───────────────────────────────────────────────────────────────
const PIN_CODE = "3739";
const PIN_KEY = "pmv_pin_ok";

// ─── DONNÉES ───────────────────────────────────────────────────────────
const TECHNICIENS_FB = ["AD","CB","JM","KD","CD","RC","MC","DN","EL","Autre"];
const CLIENTS_FB = [];
const CATEGORIES_PHOTOS_FB = ["Vue d'ensemble","Plaque moteur","Plaque pompe","Plaque ventilation","Plaque réducteur","Autre plaque","Stator avant","Stator arrière","Rotor","Flasque avant","Flasque arrière","Arbre avant","Arbre arrière","Divers"];
const ROULEMENTS = ["608 ZZ C3","608 RSH","6000 ZZ C3","6001 ZZ C3","6002 ZZ C3","6003 ZZ C3","6004 ZZ C3","6005 ZZ C3","6006 ZZ C3","6007 ZZ C3","6008 ZZ C3","6009 ZZ C3","6010 ZZ C3","6011 ZZ C3","6200 ZZ C3","6201 ZZ C3","6202 ZZ C3","6203 ZZ C3","6204 ZZ C3","6205 ZZ C3","6206 ZZ C3","6207 ZZ C3","6208 ZZ C3","6209 ZZ C3","6210 ZZ C3","6211 ZZ C3","6212 ZZ C3","6213 ZZ C3","6214 ZZ C3","6215 ZZ C3","6216 ZZ C3","6217 ZZ C3","6217 C3","6218 ZZ C3","6218 C3","6219 ZZ C3","6219 C3","6300 ZZ C3","6301 ZZ C3","6302 ZZ C3","6303 ZZ C3","6304 ZZ C3","6305 ZZ C3","6306 ZZ C3","6307 ZZ C3","6308 ZZ C3","6309 ZZ C3","6310 ZZ C3","6311 ZZ C3","6312 ZZ C3","6313 ZZ C3","6314 ZZ C3","6315 ZZ C3","6316 ZZ C3","6317 ZZ C3","6317 C3","6318 ZZ C3","6318 C3","6319 ZZ C3","6319 C3","NU 206 C3","NU 208 C3","NU 209 C3","NU 210 C3","NU 212 C3","NU 213 C3","NU 214 C3","NU 215 C3","NU 308 C3","NU 309 C3","NU 310 C3","NU 311 C3","NU 312 C3","NU 313 C3","NU 314 C3","NU 315 C3","NU 316 C3","NU 319 C3","NU 322 C3","Autre"];
const SEUIL_OMEGA = 300;
const ETAPES = ["Entrée","Infos électriques","Information rotation avant démontage","Information matériel au démontage","Information des essais après remontage"];

const CHAMPS = {
  "Entrée": [
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
  "Infos électriques": [
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
  "Information rotation avant démontage": [
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
    {id:"int_560_p1_avant",label:"Intensité 560V — Phase 1",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_avant"},
    {id:"int_560_p2_avant",label:"Intensité 560V — Phase 2",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_avant"},
    {id:"int_560_p3_avant",label:"Intensité 560V — Phase 3",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_avant"},
    {id:"nettoyage_hp",label:"Nettoyage HP",type:"select",options:["Oui","Non"],required:true},
    {id:"etuvage_stator",label:"Étuvage du stator",type:"select",options:["Oui","Non"],required:true},
    {id:"isol_masse_hp",label:"Mesure isolement masse (suite HP)",type:"mesure",unite:"MΩ",seuilMin:SEUIL_OMEGA,required:true,condition:{champ:"etuvage_stator",valeur:"Oui"}},
    {id:"isol_enroul_min",label:"Isolement enroulements — plus petite valeur",type:"mesure",unite:"MΩ",seuilMin:SEUIL_OMEGA,required:true},
    {id:"tech_mesure_avant",label:"Qui a mesuré",type:"technicien",required:true},
  ],
  "Information matériel au démontage": [
    {id:"ventilateur_present",label:"Présence d'un ventilateur",type:"oui_non",required:true},
    {id:"circlips_avant",label:"Circlips avant",type:"text",required:true},
    {id:"circlips_arriere",label:"Circlips arrière",type:"text",required:true},
    {id:"rondelle_presence",label:"Rondelle souplesse — présence",type:"select",options:["Oui","Non"],required:true},
    {id:"rondelle_avant",label:"Rondelle souplesse avant",type:"select",options:["Oui","Non"],required:true,condition:{champ:"rondelle_presence",valeur:"Oui"}},
    {id:"rondelle_arriere",label:"Rondelle souplesse arrière",type:"select",options:["Oui","Non"],required:true,condition:{champ:"rondelle_presence",valeur:"Oui"}},
    {id:"etat_ventilateur",label:"État ventilateur",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,condition:{champ:"ventilateur_present",valeur:"Oui"}},
    {id:"taille_ventilateur",label:"Taille ventilateur",type:"text",required:true,condition:{champ:"ventilateur_present",valeur:"Oui"}},
    {id:"type_roulement_av",label:"Type roulement avant",type:"roulement",required:true},
    {id:"etat_roulement_av",label:"État roulement avant",type:"select",options:["RAS","Usé","HS","Cassé"],required:true},
    {id:"etat_flasque_av",label:"État visuel flasque avant",type:"select",options:["OK","Marqué"],required:true},
    {id:"etat_arbre_av",label:"État visuel arbre avant",type:"select",options:["OK","Marqué"],required:true},
    {id:"mesure_flasque_av",label:"Mesure flasque avant",type:"number",unite:"mm",required:true},
    {id:"mesure_arbre_av",label:"Mesure arbre avant",type:"number",unite:"mm",required:true},
    {id:"joint_av_int",label:"Joint à lèvres avant — Ø int.",type:"number",unite:"mm",required:true},
    {id:"joint_av_ext",label:"Joint à lèvres avant — Ø ext.",type:"number",unite:"mm",required:true},
    {id:"joint_av_ep",label:"Joint à lèvres avant — épaisseur",type:"number",unite:"mm",required:true},
    {id:"joint_av_levres",label:"Joint à lèvres avant — lèvres",type:"select",options:["Simple","Double"],required:true},
    {id:"type_roulement_ar",label:"Type roulement arrière",type:"roulement",required:true},
    {id:"etat_roulement_ar",label:"État roulement arrière",type:"select",options:["RAS","Usé","HS","Cassé"],required:true},
    {id:"etat_flasque_ar",label:"État visuel flasque arrière",type:"select",options:["OK","Marqué"],required:true},
    {id:"etat_arbre_ar",label:"État visuel arbre arrière",type:"select",options:["OK","Marqué"],required:true},
    {id:"mesure_flasque_ar",label:"Mesure flasque arrière",type:"number",unite:"mm",required:true},
    {id:"mesure_arbre_ar",label:"Mesure arbre arrière",type:"number",unite:"mm",required:true},
    {id:"joint_ar_int",label:"Joint à lèvres arrière — Ø int.",type:"number",unite:"mm",required:true},
    {id:"joint_ar_ext",label:"Joint à lèvres arrière — Ø ext.",type:"number",unite:"mm",required:true},
    {id:"joint_ar_ep",label:"Joint à lèvres arrière — épaisseur",type:"number",unite:"mm",required:true},
    {id:"joint_ar_levres",label:"Joint à lèvres arrière — lèvres",type:"select",options:["Simple","Double"],required:true},
    {id:"peinture",label:"Peinture à faire",type:"oui_non",required:true},
    {id:"etat_bobinage",label:"État visuel bobinage",type:"select",options:["RAS","Cuit","Sale","Vieux","HS"],required:true},
    {id:"etat_rotor",label:"État visuel rotor",type:"select",options:["RAS","Bleui","HS"],required:false},
    {id:"tech_demontage",label:"Qui a démonté",type:"technicien",required:true},
  ],
  "Information des essais après remontage": [
    {id:"tech_remontage",label:"Qui a remonté",type:"technicien",required:true},
    {id:"essai_vide_apres",label:"Essai à vide possible",type:"select",options:["Oui","Non"],required:true},
    {id:"essai_vide_apres_pourquoi",label:"Pourquoi essai à vide impossible",type:"text",required:true,condition:{champ:"essai_vide_apres",valeur:"Non"}},
    {id:"int_p1_apres",label:"Intensité Phase 1",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_apres"},
    {id:"int_p2_apres",label:"Intensité Phase 2",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_apres"},
    {id:"int_p3_apres",label:"Intensité Phase 3",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_apres"},
    {id:"int_560_p1_apres",label:"Intensité 560V — Phase 1",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_apres"},
    {id:"int_560_p2_apres",label:"Intensité 560V — Phase 2",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_apres"},
    {id:"int_560_p3_apres",label:"Intensité 560V — Phase 3",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_apres"},
    {id:"vib_av_mms_apres",label:"Vibration avant — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_avant_apres"},
    {id:"vib_av_ge_apres",label:"Vibration avant — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_avant_apres"},
    {id:"vib_ar_mms_apres",label:"Vibration arrière — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_arriere_apres"},
    {id:"vib_ar_ge_apres",label:"Vibration arrière — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_arriere_apres"},
    {id:"resserage_plaque",label:"Resserrage plaque à bornes",type:"text",required:false},
    {id:"tech_essai",label:"Qui a essayé",type:"technicien",required:true},
  ],
};

// ─── UTILITAIRES ────────────────────────────────────────────────────────
function champVisible(c,v){return !c.condition||v[c.condition.champ]===c.condition.valeur;}
function etapeOk(nom,v,nr){if(nr)return true;for(const c of(CHAMPS[nom]||[])){if(!c.required||!champVisible(c,v))continue;if(!v[c.id])return false;}return true;}
function enErreur(c,val){if(c.type!=="mesure"||c.seuilMin===null||c.seuilMin===undefined)return false;const vv=parseFloat(val);return !isNaN(vv)&&vv<c.seuilMin;}
function genDE(){return "DE-"+String(Math.floor(1000+Math.random()*9000));}
function today(){return new Date().toISOString().split("T")[0];}
function fmt(iso){if(!iso)return "—";return new Date(iso).toLocaleDateString("fr-FR");}
function slugify(s){return s.toLowerCase().replace(/['\s]/g,"_").replace(/[éè]/g,"e").replace(/[à]/g,"a").replace(/[^a-z0-9_]/g,"");}
function nomDossier(v){const c=(v.client||"client").replace(/\s+/g,"_");const l=(v.materiel_lieu||"").replace(/\s+/g,"_");return `${c}_${v.de||"DE"}_${l}`.substring(0,60);}

// ─── STYLES ─────────────────────────────────────────────────────────────
const S={
  app:{fontFamily:"system-ui,-apple-system,sans-serif",background:"#F5F6F8",minHeight:"100vh",color:"#1A1A2E"},
  hdr:{background:"#1B4F8A",color:"#fff",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"},
  p1:{background:"#1B4F8A",color:"#fff",border:"none",padding:"9px 20px",borderRadius:6,fontWeight:600,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:6},
  p2:{background:"#fff",color:"#1B4F8A",border:"1.5px solid #1B4F8A",padding:"8px 18px",borderRadius:6,fontWeight:600,fontSize:14,cursor:"pointer"},
  card:{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"16px 20px",marginBottom:16},
  cAct:{background:"#fff",borderRadius:10,border:"2px solid #1B4F8A",padding:"16px 20px",marginBottom:16},
  cDone:{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",marginBottom:12,overflow:"hidden"},
  cLock:{background:"#F5F6F8",borderRadius:10,border:"1px solid #E2E6EA",padding:"12px 20px",marginBottom:12,opacity:0.5},
  lbl:{fontSize:12,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:4},
  inp:{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid #D1D5DB",fontSize:14,boxSizing:"border-box",background:"#fff"},
  inpErr:{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid #D73A49",fontSize:14,boxSizing:"border-box",background:"#FFF5F5"},
  sel:{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid #D1D5DB",fontSize:14,background:"#fff"},
  alert:{background:"#FFF5F5",border:"1.5px solid #D73A49",borderRadius:6,padding:"6px 10px",fontSize:12,color:"#D73A49",display:"flex",alignItems:"center",gap:6,marginTop:4},
  ok:{background:"#F0FFF4",border:"1px solid #22863A",borderRadius:6,padding:"8px 14px",fontSize:13,color:"#22863A",display:"flex",alignItems:"center",gap:8,marginBottom:14},
  info:{background:"#EEF4FF",border:"1px solid #1B4F8A",borderRadius:6,padding:"8px 14px",fontSize:13,color:"#1B4F8A",display:"flex",alignItems:"center",gap:8,marginBottom:14},
  tech:{background:"#EEF4FF",borderRadius:8,padding:"8px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:14},
  nr:{border:"1.5px solid #E2E6EA",borderRadius:8,padding:"8px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:14,cursor:"pointer"},
  grid3:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14},
  grid2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14},
};

// ─── PIN ────────────────────────────────────────────────────────────────
function ModalPin({onSuccess}){
  const [s,setS]=useState("");
  const [err,setErr]=useState(false);
  function tap(c){
    if(s.length>=4)return;
    const n=s+c;
    setS(n);
    if(n.length===4){
      if(n===PIN_CODE){localStorage.setItem(PIN_KEY,"1");onSuccess();}
      else{setErr(true);setTimeout(()=>{setS("");setErr(false);},800);}
    }
  }
  const touches=["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return(
    <div style={{position:"fixed",inset:0,background:"#1B4F8A",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
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
    </div>
  );
}

// ─── AUTOCOMPLETE CLIENT ────────────────────────────────────────────────
function ChampClient({valeur,onChange,clients,onAddClient}){
  const [q,setQ]=useState(valeur||"");
  const [ouvert,setOuvert]=useState(false);
  const [modeAutre,setModeAutre]=useState(false);
  const ref=useRef(null);

  useEffect(()=>{
    function close(e){if(ref.current&&!ref.current.contains(e.target))setOuvert(false);}
    document.addEventListener("mousedown",close);
    return()=>document.removeEventListener("mousedown",close);
  },[]);

  const filtres=[...clients.filter(c=>c.toLowerCase().includes(q.toLowerCase())&&q.length>0),"Autre"];
  const tousAvecAutre=q.length===0?["Autre"]:filtres;

  function select(c){
    if(c==="Autre"){setModeAutre(true);setQ("");onChange("");}
    else{setQ(c);onChange(c);setOuvert(false);setModeAutre(false);}
  }

  async function enregistrer(){
    if(!q.trim())return;
    try{
      await db.post("clients",{nom:q.trim()});
      onAddClient(q.trim());
    }catch(e){}
    onChange(q.trim());
    setModeAutre(false);
    setOuvert(false);
  }

  if(modeAutre)return(
    <div>
      <div style={{display:"flex",gap:8}}>
        <input type="text" value={q} onChange={e=>{setQ(e.target.value);onChange(e.target.value);}} placeholder="Nom du client..." style={{...S.inp,flex:1}}/>
        <button onClick={enregistrer} style={{...S.p1,fontSize:12,padding:"6px 12px",whiteSpace:"nowrap"}}>+ Enregistrer</button>
        <button onClick={()=>{setModeAutre(false);setQ("");}} style={{...S.p2,fontSize:12,padding:"6px 10px"}}>✕</button>
      </div>
      <p style={{fontSize:11,color:"#9CA3AF",marginTop:3}}>"Enregistrer" ajoutera ce client à la liste pour les prochaines fiches</p>
    </div>
  );

  return(
    <div ref={ref} style={{position:"relative"}}>
      <input type="text" value={q} onChange={e=>{setQ(e.target.value);setOuvert(true);onChange(e.target.value);}} onFocus={()=>setOuvert(true)} placeholder="Tapez pour rechercher..." style={S.inp}/>
      {ouvert&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1.5px solid #D1D5DB",borderRadius:6,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:50,maxHeight:220,overflowY:"auto"}}>
          {tousAvecAutre.map(c=>(
            <div key={c} onClick={()=>select(c)} style={{padding:"8px 12px",cursor:"pointer",fontSize:14,color:c==="Autre"?"#E8720C":"#1A1A2E",fontWeight:c==="Autre"?600:400,borderBottom:"1px solid #F3F4F6"}}
              onMouseOver={e=>e.currentTarget.style.background="#F5F6F8"}
              onMouseOut={e=>e.currentTarget.style.background="transparent"}>
              {c==="Autre"?"+ Autre (nouveau client)":c}
            </div>
          ))}
          {tousAvecAutre.length===1&&q.length>0&&<div style={{padding:"8px 12px",fontSize:13,color:"#9CA3AF"}}>Aucun client trouvé</div>}
        </div>
      )}
    </div>
  );
}

// ─── TECHNICIEN ─────────────────────────────────────────────────────────
function ChampTechnicien({valeur,onChange,techs}){
  const [modeAutre,setModeAutre]=useState(valeur&&!techs.slice(0,-1).includes(valeur)&&valeur!=="Autre");
  const [autreVal,setAutreVal]=useState(modeAutre?valeur:"");
  return(
    <div>
      <select value={modeAutre?"Autre":(valeur||"")} onChange={e=>{if(e.target.value==="Autre"){setModeAutre(true);onChange("");}else{setModeAutre(false);onChange(e.target.value);}}} style={S.sel}>
        <option value="">— Sélectionner</option>
        {techs.map(t=><option key={t}>{t}</option>)}
      </select>
      {modeAutre&&(
        <div style={{marginTop:6,display:"flex",gap:8}}>
          <input type="text" value={autreVal} onChange={e=>{setAutreVal(e.target.value);onChange(e.target.value);}} placeholder="Initiales..." style={{...S.inp,width:120}}/>
          <button onClick={()=>{setModeAutre(false);setAutreVal("");onChange("");}} style={{...S.p2,fontSize:12,padding:"6px 10px"}}>✕</button>
        </div>
      )}
    </div>
  );
}

// ─── ROULEMENT ──────────────────────────────────────────────────────────
function ChampRoulement({valeur,onChange}){
  const isAutre=valeur&&!ROULEMENTS.slice(0,-1).includes(valeur);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <select value={isAutre?"Autre":(valeur||"")} onChange={e=>{if(e.target.value==="Autre")onChange("Autre:");else onChange(e.target.value);}} style={S.sel}>
        <option value="">— Sélectionner</option>
        {ROULEMENTS.map(r=><option key={r}>{r}</option>)}
      </select>
      {(isAutre||valeur?.startsWith("Autre:"))&&<input type="text" placeholder="Référence précise..." value={valeur?.replace("Autre:","")||""} onChange={e=>onChange("Autre:"+e.target.value)} style={S.inp}/>}
    </div>
  );
}

// ─── PHOTOS ─────────────────────────────────────────────────────────────
function SectionPhotos({etape,ficheId,de,categories,photos,onPhotoAdded}){
  const [uploading,setUploading]=useState(false);
  const [catChoisie,setCatChoisie]=useState("");
  const [apercu,setApercu]=useState(null);
  const inputRef=useRef(null);

  async function handleFile(e){
    const file=e.target.files[0];
    if(!file||!catChoisie)return;
    setUploading(true);
    try{
      const cat=categories.find(c=>c.nom===catChoisie)||{slug:slugify(catChoisie),nom:catChoisie};
      const count=photos.filter(p=>p.categorie_slug===cat.slug).length+1;
      const nomFichier=`${de}_${cat.slug}_${count}.jpg`;
      const path=`${de}/${nomFichier}`;
      const ok=await db.uploadPhoto(path,file);
      if(ok&&ficheId){
        await db.post("fiche_photos",{fiche_id:ficheId,etape,categorie_slug:cat.slug,categorie_nom:cat.nom,nom_fichier:nomFichier,storage_path:path});
        onPhotoAdded({categorie_slug:cat.slug,categorie_nom:cat.nom,nom_fichier:nomFichier,storage_path:path,url:db.photoUrl(path)});
      }
    }catch(err){}
    setUploading(false);
    setCatChoisie("");
    if(inputRef.current)inputRef.current.value="";
  }

  const photosEtape=photos.filter(p=>p.etape===etape||!p.etape);

  return(
    <div style={{background:"#F8F9FA",borderRadius:8,padding:"12px",marginTop:8,marginBottom:14}}>
      <p style={{fontSize:12,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:".05em",margin:"0 0 10px"}}>📷 Photos — {etape}</p>

      {photosEtape.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
          {photosEtape.map((p,i)=>(
            <div key={i} onClick={()=>setApercu(p)} style={{cursor:"pointer",position:"relative"}}>
              <img src={p.url||db.photoUrl(p.storage_path)} alt={p.categorie_nom} style={{width:64,height:64,objectFit:"cover",borderRadius:6,border:"1.5px solid #E2E6EA"}}
                onError={e=>e.target.style.display="none"}/>
              <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.55)",borderRadius:"0 0 5px 5px",padding:"2px 3px",fontSize:9,color:"#fff",textAlign:"center",lineHeight:1.2}}>{p.categorie_nom}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <select value={catChoisie} onChange={e=>setCatChoisie(e.target.value)} style={{...S.sel,flex:1,minWidth:160}}>
          <option value="">— Catégorie photo</option>
          {categories.map(c=><option key={c.nom}>{c.nom}</option>)}
        </select>
        <button onClick={()=>{if(!catChoisie){alert("Choisissez d'abord une catégorie");return;}inputRef.current?.click();}}
          style={{...S.p2,fontSize:13,padding:"7px 14px",whiteSpace:"nowrap",opacity:catChoisie?1:0.5}}>
          {uploading?"Upload…":"📷 Ajouter photo"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{display:"none"}}/>
      </div>

      {apercu&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}} onClick={()=>setApercu(null)}>
          <img src={apercu.url||db.photoUrl(apercu.storage_path)} alt={apercu.categorie_nom} style={{maxWidth:"90vw",maxHeight:"80vh",objectFit:"contain",borderRadius:8}}/>
          <p style={{color:"#fff",marginTop:12,fontSize:14}}>{apercu.categorie_nom} — {apercu.nom_fichier}</p>
          <p style={{color:"rgba(255,255,255,0.6)",fontSize:12}}>Appuyez pour fermer</p>
        </div>
      )}
    </div>
  );
}

// ─── CHAMP GÉNÉRIQUE ────────────────────────────────────────────────────
function UnChamp({c,v,onChange,techs,clients,onAddClient}){
  if(!champVisible(c,v))return null;
  const val=v[c.id]||"";
  const manque=c.required&&!val;
  const err=enErreur(c,val);

  const lbl=<label style={{...S.lbl,color:manque?"#D73A49":"#6B7280"}}>
    {c.label}{c.required&&<span style={{color:"#D73A49"}}> *</span>}
    {c.unite&&<span style={{color:"#9CA3AF",fontWeight:400,textTransform:"none"}}> ({c.unite})</span>}
    {c.note&&<span style={{color:"#9CA3AF",fontWeight:400,textTransform:"none",fontSize:11}}> — {c.note}</span>}
  </label>;

  let ctrl;
  if(c.type==="client") ctrl=<ChampClient valeur={val} onChange={nv=>onChange(c.id,nv)} clients={clients} onAddClient={onAddClient}/>;
  else if(c.type==="technicien") ctrl=<ChampTechnicien valeur={val} onChange={nv=>onChange(c.id,nv)} techs={techs}/>;
  else if(c.type==="roulement") ctrl=<ChampRoulement valeur={val} onChange={nv=>onChange(c.id,nv)}/>;
  else if(c.type==="select"){
    const isAutre=val&&!c.options.includes(val)&&c.autreTexte;
    ctrl=<div style={{display:"flex",flexDirection:"column",gap:6}}>
      <select value={isAutre?"Autre":(val||"")} onChange={e=>{if(e.target.value==="Autre")onChange(c.id,"Autre:");else onChange(c.id,e.target.value);}} style={S.sel}>
        <option value="">— Sélectionner</option>
        {c.options.map(o=><option key={o}>{o}</option>)}
      </select>
      {(isAutre||val?.startsWith("Autre:"))&&c.autreTexte&&<input type="text" placeholder="Préciser..." value={val?.replace("Autre:","")||""} onChange={e=>onChange(c.id,"Autre:"+e.target.value)} style={S.inp}/>}
    </div>;
  }
  else if(c.type==="mesure") ctrl=<div>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <input type="number" value={val||""} onChange={e=>onChange(c.id,e.target.value)} style={err?{...S.inpErr,width:140}:{...S.inp,width:140}} placeholder="—"/>
      {c.unite&&<span style={{fontSize:13,color:"#6B7280"}}>{c.unite}</span>}
    </div>
    {err&&<div style={S.alert}>⚠ Sous le seuil min ({c.seuilMin} {c.unite})</div>}
  </div>;
  else if(c.type==="oui_non") ctrl=<div style={{display:"flex",gap:20}}>
    {["Oui","Non"].map(opt=><label key={opt} style={{display:"flex",alignItems:"center",gap:6,fontSize:14,cursor:"pointer"}}><input type="radio" checked={val===opt} onChange={()=>onChange(c.id,opt)}/> {opt}</label>)}
  </div>;
  else if(c.type==="date") ctrl=<input type="date" value={val} onChange={e=>onChange(c.id,e.target.value)} style={S.inp}/>;
  else if(c.type==="number") ctrl=<div style={{display:"flex",alignItems:"center",gap:8}}>
    <input type="number" value={val} onChange={e=>onChange(c.id,e.target.value)} style={{...S.inp,width:140}} placeholder="—"/>
    {c.unite&&<span style={{fontSize:13,color:"#6B7280"}}>{c.unite}</span>}
  </div>;
  else ctrl=<input type="text" value={val} onChange={e=>onChange(c.id,e.target.value)} style={manque?S.inpErr:S.inp} placeholder="—"/>;

  return <div style={{marginBottom:14}}>{lbl}{ctrl}{manque&&<div style={{fontSize:11,color:"#D73A49",marginTop:3}}>Champ obligatoire</div>}</div>;
}

// ─── RENDU GROUPÉ (intensités / vibrations côte à côte) ─────────────────
function RenduChamps({nom,v,onChange,techs,clients,onAddClient,ficheId,de,categories,photos,onPhotoAdded}){
  const champs=CHAMPS[nom]||[];
  const rendus=[];
  const vus=new Set();

  for(let i=0;i<champs.length;i++){
    const c=champs[i];
    if(vus.has(c.id))continue;
    if(!champVisible(c,v)){vus.add(c.id);continue;}

    if(c.groupe){
      const grp=champs.filter(cc=>cc.groupe===c.groupe&&champVisible(cc,v));
      grp.forEach(cc=>vus.add(cc.id));
      const cols=grp.length===3?S.grid3:S.grid2;
      rendus.push(
        <div key={c.groupe} style={cols}>
          {grp.map(cc=>(
            <div key={cc.id}>
              <UnChamp c={cc} v={v} onChange={onChange} techs={techs} clients={clients} onAddClient={onAddClient}/>
            </div>
          ))}
        </div>
      );
    }else{
      vus.add(c.id);
      rendus.push(<UnChamp key={c.id} c={c} v={v} onChange={onChange} techs={techs} clients={clients} onAddClient={onAddClient}/>);
    }
  }

  rendus.push(<SectionPhotos key="photos" etape={nom} ficheId={ficheId} de={de} categories={categories} photos={photos.filter(p=>p.etape===nom)} onPhotoAdded={p=>onPhotoAdded({...p,etape:nom})}/>);
  return <>{rendus}</>;
}

// ─── SECTION ÉTAPE ──────────────────────────────────────────────────────
function SectionEtape({nom,idx,actif,validees,v,nr,onChange,onNR,onValider,sessionTech,techs,clients,onAddClient,saving,ficheId,de,categories,photos,onPhotoAdded}){
  const [ouvert,setOuvert]=useState(false);
  const estAct=idx===actif,estVal=validees.includes(idx),estLock=idx>actif;
  const ok=etapeOk(nom,v,nr);
  const techEtape=(CHAMPS[nom]||[]).filter(c=>c.type==="technicien").map(c=>v[c.id]||"—")[0]||"—";
  function resume(){return(CHAMPS[nom]||[]).filter(c=>c.type!=="technicien"&&champVisible(c,v)&&v[c.id]).slice(0,3).map(c=>`${c.label}: ${v[c.id]}${c.unite?" "+c.unite:""}`).join(" · ");}

  if(estLock)return<div style={S.cLock}><div style={{display:"flex",alignItems:"center",gap:10}}><span>🔒</span><span style={{fontSize:14,color:"#9CA3AF"}}>{idx+1}. {nom}</span></div></div>;

  if(estVal&&!estAct)return(
    <div style={S.cDone}>
      <div onClick={()=>setOuvert(!ouvert)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",cursor:"pointer",background:ouvert?"#F0FFF4":"#fff"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span>✅</span>
          <div><span style={{fontSize:14,fontWeight:600}}>{idx+1}. {nom}</span><span style={{fontSize:12,color:"#9CA3AF",marginLeft:8}}>— {techEtape}</span></div>
        </div>
        <span style={{fontSize:12,color:"#6B7280"}}>{ouvert?"▲ Replier":"▼ Modifier"}</span>
      </div>
      {ouvert?(<div style={{padding:"14px 16px",borderTop:"1px solid #E2E6EA"}}>
        <div style={S.info}>✏️ Modification tracée dans l'historique.</div>
        <RenduChamps nom={nom} v={v} onChange={onChange} techs={techs} clients={clients} onAddClient={onAddClient} ficheId={ficheId} de={de} categories={categories} photos={photos} onPhotoAdded={onPhotoAdded}/>
      </div>):<div style={{padding:"4px 16px 10px",fontSize:12,color:"#6B7280"}}>{resume()}{photos.filter(p=>p.etape===nom).length>0&&` · 📷 ${photos.filter(p=>p.etape===nom).length} photo(s)`}</div>}
    </div>
  );

  return(
    <div style={S.cAct}>
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
        <RenduChamps nom={nom} v={v} onChange={onChange} techs={techs} clients={clients} onAddClient={onAddClient} ficheId={ficheId} de={de} categories={categories} photos={photos} onPhotoAdded={onPhotoAdded}/>
      </div>
      {!ok&&!nr&&<div style={{...S.alert,marginBottom:10}}>⚠ Des champs obligatoires (*) sont manquants.</div>}
      <button style={{...S.p1,width:"100%",justifyContent:"center",opacity:ok?1:0.5,marginTop:12}} disabled={!ok||saving} onClick={onValider}>
        {saving?"Enregistrement…":"Enregistrer et continuer →"}
      </button>
    </div>
  );
}

// ─── MODAL IDENT ────────────────────────────────────────────────────────
function ModalIdent({techs,onConfirm}){
  const [t,setT]=useState("");
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
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
    </div>
  );
}

// ─── APERÇU + IMPRESSION ────────────────────────────────────────────────
function genHtml(v,photos){
  function row2(l1,v1,l2,v2,err1,err2){
    const s1=err1?"color:#D73A49;font-weight:bold":"";const s2=err2?"color:#D73A49;font-weight:bold":"";
    return `<tr><td class="lbl">${l1}</td><td class="val" style="${s1}">${v1||"—"}</td><td class="lbl">${l2}</td><td class="val" style="${s2}">${v2||"—"}</td></tr>`;
  }
  function secHdr(n,t,tech){return `<tr class="sec"><td colspan="4"><span class="sn">${n}.</span> ${t}<span class="st">${tech?"Technicien : "+tech:""}</span></td></tr>`;}
  const css=`*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:9.5pt;color:#1A1A2E;background:#fff;}.page{max-width:210mm;margin:0 auto;padding:12mm;}.hdr{background:#1B4F8A;color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}.ht{font-size:15pt;font-weight:bold;}.hs{font-size:8pt;opacity:.75;margin-top:2px;}.hd{font-size:18pt;font-weight:bold;color:#E8720C;text-align:right;}.hdate{font-size:8pt;opacity:.75;text-align:right;}table{width:100%;border-collapse:collapse;margin-bottom:4px;}td{padding:5px 7px;border:0.4px solid #DEE2E6;vertical-align:top;}tr:nth-child(even) td{background:#F8F9FA;}.lbl{font-weight:bold;font-size:9.5pt;width:22%;}.val{font-size:9.5pt;width:28%;}.sec td{background:#1B4F8A;color:#fff;font-weight:bold;font-size:9.5pt;padding:6px 8px;}.sn{margin-right:6px;}.st{float:right;font-size:8pt;opacity:.8;font-weight:normal;}.sub td{background:#D6E4F7;color:#1B4F8A;font-weight:bold;font-size:8.5pt;padding:5px 8px;}.ft{border-top:.5px solid #DEE2E6;margin-top:12px;padding-top:6px;font-size:7pt;color:#6B7280;text-align:center;}.photos-section{margin-top:12px;}.photos-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;}.photo-item{text-align:center;}.photo-item img{width:80px;height:80px;object-fit:cover;border-radius:4px;border:0.5px solid #DEE2E6;}.photo-item p{font-size:7pt;color:#6B7280;margin-top:2px;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.no-print{display:none!important;}}`;
  const jav=`${v.joint_av_int||"?"}×${v.joint_av_ext||"?"}×${v.joint_av_ep||"?"} ${v.joint_av_levres==="Double"?"DL":"SL"}`;
  const jar=`${v.joint_ar_int||"?"}×${v.joint_ar_ext||"?"}×${v.joint_ar_ep||"?"} ${v.joint_ar_levres==="Double"?"DL":"SL"}`;
  const now=new Date().toLocaleDateString("fr-FR");
  const photosHtml=photos.length>0?`<div class="photos-section"><p style="font-weight:bold;font-size:9.5pt;margin-bottom:6px;">Photos</p><div class="photos-grid">${photos.map(p=>`<div class="photo-item"><img src="${p.url||""}" alt="${p.categorie_nom}"/><p>${p.categorie_nom}</p></div>`).join("")}</div></div>`:"";
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><title>Fiche ${v.de||""}</title><style>${css}</style></head><body><div class="page">
<button class="no-print" onclick="window.print()" style="margin-bottom:12px;background:#1B4F8A;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-size:14px;cursor:pointer;font-weight:600;">📄 Imprimer / PDF</button>
<button class="no-print" onclick="window.close()" style="margin-bottom:12px;margin-left:8px;background:#fff;color:#1B4F8A;border:1.5px solid #1B4F8A;padding:8px 18px;border-radius:6px;font-size:14px;cursor:pointer;font-weight:600;">✕ Fermer</button>
<div class="hdr"><div><div class="ht">FICHE D'ENTRETIEN / EXPERTISE</div><div class="hs">Atelier PMV — Matériels électriques</div></div><div><div class="hd">${v.de||"—"}</div><div class="hdate">${v.date_entree||now}</div></div></div>
<table>
${secHdr("1","ENTRÉE",v.tech_entree)}
${row2("Client",v.client,"Téléphone",v.telephone)}
${row2("Mail",v.mail,"Matériel / Identification lieux",v.materiel_lieu)}
${row2("Marque moteur",v.marque_moteur,"Type",v.type_moteur)}
${row2("Numéro de série",v.numero_serie,"Fixation",v.fixation)}
${row2("Puissance",v.puissance?v.puissance+" kW":"","Vitesse",v.vitesse?v.vitesse+" tr/mn":"")}
${row2("Tension",v.tension?v.tension+" V":"","Déposé par nos soins",v.depose_nos_soins)}
${row2("Enlevé par nos soins",v.enleve_nos_soins,"","")}
</table>
<table>
${secHdr("2","INFOS ÉLECTRIQUES",v.tech_elec)}
${row2("Couplage",v.couplage,"ADX isol. — résultat",v.adx_resultat,false,v.adx_resultat==="Hors Tolérance")}
${row2("Isol. enroul./masse",v.isol_masse?v.isol_masse+" MΩ":"","ADX isol. — valeur",v.adx_valeur?v.adx_valeur+" MΩ":"")}
${row2("Isolement U-V",v.isol_uv?v.isol_uv+" MΩ":"","Isolement V-W",v.isol_vw?v.isol_vw+" MΩ":"",false,parseFloat(v.isol_vw)<300)}
${row2("Isolement W-U",v.isol_wu?v.isol_wu+" MΩ":"","Plaque à bornes",v.plaque_bornes_etat,false,v.plaque_bornes_etat==="HS")}
${row2("Résistance sonde",v.sonde_presence,"Valeur sonde",v.sonde_valeur?v.sonde_valeur+" Ω":"")}
</table>
<table>
${secHdr("3","ROTATION AVANT DÉMONTAGE",v.tech_mesure_avant)}
${row2("Essai à vide",v.essai_vide_avant,"Vérif rotor cc",v.rotor_cc_realise+(v.rotor_cc_resultat?" — "+v.rotor_cc_resultat:""))}
${row2("Intensité Ph.1",v.int_p1_avant?v.int_p1_avant+" A":"","Intensité Ph.2",v.int_p2_avant?v.int_p2_avant+" A":"")}
${row2("Intensité Ph.3",v.int_p3_avant?v.int_p3_avant+" A":"","Intensité 560V Ph.1",v.int_560_p1_avant?v.int_560_p1_avant+" A":"")}
${row2("Intensité 560V Ph.2",v.int_560_p2_avant?v.int_560_p2_avant+" A":"","Intensité 560V Ph.3",v.int_560_p3_avant?v.int_560_p3_avant+" A":"")}
${row2("Vib. avant 400V mm/s",v.vib_av_mms_avant?v.vib_av_mms_avant+" mm/s":"","Vib. avant 400V GE",v.vib_av_ge_avant?v.vib_av_ge_avant+" GE":"")}
${row2("Vib. arrière 400V mm/s",v.vib_ar_mms_avant?v.vib_ar_mms_avant+" mm/s":"","Vib. arrière 400V GE",v.vib_ar_ge_avant?v.vib_ar_ge_avant+" GE":"")}
${row2("Nettoyage HP",v.nettoyage_hp,"Étuvage stator",v.etuvage_stator)}
${row2("Isol. enroul. min.",v.isol_enroul_min?v.isol_enroul_min+" MΩ":"","","")}
</table>
<table>
${secHdr("4","MATÉRIEL AU DÉMONTAGE",v.tech_demontage)}
${row2("Présence ventilateur",v.ventilateur_present,"État ventilateur",v.etat_ventilateur)}
${row2("Taille ventilateur",v.taille_ventilateur,"Peinture",v.peinture)}
${row2("Circlips avant",v.circlips_avant,"Circlips arrière",v.circlips_arriere)}
${row2("Rondelle souplesse",v.rondelle_presence,"Bobinage",v.etat_bobinage)}
<tr class="sub"><td colspan="2">ROULEMENT AVANT</td><td colspan="2">ROULEMENT ARRIÈRE</td></tr>
${row2("Type",v.type_roulement_av?.replace("Autre:",""),"Type",v.type_roulement_ar?.replace("Autre:",""))}
${row2("État",v.etat_roulement_av,"État",v.etat_roulement_ar,["HS","Cassé"].includes(v.etat_roulement_av),["HS","Cassé"].includes(v.etat_roulement_ar))}
${row2("Flasque avant",v.etat_flasque_av,"Flasque arrière",v.etat_flasque_ar)}
${row2("Mesure flasque avant",v.mesure_flasque_av?v.mesure_flasque_av+" mm":"","Mesure flasque arrière",v.mesure_flasque_ar?v.mesure_flasque_ar+" mm":"")}
${row2("Arbre avant",v.etat_arbre_av,"Arbre arrière",v.etat_arbre_ar)}
${row2("Mesure arbre avant",v.mesure_arbre_av?v.mesure_arbre_av+" mm":"","Mesure arbre arrière",v.mesure_arbre_ar?v.mesure_arbre_ar+" mm":"")}
${row2("Joint avant",jav,"Joint arrière",jar)}
${row2("Rotor",v.etat_rotor,"","")}
</table>
<table>
${secHdr("5","ESSAIS APRÈS REMONTAGE","Remonté: "+(v.tech_remontage||"—")+" / Essayé: "+(v.tech_essai||"—"))}
${row2("Essai à vide",v.essai_vide_apres,"Resserrage plaque",v.resserage_plaque)}
${row2("Intensité Ph.1",v.int_p1_apres?v.int_p1_apres+" A":"","Intensité Ph.2",v.int_p2_apres?v.int_p2_apres+" A":"")}
${row2("Intensité Ph.3",v.int_p3_apres?v.int_p3_apres+" A":"","Intensité 560V Ph.1",v.int_560_p1_apres?v.int_560_p1_apres+" A":"")}
${row2("Intensité 560V Ph.2",v.int_560_p2_apres?v.int_560_p2_apres+" A":"","Intensité 560V Ph.3",v.int_560_p3_apres?v.int_560_p3_apres+" A":"")}
${row2("Vib. avant mm/s",v.vib_av_mms_apres?v.vib_av_mms_apres+" mm/s":"","Vib. avant GE",v.vib_av_ge_apres?v.vib_av_ge_apres+" GE":"")}
${row2("Vib. arrière mm/s",v.vib_ar_mms_apres?v.vib_ar_mms_apres+" mm/s":"","Vib. arrière GE",v.vib_ar_ge_apres?v.vib_ar_ge_apres+" GE":"")}
</table>
${photosHtml}
<div class="ft">Fiche ${v.de||"—"} — Générée le ${now} — Atelier PMV — Document confidentiel</div>
</div></body></html>`;
}

function imprimerFiche(v,photos){
  const w=window.open("","_blank","width=900,height=700");
  w.document.write(genHtml(v,photos));
  w.document.close();
  setTimeout(()=>w.print(),800);
}

function ApercuFiche({v,photos,onClose}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:300,display:"flex",flexDirection:"column"}}>
      <div style={{background:"#1B4F8A",color:"#fff",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <span style={{fontWeight:700}}>Aperçu — {v.de}</span>
        <div style={{display:"flex",gap:10}}>
          <button style={{background:"#E8720C",color:"#fff",border:"none",padding:"7px 16px",borderRadius:6,fontWeight:600,cursor:"pointer"}} onClick={()=>imprimerFiche(v,photos)}>📄 Imprimer / PDF</button>
          <button style={{background:"rgba(255,255,255,0.2)",color:"#fff",border:"none",padding:"7px 16px",borderRadius:6,fontWeight:600,cursor:"pointer"}} onClick={onClose}>✕ Fermer</button>
        </div>
      </div>
      <iframe srcDoc={genHtml(v,photos)} style={{flex:1,border:"none",background:"#fff"}} title="Aperçu"/>
    </div>
  );
}

// ─── ACCUEIL ────────────────────────────────────────────────────────────
function statutStyle(s){
  if(s==="Terminée")return{background:"#F0FFF4",color:"#22863A"};
  if(s==="En cours")return{background:"#FFF8E1",color:"#E8720C"};
  if(s==="Modifiée")return{background:"#EEF4FF",color:"#1B4F8A"};
  return{};
}

function PageAccueil({onNew,onOpen}){
  const [fiches,setFiches]=useState([]);
  const [loading,setLoading]=useState(true);
  const [q,setQ]=useState("");
  const [fs,setFs]=useState("Tous");

  useEffect(()=>{
    db.get("fiches","?order=created_at.desc").then(d=>{setFiches(Array.isArray(d)?d:[]);setLoading(false);}).catch(()=>setLoading(false));
  },[]);

  const list=fiches.filter(f=>{
    const qq=q.toLowerCase();
    return(!qq||(f.de||"").toLowerCase().includes(qq)||(f.client||"").toLowerCase().includes(qq)||(f.materiel||"").toLowerCase().includes(qq))&&(fs==="Tous"||f.statut===fs);
  });

  return(
    <div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div><h1 style={{fontSize:22,fontWeight:800,margin:0}}>Fiches atelier</h1><p style={{fontSize:13,color:"#6B7280",margin:"3px 0 0"}}>{fiches.length} fiche{fiches.length>1?"s":""} enregistrée{fiches.length>1?"s":""}</p></div>
        <button style={S.p1} onClick={onNew}>+ Nouvelle fiche</button>
      </div>
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"12px 16px",marginBottom:16,display:"flex",gap:10,flexWrap:"wrap"}}>
        <input type="text" placeholder="🔍 Client, N° DE, matériel..." value={q} onChange={e=>setQ(e.target.value)} style={{...S.inp,flex:1,minWidth:180}}/>
        <select value={fs} onChange={e=>setFs(e.target.value)} style={{...S.sel,width:150}}>
          <option value="Tous">Tous statuts</option>
          <option>En cours</option><option>Terminée</option><option>Modifiée</option>
        </select>
      </div>
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"90px 1fr 110px 100px 36px",gap:8,padding:"8px 16px",background:"#F5F6F8",borderBottom:"1px solid #E2E6EA"}}>
          {["N° DE","Client / Matériel","Date","Statut",""].map((h,i)=><span key={i} style={{fontSize:11,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase"}}>{h}</span>)}
        </div>
        {loading&&<div style={{padding:"32px",textAlign:"center",color:"#9CA3AF"}}>Chargement…</div>}
        {!loading&&list.length===0&&<div style={{padding:"32px",textAlign:"center",color:"#9CA3AF"}}>{fiches.length===0?"Aucune fiche — créez la première !":"Aucune fiche ne correspond."}</div>}
        {list.map((f,i)=>(
          <div key={f.id} onClick={()=>onOpen(f)} style={{display:"grid",gridTemplateColumns:"90px 1fr 110px 100px 36px",gap:8,padding:"12px 16px",borderBottom:i<list.length-1?"1px solid #F3F4F6":"none",alignItems:"center",cursor:"pointer"}}>
            <span style={{fontSize:13,fontWeight:700,color:"#1B4F8A"}}>{f.de}</span>
            <div><p style={{margin:0,fontSize:13,fontWeight:600}}>{f.client||"—"}</p><p style={{margin:0,fontSize:12,color:"#9CA3AF"}}>{f.materiel}</p></div>
            <span style={{fontSize:13,color:"#6B7280"}}>{fmt(f.created_at)}</span>
            <span style={{...statutStyle(f.statut),fontSize:12,fontWeight:600,padding:"3px 8px",borderRadius:5}}>{f.statut}</span>
            <span style={{fontSize:16,color:"#9CA3AF"}}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CHOIX MATÉRIEL ─────────────────────────────────────────────────────
function PageChoix({onChoisir,onRetour}){
  const mats=[
    {id:"Moteur",emoji:"⚙️",desc:"Moteur électrique seul"},
    {id:"Pompe",emoji:"💧",desc:"Corps de pompe + moteur",soon:true},
    {id:"Ventilation",emoji:"🌀",desc:"Ventilateur + moteur",soon:true},
    {id:"Réducteur",emoji:"🔩",desc:"Réducteur + moteur",soon:true},
    {id:"Moto-réducteur",emoji:"🔧",desc:"Moto-réducteur complet",soon:true},
  ];
  return(
    <div style={{maxWidth:700,margin:"0 auto",padding:"20px 16px"}}>
      <button style={{...S.p2,marginBottom:20}} onClick={onRetour}>← Retour</button>
      <h2 style={{fontSize:20,fontWeight:800,margin:"0 0 6px"}}>Nouvelle fiche — quel matériel ?</h2>
      <p style={{fontSize:14,color:"#6B7280",margin:"0 0 20px"}}>Le formulaire s'adaptera selon votre choix.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:14}}>
        {mats.map(m=><div key={m.id} onClick={()=>onChoisir(m.id)} style={{...S.card,textAlign:"center",cursor:m.soon?"default":"pointer",opacity:m.soon?0.6:1}}>
          <div style={{fontSize:32,marginBottom:8}}>{m.emoji}</div>
          <p style={{fontWeight:700,fontSize:15,margin:"0 0 4px"}}>{m.id}</p>
          <p style={{fontSize:12,color:"#9CA3AF",margin:0}}>{m.desc}</p>
          {m.soon&&<p style={{fontSize:11,color:"#E8720C",margin:"6px 0 0"}}>Bientôt disponible</p>}
        </div>)}
      </div>
    </div>
  );
}

// ─── PAGE FICHE ─────────────────────────────────────────────────────────
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
    db.get("fiche_valeurs",`?fiche_id=eq.${ficheInit.id}`).then(rows=>{
      if(!Array.isArray(rows))return;
      const m={};rows.forEach(r=>{m[r.champ_id]=r.valeur;});setV(p=>({...p,...m}));
    });
    db.get("fiche_photos",`?fiche_id=eq.${ficheInit.id}`).then(rows=>{
      if(!Array.isArray(rows))return;
      setPhotos(rows.map(p=>({...p,url:db.photoUrl(p.storage_path)})));
    });
  },[ficheInit?.id]);

  const onChange=useCallback((id,val)=>setV(p=>({...p,[id]:val})),[]);
  const onPhotoAdded=useCallback(p=>setPhotos(prev=>[...prev,p]),[]);

  async function save(idx){
    setSaving(true);setErreur(null);
    try{
      let fid=ficheId;
      const newVal=[...new Set([...validees,idx])];
      const toutFini=newVal.length===ETAPES.length;
      if(!fid){
        const res=await db.post("fiches",{de:v.de,materiel:"Moteur",client:v.client||"",statut:"En cours",etape_active:idx+1,etapes_validees:newVal});
        fid=Array.isArray(res)?res[0]?.id:res?.id;
        if(!fid)throw new Error("Impossible de créer la fiche");
        setFicheId(fid);
      }else{
        await db.patch("fiches",`?id=eq.${fid}`,{client:v.client||"",statut:toutFini?"Terminée":"En cours",etape_active:Math.min(idx+1,ETAPES.length-1),etapes_validees:newVal});
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

  const info=`${v.de} · ${v.client||"Client"} · Moteur${v.puissance?" "+v.puissance+"kW":""}`;
  const prog=Math.round((validees.length/ETAPES.length)*100);

  return(
    <div style={{maxWidth:800,margin:"0 auto",paddingBottom:40}}>
      {apercu&&<ApercuFiche v={v} photos={photos} onClose={()=>setApercu(false)}/>}
      <div style={{background:"#1B4F8A",color:"#fff",padding:"10px 16px",position:"sticky",top:48,zIndex:90}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div><p style={{margin:0,fontSize:13,fontWeight:700}}>{info}</p><p style={{margin:"2px 0 0",fontSize:11,opacity:0.7}}>Session : {sessionTech} — étape {actif+1}/{ETAPES.length}</p></div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{background:"rgba(255,255,255,0.2)",borderRadius:20,height:6,width:100}}>
              <div style={{background:"#E8720C",height:6,borderRadius:20,width:`${prog}%`,transition:"width .4s"}}/>
            </div>
            <span style={{fontSize:12,opacity:0.85}}>{prog}%</span>
            <button style={{...S.p2,fontSize:12,padding:"5px 12px"}} onClick={onRetour}>← Liste</button>
          </div>
        </div>
      </div>
      <div style={{padding:"16px 16px 0"}}>
        {flash!==null&&<div style={S.ok}>✅ Étape "{ETAPES[flash]}" enregistrée dans Supabase.</div>}
        {erreur&&<div style={{...S.alert,marginBottom:14}}>{erreur}</div>}
        {ETAPES.map((nom,i)=>(
          <SectionEtape key={nom} nom={nom} idx={i} actif={actif} validees={validees}
            v={v} nr={!!nrMap[i]} onChange={onChange}
            onNR={()=>setNrMap(p=>({...p,[i]:!p[i]}))}
            onValider={()=>save(i)} sessionTech={sessionTech} techs={techs}
            clients={clients} onAddClient={onAddClient} saving={saving}
            ficheId={ficheId} de={v.de} categories={categories}
            photos={photos} onPhotoAdded={onPhotoAdded}
          />
        ))}
        {validees.length===ETAPES.length&&(
          <div style={{...S.card,textAlign:"center",border:"2px solid #22863A"}}>
            <div style={{fontSize:40,marginBottom:10}}>🎉</div>
            <p style={{fontSize:18,fontWeight:800,color:"#22863A",margin:"0 0 4px"}}>Fiche complète !</p>
            <p style={{fontSize:13,color:"#6B7280",margin:"0 0 20px"}}>{nomDossier(v)}</p>
            <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
              <button style={S.p1} onClick={()=>setApercu(true)}>👁 Aperçu fiche</button>
              <button style={{...S.p1,background:"#22863A"}} onClick={()=>imprimerFiche(v,photos)}>📄 Imprimer / PDF</button>
              <button style={S.p2}>📧 Rapport client (bientôt)</button>
              <button style={S.p2} onClick={onRetour}>← Retour à l'accueil</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APP ────────────────────────────────────────────────────────────────
export default function App(){
  const [pinOk,setPinOk]=useState(()=>localStorage.getItem(PIN_KEY)==="1");
  const [page,setPage]=useState("accueil");
  const [sessionTech,setSessionTech]=useState(null);
  const [ficheOuverte,setFicheOuverte]=useState(null);
  const [demandeIdent,setDemandeIdent]=useState(false);
  const [pending,setPending]=useState(null);
  const [techs,setTechs]=useState(TECHNICIENS_FB);
  const [clients,setClients]=useState(CLIENTS_FB);
  const [categories,setCategories]=useState(CATEGORIES_PHOTOS_FB.map(n=>({nom:n,slug:slugify(n)})));

  useEffect(()=>{
    db.get("techniciens","?actif=eq.true&order=initiales").then(d=>{if(Array.isArray(d)&&d.length>0)setTechs(d.map(t=>t.initiales));}).catch(()=>{});
    db.get("clients","?order=nom").then(d=>{if(Array.isArray(d)&&d.length>0)setClients(d.map(c=>c.nom));}).catch(()=>{});
    db.get("categories_photos","?actif=eq.true&order=ordre").then(d=>{if(Array.isArray(d)&&d.length>0)setCategories(d);}).catch(()=>{});
  },[]);

  function onAddClient(nom){setClients(prev=>[...prev,nom].sort());}
  function askIdent(fn){setDemandeIdent(true);setPending(()=>fn);}
  function confirmIdent(t){setSessionTech(t);setDemandeIdent(false);if(pending){pending(t);setPending(null);}}

  if(!pinOk)return <ModalPin onSuccess={()=>setPinOk(true)}/>;

  return(
    <div style={S.app}>
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
    </div>
  );
}
