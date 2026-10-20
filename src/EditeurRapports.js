// Onglet « Rapports » de la page Maintenance : modifier les rapports client (moteur, pompe, ventilateur, cheminée…) sans passer par le code.
// On y masque ou renomme une rubrique, on modifie les textes fixes, et surtout on AJOUTE des blocs (titre, paragraphe, lignes, photos de la fiche) à l'endroit voulu,
// en choisissant les cases de la fiche atelier à reporter ({{champ}}). Brouillon → aperçu → publication (20 versions gardées), comme pour les fiches.
// Voir configRapports.js (stockage) et rapportPerso.js (application au rapport).
import React, {useState, useEffect, useRef} from "react";
import {configRapportsActuelle, surChangementConfigRapports, publierConfigRapports, lireHistoriqueRapports, configDuType} from "./configRapports";
import {TYPES_RAPPORT, TYPES_BLOC, STYLES, OPERATEURS, TAILLES_PHOTO, typeGenerique, blocsDepuisAjout, jetonsDe} from "./rapportPerso";
import {ANCRES_MOTEUR, ANCRES_GENERIQUE} from "./rapportModele";
import {ANCRES_CHEMINEE} from "./rapportCheminee";
import {db} from "./supabase";
import {TYPE_CHEMINEE} from "./railClients";

const BLEU="#1B4F8A";
const CARTE={background:"#fff",border:"1px solid #E2E6EA",borderRadius:10,padding:"14px 16px",marginBottom:14};
const BTN={background:BLEU,color:"#fff",border:"none",borderRadius:6,padding:"8px 14px",fontWeight:600,fontSize:13,cursor:"pointer"};
const BTN_O={background:"#fff",color:BLEU,border:"1.5px solid "+BLEU,borderRadius:6,padding:"6px 10px",fontWeight:600,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"};
const BTN_P={...BTN_O,padding:"4px 8px",fontSize:11};
const INP={width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid #D1D5DB",fontSize:14,boxSizing:"border-box",background:"#fff"};
const LBL={display:"block",fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".04em",margin:"8px 0 3px"};
const copie=o=>JSON.parse(JSON.stringify(o));
const nouvelId=()=>"b_"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const INTERNE=/recommander|observation|^obs_|_obs$|commentaire|interne|justif|__just/i;

export const ancresDuType=type=>(type===TYPE_CHEMINEE?ANCRES_CHEMINEE:typeGenerique(type)?ANCRES_GENERIQUE:ANCRES_MOTEUR).map(a=>({kind:a.niveau===1?"h1":"h2",...a}));
const libType=t=>(TYPES_BLOC.find(x=>x[0]===t)||[t,t])[1];

export default function EditeurRapports({nom,champsDe,categories,fiches,apercu}){
  const [type,setType]=useState(TYPES_RAPPORT[0][0]);
  const [brouillon,setBrouillon]=useState(()=>copie(configRapportsActuelle()));
  const [form,setForm]=useState(null);          // bloc en cours de saisie : {id?, avant, type, texte, …}
  const [renom,setRenom]=useState(null);        // id de la rubrique dont on modifie le texte
  const [ficheId,setFicheId]=useState("");
  const [essai,setEssai]=useState({v:{},photos:[]});
  const [message,setMessage]=useState(null);const [occupe,setOccupe]=useState(false);
  const [histo,setHisto]=useState(null);const [voirHisto,setVoirHisto]=useState(false);
  const modifie=JSON.stringify(brouillon)!==JSON.stringify(configRapportsActuelle());
  const ancres=ancresDuType(type);
  const cfg=configDuType(type,brouillon);
  const champs=champsDe(type);
  const champsMap={};champs.forEach(c=>{champsMap[c.id]=c;});
  const fichesType=(fiches||[]).filter(f=>(f.type_materiel||"Moteur")===type).slice(0,40);
  const cats=Array.from(new Set([...(categories||[]),...champs.filter(c=>c.categorie).map(c=>c.categorie)])).sort((a,b)=>a.localeCompare(b,"fr"));

  const majT=fn=>setBrouillon(b=>{const n=copie(b);n.rapports=n.rapports||{};const c=n.rapports[type]=n.rapports[type]||{};c.masques=c.masques||[];c.textes=c.textes||{};c.ajouts=c.ajouts||[];fn(c);return n;});

  // la configuration en base peut arriver après l'ouverture de la page : sans modification en cours, le brouillon la suit
  const precedente=useRef(copie(configRapportsActuelle()));
  useEffect(()=>surChangementConfigRapports(()=>{
    const nouvelle=copie(configRapportsActuelle());
    setBrouillon(b=>JSON.stringify(b)===JSON.stringify(precedente.current)?nouvelle:b);
    precedente.current=nouvelle;
  }),[]);
  useEffect(()=>{if(voirHisto&&histo===null)lireHistoriqueRapports().then(setHisto);},[voirHisto,histo]);
  useEffect(()=>{setForm(null);setRenom(null);setFicheId(fichesType[0]?fichesType[0].id:"");},[type]);
  // données de la fiche d'essai : servent à montrer ce que donnerait un bloc
  useEffect(()=>{
    if(!ficheId){setEssai({v:{},photos:[]});return;}
    let vivant=true;
    Promise.all([db.get("fiche_valeurs","?fiche_id=eq."+ficheId),db.get("fiche_photos","?fiche_id=eq."+ficheId+"&order=created_at")]).then(([vals,ph])=>{
      if(!vivant)return;
      const v={};if(Array.isArray(vals))vals.forEach(r=>{v[r.champ_id]=r.valeur;});
      setEssai({v,photos:Array.isArray(ph)?ph.map(p=>({...p,url:db.photoUrl(p.storage_path)})):[]});
    }).catch(()=>{});
    return()=>{vivant=false;};
  },[ficheId]);

  async function publier(){
    setOccupe(true);setMessage(null);
    try{await publierConfigRapports(brouillon,nom,"");setMessage({ok:true,t:"Modifications publiées : les prochains rapports les utilisent (aucun rapport déjà envoyé n'est changé)."});setHisto(null);}
    catch(e){setMessage({ok:false,t:"Publication impossible (connexion ?) : "+(e&&e.message?e.message:"réessayez")+". Vos modifications sont conservées ici."});}
    setOccupe(false);
  }
  function annuler(){setBrouillon(copie(configRapportsActuelle()));setForm(null);setRenom(null);setMessage(null);}

  const masque=id=>cfg.masques.includes(id);
  const basculerMasque=id=>majT(c=>{c.masques=c.masques.includes(id)?c.masques.filter(x=>x!==id):[...c.masques,id];});
  const posTexte=(id,v)=>majT(c=>{if(v&&String(v).trim())c.textes[id]=v;else delete c.textes[id];});
  const valider=bloc=>{
    majT(c=>{
      if(bloc.id)c.ajouts=c.ajouts.map(a=>a.id===bloc.id?bloc:a);
      else c.ajouts.push({...bloc,id:nouvelId()});
    });
    setForm(null);
  };
  const retirer=id=>majT(c=>{c.ajouts=c.ajouts.filter(a=>a.id!==id);});
  const deplacer=(id,sens)=>majT(c=>{
    const i=c.ajouts.findIndex(a=>a.id===id);if(i<0)return;
    const avant=c.ajouts[i].avant;
    let j=i+sens;while(j>=0&&j<c.ajouts.length&&c.ajouts[j].avant!==avant)j+=sens;
    if(j<0||j>=c.ajouts.length)return;
    const t=c.ajouts[i];c.ajouts[i]=c.ajouts[j];c.ajouts[j]=t;
  });
  const nouveauBloc=avant=>({avant,type:"texte",texte:"",style:"normal",masquerSiVide:true,condition:null,photo:{categorie:"",taille:"moyenne"}});

  const pastille=actif=>({padding:"6px 12px",borderRadius:18,border:"1.5px solid "+(actif?BLEU:"#D1D5DB"),background:actif?BLEU:"#fff",color:actif?"#fff":"#374151",fontSize:12,fontWeight:600,cursor:"pointer"});
  const titreAncre=a=>(cfg.textes[a.id]&&a.kind!=="texte"?cfg.textes[a.id]:a.titre)||a.titre;

  const carteBloc=a=>(<div key={a.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",background:"#F0FFF4",border:"1px solid #22863A",borderRadius:8,padding:"8px 10px",margin:"4px 0"}}>
    <div style={{flex:"1 1 260px",minWidth:0}}>
      <div style={{fontSize:11,color:"#22863A",fontWeight:700}}>＋ Bloc ajouté · {libType(a.type)}{a.style==="gras"?" · gras":a.style==="rouge"?" · rouge":""}{a.condition&&a.condition.champ?" · sous condition":""}</div>
      <div style={{fontSize:13,overflowWrap:"anywhere"}}>{a.type==="photo"?"📷 Photo(s) « "+(a.photo&&a.photo.categorie)+" »":String(a.texte||"").slice(0,160)}</div>
    </div>
    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
      <button type="button" style={BTN_P} onClick={()=>{setForm({...copie(a),photo:a.photo||{categorie:"",taille:"moyenne"}});setRenom(null);}}>✏ Modifier</button>
      <button type="button" style={BTN_P} onClick={()=>deplacer(a.id,-1)} aria-label="Monter">▲</button>
      <button type="button" style={BTN_P} onClick={()=>deplacer(a.id,1)} aria-label="Descendre">▼</button>
      <button type="button" style={{...BTN_P,color:"#D73A49",borderColor:"#D73A49"}} onClick={()=>retirer(a.id)}>🗑 Retirer</button>
    </div>
  </div>);
  const zoneAjout=avant=>(<div key={"zone-"+avant}>
    {cfg.ajouts.filter(a=>a.avant===avant&&!(form&&form.id===a.id)).map(carteBloc)}
    {form&&form.avant===avant&&(!form.id||cfg.ajouts.some(a=>a.id===form.id))&&<FormulaireBloc key={form.id||"nouveau"} init={form} ancres={ancres} champs={champs} champsMap={champsMap} cats={cats} essai={essai} onValider={valider} onAnnuler={()=>setForm(null)}/>}
    {!form&&<button type="button" style={{...BTN_P,margin:"2px 0 6px"}} onClick={()=>{setForm(nouveauBloc(avant));setRenom(null);}}>＋ Ajouter un bloc ici</button>}
  </div>);

  return(<>
    <div style={CARTE}>
      <b style={{fontSize:14}}>Rapports client</b>
      <p style={{fontSize:12,color:"#6B7280",margin:"4px 0 10px",lineHeight:1.5}}>Choisissez le rapport, puis ajoutez ou changez des éléments là où vous le voulez : un titre, une phrase, des lignes avec des cases de la fiche atelier (ex. <code>{"{{isol_masse}}"}</code>), des photos de la fiche. Rien n'est envoyé au client tant que vous ne publiez pas. <b>Ne reprenez pas de champ interne</b> (observations, « à recommander »…) : le rapport est lu par le client.</p>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {TYPES_RAPPORT.map(([t,l])=><button key={t} type="button" onClick={()=>setType(t)} style={pastille(t===type)}>{l}</button>)}
      </div>
      {typeGenerique(type)&&<p style={{fontSize:12,color:"#8A4B00",background:"#FFF8E1",border:"1px solid #E8720C",borderRadius:6,padding:"6px 10px",margin:"10px 0 0"}}>Ce rapport n'existait pas encore : la couverture, l'identification du chantier et la conclusion (signatures, matériel de contrôle) sont automatiques ; <b>tout le contenu est à composer ici</b>.</p>}
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:12}}>
        <label style={{...LBL,margin:0}}>Fiche d'essai</label>
        <select value={ficheId} onChange={e=>setFicheId(e.target.value)} style={{...INP,width:"auto",minWidth:200,maxWidth:"100%"}}>
          {fichesType.length===0&&<option value="">Aucune fiche de ce type</option>}
          {fichesType.map(f=><option key={f.id} value={f.id}>{f.de||"Sans N°"} · {f.client||"—"}</option>)}
        </select>
        <button type="button" style={{...BTN_O,whiteSpace:"normal",textAlign:"left"}} disabled={!ficheId} onClick={()=>apercu(type,ficheId,brouillon).catch(e=>setMessage({ok:false,t:"Aperçu impossible : "+(e&&e.message?e.message:"réessayez")}))}>👁 Aperçu du rapport avec cette configuration</button>
      </div>
    </div>

    {message&&<div style={{...CARTE,borderColor:message.ok?"#22863A":"#D73A49",background:message.ok?"#F0FFF4":"#FFF5F5",color:message.ok?"#22863A":"#D73A49",fontSize:13}}>{message.t}</div>}

    <div style={CARTE}>
      <b style={{fontSize:14}}>Plan du rapport</b>
      <p style={{fontSize:12,color:"#6B7280",margin:"4px 0 10px"}}>Les rubriques en gris sont celles du rapport actuel, dans l'ordre. « ＋ Ajouter un bloc ici » place le bloc juste avant la rubrique qui suit. Une rubrique masquée n'est plus imprimée (avec son contenu) ; les données de la fiche ne sont pas touchées.</p>
      {zoneAjout("__debut")}
      {ancres.map(a=>{
        const m=masque(a.id);
        const modifTexte=cfg.textes[a.id]!==undefined;
        const edition=renom===a.id;
        return(<div key={a.id}>
          {zoneAjout(a.id)}
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"6px 8px",background:"#F3F4F6",borderRadius:6,opacity:m?0.55:1,marginLeft:a.niveau===2?18:0}}>
            <div style={{flex:"1 1 260px",minWidth:0}}>
              <div style={{fontSize:10,color:"#9CA3AF"}}>{a.kind==="h1"?"Rubrique":a.kind==="h2"?"Sous-rubrique":a.kind==="texte"?"Texte":"Groupe de lignes"}{m&&<b style={{color:"#6B7280"}}> · masquée</b>}{modifTexte&&<b style={{color:"#22863A"}}> · modifiée</b>}</div>
              <div style={{fontSize:13,fontWeight:a.kind==="h1"?700:500,color:a.kind==="h1"?BLEU:"#1A1A2E",overflowWrap:"anywhere"}}>{a.kind==="texte"&&cfg.textes[a.id]?String(cfg.textes[a.id]).slice(0,150):titreAncre(a)}</div>
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {(a.kind==="h1"||a.kind==="h2"||a.kind==="texte")&&<button type="button" style={BTN_P} onClick={()=>{setRenom(edition?null:a.id);setForm(null);}}>✏ {a.kind==="texte"?"Modifier le texte":"Renommer"}</button>}
              <button type="button" style={BTN_P} onClick={()=>basculerMasque(a.id)}>{m?"👁 Réafficher":"🚫 Masquer"}</button>
            </div>
          </div>
          {edition&&<FormulaireTexte a={a} courant={cfg.textes[a.id]} champs={champs} onOk={t=>{posTexte(a.id,t);setRenom(null);}} onAnnuler={()=>setRenom(null)}/>}
        </div>);
      })}
      {zoneAjout("__fin")}
      {ancres.length===0&&<p style={{fontSize:13,color:"#9CA3AF"}}>Aucune rubrique.</p>}
    </div>

    <div style={CARTE}>
      <button type="button" style={{...BTN_O,whiteSpace:"normal",textAlign:"left"}} onClick={()=>setVoirHisto(v=>!v)}>🕘 {voirHisto?"Masquer":"Voir"} les versions précédentes des rapports</button>
      {voirHisto&&<div style={{marginTop:10}}>
        {histo===null&&<p style={{fontSize:13,color:"#9CA3AF"}}>Chargement…</p>}
        {histo&&histo.length===0&&<p style={{fontSize:13,color:"#9CA3AF"}}>Aucune modification publiée pour l'instant.</p>}
        {(histo||[]).map((h,i)=>(<div key={h.t+i} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderTop:i?"1px solid #EEF1F5":"none"}}>
          <div style={{flex:"1 1 220px",fontSize:13}}>{new Date(h.t).toLocaleString("fr-FR")}<span style={{color:"#6B7280"}}> · remplacée par {h.qui||"—"}</span></div>
          <button type="button" style={BTN_O} disabled={occupe} onClick={async()=>{if(!window.confirm("Revenir à cette version des rapports ? La version actuelle est conservée dans l'historique."))return;setOccupe(true);try{await publierConfigRapports(JSON.parse(h.config),nom,"retour arrière");setBrouillon(copie(configRapportsActuelle()));setHisto(null);setMessage({ok:true,t:"Version rétablie."});}catch(e){setMessage({ok:false,t:"Impossible de rétablir (connexion ?)."});}setOccupe(false);}}>↩ Revenir à cette version</button>
        </div>))}
      </div>}
    </div>

    {modifie&&<div style={{position:"fixed",left:0,right:0,bottom:0,zIndex:150,background:"#fff",borderTop:"3px solid "+BLEU,padding:"10px 16px",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",justifyContent:"center",boxShadow:"0 -4px 12px rgba(0,0,0,0.12)"}}>
      <span style={{fontSize:13,fontWeight:600}}>Modifications des rapports non publiées</span>
      <button type="button" style={{...BTN,minHeight:42}} disabled={occupe} onClick={publier}>{occupe?"⏳ Publication…":"✔ Publier"}</button>
      <button type="button" style={{...BTN_O,minHeight:42}} disabled={occupe} onClick={annuler}>Annuler les modifications</button>
    </div>}
  </>);
}

// liste des champs de la fiche, par étape, pour insérer un {{champ}}
function SelecteurChamp({champs,onChoisir}){
  const parEtape={};champs.filter(c=>c.type!=="photo_requise").forEach(c=>{(parEtape[c.etape]=parEtape[c.etape]||[]).push(c);});
  return(<select value="" onChange={e=>{if(e.target.value)onChoisir(e.target.value);e.target.value="";}} style={{...INP,width:"auto",maxWidth:"100%"}}>
    <option value="">＋ Insérer un champ de la fiche…</option>
    {Object.keys(parEtape).map(et=><optgroup key={et} label={et}>{parEtape[et].map(c=><option key={c.id} value={c.id}>{c.label||c.id}{INTERNE.test(c.id+" "+(c.label||""))?"  ⚠ interne ?":""}</option>)}</optgroup>)}
  </select>);
}
function ChampsUtilises({texte,champsMap}){
  const ids=jetonsDe(texte);
  if(!ids.length)return null;
  return(<div style={{fontSize:11,color:"#6B7280",margin:"4px 0"}}>
    {ids.map(id=>{const c=champsMap[id];return <div key={id}>{"{{"+id+"}}"} → {c?<b>{c.label||id}</b>:<b style={{color:"#D73A49"}}>champ inconnu (rien ne s'affichera)</b>}{c&&INTERNE.test(id+" "+(c.label||""))&&<b style={{color:"#E8720C"}}> ⚠ champ interne ? Le client verra cette valeur.</b>}</div>;})}
  </div>);
}
function inserer(ref,texte,setTexte,jeton){
  const el=ref.current;const t=String(texte||"");
  const a=el&&typeof el.selectionStart==="number"?el.selectionStart:t.length;
  const b=el&&typeof el.selectionEnd==="number"?el.selectionEnd:a;
  const nv=t.slice(0,a)+"{{"+jeton+"}}"+t.slice(b);
  setTexte(nv);
  setTimeout(()=>{if(el){el.focus();const p=a+jeton.length+4;try{el.setSelectionRange(p,p);}catch(e){/* sans effet */}}},0);
}

// modification du titre ou du texte fixe d'une rubrique du rapport
function FormulaireTexte({a,courant,champs,onOk,onAnnuler}){
  const [t,setT]=useState(courant!==undefined?courant:(a.texte||a.titre));
  const ref=useRef(null);
  const champsMap={};champs.forEach(c=>{champsMap[c.id]=c;});
  const long=a.kind==="texte";
  return(<div style={{background:"#F8F9FA",border:"1px solid #D1D5DB",borderRadius:8,padding:"10px 12px",margin:"4px 0 8px"}}>
    <label style={LBL}>{long?"Texte à imprimer":"Nouveau titre"}</label>
    {long?<textarea ref={ref} value={t} onChange={e=>setT(e.target.value)} rows={3} style={{...INP,resize:"vertical",fontFamily:"inherit"}}/>:<input ref={ref} type="text" value={t} onChange={e=>setT(e.target.value)} style={INP}/>}
    <div style={{margin:"6px 0"}}><SelecteurChamp champs={champs} onChoisir={id=>inserer(ref,t,setT,id)}/></div>
    <ChampsUtilises texte={t} champsMap={champsMap}/>
    <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
      <button type="button" style={BTN} onClick={()=>onOk(t.trim()===String(a.texte||a.titre).trim()?"":t)}>OK</button>
      {courant!==undefined&&<button type="button" style={BTN_O} onClick={()=>onOk("")}>↩ Rétablir le texte d'origine</button>}
      <button type="button" style={BTN_O} onClick={onAnnuler}>Annuler</button>
    </div>
  </div>);
}

// ajout ou modification d'un bloc
function FormulaireBloc({init,ancres,champs,champsMap,cats,essai,onValider,onAnnuler}){
  const [d,setD]=useState(init);
  const ref=useRef(null);
  const maj=patch=>setD(p=>({...p,...patch}));
  const photo=d.type==="photo";
  const cond=d.condition&&d.condition.champ!==undefined?d.condition:null;
  const apercuNeutres=blocsDepuisAjout(d,{v:essai.v,champs:champsMap,fiche:essai.photos});
  const ok=photo?!!(d.photo&&d.photo.categorie):String(d.texte||"").trim().length>0;
  return(<div style={{background:"#F0FFF4",border:"1px solid #22863A",borderRadius:8,padding:"10px 12px",margin:"6px 0 10px"}}>
    <div style={{fontSize:13,fontWeight:700,color:"#22863A"}}>{init.id?"Modifier le bloc":"＋ Nouveau bloc"}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10}}>
      <div><label style={LBL}>Type de bloc</label><select value={d.type} onChange={e=>maj({type:e.target.value})} style={INP}>{TYPES_BLOC.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></div>
      <div><label style={LBL}>Placé juste avant</label>
        <select value={d.avant} onChange={e=>maj({avant:e.target.value})} style={INP}>
          <option value="__debut">Le début du rapport</option>
          {ancres.map(a=><option key={a.id} value={a.id}>{String(a.titre).slice(0,70)}</option>)}
          <option value="__fin">La fin du rapport</option>
        </select></div>
    </div>
    {photo?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10}}>
      <div><label style={LBL}>Photos de la fiche, catégorie</label>
        <select value={(d.photo&&d.photo.categorie)||""} onChange={e=>maj({photo:{...d.photo,categorie:e.target.value}})} style={INP}>
          <option value="">— choisir —</option>{cats.map(c=><option key={c} value={c}>{c}</option>)}
        </select></div>
      <div><label style={LBL}>Taille</label>
        <select value={(d.photo&&d.photo.taille)||"moyenne"} onChange={e=>maj({photo:{...d.photo,taille:e.target.value}})} style={INP}>{TAILLES_PHOTO.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></div>
    </div>:<>
      <label style={LBL}>{d.type==="lignes"?"Lignes (une par ligne)":"Texte"}</label>
      <textarea ref={ref} value={d.texte||""} onChange={e=>maj({texte:e.target.value})} rows={d.type==="titre1"||d.type==="titre2"?2:4} style={{...INP,resize:"vertical",fontFamily:"inherit"}} placeholder={"Ex : Mesure d'isolement à l'arrivée : {{isol_masse}}/1000V ; DAR : {{isol_masse_dar}}"}/>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",margin:"6px 0"}}>
        <SelecteurChamp champs={champs} onChoisir={id=>inserer(ref,d.texte,t=>maj({texte:t}),id)}/>
        {(d.type==="texte"||d.type==="lignes")&&<select value={d.style||"normal"} onChange={e=>maj({style:e.target.value})} style={{...INP,width:"auto"}}>{STYLES.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select>}
      </div>
      <ChampsUtilises texte={d.texte} champsMap={champsMap}/>
      <label style={{display:"flex",gap:6,alignItems:"center",fontSize:13,marginTop:6}}><input type="checkbox" checked={d.masquerSiVide!==false} onChange={e=>maj({masquerSiVide:e.target.checked})}/> Ne pas imprimer la ligne si un de ses champs est vide</label>
    </>}
    <label style={{display:"flex",gap:6,alignItems:"center",fontSize:13,marginTop:8}}><input type="checkbox" checked={!!cond} onChange={e=>maj({condition:e.target.checked?{champ:"",op:"rempli",valeur:""}:null})}/> Imprimer ce bloc seulement si…</label>
    {cond&&<div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginTop:4}}>
      <select value={cond.champ} onChange={e=>maj({condition:{...cond,champ:e.target.value}})} style={{...INP,width:"auto",maxWidth:"100%"}}><option value="">— champ de la fiche —</option>{champs.filter(c=>c.type!=="photo_requise").map(c=><option key={c.id} value={c.id}>{c.label||c.id}</option>)}</select>
      <select value={cond.op} onChange={e=>maj({condition:{...cond,op:e.target.value}})} style={{...INP,width:"auto"}}>{OPERATEURS.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select>
      {(cond.op==="egal"||cond.op==="different")&&<input type="text" value={cond.valeur||""} onChange={e=>maj({condition:{...cond,valeur:e.target.value}})} placeholder="valeur (ex. SNCF)" style={{...INP,width:160}}/>}
    </div>}
    <div style={{marginTop:10,padding:"8px 10px",background:"#fff",border:"1px dashed #9CA3AF",borderRadius:6}}>
      <div style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase"}}>Résultat avec la fiche d'essai</div>
      {apercuNeutres.length===0&&<div style={{fontSize:12,color:"#9CA3AF"}}>Rien ne s'imprimerait avec cette fiche (champ vide, condition non remplie ou aucune photo de cette catégorie).</div>}
      {apercuNeutres.map((n,i)=><ApercuNeutre key={i} n={n}/>)}
    </div>
    <div style={{display:"flex",gap:8,marginTop:10}}>
      <button type="button" style={{...BTN,opacity:ok?1:0.5}} disabled={!ok} onClick={()=>onValider({...d,texte:photo?"":d.texte,condition:cond&&cond.champ?cond:null})}>{init.id?"OK":"Ajouter"}</button>
      <button type="button" style={BTN_O} onClick={onAnnuler}>Annuler</button>
    </div>
  </div>);
}
const texteDe=parts=>parts.map(p=>typeof p==="string"?p:(p.b||p.rouge||p.txt||"")).join("");
function ApercuNeutre({n}){
  if(n.k==="photo")return <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>{n.urls.map(u=><img key={u} src={u} alt="" style={{height:60,borderRadius:4,border:"1px solid #E2E6EA"}}/>)}</div>;
  if(n.k==="titre1")return <div style={{fontSize:15,fontWeight:700,textDecoration:"underline",marginTop:4}}>{n.txt}</div>;
  if(n.k==="titre2")return <div style={{fontSize:13,fontWeight:700,textDecoration:"underline",marginTop:4}}>{n.txt}</div>;
  const rouge=(n.parts&&n.parts[0]&&n.parts[0].rouge!==undefined)||(n.lignes&&n.lignes[0]&&n.lignes[0][0]&&n.lignes[0][0].rouge!==undefined);
  const gras=(n.parts&&n.parts[0]&&n.parts[0].b!==undefined)||(n.lignes&&n.lignes[0]&&n.lignes[0][0]&&n.lignes[0][0].b!==undefined);
  const st={fontSize:13,marginTop:3,color:rouge?"#FF0000":"#1A1A2E",fontWeight:gras?700:400};
  if(n.k==="lignes")return <div style={st}>{n.lignes.map((l,i)=><div key={i}>{texteDe(l)}</div>)}</div>;
  return <div style={st}>{texteDe(n.parts)}</div>;
}
