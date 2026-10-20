// Rapport client « cheminée de freinage » (PMV Rail). Même principe que le rapport moteur (rapportModele.js) : le CONTENU est construit ici,
// une seule fois, puis mis en page par rapportLivretDocx.js (Word) et rapportLivretHtml.js (aperçu / PDF). Les deux versions disent donc la même chose.
// Modèles : « rapport DV0040 » (cheminée IMATEQ) et « rapport DV0044 » (cheminée SNCF). Rien n'y est ajouté : chaque ligne vient d'un de ces deux rapports.
//
// Un rapport = { de, couverture, societe, identite[], descriptif, sommaire[], blocs[], legende[] } ; un bloc est l'un de :
//   { t:"h1"|"h2", txt, toc?, leger?, saut? }     titre (h2 « leger » : texte normal repris au sommaire)
//   { t:"para", parts, centre? }                   un paragraphe ; { t:"lignes", lignes:[parts…], petit? } plusieurs lignes serrées
//   { t:"img", url, w, h }                         une photo (w, h = taille maximale en cm), alignée à gauche comme dans les rapports d'origine
//   { t:"rang", items:[{url,legende?}…], h }       2 ou 3 photos côte à côte
//   { t:"capture", url, h }                        capture d'appareil (grande image)
//   { t:"table", cols:[largeurs relatives], rows:[[cellule…]…], taille? }   cellule = "texte" | { txt, b?, v?, align?, taille? }
// parts = "texte" | { b } gras | { bu } gras souligné | { v:"ok"|"res"|"ko", txt } verdict en couleur | { rouge } texte rouge
import {RACK_NOMINAL, SERIE_NOMINAL, TOLERANCE, verdictResistance, verdictSerie, verdictIsolement, conclusionResistances, ohmsDe, totalCasse} from "./Cheminee";
import {ISOLATEURS_SNCF_PAR_CHEMINEE} from "./railClients";
import {listeEt} from "./rapportModele";

export const SOCIETE_RAIL={
  lignes:["SARL PMV Rail","7 rue des entrepreneurs","37390 La Membrolle sur Choisille","Tél : 09 67 37 27 24","agence@pmvservices.fr"],
  accroche:"votre spécialiste de l'entretien du moteur électrique et annexe",
};
export const DESCRIPTIF_CHEMINEE_DEFAUT="Contrôle et mesures des résistances de freinages avec contrôle et entretien du moteur électrique de ventilation";
export const MATERIEL_CHEMINEE_DEFAUT=
  "Les mesures de résistance électriques à 5KV et 10KV ont été réalisées avec le MIT 1025 (date de validité : 12/2026)\n"+
  "Les mesures ohmiques des résistances ont été réalisées avec le MTR 105 (date de validité : 6/2028)\n"+
  "Les clefs dynamométriques de E100105/24W530172 (date de validité : 02/2027)\n"+
  "Megger Baker ADX 6 (date de validité : 09/2026)";
export const TYPE_RESISTANCE_DEFAUT="BWD 143-1";
export const LEGENDE_COULEURS=[{v:"ok",txt:"Conforme"},{v:"res",txt:"Conforme sous réserve"},{v:"ko",txt:"Non conforme (irréparables)"}];
export const VERDICTS_CHEMINEE=["Conforme","Conforme sous réserve","Non conforme"];

// Photos du rapport : prises sur la fiche par catégorie (« cats »), sinon ajoutées à la main dans le formulaire du rapport.
export const PHOTOS_RAPPORT_CHEMINEE=[
  {key:"palette",label:"Palette à la réception",cats:["Palette à la réception"]},
  {key:"plaque_res",label:"Plaque jaune (résistance de freinage)",cats:["Déballage plaque jaune"]},
  {key:"plaque_vent",label:"Plaque du ventilateur (MDEXX)",cats:["Déballage plaque pressostat"]},
  {key:"plaque_moteur",label:"Plaque moteur",cats:["Déballage plaque moteur"]},
  {key:"stator_av",label:"Stator avant",cats:["Stator avant","Bobinage avant"]},
  {key:"stator_ar",label:"Stator arrière",cats:["Stator arrière","Bobinage arrière"]},
  {key:"adx_pv",label:"Rapport ADX6 — petite vitesse",cats:["Rapport ADX6 petite vitesse"]},
  {key:"adx_gv",label:"Rapport ADX6 — grande vitesse",cats:["Rapport ADX6 grande vitesse"]},
  {key:"roulements",label:"Roulements",cats:["Roulements"]},
  {key:"deflecteur",label:"Déflecteur d'air",cats:[]},
  {key:"transport",label:"Transport (serrures…)",cats:[]},
];
// Séries de photos : toutes celles de la fiche (catégories) puis celles ajoutées à la main
export const SERIES_RAPPORT_CHEMINEE=[
  {key:"desaccouplage",label:"Séparation du bloc de ventilation et du bloc de résistance (3 photos)",cats:["Désaccouplage"],max:3},
  {key:"defauts",label:"Défauts constatés au déballage",cats:[],max:4},
  {key:"depart",label:"Départ de nos ateliers",cats:["Palettisation au départ","Départ de l'atelier"],max:4},
];

const clean=val=>String(val===undefined||val===null?"":val).replace("Autre:","").trim();
const has=val=>val!==undefined&&val!==null&&String(val).trim()!==""&&!/^[.\-–—\s]+$/.test(String(val));
const nombre=val=>{const x=parseFloat(String(val===undefined||val===null?"":val).replace(",","."));return isNaN(x)?null:x;};
const unique=l=>l.filter((x,i)=>x&&l.indexOf(x)===i);
const dateFr=s=>{const m=String(s||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[3]+"/"+m[2]+"/"+m[1]:"";};
const moisAnneeDe=s=>{const m=String(s||"").match(/^(\d{4})-(\d{2})/);return m?m[2]+"/"+m[1]:"";};
const fr2=(x,d)=>String(Math.round(x*Math.pow(10,d))/Math.pow(10,d));

// Photos côte à côte : même hauteur, largeurs proportionnelles, sur une seule ligne. La hauteur commune est celle demandée (hMax),
// réduite si la somme des largeurs dépasse la place disponible (largeurCm, espaces entre photos compris).
export function dimensionsRang(ratios,hMax,largeurCm,espaceCm){
  if(!ratios.length)return {h:0,largeurs:[]};
  const somme=ratios.reduce((a,r)=>a+r,0);
  const h=Math.min(hMax,(largeurCm-espaceCm*(ratios.length-1))/somme);
  return {h,largeurs:ratios.map(r=>h*r)};
}

// numéro lu sur la gravure d'une plaque SNCF : « 2026-08-307 » -> 307 ; « 2024-07-037/2026-08 » -> 037
export function numeroGravure(texte){
  const t=String(texte||"").trim().replace(/^-+/,"").split("/")[0].trim();
  if(!t)return "";
  const p=t.split("-");
  return (p[p.length-1]||"").trim();
}
// colonnes des tableaux : 1 à 8 (IMATEQ) ou numéros de gravure (SNCF)
export function colonnesResistances(v){
  const sncf=v&&v.cheminee_origine==="SNCF";
  return [1,2,3,4,5,6,7,8].map(i=>{const g=sncf?numeroGravure(v["gravure_"+i]):"";return g||String(i);});
}

// intensités « 3.5 », « 3.5 / 3.5 / 3.4 » : une seule valeur si les trois phases sont identiques
function intensites(v,prefixe){
  const l=[1,2,3].map(p=>String(v[prefixe+"_p"+p]===undefined?"":v[prefixe+"_p"+p]).trim()).filter(x=>x!=="");
  if(!l.length)return "";
  if(unique(l).length===1)return l[0];
  return listeEt(l.join(","));
}
const ampere=(v,prefixe)=>{const t=intensites(v,prefixe);return t?t+" Ampères par phases sous 400V":"";};
function verdictPortees(v){
  const etats=["etat_arbre_av","etat_arbre_ar","etat_flasque_av","etat_flasque_ar"].map(k=>v[k]).filter(Boolean);
  if(!etats.length)return "";
  return etats.every(e=>e==="OK")?"Conforme":"Conforme sous réserve";
}
const joint=(v,k)=>{try{const a=JSON.parse(v[k]||"[]");return Array.isArray(a)&&a.length>0;}catch(e){return false;}};
const vibrationsApres=v=>[v.tvib_pv_mms_ap,v.tvib_gv_mms_ap].map(nombre).filter(x=>x!==null);
const etatRoulement=e=>e==="Usé"?"usé":e==="HS"?"hors service":e==="RAS"?"RAS":"";

// Valeurs proposées au départ dans le formulaire du rapport (modifiables avant l'export), tirées de la fiche
export function valeursDepartRapportCheminee(v){
  v=v||{};
  const techs=l=>unique(l.map(k=>String(v[k]||"").trim()));
  const d={};
  d.mois_annee=moisAnneeDe(v.date_mise_dispo)||moisAnneeDe(new Date().toISOString());
  d.descriptif_travaux=DESCRIPTIF_CHEMINEE_DEFAUT;
  d.res_type=has(v.res_type)?String(v.res_type).trim():TYPE_RESISTANCE_DEFAUT;
  if(has(v.vent_type))d.vent_type=String(v.vent_type).trim();
  d.defauts_texte=has(v.deballage_obs)?String(v.deballage_obs).trim():"";
  d.verdict_onde="Conforme";
  const vp=verdictPortees(v);if(vp)d.verdict_portees=vp;
  d.etat_rou_av=etatRoulement(v.etat_roulement_av);
  d.etat_rou_ar=etatRoulement(v.etat_roulement_ar);
  // conclusion moteur : phrase proposée d'après la fiche (modifiable)
  const vib=vibrationsApres(v);
  const phrases=[];
  if(vib.length)phrases.push(vib.every(x=>x<3)?"La valeur de vibration est sous la norme des 3 mm/s.":"La valeur de vibration dépasse la norme de 3 mm/s.");
  const isol=ohmsDe(v.isol_masse_ap);
  const porteesOk=vp==="Conforme",bobinageOk=isol!==null&&isol>=1e9;
  if(porteesOk&&bobinageOk)phrases.push("Les portées moteurs et le bobinage sont en bon état.");
  else if(porteesOk)phrases.push("Les portées moteurs sont en bon état.");
  else if(bobinageOk)phrases.push("Le bobinage est en bon état.");
  const roulements=v.roulement_av_change==="Oui"||v.roulement_ar_change==="Oui",joints=joint(v,"joint_av")||joint(v,"joint_ar");
  if(roulements&&joints)phrases.push("Les roulements et le joint moteur ont été remplacés.");
  else if(roulements)phrases.push("Les roulements ont été remplacés.");
  else if(joints)phrases.push("Le joint moteur a été remplacé.");
  d.conclusion_moteur=phrases.join(" ");
  d.verdict_moteur=vib.some(x=>x>=3)?"Non conforme":(vp&&vp!=="Conforme")?"Conforme sous réserve":"Conforme";
  d.realise_par=techs(["tech_reception","tech_moteur_controle","tech_moteur_essais","tech_demontage","tech_moteur_remontage","tech_cheminee"]).join(", ");
  d.certifie_par=techs(["qualite_tech_1","qualite_tech_2"]).join(", ");
  return d;
}

// Photos : { palette:url, …, desaccouplage:[urls], … } d'après les photos de la fiche (catégories), complétées par ce que le formulaire a ajouté à la main
export function resoudrePhotosCheminee(photosFiche,data){
  const l=Array.isArray(photosFiche)?photosFiche:[];
  data=data||{};
  const out={};
  PHOTOS_RAPPORT_CHEMINEE.forEach(s=>{
    let url=null;
    for(const c of s.cats){const p=l.find(x=>x.categorie_nom===c);if(p){url=p.url;break;}}
    out[s.key]=url||data["photo_"+s.key+"_url"]||null;
  });
  SERIES_RAPPORT_CHEMINEE.forEach(s=>{
    const urls=[];
    s.cats.forEach(c=>l.filter(x=>x.categorie_nom===c).forEach(p=>urls.push(p.url)));
    try{const m=JSON.parse(data["liste_"+s.key]||"[]");if(Array.isArray(m))m.forEach(u=>{if(u)urls.push(u);});}catch(e){/* liste illisible : ignorée */}
    out[s.key]=urls.slice(0,s.max);
  });
  return out;
}

function partsVerdict(nom){
  if(nom==="Conforme")return {v:"ok",txt:"Conforme"};
  if(nom==="Conforme sous réserve")return {v:"res",txt:"Conforme sous réserve"};
  if(nom==="Non conforme")return {v:"ko",txt:"Non conforme"};
  return null;
}
const cellule=(texte,verdict)=>{
  const p=partsVerdict(verdict);
  return p?{txt:p.txt,v:p.v,taille:9}:{txt:texte,taille:9};
};
// verdict calculé {texte, ok} (Cheminee.js) -> cellule
const celluleCalc=r=>r.ok===true?{txt:"Conforme",v:"ok",taille:9}:r.ok===false?{txt:"Non conforme",v:"ko",taille:9}:{txt:r.texte==="—"?"":"À compléter",taille:9};

export function construireRapportCheminee(v,data,photos){
  v=v||{};data=data||{};photos=photos||{};
  const sncf=v.cheminee_origine==="SNCF";
  const txt=id=>clean(v[id]);
  const d=id=>has(data[id])?String(data[id]).trim():"";
  const ohm=id=>{const p=String(v[id]||"").split("_");return p[0]?p[0].trim()+" "+(p[1]||"GΩ"):"";};
  const num=(id,unite)=>(has(v[id])?String(v[id]).trim()+(unite?" "+unite:""):"");
  const cols=colonnesResistances(v);
  const certifie=d("certifie_par"),realise=d("realise_par");
  const par=listeEt(certifie).split(/,| et /)[0].trim();
  const parTxt=par?" (par "+par+")":"";
  const moisAnnee=d("mois_annee")||moisAnneeDe(v.date_mise_dispo);
  const noms=p=>p.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);

  const noEngin=sncf?txt("n_engin"):txt("n_loco");
  const bl=has(v.bon_livraison)?txt("bon_livraison"):"";
  const identite=[
    ["Chantier :",txt("de")],
    ["Ref cheminée :",txt("n_cheminee")],
    ["N°d'engin :",noEngin],
    ...(sncf?[["Symbole :",txt("symbole")]]:[]),
    ["Bon de livraison :",bl],
    ["Dates d'entrée :",v.date_entree?"le "+dateFr(v.date_entree):""],
    ["Date de mise à disposition :",moisAnneeDe(v.date_mise_dispo)],
    ["Site de livraison :",txt("site_livraison")],
  ].filter(l=>has(l[1])).map(l=>({k:l[0],v:String(l[1]).trim()}));

  const blocs=[];
  const h1=(t,o)=>blocs.push({t:"h1",txt:t,toc:true,...o});
  const h2=(t,o)=>blocs.push({t:"h2",txt:t,...o});
  const para=(parts,o)=>blocs.push({t:"para",parts:Array.isArray(parts)?parts:[parts],...o});
  const lignes=(l,o)=>blocs.push({t:"lignes",lignes:l.map(x=>Array.isArray(x)?x:[x]),...o});
  const img=(url,w,h)=>{if(url)blocs.push({t:"img",url,w,h});};
  const rang=(urls,h)=>{const items=urls.filter(Boolean).map(u=>({url:u}));if(items.length)blocs.push({t:"rang",items,h});};

  // ── 1. palettisation, déballage, identification, démontage ────────
  h1("Contrôle visuel de la palettisation à la réception",{saut:true});
  if(v.palettisation_conforme==="Oui"||v.palettisation_conforme==="Non")para(["Résultat palettisation : ",partsVerdict(v.palettisation_conforme==="Oui"?"Conforme":"Non conforme")]);
  img(photos.palette,9,12);
  h2("Contrôle visuel du matériel après déballage dans nos ateliers :",{toc:true,leger:true});
  h2("Défauts constatés :",{toc:true,leger:true});
  const defautsTexte=noms(d("defauts_texte"));
  if(defautsTexte.length)lignes(defautsTexte);else para("-Aucun défaut");
  rang(photos.defauts||[],7);

  h2("Relevé des informations, identification et numéros de série :",{toc:true});
  const resType=d("res_type"),resNum=d("res_numero");
  if(resType||resNum)lignes(["Résistance de freinage"+(resType?" "+resType:""),"Indication relevée sur la machine :",["Type"+(resType?" "+resType:"")+(resNum?"  N° "+resNum:"")]]);
  img(photos.plaque_res,8,7);
  if(has(v.n_cheminee))para("N°"+txt("n_cheminee"));
  const ventType=d("vent_type"),ventNum=d("vent_numero");
  if(ventType||ventNum||photos.plaque_vent){
    lignes(["MDEXX",...(ventType?["Type : "+ventType]:[]),...(ventNum?["N° de fabrication : "+ventNum]:[])]);
    img(photos.plaque_vent,8,7);
  }
  {
    const deux=txt("vitesse").indexOf("/")>=0;
    const marque=txt("marque_moteur");
    const l=[["Information moteur : Moteur"+(marque?" de marque "+marque.toUpperCase():"")+(deux?" de type Dahlender":"")]];
    if(txt("type_moteur"))l.push(["Type : "+txt("type_moteur")]);
    if(txt("numero_serie"))l.push(["N° : "+txt("numero_serie")]);
    const carac=[deux?"Moteur deux vitesses":"Moteur",txt("vitesse")?txt("vitesse")+" tr/mn":"",txt("tension")?"moteur "+txt("tension"):"",txt("puissance")?txt("puissance")+" kW":""].filter(Boolean);
    if(carac.length>1||(carac.length===1&&!deux))l.push([carac.join(" ")]);
    lignes(l);
    img(photos.plaque_moteur,8,7);
  }
  h2("Démontage des éléments :",{toc:true});
  para("Séparation du bloc de ventilation au bloc de résistance : ( avant nettoyage)");
  rang(photos.desaccouplage||[],5.6);

  // ── 2. moteur : expertise, mesures statiques ──────────────────────
  h1("Démontage et expertise du moteur électrique");
  para("Essai du moteur séparément avec prise des mesures vibratoires et spectrales puis mesure électrique et métrologique.");
  if(photos.stator_av||photos.stator_ar){
    const items=[photos.stator_av&&{url:photos.stator_av,legende:"Stator avant"},photos.stator_ar&&{url:photos.stator_ar,legende:"Stator arrière"}].filter(Boolean);
    blocs.push({t:"rang",items,h:6.5,legendes:true});
  }
  {
    // isolement du moteur (fiche : « Isolement masse enroulement sous 1 kV (UVW) », à l'arrivée puis après étuvage)
    const avant=ohm("isol_masse"),apres=ohm("isol_masse_ap");
    const dar=id=>has(v[id])?" ; DAR : "+String(v[id]).trim():"";
    const l=[];
    if(avant)l.push(["Mesure d'isolement moteur à l'arrivée : "+avant+"/1000V"+dar("isol_masse_dar")]);
    if(apres)l.push(["Mesure d'isolement moteur après étuvage : "+apres+"/1000V"+dar("isol_masse_dar_ap")]);
    if(l.length){h2("Mesure électrique statique :",{toc:true});lignes(l);}
  }
  if(has(v.champ_magnetique)){h2("Mesure de champ magnétique :",{toc:true});para(String(v.champ_magnetique).trim());}
  if(photos.adx_pv){h2("Mesure électrique statique en PV :",{toc:true});blocs.push({t:"capture",url:photos.adx_pv,h:17});}
  if(photos.adx_gv){h2("Mesure électrique statique en GV :",{toc:true});blocs.push({t:"capture",url:photos.adx_gv,h:17});}
  if(partsVerdict(d("verdict_onde"))){
    lignes([["Analyse et contrôle électrique par onde de choc moteur : ",partsVerdict(d("verdict_onde")),parTxt?{b:parTxt}:""],["Résultat onde de choc sur ADX6 : ",partsVerdict(d("verdict_onde")),parTxt?{b:parTxt}:""]]);
  }

  // ── 3. partie mécanique ───────────────────────────────────────────
  h1("Partie mécanique du moteur :");
  para("Mesure électrique, vibratoire et spectral en rotation avant démontage :",{grand:true});
  {
    const pv=ampere(v,"tint_pv"),gv=ampere(v,"tint_gv");
    if(pv||gv)lignes([["Premier essai en rotation avec l'hélice de ventilation :"],...(pv?[[{bu:"Petite vitesse :"},"   "+pv]]:[]),...(gv?[[{bu:"Grande vitesse :"},"  "+gv]]:[])],{apres:true});
    const vpv=num("tvib_pv_mms","mm/s"),vgv=num("tvib_gv_mms","mm/s");
    if(vpv||vgv)lignes([...(vpv?[[{bu:"Petite vitesse :"}],["Mesure de vibration : "+vpv+","]]:[]),...(vgv?[[{bu:"Grande vitesse :"}],["Mesure de vibration : "+vgv]]:[])],{apres:true});
  }
  if(has(v.diam_arbre_av)||has(v.diam_arbre_ar)||has(v.diam_flasque_av)||has(v.diam_flasque_ar)){
    lignes([[{bu:"Portées Moteurs :"}],
      ["Etat des portées intérieures de roulement (portée d'arbre)"],
      ["Côté commande : "+(num("diam_arbre_av","mm")||"—")],["Côté opposé commande : "+(num("diam_arbre_ar","mm")||"—")],
      ["Etat des portées extérieures de roulement (portée de flasque)"],
      ["Côté commande : "+(num("diam_flasque_av","mm")||"—")],["Côté opposé commande : "+(num("diam_flasque_ar","mm")||"—")]],{apres:true});
    const vp=partsVerdict(d("verdict_portees"));
    if(vp)para(["Les valeurs des mesures relevées sont ",{...vp,txt:vp.txt.toLowerCase()==="conforme"?"Conforme":vp.txt},{b:parTxt}]);
  }
  if(photos.roulements||has(v.type_roulement_av)||has(v.type_roulement_ar)){
    para([{bu:"Types des roulements installés sur la machine :"}]);
    img(photos.roulements,9,7);
    lignes([...(has(v.type_roulement_av)?[["Côté commande : "+txt("type_roulement_av")]]:[]),...(has(v.type_roulement_ar)?[["Côté opposé commande : "+txt("type_roulement_ar")]]:[])],{apres:true});
  }
  if(d("etat_rou_av")||d("etat_rou_ar")){
    lignes([[{bu:"Etat des roulements déposés :"}],...(d("etat_rou_av")?[["Côté commande : "+d("etat_rou_av")+"."]]:[]),...(d("etat_rou_ar")?[["Côté opposé commande : "+d("etat_rou_ar")+"."]]:[])]);
  }
  {
    const pv=num("tvib_pv_mms_ap","mm/s"),gv=num("tvib_gv_mms_ap","mm/s"),apv=ampere(v,"tint_pv_ap"),agv=ampere(v,"tint_gv_ap");
    if(pv||gv||apv||agv){
      const change=v.roulement_av_change==="Oui"||v.roulement_ar_change==="Oui";
      h2("Mesure électrique et vibratoire en rotation après entretien",{toc:true});
      para(change?"(Après fourniture et remplacement des roulements moteur avec hélice de ventilation)":"(Après entretien du moteur avec hélice de ventilation)");
      if(pv)lignes([[{bu:"Petite vitesse :"}],["Mesure de vibration: "+pv]],{apres:true});
      if(gv)lignes([[{bu:"Grande vitesse :"}],["Mesure de vibration : "+gv]],{apres:true});
      if(apv||agv)lignes([...(apv?[[{bu:"Petite vitesse"}," :      "+apv]]:[]),...(agv?[[{bu:"Grande vitesse"}," :   "+agv]]:[])]);
    }
  }
  if(d("conclusion_moteur")||partsVerdict(d("verdict_moteur"))){
    h2("Conclusion moteur :",{toc:true});
    if(d("conclusion_moteur"))lignes(noms(d("conclusion_moteur")));
    const vm=partsVerdict(d("verdict_moteur"));
    if(vm)para(["L'ensemble de la partie moteur / ventilateur est ",{...vm,txt:vm.v==="ok"?"Conforme.":vm.txt},{b:parTxt}]);
  }

  // ── 4. résistances ────────────────────────────────────────────────
  const nums=[1,2,3,4,5,6,7,8];
  const entete=()=>[{txt:"N°",b:true,taille:11},...cols.map(c=>({txt:c,b:true,taille:11,align:"center"}))];
  h1("Mesure électrique d'isolement et de résistif sur les résistances :");
  blocs.push({t:"img",url:"/rail/rapport-rack-fleches.png",w:6.9,h:6.4,statique:true});
  {
    const casseConnue=nums.some(i=>has(v["casse_"+i]));
    blocs.push({t:"table",cols:[1.5,1,1,1,1,1,1,1,1],rows:[
      entete(),
      [{txt:"Etat visuel",b:true,taille:8},...nums.map(i=>{const c=nombre(v["casse_"+i]);return !casseConnue?{txt:""}:(c||0)>0?{txt:"Conforme sous réserve",v:"res",taille:8,align:"center"}:{txt:"Conforme",v:"ok",taille:8,align:"center"};})],
      [{txt:sncf?"Etat résistances après remplacement":"Etat résistances",b:true,taille:8},...nums.map(i=>({...celluleCalc(verdictResistance(v,i)),align:"center",taille:8}))],
    ]});
  }
  {
    const nCasse=totalCasse(v);
    if(sncf){
      const lignesGrav=nums.filter(i=>has(v["gravure_"+i])).map(i=>"-"+String(v["gravure_"+i]).trim().replace(/^-+/,""));
      const l=[];
      if(has(v.lot_isolateurs))l.push("Lot isolateur :   "+txt("lot_isolateurs"));
      if(lignesGrav.length){l.push("Les 8 résistances sont gravées comme suit");lignesGrav.forEach(g=>l.push(g));}
      if(l.length)lignes(l);
    }else{
      const ch=nombre(v.isolateurs_changes);
      if(ch!==null)para(ch>0?"Il y a eu un changement de "+ch+" isolateur"+(ch>1?"s":"")+".":"Il n'y a pas eu de changement d'isolateur.");
      else if(nCasse>0)para("Il y a eu un changement d'isolateurs.");
    }
  }
  h2("Isolement des résistances par rack :",{toc:true});
  para("Tableau de rapport de test haut tension à 5 et 10 kV pour chaque rack entre l'isolateur et la résistance suivant la recommandation (fig. 6) après nettoyage et étuvage des résistances :");
  blocs.push({t:"img",url:"/rail/rapport-fig6.png",w:7.6,h:5.4,statique:true,centre:true});
  blocs.push({t:"table",cols:[1.5,1,1,1,1,1,1,1,1],rows:[
    entete(),
    [{txt:"Isolement 5kv",b:true,taille:8},...nums.map(i=>({txt:ohm("iso5_"+i),taille:10,align:"center"}))],
    [{txt:"Etat résistances",b:true,taille:8},...nums.map(i=>({...celluleCalc(verdictIsolement(v,"iso5_"+i)),align:"center",taille:8}))],
    entete(),
    [{txt:"Isolement 10kv",b:true,taille:8},...nums.map(i=>({txt:ohm("iso10_"+i),taille:10,align:"center"}))],
    [{txt:"Etat résistances",b:true,taille:8},...nums.map(i=>({...celluleCalc(verdictIsolement(v,"iso10_"+i)),align:"center",taille:8}))],
  ]});
  if(v.deflecteur){
    h2("Déflecteur d'air suivant préconisation :",{toc:true});
    if(v.deflecteur==="Remplacé"){
      para("Remplacement des déflecteurs d'air par la nouvelle génération.");
      img(photos.deflecteur,9.5,7);
    }else if(v.deflecteur==="Non remplacé")para("Les déflecteurs d'air n'ont pas été remplacés.");
    else if(v.deflecteur==="Fourni par le client")para("Déflecteurs d'air fournis par le client.");
    else para("Déflecteurs d'air manquants.");
  }
  h2("Isolement des résistances par lot de 4 racks :",{toc:true});
  para("Tableau de rapport d'isolement à haute tension de 5 à 10kV entre chaque lot de résistance et la masse :");
  para("Tableau de rapport d'isolement à haute tension de 5 à 10kV entre chaque lot de résistances partielles (Rack 1 haut ) et (Rack 2 bas ) :");
  blocs.push({t:"img",url:"/rail/rapport-fig5.png",w:9.5,h:6.4,statique:true});
  para([{bu:"Test de rigidité diélectrique ( pendant 100s):"}]);
  {
    const l=[];
    if(ohm("iso_global_5"))l.push("Isolement globale sous 5KV : "+ohm("iso_global_5"));
    if(ohm("iso_global_10"))l.push("Isolement globale sous 10KV : "+ohm("iso_global_10"));
    if(ohm("iso_partiel_5"))l.push("Isolement résistance partielle R1/R2 sous 5kV : "+ohm("iso_partiel_5"));
    if(ohm("iso_partiel_10"))l.push("Isolement résistance partielle R1/R2 sous 10kV : "+ohm("iso_partiel_10"));
    if(l.length)blocs.push({t:"table",cols:[1],largeur:0.68,rows:l.map(x=>[{txt:x,taille:11}])});
  }
  h2("Mesure des résistances et micro résistif partielles globale :",{toc:true});
  para("Valeur de référence des résistances en série");
  const bas=SERIE_NOMINAL*(1-TOLERANCE),haut=SERIE_NOMINAL*(1+TOLERANCE);
  para("Norme : 3.21Ω +/- 5%     soit "+fr2(bas,2)+"Ω>…. <"+fr2(haut,2)+"Ω");
  blocs.push({t:"table",cols:[1.4,1.2,1.2],rows:[
    [{txt:"Résistance partielle\nN° ("+cols[0]+" à "+cols[3]+") :",align:"center",taille:11},{txt:num("res_partielle_r1","Ω"),align:"center",taille:11},{...celluleCalc(verdictSerie(v,"res_partielle_r1")),align:"center",taille:11}],
    [{txt:"Résistance partielle\nN° ("+cols[4]+" à "+cols[7]+") :",align:"center",taille:11},{txt:num("res_partielle_r2","Ω"),align:"center",taille:11},{...celluleCalc(verdictSerie(v,"res_partielle_r2")),align:"center",taille:11}],
  ]});
  h2("Tableau de rapport de résistance ohmique de chaque rack (Unitaire) :",{toc:true});
  blocs.push({t:"img",url:"/rail/rapport-rack-unitaire.png",w:4.8,h:3.1,statique:true});
  para("Norme : 0.8025Ω +/- 5%     soit "+fr2(RACK_NOMINAL*(1-TOLERANCE),3)+"Ω>…. <"+fr2(RACK_NOMINAL*(1+TOLERANCE),3)+"Ω");
  blocs.push({t:"table",cols:[1.5,1,1,1,1,1,1,1,1],rows:[
    [{txt:"N°",b:true,taille:11},...cols.map(c=>({txt:c,b:true,taille:11,align:"center"}))],
    [{txt:"Résistance",b:true,taille:8},...nums.map(i=>({txt:num("res_"+i,"Ω"),taille:9,align:"center"}))],
    [{txt:"Etat résistances",b:true,taille:8},...nums.map(i=>{const r=nombre(v["res_"+i]);return {...(r===null?{txt:""}:(r>=RACK_NOMINAL*(1-TOLERANCE)-1e-9&&r<=RACK_NOMINAL*(1+TOLERANCE)+1e-9)?{txt:"Conforme",v:"ok"}:{txt:"Non conforme",v:"ko"}),align:"center",taille:8};})],
  ]});
  const concl=conclusionResistances(v);
  h2("Conclusion sur les résistances :",{toc:true});
  const nIso=sncf?ISOLATEURS_SNCF_PAR_CHEMINEE:(nombre(v.isolateurs_changes)||0);
  if(concl.ok===true){
    para(sncf?"L'ensemble des résistances est conforme après changement des "+nIso+" isolateurs":"L'ensemble des résistances est conforme.");
    if(sncf&&has(v.lot_isolateurs))para("Lot isolateur : "+txt("lot_isolateurs"));
    para([sncf?"L'ensemble est : ":"",{v:"ok",txt:"Conforme"},par?{b:" par ("+par+")"}:""].filter(x=>x!==""));
  }else if(concl.ok===false){
    para([{v:"ko",txt:"Non conforme"}," : une ou plusieurs mesures sont hors tolérance (voir les tableaux ci-dessus)."]);
  }else para(concl.texte==="—"?"":"À compléter : mesures manquantes.");

  // ── 5. conclusion générale ────────────────────────────────────────
  h1("Conclusion générale :");
  {
    const remplace=sncf||nIso>0;
    if(concl.ok===true)para("Après entretien"+(remplace?" et remplacement des isolateurs":"")+", toutes les valeurs sont dans les tolérances.");
    else if(concl.ok===false)para("Après entretien, certaines valeurs restent hors des tolérances (voir les tableaux de mesures).");
  }
  if(v.deflecteur==="Fourni par le client"||v.deflecteur==="Manquant")para([{rouge:"Attention , Nous n'avons plus de déflecteur d'air ( fourni par vos soins )"}]);
  if(d("attention_rouge"))noms(d("attention_rouge")).forEach(t=>para([{rouge:t}]));
  const depart=photos.depart||[];
  if(depart.length||d("transport_texte")||photos.transport){
    para("Départ de nos ateliers :");
    rang(depart,8);
    if(d("transport_texte")){para(d("transport_texte"));img(photos.transport,9,7);}
  }
  if(realise||certifie){
    lignes([...(realise?[["Travaux et rapport réalisés par "+listeEt(realise)]]:[]),...(certifie?[["Vérification de l'ensemble : "+listeEt(certifie)]]:[])],{espace:true});
  }
  lignes([["Pour rappel :"],
    ["Nous n'intervenons que sur le moteur électrique de la boîte à bornes du ventilateur et uniquement sur les résistances internes."],
    ["Les éléments périphériques à la cheminée ne sont ni contrôlés ni vérifiés (capteur de pression, prise Harting du capteur, colliers divers, etc.)"],
    ["Ainsi que les pièces mécaniques périphériques."]],{espace:true});
  if(d("materiel_controle")){
    para([{bu:"Liste du matériel utilisé et date de validité pour effectuer ce rapport :"}],{espace:true});
    lignes(noms(d("materiel_controle")));
  }

  const sommaire=blocs.filter(b=>(b.t==="h1"||b.t==="h2")&&b.toc).map(b=>({txt:b.txt.replace(/\s*:\s*$/,""),niveau:b.t==="h1"?1:2}));
  return {
    type:"livret",
    de:txt("de"),
    client:txt("client"),
    sncf,
    couverture:{titre:"Livret de rapport d'intervention",client:txt("client"),logoClient:/imateq/i.test(txt("client")),travaux:"Travaux réalisés par la société PMV Rail",date:moisAnnee},
    societe:SOCIETE_RAIL,
    identite,
    descriptif:d("descriptif_travaux"),
    sommaire,
    legende:LEGENDE_COULEURS,
    blocs,
    // images fixes de la couverture, à charger comme les photos
    imagesCouverture:{cheminee:"/rail/rapport-cheminee.png",imateq:"/rail/rapport-imateq.png"},
  };
}

// toutes les adresses d'images d'un rapport (pour les charger une seule fois)
export function urlsRapportCheminee(M){
  const u=[];
  M.blocs.forEach(b=>{if(b.url)u.push(b.url);(b.items||[]).forEach(it=>{if(it.url)u.push(it.url);});});
  u.push(M.imagesCouverture.cheminee);
  if(M.couverture.logoClient)u.push(M.imagesCouverture.imateq);
  return u.filter((x,i)=>u.indexOf(x)===i);
}

// Les images fixes (« /rail/… ») sont servies par l'appli : adresse complète pour pouvoir les charger depuis l'aperçu
export const adresseImage=u=>(u&&u.charAt(0)==="/"&&typeof window!=="undefined"?window.location.origin:"")+(u||"");
