// Personnalisation des rapports client par la Maintenance (configuration : configRapports.js).
// Les rapports sont construits par le code (rapportModele.js : moteur, pompe, ventilateur… ; rapportCheminee.js : cheminée) sous forme de modèle ;
// ce fichier applique PAR-DESSUS ce modèle ce que la Maintenance a décidé : rubriques masquées, titres et textes modifiés, blocs ajoutés
// (titre, paragraphe, lignes, photos de la fiche) avec des champs de la fiche écrits {{id_du_champ}}. Word et PDF lisent le même modèle : ils restent identiques.
// Module sans dépendance (pas d'import) pour pouvoir être lu partout sans import circulaire.

export const TYPES_RAPPORT=[
  ["Moteur","Moteur électrique"],["Moto-réducteur","Moto-réducteur"],["Autre","Autre matériel"],
  ["Pompe","Pompe"],["Ventilateur","Ventilateur"],["Cheminée de freinage","Cheminée de freinage"],
];
export const TYPES_BLOC=[
  ["titre1","Titre de rubrique"],["titre2","Sous-titre"],["texte","Paragraphe"],["lignes","Lignes serrées (une par ligne)"],["photo","Photo(s) de la fiche"],
  ["identite","Ligne d'identification (page de garde)"],
];
export const STYLES=[["normal","Normal"],["gras","Gras"],["rouge","Rouge (attention)"]];
export const OPERATEURS=[["rempli","est rempli"],["vide","est vide"],["egal","est égal à"],["different","est différent de"]];
export const TAILLES_PHOTO=[["petite","Petite"],["moyenne","Moyenne"],["grande","Grande"]];
// pompe et ventilateur n'avaient pas de rapport : il se compose entièrement ici (couverture, identification et conclusion sont automatiques)
export const typeGenerique=t=>t==="Pompe"||t==="Ventilateur";

const JETON=/\{\{\s*([A-Za-z0-9_:]+)\s*\}\}/g;
const vide=s=>s===undefined||s===null||String(s).trim()===""||/^[.\-–—\s]+$/.test(String(s));
const listeEt=t=>{const l=String(t||"").split(",").map(s=>s.trim()).filter(Boolean);return l.length<=1?(l[0]||""):l.slice(0,-1).join(", ")+" et "+l[l.length-1];};

// Valeur d'un champ de la fiche telle qu'elle s'écrit dans un rapport (def : définition du champ, peut manquer)
export function formaterValeur(def,val){
  if(val===undefined||val===null)return "";
  const s=String(val).trim();
  if(!s)return "";
  const t=def&&def.type;
  if(t==="ohm"){const p=s.split("_");return p[0]?p[0].trim()+" "+(p[1]||"GΩ"):"";}
  if(t==="date"){const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[3]+"/"+m[2]+"/"+m[1]:s;}
  if(t==="technicien")return listeEt(s);
  if(t==="joints"){try{const a=JSON.parse(s);return Array.isArray(a)?a.map(j=>[j.type,[j.int,j.ext,j.ep].filter(Boolean).join("×")].filter(Boolean).join(" ")).join(", "):s;}catch(e){return s;}}
  if(s==="[]")return "";
  return s.replace(/^Autre:\s*/,"");
}
// remplace {{champ}} par sa valeur ; `manque` : au moins un champ est vide
// {{champ}} = case de la fiche atelier ; {{rapport:cle}} = réponse du formulaire du rapport (data : contact, mois_annee…)
export function resoudreJetons(texte,v,champs,data){
  let manque=false;
  const t=String(texte||"").replace(JETON,(m,id)=>{
    const s=id.indexOf("rapport:")===0?String(data&&data[id.slice(8)]!==undefined&&data[id.slice(8)]!==null?data[id.slice(8)]:"").trim():formaterValeur(champs&&champs[id],v&&v[id]);
    if(!s)manque=true;
    return s;
  });
  return {texte:t,manque};
}

// Table des textes d'un rapport : chaque morceau de texte écrit dans le code passe par T(id, texte par défaut, variables).
// Un texte modifié par la Maintenance (textes[id]) remplace le défaut ; il peut contenir des champs {{…}}. Les variables du code s'écrivent {nom} :
// une variable vide efface aussi l'espace qui la précède. recus = tous les textes demandés (id + texte par défaut), prises() = ceux utilisés depuis le dernier appel
// (sert à repérer, dans l'aperçu modifiable, quels textes appartiennent à quel bloc).
export function creerTextes(textes,ctx){
  const recus=[];const vus={};let pend=[];
  const T=(id,defaut,vars)=>{
    if(!vus[id]){vus[id]=1;recus.push({id,defaut});}
    pend.push(id);
    const o=textes?textes[id]:undefined;
    let t=(o===undefined||o===null)?defaut:resoudreJetons(String(o),ctx.v,ctx.champs,ctx.data).texte;
    if(vars)t=t.replace(/(\s?)\{([A-Za-z_]\w*)\}/g,(m,sp,nom)=>{const x=vars[nom];return (x===undefined||x===null||x==="")?"":sp+x;});
    return t;
  };
  const prises=()=>{const l=pend.filter((x,i)=>pend.indexOf(x)===i);pend=[];return l;};
  return {T,recus,prises};
}
export const jetonsDe=texte=>{const l=[];String(texte||"").replace(JETON,(m,id)=>{if(!l.includes(id))l.push(id);return m;});return l;};

export function conditionOk(c,v){
  if(!c||!c.champ)return true;
  const val=v&&v[c.champ];
  switch(c.op){
    case "rempli":return !vide(val);
    case "vide":return vide(val);
    case "egal":return String(val===undefined||val===null?"":val).trim()===String(c.valeur||"").trim();
    case "different":return String(val===undefined||val===null?"":val).trim()!==String(c.valeur||"").trim();
    default:return true;
  }
}

// Un bloc ajouté -> 0, 1 ou plusieurs blocs « neutres » {k:…} (titre1, titre2, texte, lignes, photo)
export const blocsDepuisAjout=(a,ctx)=>blocsDepuisAjoutBrut(a,ctx).map(d=>({...d,ajout:a.id}));
function blocsDepuisAjoutBrut(a,ctx){
  const v=ctx.v||{};
  if(!conditionOk(a.condition,v))return [];
  const style=t=>a.style==="gras"?[{b:t}]:a.style==="rouge"?[{rouge:t}]:[t];
  if(a.type==="photo"){
    const cat=a.photo&&a.photo.categorie;
    if(!cat)return [];
    const urls=(ctx.fiche||[]).filter(p=>p.categorie_nom===cat).map(p=>p.url).filter(Boolean).slice(0,a.photo.max||6);
    return urls.length?[{k:"photo",urls,taille:a.photo.taille||"moyenne"}]:[];
  }
  const masquer=a.masquerSiVide!==false;
  if(a.type==="identite"){
    const lib=resoudreJetons(a.label,v,ctx.champs,ctx.data).texte.trim();
    const val=resoudreJetons(a.texte,v,ctx.champs,ctx.data);
    if(!lib||!val.texte.trim()||(masquer&&val.manque))return [];
    return [{k:"identite",label:lib,valeur:val.texte.trim()}];
  }
  const lignes=String(a.texte||"").split(/\r?\n/).map(l=>resoudreJetons(l,v,ctx.champs,ctx.data)).filter(r=>r.texte.trim()&&!(masquer&&r.manque)).map(r=>r.texte.trim());
  if(!lignes.length)return [];
  if(a.type==="titre1"||a.type==="titre2")return [{k:a.type,txt:lignes.join(" ")}];
  if(a.type==="lignes")return [{k:"lignes",lignes:lignes.map(style)}];
  return lignes.map(l=>({k:"texte",parts:style(l)}));
}

// ── rapport « livret » (cheminée) : modèle plat {blocs:[…]} ───────────────────────────────
const DIM_LIVRET={petite:{w:6,h:5,r:4.2},moyenne:{w:9,h:7,r:5.6},grande:{w:14,h:10,r:7.5}};
const blocsLivret=d=>blocsLivretBrut(d).map(b=>({...b,ajout:d.ajout}));
function blocsLivretBrut(d){
  const dim=DIM_LIVRET[d.taille]||DIM_LIVRET.moyenne;
  switch(d.k){
    case "titre1":return [{t:"h1",txt:d.txt,toc:true,perso:true}];
    case "titre2":return [{t:"h2",txt:d.txt,toc:true,perso:true}];
    case "texte":return [{t:"para",parts:d.parts,perso:true}];
    case "lignes":return [{t:"lignes",lignes:d.lignes,perso:true}];
    case "photo":{
      if(d.urls.length===1)return [{t:"img",url:d.urls[0],w:dim.w,h:dim.h,perso:true}];
      const out=[];for(let i=0;i<d.urls.length;i+=3)out.push({t:"rang",items:d.urls.slice(i,i+3).map(url=>({url})),h:dim.r,perso:true});
      return out;
    }
    default:return [];
  }
}
// ancres : liste ordonnée [{id,…}] des rubriques que le code connaît (sert à retrouver « la rubrique suivante » quand celle visée n'est pas imprimée)
export function appliquerLivret(M,cfg,ctx,ancres){
  let blocs=M.blocs.slice();
  // 1. rubriques masquées : un titre masqué emporte ce qui le suit jusqu'au titre suivant de même niveau ou supérieur
  if(cfg.masques.length){
    const out=[];let cache=0;
    blocs.forEach(b=>{
      if(cache===1&&b.t==="h1")cache=0;
      if(cache===2&&(b.t==="h1"||b.t==="h2"))cache=0;
      if(cache)return;
      if(b.id&&cfg.masques.includes(b.id)){if(b.t==="h1")cache=1;else if(b.t==="h2")cache=2;return;}
      out.push(b);
    });
    blocs=out;
  }
  // 2. page d'identification : lignes masquées, lignes ajoutées (juste avant la ligne visée, ou à la fin)
  let identite=(M.identite||[]).filter(l=>!l.id||!cfg.masques.includes(l.id));
  const lignesId=ancres.filter(a=>a.kind==="ligne").map(a=>a.id);
  cfg.ajouts.filter(a=>a.type==="identite").forEach(a=>{
    const n=blocsDepuisAjout(a,ctx)[0];
    if(!n)return;
    const nl={id:"perso:"+a.id,k:n.label,v:n.valeur,ajout:a.id};
    let i=identite.length;
    const k0=lignesId.indexOf(a.avant);
    if(k0>=0)for(let k=k0;k<lignesId.length;k++){const j=identite.findIndex(l=>l.id===lignesId[k]);if(j>=0){i=j;break;}}
    identite=identite.slice(0,i).concat([nl],identite.slice(i));
  });
  // 3. blocs ajoutés, posés avant leur rubrique (ou la suivante qui existe, ou à la fin)
  const ajoutsCorps=cfg.ajouts.filter(a=>a.type!=="identite");
  if(ajoutsCorps.length){
    const ordre=ancres.map(a=>a.id);
    const indice=id=>{
      if(id==="__debut")return 0;
      if(!id||id==="__fin")return blocs.length;
      let k=ordre.indexOf(id);if(k<0)return blocs.length;
      for(;k<ordre.length;k++){const i=blocs.findIndex(b=>b.id===ordre[k]);if(i>=0)return i;}
      return blocs.length;
    };
    const devant=new Map();const fin=[];
    ajoutsCorps.forEach(a=>{
      const neutres=blocsDepuisAjout(a,ctx);
      const nouveaux=[].concat(...neutres.map(blocsLivret));
      if(!nouveaux.length)return;
      const i=indice(a.avant);
      if(i>=blocs.length)fin.push(...nouveaux);
      else{const b=blocs[i];if(!devant.has(b))devant.set(b,[]);devant.get(b).push(...nouveaux);}
    });
    const out=[];
    blocs.forEach(b=>{if(devant.has(b))out.push(...devant.get(b));out.push(b);});
    blocs=out.concat(fin);
  }
  const sommaire=blocs.filter(b=>(b.t==="h1"||b.t==="h2")&&b.toc).map(b=>({txt:String(b.txt).replace(/\s*:\s*$/,""),niveau:b.t==="h1"?1:2}));
  return {...M,blocs,sommaire,identite};
}

// ── rapport « chapitres » (moteur, pompe, ventilateur…) : modèle {chapitres:[{id,titre,blocs}]} ──────────────
const blocsChapitre=d=>blocsChapitreBrut(d).map(b=>({...b,ajout:d.ajout}));
function blocsChapitreBrut(d){
  switch(d.k){
    case "titre2":return [{t:"sous",txt:d.txt}];
    case "texte":return [{t:"para",parts:d.parts}];
    case "lignes":return [{t:"lignes",lignes:d.lignes}];
    case "photo":{
      if(d.urls.length===1)return [{t:"img",url:d.urls[0],taille:d.taille}];
      const out=[];for(let i=0;i<d.urls.length;i+=2)out.push({t:"paire",items:d.urls.slice(i,i+2).map(url=>({url,legende:""}))});
      return out;
    }
    default:return [];
  }
}
export function appliquerChapitres(M,cfg,ctx,ancres){
  let ch=M.chapitres.map(c=>({...c,blocs:c.blocs.slice()}));
  // 1. masques : un chapitre, ou un intertitre (avec ce qui le suit jusqu'à l'intertitre suivant)
  ch=ch.filter(c=>!cfg.masques.includes(c.id));
  ch.forEach(c=>{
    const out=[];let cache=false;
    c.blocs.forEach(b=>{if(b.t==="sous")cache=!!(b.id&&cfg.masques.includes(b.id));if(!cache)out.push(b);});
    c.blocs=out;
  });
  // 2. titres renommés
  const res=t=>resoudreJetons(t,ctx.v,ctx.champs).texte;
  ch.forEach(c=>{
    const o=cfg.textes[c.id];if(o!==undefined&&o!==null&&String(o).trim())c.titre=res(String(o).replace(/\r?\n/g," ").trim());
    c.blocs=c.blocs.map(b=>{const t=b.t==="sous"&&b.id?cfg.textes[b.id]:undefined;return t!==undefined&&t!==null&&String(t).trim()?{...b,txt:res(String(t).replace(/\r?\n/g," ").trim())}:b;});
  });
  // 3. blocs ajoutés
  const ordre=ancres.map(a=>a.id);
  const premier=ch.length?ch[0].id:null; // le « début » reste celui du rapport d'origine, même après l'ajout d'un premier chapitre
  const existe=id=>ch.some(c=>c.id===id)||ch.some(c=>c.blocs.some(b=>b.t==="sous"&&b.id===id));
  const cible=id=>{
    if(id==="__debut")return premier||"__fin";
    if(!id||id==="__fin")return "__fin";
    let k=ordre.indexOf(id);if(k<0)return "__fin";
    for(;k<ordre.length;k++)if(existe(ordre[k]))return ordre[k];
    return "__fin";
  };
  const COMPLEMENT="Informations complémentaires";
  cfg.ajouts.forEach(a=>{
    const neutres=blocsDepuisAjout(a,ctx);
    if(!neutres.length)return;
    const cle=cible(a.avant);
    const ci=ch.findIndex(c=>c.id===cle);
    neutres.forEach((d,n)=>{
      if(ci>=0||cle==="__fin"){
        // niveau chapitre : un titre de rubrique ouvre un chapitre ; le reste se range à la fin du chapitre précédent
        if(d.k==="titre1"){
          const nv={id:"perso:"+a.id+":"+n,titre:d.txt,blocs:[],ajout:a.id};
          const i=cle==="__fin"?ch.length:ch.findIndex(c=>c.id===cle);
          ch.splice(i,0,nv);return;
        }
        const i=cle==="__fin"?ch.length:ch.findIndex(c=>c.id===cle);
        const prec=ch[i-1];
        if(prec){prec.blocs.push(...blocsChapitre(d));return;}
        ch.splice(i,0,{id:"perso:"+a.id+":"+n,titre:COMPLEMENT,blocs:blocsChapitre(d)});
        return;
      }
      // niveau intertitre : posé avant l'intertitre visé, dans son chapitre
      const k=ch.findIndex(c=>c.blocs.some(b=>b.t==="sous"&&b.id===cle));
      if(k<0)return;
      const j=ch[k].blocs.findIndex(b=>b.t==="sous"&&b.id===cle);
      const dd=d.k==="titre1"?{...d,k:"titre2"}:d;
      ch[k].blocs.splice(j,0,...blocsChapitre(dd));
    });
  });
  ch=ch.filter(c=>c.blocs.length>0||c.ajout); // un titre ajouté par la Maintenance reste, même seul (on y ajoute ensuite son contenu)
  return {...M,chapitres:ch,sommaire:ch.map((c,i)=>(i+1)+". "+c.titre)};
}
