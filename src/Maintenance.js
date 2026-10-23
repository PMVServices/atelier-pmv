// Page « Maintenance » (profil Maintenance : ne remplit aucune fiche, modifie seulement ce que les autres verront).
// Les modifications sont préparées en brouillon, puis publiées d'un coup ; elles sont enregistrées en base (config_fiches) et gardées dans un historique.
import React, {useState, useEffect, useRef} from "react";
import EditeurRapports from "./EditeurRapports";
import {configActuelle, surChangementConfig, appliquerConfigEditeur, publierConfig, lireHistorique, statutsAvecConfig, TYPES_AJOUT} from "./configFiches";
import {lireSeuil, resumeSeuil, seuilDepuisSaisie} from "./seuils";

const BLEU="#1B4F8A";
const CARTE={background:"#fff",border:"1px solid #E2E6EA",borderRadius:10,padding:"14px 16px",marginBottom:14};
const BTN={background:BLEU,color:"#fff",border:"none",borderRadius:6,padding:"8px 14px",fontWeight:600,fontSize:13,cursor:"pointer"};
const BTN_O={background:"#fff",color:BLEU,border:"1.5px solid "+BLEU,borderRadius:6,padding:"6px 10px",fontWeight:600,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"};
const BTN_P={...BTN_O,padding:"4px 8px",fontSize:11};
const INP={width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid #D1D5DB",fontSize:14,boxSizing:"border-box",background:"#fff"};
const LBL={display:"block",fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".04em",margin:"8px 0 3px"};

const LIBELLE_TYPE={text:"Texte",number:"Nombre",select:"Liste",oui_non:"Oui / Non",choix:"Choix",date:"Date",photo_requise:"Photo",titre:"Intertitre",conseil:"Message",
  fait:"Case à cocher",verdict:"Conformité (calculée)",illustration:"Schéma",technicien:"Technicien",client:"Client",contact:"Contact",ohm:"Isolement",mesure:"Mesure",calcul:"Calcul",roulement:"Roulement",joints:"Joints"};
const SANS_LIBELLE=["conseil","illustration"];            // pas d'intitulé à renommer
const SANS_OBLIGATOIRE=["titre","conseil","illustration","verdict","calcul"];

const copie=o=>JSON.parse(JSON.stringify(o));
const nouvelId=()=>"x_"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const resume=c=>c.type==="conseil"?"Message : "+String(typeof c.texte==="function"?"(texte calculé)":c.texte||"").slice(0,70):(c.label||c.id);

export default function PageMaintenance({catalogue,statutsBase,rendreApercu,nom,rapports}){
  const [onglet,setOnglet]=useState("atelier");
  const [brouillon,setBrouillon]=useState(()=>copie(configActuelle()));
  const [cle,setCle]=useState({atelier:catalogue.atelier[0].cle,chantier:catalogue.chantier[0].cle});
  const [etape,setEtape]=useState("");
  const [edition,setEdition]=useState(null);     // id du champ en cours de modification
  const [ajoutApres,setAjoutApres]=useState(null); // "__debut" ou id du champ après lequel on ajoute
  const [deplaceId,setDeplaceId]=useState(null); // id du champ dont on choisit la nouvelle étape
  const [apercu,setApercu]=useState(false);
  const [occupe,setOccupe]=useState(false);const [message,setMessage]=useState(null);
  const [histo,setHisto]=useState(null);
  const modifie=JSON.stringify(brouillon)!==JSON.stringify(configActuelle());
  const maj=fn=>setBrouillon(b=>{const n=copie(b);fn(n);return n;});

  const famille=onglet==="chantier"?"chantier":"atelier";
  const types=catalogue[famille];
  const typeCourant=types.find(t=>t.cle===cle[famille])||types[0];
  const base=typeCourant?typeCourant.base():{};
  const etapes=Object.keys(base);
  const etapeCourante=etapes.includes(etape)?etape:etapes[0];
  const vue=onglet==="atelier"||onglet==="chantier"?appliquerConfigEditeur(base,typeCourant.cle,brouillon):{};
  const liste=(vue[etapeCourante]||[]);
  const c0=(n)=>{n.fiches=n.fiches||{};n.fiches[typeCourant.cle]=n.fiches[typeCourant.cle]||{};return n.fiches[typeCourant.cle];};

  // la configuration en base peut arriver après l'ouverture de la page : sans modification en cours, le brouillon suit (jamais de publication « à vide » par accident)
  const precedente=useRef(copie(configActuelle()));
  useEffect(()=>surChangementConfig(()=>{
    const nouvelle=copie(configActuelle());
    setBrouillon(b=>JSON.stringify(b)===JSON.stringify(precedente.current)?nouvelle:b);
    precedente.current=nouvelle;
  }),[]);
  useEffect(()=>{if(onglet==="historique"&&histo===null)lireHistorique().then(setHisto);},[onglet,histo]);
  useEffect(()=>{setEdition(null);setAjoutApres(null);setDeplaceId(null);},[etapeCourante,typeCourant&&typeCourant.cle,onglet]);

  // définition du code d'un champ (toutes étapes : il a pu être envoyé dans une autre étape) et étape où le code le place
  const baseDe=id=>{for(const e of etapes){const c=(base[e]||[]).find(x=>x.id===id);if(c)return c;}return null;};
  const etapeNative=id=>etapes.find(e=>(base[e]||[]).some(c=>c.id===id))||null;
  const premiere=etapes[0]; // l'étape d'entrée de la fiche (la création de la fiche en dépend) ne reçoit ni ne perd de champ
  const variantesEtapes=typeCourant&&typeCourant.variantesEtapes?typeCourant.variantesEtapes():null;
  const partenaires=c=>c&&c.groupe?liste.filter(x=>x.id!==c.id&&x.groupe===c.groupe&&!x.ajoute):[];
  // champs du code envoyés par la configuration dans une autre étape : on le dit dans l'étape d'origine
  const cfgDeplace=((brouillon.fiches||{})[typeCourant&&typeCourant.cle]||{}).deplace||{};
  const sortis=Object.keys(cfgDeplace).filter(id=>{const t=cfgDeplace[id]&&cfgDeplace[id].etape;return t&&t!==etapeCourante&&etapes.includes(t)&&etapeNative(id)===etapeCourante;})
    .map(id=>{const t=cfgDeplace[id].etape;const f=(vue[t]||[]).find(x=>x.id===id);return {id,label:f?(f.label||id):id,vers:t};});
  function majChamp(id,patch){
    maj(n=>{
      const c=c0(n);
      const a=(c.ajouts||[]).find(x=>x.id===id);
      if(a){a.def={...a.def,...patch.def};return;}
      c.champs=c.champs||{};
      const o={...(c.champs[id]||{}),...patch};
      const b=baseDe(id);
      if(b&&o.label===b.label)delete o.label;
      Object.keys(o).forEach(k=>{if(o[k]===undefined||o[k]===null||o[k]==="")delete o[k];});
      if(patch.note===" ")o.note=" ";
      if(o.masque===false)delete o.masque;
      if(Object.keys(o).length)c.champs[id]=o;else delete c.champs[id];
    });
  }
  function retirer(id){
    maj(n=>{
      const c=c0(n);
      c.ajouts=(c.ajouts||[]).filter(a=>a.id!==id);
      // ce qui était posé après lui reste à sa place : on le rattache à l'élément précédent
      const i=liste.findIndex(x=>x.id===id);
      const prec=i>0?liste[i-1].id:"__debut";
      (c.ajouts||[]).forEach(a=>{if(a.apres===id)a.apres=prec;});
      if(c.deplace)Object.keys(c.deplace).forEach(k=>{if(c.deplace[k].apres===id)c.deplace[k].apres=prec;});
    });
  }
  function deplacer(id,sens){
    const i=liste.findIndex(x=>x.id===id);const j=i+sens;
    if(i<0||j<0||j>=liste.length)return;
    const apres=sens<0?(j===0?"__debut":liste[j-1].id):liste[j].id;
    maj(n=>{
      const c=c0(n);
      const a=(c.ajouts||[]).find(x=>x.id===id);
      if(a){a.apres=apres;a.etape=etapeCourante;return;}
      c.deplace=c.deplace||{};c.deplace[id]={...(c.deplace[id]||{}),apres}; // l'étape d'arrivée éventuelle est conservée
    });
  }
  function ajouter(def){
    maj(n=>{const c=c0(n);c.ajouts=c.ajouts||[];c.ajouts.push({id:nouvelId(),etape:etapeCourante,apres:ajoutApres,def});});
    setAjoutApres(null);
  }
  // envoie un champ (et ceux affichés sur la même ligne, si demandé) dans une autre étape, après le champ « apres » (ou « __debut »)
  function deplacerVers(c,dest,apres,avec){
    const ids=[c.id].concat(avec?partenaires(c).map(x=>x.id):[]);
    maj(n=>{
      const cf=c0(n);
      let prec=apres;
      ids.forEach(id=>{
        const a=(cf.ajouts||[]).find(x=>x.id===id);
        if(a){a.etape=dest;a.apres=prec;}
        else{
          cf.deplace=cf.deplace||{};
          cf.deplace[id]=dest===etapeNative(id)?{apres:prec}:{apres:prec,etape:dest};
        }
        prec=id;
      });
    });
    setDeplaceId(null);setEdition(null);setAjoutApres(null);setEtape(dest);
  }
  // remet un champ envoyé dans une autre étape à sa place d'origine (avec ceux qui l'avaient suivi)
  function retablir(c){
    const depuis=c._depuis;
    const ids=[c.id].concat(partenaires(c).filter(x=>x._depuis===depuis).map(x=>x.id));
    maj(n=>{const cf=c0(n);ids.forEach(id=>{if(cf.deplace)delete cf.deplace[id];});});
    setEtape(depuis);
  }
  async function publier(){
    setOccupe(true);setMessage(null);
    try{await publierConfig(brouillon,nom,"");setMessage({ok:true,t:"Modifications publiées. Les autres appareils les prennent en compte dans la minute (ou à la prochaine ouverture)."});setHisto(null);}
    catch(e){setMessage({ok:false,t:"Publication impossible (connexion ?) : "+(e&&e.message?e.message:"réessayez")+". Vos modifications sont conservées ici."});}
    setOccupe(false);
  }
  function annuler(){setBrouillon(copie(configActuelle()));setEdition(null);setAjoutApres(null);setMessage(null);}

  // ── colonnes du planning ──
  const statuts=statutsAvecConfig(statutsBase,brouillon.statuts).map(s=>({id:s.id,label:s.label,color:s.color,...(s.masque?{masque:true}:{})}));
  const majStatuts=fn=>maj(n=>{const l=statutsAvecConfig(statutsBase,n.statuts).map(s=>({id:s.id,label:s.label,color:s.color,...(s.masque?{masque:true}:{})}));fn(l);n.statuts=l;});

  const pastille=(actif)=>({padding:"6px 12px",borderRadius:18,border:"1.5px solid "+(actif?BLEU:"#D1D5DB"),background:actif?BLEU:"#fff",color:actif?"#fff":"#374151",fontSize:12,fontWeight:600,cursor:"pointer"});

  return(<div style={{maxWidth:"var(--lp,1000px)",margin:"0 auto",padding:"20px 16px 90px"}}>
    <h2 style={{fontSize:20,fontWeight:700,margin:"0 0 6px"}}>🛠 Maintenance</h2>
    <p style={{fontSize:13,color:"#6B7280",margin:"0 0 14px",lineHeight:1.5}}>Vous ne remplissez aucune fiche ici : vous changez ce que les autres verront (champs, intitulés, colonnes du planning, rapports client). Préparez vos modifications puis cliquez sur <b>Publier</b> (pour les rapports : <b>Enregistrer comme modèle de référence</b>) : elles valent alors pour toutes les fiches, et vous pouvez revenir en arrière depuis l'historique.</p>

    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
      {[["atelier","📁 Fiches atelier"],["chantier","🏗 Fiches chantier"],["planning","📋 Planning"],["rapports","📄 Rapports"],["historique","🕘 Historique"]].map(([id,lib])=>
        <button key={id} type="button" onClick={()=>setOnglet(id)} style={pastille(onglet===id)}>{lib}</button>)}
    </div>

    {message&&<div style={{...CARTE,borderColor:message.ok?"#22863A":"#D73A49",background:message.ok?"#F0FFF4":"#FFF5F5",color:message.ok?"#22863A":"#D73A49",fontSize:13}}>{message.t}</div>}

    {(onglet==="atelier"||onglet==="chantier")&&<>
      <div style={CARTE}>
        <div style={LBL}>{onglet==="atelier"?"Type de matériel":"Type d'équipement"}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
          {types.map(t=><button key={t.cle} type="button" onClick={()=>setCle(c=>({...c,[famille]:t.cle}))} style={pastille(t.cle===typeCourant.cle)}>{t.libelle}</button>)}
        </div>
        <div style={LBL}>Étape</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {etapes.map(e=><button key={e} type="button" onClick={()=>setEtape(e)} style={pastille(e===etapeCourante)}>{e}</button>)}
        </div>
        <p style={{fontSize:11,color:"#9CA3AF",margin:"10px 0 0"}}>Les étapes elles-mêmes (ajout, ordre, suppression) ne se modifient pas ici : les fiches en cours en dépendent. Un champ peut en revanche changer d'étape (« ↪ Autre étape »). « Masquer » cache un champ sans effacer les données déjà saisies.</p>
      </div>

      <div style={CARTE}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:8}}>
          <b style={{fontSize:14}}>{etapeCourante}</b>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <button type="button" style={BTN_O} onClick={()=>{setAjoutApres("__debut");setEdition(null);}}>＋ Ajouter un champ en tête</button>
            <button type="button" style={apercu?{...BTN_O,background:BLEU,color:"#fff"}:BTN_O} onClick={()=>setApercu(a=>!a)}>👁 {apercu?"Masquer l'aperçu":"Voir comme dans la fiche"}</button>
          </div>
        </div>

        {sortis.length>0&&<div style={{background:"#F3F4F6",borderRadius:6,padding:"6px 10px",marginBottom:8,fontSize:12,color:"#6B7280"}}>
          ↪ Envoyé{sortis.length>1?"s":""} dans une autre étape : {sortis.map((s,k)=><span key={s.id}>{k>0?" · ":""}<b>{s.label}</b> → <button type="button" onClick={()=>setEtape(s.vers)} style={{background:"none",border:"none",padding:0,color:BLEU,fontWeight:700,fontSize:12,cursor:"pointer",textDecoration:"underline",textAlign:"left"}}>{s.vers}</button></span>)}
        </div>}

        {ajoutApres==="__debut"&&<FormulaireAjout onAjouter={ajouter} onAnnuler={()=>setAjoutApres(null)}/>}

        {liste.map((c,i)=>{
          const modeEdition=edition===c.id;
          const masque=!!c._masque;
          const peutChangerEtape=etapeCourante!==premiere&&etapes.some(e=>e!==premiere&&e!==etapeCourante);
          return(<div key={c.id}>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 8px",borderTop:i?"1px solid #EEF1F5":"none",background:masque?"#F3F4F6":(c.ajoute?"#F0FFF4":"transparent"),opacity:masque?0.65:1,borderRadius:6}}>
              <div style={{flex:"1 1 260px",minWidth:0}}>
                <div style={{fontSize:11,color:"#9CA3AF"}}>{LIBELLE_TYPE[c.type]||c.type}{c.ajoute&&<span style={{color:"#22863A",fontWeight:700}}> · ajouté</span>}{masque&&<span style={{color:"#6B7280",fontWeight:700}}> · masqué</span>}{c._depuis&&<span style={{color:BLEU,fontWeight:700}}> · ↪ vient de « {c._depuis} »</span>}</div>
                <div style={{fontSize:14,fontWeight:c.type==="titre"?700:500,color:c.type==="titre"?BLEU:"#1A1A2E",overflowWrap:"anywhere"}}>{resume(c)}{c.required===true&&<span style={{color:"#D73A49"}}> *</span>}{c.unite&&<span style={{color:"#9CA3AF"}}> ({c.unite})</span>}</div>
                {Array.isArray(c.options)&&<div style={{fontSize:11,color:"#6B7280"}}>Choix : {c.options.join(" · ")}</div>}
                {lireSeuil(c)&&<div style={{fontSize:11,color:"#B45309",fontWeight:600}}>⚠ {resumeSeuil(c)}{lireSeuil(c).msg?" — « "+lireSeuil(c).msg+" »":""}</div>}
              </div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
                {!masque&&!SANS_LIBELLE.includes(c.type)&&<button type="button" style={BTN_P} onClick={()=>{setEdition(modeEdition?null:c.id);setAjoutApres(null);}}>✏ Modifier</button>}
                {c.ajoute
                  ?<button type="button" style={{...BTN_P,color:"#D73A49",borderColor:"#D73A49"}} onClick={()=>retirer(c.id)}>🗑 Retirer</button>
                  :<button type="button" style={BTN_P} onClick={()=>majChamp(c.id,{masque:!masque})}>{masque?"👁 Réafficher":"🚫 Masquer"}</button>}
                <button type="button" style={BTN_P} onClick={()=>deplacer(c.id,-1)} disabled={i===0} aria-label="Monter">▲</button>
                <button type="button" style={BTN_P} onClick={()=>deplacer(c.id,1)} disabled={i===liste.length-1} aria-label="Descendre">▼</button>
                <button type="button" style={BTN_P} onClick={()=>{setAjoutApres(c.id);setEdition(null);setDeplaceId(null);}}>＋ Ajouter dessous</button>
                {peutChangerEtape&&<button type="button" style={BTN_P} onClick={()=>{setDeplaceId(deplaceId===c.id?null:c.id);setEdition(null);setAjoutApres(null);}}>↪ Autre étape</button>}
                {c._depuis&&<button type="button" style={BTN_P} onClick={()=>retablir(c)}>↩ Remettre dans « {c._depuis} »</button>}
              </div>
            </div>
            {deplaceId===c.id&&<FormulaireDeplacement c={c} etapes={etapes.filter(e=>e!==premiere&&e!==etapeCourante)} vue={vue} variantes={variantesEtapes} etapeCourante={etapeCourante} partenaires={partenaires(c)} onOk={(dest,apres,avec)=>deplacerVers(c,dest,apres,avec)} onAnnuler={()=>setDeplaceId(null)}/>}
            {modeEdition&&<FormulaireModif c={c} onChange={patch=>majChamp(c.id,c.ajoute?{def:patch.def||patch}:patch)} onFermer={()=>setEdition(null)} ajoute={!!c.ajoute} base={baseDe(c.id)}/>}
            {ajoutApres===c.id&&<FormulaireAjout onAjouter={ajouter} onAnnuler={()=>setAjoutApres(null)}/>}
          </div>);
        })}
        {liste.length===0&&<p style={{fontSize:13,color:"#9CA3AF"}}>Aucun champ dans cette étape.</p>}

        {apercu&&<div style={{marginTop:14,borderTop:"2px dashed #D1D5DB",paddingTop:12}}>
          <div style={{fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",marginBottom:8}}>Aperçu (non modifiable) : ce que verront les techniciens</div>
          <div style={{pointerEvents:"none",opacity:0.95}}>{rendreApercu(liste.filter(c=>!c._masque),etapeCourante)}</div>
        </div>}
      </div>
    </>}

    {onglet==="rapports"&&rapports&&<EditeurRapports nom={nom} champsDe={rapports.champsDe} categories={rapports.categories} fiches={rapports.fiches} apercu={rapports.apercu} preparer={rapports.preparer}/>}

    {onglet==="planning"&&<div style={CARTE}>
      <b style={{fontSize:14}}>Colonnes du planning (statuts des chantiers)</b>
      <p style={{fontSize:12,color:"#6B7280",margin:"4px 0 10px"}}>Renommez, changez la couleur, réordonnez ou ajoutez une colonne. Une colonne existante ne se supprime pas (des fiches peuvent s'y trouver) : renommez-la plutôt. Case « Masquée par défaut » : la colonne n'apparaît plus dans le Planning tant qu'on ne touche pas son bouton « Afficher … » (comme Terminé et Abandonné) ; la recherche retrouve toujours ses fiches.</p>
      {statuts.map((s,i)=>(<div key={s.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"6px 0",borderTop:i?"1px solid #EEF1F5":"none"}}>
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(s.color)?s.color:"#6B7280"} onChange={e=>majStatuts(l=>{l[i].color=e.target.value;})} aria-label={"Couleur de "+s.label} style={{width:42,height:36,padding:0,border:"1px solid #D1D5DB",borderRadius:6,background:"#fff"}}/>
        <input type="text" value={s.label} onChange={e=>majStatuts(l=>{l[i].label=e.target.value;})} style={{...INP,flex:"1 1 200px",width:"auto"}}/>
        {(s.id==="Termine"||s.id==="Abandonne")
          ?<span style={{fontSize:11,color:"#9CA3AF"}}>toujours masquée par défaut</span>
          :<label style={{display:"flex",gap:6,alignItems:"center",fontSize:12,color:"#4B5563",cursor:"pointer"}}><input type="checkbox" checked={!!s.masque} onChange={e=>majStatuts(l=>{l[i].masque=e.target.checked;})}/> Masquée par défaut</label>}
        <button type="button" style={BTN_P} disabled={i===0} onClick={()=>majStatuts(l=>{const [x]=l.splice(i,1);l.splice(i-1,0,x);})} aria-label="Monter">▲</button>
        <button type="button" style={BTN_P} disabled={i===statuts.length-1} onClick={()=>majStatuts(l=>{const [x]=l.splice(i,1);l.splice(i+1,0,x);})} aria-label="Descendre">▼</button>
      </div>))}
      <button type="button" style={{...BTN_O,marginTop:10}} onClick={()=>majStatuts(l=>{l.push({id:"s_"+Date.now().toString(36),label:"Nouvelle colonne",color:"#6B7280"});})}>＋ Ajouter une colonne</button>
    </div>}

    {onglet==="historique"&&<div style={CARTE}>
      <b style={{fontSize:14}}>Versions précédentes</b>
      <p style={{fontSize:12,color:"#6B7280",margin:"4px 0 10px"}}>Chaque publication range la version précédente ici (20 gardées). « Revenir à cette version » la republie.</p>
      {histo===null&&<p style={{fontSize:13,color:"#9CA3AF"}}>Chargement…</p>}
      {histo&&histo.length===0&&<p style={{fontSize:13,color:"#9CA3AF"}}>Aucune modification publiée pour l'instant.</p>}
      {(histo||[]).map((h,i)=>(<div key={h.t+i} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"8px 0",borderTop:i?"1px solid #EEF1F5":"none"}}>
        <div style={{flex:"1 1 220px",fontSize:13}}>{new Date(h.t).toLocaleString("fr-FR")}<span style={{color:"#6B7280"}}> · remplacée par {h.qui||"—"}</span></div>
        <button type="button" style={BTN_O} disabled={occupe} onClick={async()=>{if(!window.confirm("Revenir à cette version ? La version actuelle est conservée dans l'historique."))return;setOccupe(true);try{await publierConfig(JSON.parse(h.config),nom,"retour arrière");setBrouillon(copie(configActuelle()));setHisto(null);setMessage({ok:true,t:"Version rétablie."});}catch(e){setMessage({ok:false,t:"Impossible de rétablir (connexion ?)."});}setOccupe(false);}}>↩ Revenir à cette version</button>
      </div>))}
    </div>}

    {modifie&&onglet!=="rapports"&&<div style={{position:"fixed",left:0,right:0,bottom:0,zIndex:150,background:"#fff",borderTop:"3px solid "+BLEU,padding:"10px 16px",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",justifyContent:"center",boxShadow:"0 -4px 12px rgba(0,0,0,0.12)"}}>
      <span style={{fontSize:13,fontWeight:600}}>Modifications non publiées</span>
      <button type="button" style={{...BTN,minHeight:42}} disabled={occupe} onClick={publier}>{occupe?"⏳ Publication…":"✔ Publier"}</button>
      <button type="button" style={{...BTN_O,minHeight:42}} disabled={occupe} onClick={annuler}>Annuler les modifications</button>
    </div>}
  </div>);
}

// choix de la nouvelle étape d'un champ (et de sa place dans cette étape)
function FormulaireDeplacement({c,etapes,vue,variantes,etapeCourante,partenaires,onOk,onAnnuler}){
  const [dest,setDest]=useState(etapes[0]||"");
  const [pos,setPos]=useState("fin");
  const [avec,setAvec]=useState(true);
  const cible=vue[dest]||[];
  // l'étape d'arrivée n'apparaît pas dans tous les cas où l'étape actuelle apparaît (moteur neuf, ventilateur seul, suivi devis…)
  const absente=e=>!!variantes&&variantes.some(l=>l.includes(etapeCourante)&&!l.includes(e));
  const apres=pos==="debut"?"__debut":pos==="fin"?(cible.length?cible[cible.length-1].id:"__debut"):pos;
  return(<div style={{background:"#F8F9FA",border:"1px solid #D1D5DB",borderRadius:8,padding:"10px 12px",margin:"4px 0 8px"}}>
    <div style={{fontSize:13,fontWeight:700}}>↪ Mettre « {c.label||c.id} » dans une autre étape</div>
    <label style={LBL}>Étape de destination</label>
    <select value={dest} onChange={e=>{setDest(e.target.value);setPos("fin");}} style={INP}>
      {etapes.map(e=><option key={e} value={e}>{e}{absente(e)?"  ⚠ pas toujours présente":""}</option>)}
    </select>
    <label style={LBL}>Place dans cette étape</label>
    <select value={pos} onChange={e=>setPos(e.target.value)} style={INP}>
      <option value="debut">En tête de l'étape</option>
      {cible.map(x=><option key={x.id} value={x.id}>Après : {resume(x).slice(0,70)}</option>)}
      <option value="fin">À la fin de l'étape</option>
    </select>
    {partenaires.length>0&&<label style={{display:"flex",gap:6,alignItems:"flex-start",fontSize:13,marginTop:8}}><input type="checkbox" checked={avec} onChange={e=>setAvec(e.target.checked)} style={{marginTop:2}}/><span>Déplacer aussi {partenaires.length>1?"les champs affichés":"le champ affiché"} sur la même ligne : <b>{partenaires.map(x=>x.label||x.id).join(", ")}</b></span></label>}
    {absente(dest)&&<p style={{fontSize:12,color:"#8A4B00",background:"#FFF8E1",border:"1px solid #E8720C",borderRadius:6,padding:"6px 10px",margin:"8px 0 0"}}>⚠ Cette étape n'apparaît pas dans tous les cas où « {etapeCourante} » apparaît (ex. moteur neuf, ventilateur seul, suivi devis) : dans ces cas le champ ne serait plus demandé.</p>}
    <p style={{fontSize:11,color:"#9CA3AF",margin:"8px 0 0"}}>Les valeurs déjà saisies sur les fiches sont conservées. Sur une fiche qui a déjà passé l'étape de destination, le champ n'est plus demandé. L'étape « Entrée » ne reçoit ni ne perd de champ (la création de la fiche en dépend).</p>
    <div style={{display:"flex",gap:8,marginTop:10}}>
      <button type="button" style={{...BTN,opacity:dest?1:0.5}} disabled={!dest} onClick={()=>onOk(dest,apres,avec)}>Déplacer</button>
      <button type="button" style={BTN_O} onClick={onAnnuler}>Annuler</button>
    </div>
  </div>);
}

function FormulaireModif({c,onChange,onFermer,ajoute,base}){
  const [label,setLabel]=useState(c.label||"");
  const [note,setNote]=useState(c.note||"");
  const [unite,setUnite]=useState(c.unite||"");
  const [choix,setChoix]=useState((c.options||[]).filter(o=>!(ajoute&&o==="Autre"&&c.autreTexte)).join("\n"));
  const [autre,setAutre]=useState(!!c.autreTexte);
  const [oblig,setOblig]=useState(c.required===true);
  const requisCode=typeof c.required==="function";
  const aOptions=Array.isArray(c.options);
  const aUnite=c.type==="number"||(ajoute&&c.unite!==undefined);
  const aSeuil=c.type==="number"||c.type==="mesure"; // seuil avec alerte : cases numériques seulement
  const s0=lireSeuil(c)||{};
  const [seuilMax,setSeuilMax]=useState(s0.max==null?"":String(s0.max));
  const [seuilMin,setSeuilMin]=useState(s0.min==null?"":String(s0.min));
  const [seuilMsg,setSeuilMsg]=useState(s0.msg||"");
  function valider(){
    const opts=choix.split("\n").map(x=>x.trim()).filter(Boolean);
    if(ajoute){
      onChange({def:{label:label.trim()||c.label,note:note.trim(),unite:unite.trim()||undefined,required:oblig,...(aSeuil?{seuil:seuilDepuisSaisie(seuilMax,seuilMin,seuilMsg)}:{}),...(aOptions?{options:opts,autre}:{})}});
    }else{
      const p={label:label.trim()||(base&&base.label)||c.label};
      if(note.trim()!==(c.note||""))p.note=note.trim()||" ";
      if(!SANS_OBLIGATOIRE.includes(c.type)&&!requisCode&&oblig!==(c.required===true))p.required=oblig;
      if(aOptions&&opts.length)p.options=opts.includes("Autre")||!c.options.includes("Autre")?opts:opts.concat(["Autre"]);
      if(aSeuil)p.seuil=seuilDepuisSaisie(seuilMax,seuilMin,seuilMsg)||null; // null : seuil retiré
      onChange(p);
    }
    onFermer();
  }
  return(<div style={{background:"#F8F9FA",border:"1px solid #D1D5DB",borderRadius:8,padding:"10px 12px",margin:"4px 0 8px"}}>
    <label style={LBL}>Intitulé</label>
    <input type="text" value={label} onChange={e=>setLabel(e.target.value)} style={INP}/>
    {aUnite&&ajoute&&<><label style={LBL}>Unité</label><input type="text" value={unite} onChange={e=>setUnite(e.target.value)} style={INP} placeholder="ex. mm, kW"/></>}
    {aOptions&&<><label style={LBL}>Choix proposés (un par ligne){!ajoute&&c.options.includes("Autre")?" — « Autre » est conservé":""}</label>
      <textarea value={choix} onChange={e=>setChoix(e.target.value)} rows={Math.min(8,Math.max(3,choix.split("\n").length+1))} style={{...INP,resize:"vertical"}}/>
      {ajoute&&<label style={{display:"flex",gap:6,alignItems:"center",fontSize:13,marginTop:6}}><input type="checkbox" checked={autre} onChange={e=>setAutre(e.target.checked)}/> Proposer aussi « Autre » (saisie libre)</label>}</>}
    <label style={LBL}>Note (petit texte à côté de l'intitulé, facultatif)</label>
    <input type="text" value={note} onChange={e=>setNote(e.target.value)} style={INP}/>
    {!SANS_OBLIGATOIRE.includes(c.type)&&!requisCode&&<label style={{display:"flex",gap:6,alignItems:"center",fontSize:13,marginTop:8}}><input type="checkbox" checked={oblig} onChange={e=>setOblig(e.target.checked)}/> Champ obligatoire (on ne peut pas valider l'étape sans lui)</label>}
    {requisCode&&<p style={{fontSize:11,color:"#9CA3AF",margin:"8px 0 0"}}>Ce champ est obligatoire seulement dans certains cas (règle écrite dans le code) : pour la changer, demandez-le moi.</p>}
    {aSeuil&&<ZoneSeuil unite={c.unite} max={seuilMax} min={seuilMin} msg={seuilMsg} setMax={setSeuilMax} setMin={setSeuilMin} setMsg={setSeuilMsg}/>}
    <div style={{display:"flex",gap:8,marginTop:10}}>
      <button type="button" style={BTN} onClick={valider}>OK</button>
      <button type="button" style={BTN_O} onClick={onFermer}>Annuler</button>
    </div>
  </div>);
}

// Seuil avec alerte d'une case numérique : au-dessus du maximum ou en dessous du minimum, la case passe en rouge avec un message (rien n'est bloqué)
function ZoneSeuil({unite,max,min,msg,setMax,setMin,setMsg}){
  const nombre=t=>t.replace(/[^0-9.,\-]/g,"");
  return(<div style={{background:"#FFF8E1",border:"1px solid #E8720C",borderRadius:8,padding:"8px 10px",marginTop:10}}>
    <div style={{fontSize:13,fontWeight:700,color:"#8A4B00"}}>⚠ Seuil avec alerte (facultatif)</div>
    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
      <div style={{flex:"1 1 150px"}}><label style={LBL}>Alerte au-dessus de{unite?" ("+unite+")":""}</label><input type="text" inputMode="decimal" value={max} onChange={e=>setMax(nombre(e.target.value))} style={INP} placeholder="ex. 3"/></div>
      <div style={{flex:"1 1 150px"}}><label style={LBL}>Alerte en dessous de{unite?" ("+unite+")":""}</label><input type="text" inputMode="decimal" value={min} onChange={e=>setMin(nombre(e.target.value))} style={INP} placeholder="ex. 0,5"/></div>
    </div>
    <label style={LBL}>Message d'alerte (facultatif ; sinon « Au-dessus du seuil : … »)</label>
    <input type="text" value={msg} onChange={e=>setMsg(e.target.value)} style={INP} placeholder="ex. Non conforme : le moteur vibre"/>
    <p style={{fontSize:11,color:"#8A4B00",margin:"6px 0 0"}}>La technicienne ou le technicien voit la case en rouge avec ce message dès que la valeur sort des limites ; l'étape peut quand même être enregistrée et validée.</p>
  </div>);
}

function FormulaireAjout({onAjouter,onAnnuler}){
  const [type,setType]=useState("text");
  const [label,setLabel]=useState("");
  const [unite,setUnite]=useState("");
  const [choix,setChoix]=useState("");
  const [autre,setAutre]=useState(false);
  const [oblig,setOblig]=useState(false);
  const [note,setNote]=useState("");
  const [seuilMax,setSeuilMax]=useState("");const [seuilMin,setSeuilMin]=useState("");const [seuilMsg,setSeuilMsg]=useState("");
  const ok=label.trim().length>0&&(type!=="select"||choix.split("\n").some(x=>x.trim()));
  function valider(){
    const def={type,label:label.trim(),note:note.trim()||undefined,required:oblig};
    if(type==="number"){def.unite=unite.trim()||undefined;def.seuil=seuilDepuisSaisie(seuilMax,seuilMin,seuilMsg);}
    if(type==="select"){def.options=choix.split("\n").map(x=>x.trim()).filter(Boolean);def.autre=autre;}
    onAjouter(def);
  }
  return(<div style={{background:"#F0FFF4",border:"1px solid #22863A",borderRadius:8,padding:"10px 12px",margin:"6px 0 10px"}}>
    <div style={{fontSize:13,fontWeight:700,color:"#22863A"}}>＋ Nouveau champ</div>
    <label style={LBL}>Type</label>
    <select value={type} onChange={e=>setType(e.target.value)} style={INP}>{TYPES_AJOUT.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select>
    <label style={LBL}>{type==="titre"?"Texte de l'intertitre":"Intitulé"}</label>
    <input type="text" autoFocus value={label} onChange={e=>setLabel(e.target.value)} style={INP} placeholder={type==="photo"?"ex. Photo du joint à lèvres":"ex. Marque du joint à lèvres"}/>
    {type==="number"&&<><label style={LBL}>Unité (facultatif)</label><input type="text" value={unite} onChange={e=>setUnite(e.target.value)} style={INP} placeholder="ex. mm, kW"/>
      <ZoneSeuil unite={unite} max={seuilMax} min={seuilMin} msg={seuilMsg} setMax={setSeuilMax} setMin={setSeuilMin} setMsg={setSeuilMsg}/></>}
    {type==="select"&&<><label style={LBL}>Choix proposés (un par ligne)</label><textarea value={choix} onChange={e=>setChoix(e.target.value)} rows={4} style={{...INP,resize:"vertical"}} placeholder={"SKF\nNBR\nViton"}/>
      <label style={{display:"flex",gap:6,alignItems:"center",fontSize:13,marginTop:6}}><input type="checkbox" checked={autre} onChange={e=>setAutre(e.target.checked)}/> Proposer aussi « Autre » (saisie libre)</label></>}
    {type!=="titre"&&<><label style={LBL}>Note (petit texte à côté de l'intitulé, facultatif)</label><input type="text" value={note} onChange={e=>setNote(e.target.value)} style={INP}/>
      <label style={{display:"flex",gap:6,alignItems:"center",fontSize:13,marginTop:8}}><input type="checkbox" checked={oblig} onChange={e=>setOblig(e.target.checked)}/> Champ obligatoire</label></>}
    <div style={{display:"flex",gap:8,marginTop:10}}>
      <button type="button" style={{...BTN,opacity:ok?1:0.5}} disabled={!ok} onClick={valider}>Ajouter</button>
      <button type="button" style={BTN_O} onClick={onAnnuler}>Annuler</button>
    </div>
  </div>);
}
