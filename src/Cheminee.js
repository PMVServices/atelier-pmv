// Fiche « Cheminée de freinage » (PMV Rail) : réception, bloc moteur (contrôle, essais, démontage, remontage) et remontage de la cheminée.
// Procédure reprise de « Procedure controle cheminées V2.xlsx ». Les photos de la procédure sont obligatoires (champ « photo_requise ») :
// on ne passe pas à l'étape suivante sans photo, sauf « photo impossible » avec une justification.
import {TYPE_CHEMINEE, ISOLATEURS_SNCF_PAR_CHEMINEE} from "./railClients";
export {TYPE_CHEMINEE};

// ── normes de conformité (rapport DV0040) ─────────────────────────────────────────────────
export const RACK_NOMINAL=0.8025;       // Ω, résistance d'un rack : 0,8025 Ω ± 5 %
export const SERIE_NOMINAL=3.21;        // Ω, 4 racks en série (N°1 à 4 ou N°5 à 8) : 3,21 Ω ± 5 %
export const TOLERANCE=0.05;
// Isolement (5 kV et 10 kV) : le rapport ne donne pas de norme chiffrée ; on retient 1 GΩ minimum (valeurs réelles : 360 GΩ à plusieurs TΩ).
export const ISOLEMENT_MINI_OHM=1e9;
const FACTEURS_OHM={"kΩ":1e3,"MΩ":1e6,"GΩ":1e9,"TΩ":1e12};

const nombre=val=>{const x=parseFloat(String(val===undefined||val===null?"":val).replace(",","."));return isNaN(x)?null:x;};
// valeur d'un champ « ohm » (« 1.854_TΩ ») en ohms
export function ohmsDe(val){
  const [n,u]=String(val||"").split("_");
  const x=nombre(n);
  return x===null?null:x*(FACTEURS_OHM[u||"GΩ"]||1e9);
}
const dansTolerance=(x,nominal)=>x>=nominal*(1-TOLERANCE)-1e-9&&x<=nominal*(1+TOLERANCE)+1e-9;
const fr=(x,d)=>String(Math.round(x*Math.pow(10,d))/Math.pow(10,d)).replace(".",",");
export const PLAGE_RACK=fr(RACK_NOMINAL*(1-TOLERANCE),3)+" à "+fr(RACK_NOMINAL*(1+TOLERANCE),3)+" Ω";
export const PLAGE_SERIE=fr(SERIE_NOMINAL*(1-TOLERANCE),2)+" à "+fr(SERIE_NOMINAL*(1+TOLERANCE),2)+" Ω";

// ── conditions ───────────────────────────────────────────────────────────────────────────
const siSncf=v=>v.cheminee_origine==="SNCF";
const siImateq=v=>v.cheminee_origine==="IMATEQ";
const siDejaGravees=v=>v.plaques_deja_gravees==="Oui";
const NUMEROS=[1,2,3,4,5,6,7,8];
export const totalCasse=v=>NUMEROS.reduce((t,i)=>t+(nombre(v["casse_"+i])||0),0);
const siCasse=v=>totalCasse(v)>0;

// ── verdicts calculés ({texte, ok}) ─────────────────────────────────────────────────────
export function verdictResistance(v,i){
  const r=nombre(v["res_"+i]),i5=ohmsDe(v["iso5_"+i]),i10=ohmsDe(v["iso10_"+i]);
  if(r===null&&i5===null&&i10===null)return {texte:"—",ok:null};
  if(r===null||i5===null||i10===null)return {texte:"À compléter",ok:null};
  const defauts=[];
  if(!dansTolerance(r,RACK_NOMINAL))defauts.push("résistance hors tolérance");
  if(i5<ISOLEMENT_MINI_OHM)defauts.push("isolement 5 kV");
  if(i10<ISOLEMENT_MINI_OHM)defauts.push("isolement 10 kV");
  return defauts.length?{texte:"Non conforme ("+defauts.join(", ")+")",ok:false}:{texte:"Conforme",ok:true};
}
export function verdictSerie(v,id){
  const r=nombre(v[id]);
  if(r===null)return {texte:"—",ok:null};
  return dansTolerance(r,SERIE_NOMINAL)?{texte:"Conforme",ok:true}:{texte:"Non conforme (hors "+PLAGE_SERIE+")",ok:false};
}
export function verdictIsolement(v,id){
  const o=ohmsDe(v[id]);
  if(o===null)return {texte:"—",ok:null};
  return o>=ISOLEMENT_MINI_OHM?{texte:"Conforme",ok:true}:{texte:"Non conforme (moins de 1 GΩ)",ok:false};
}
export function conclusionResistances(v){
  const verdicts=NUMEROS.map(i=>verdictResistance(v,i)).concat([verdictSerie(v,"res_partielle_r1"),verdictSerie(v,"res_partielle_r2")]);
  ["iso_partiel_5","iso_partiel_10","iso_global_5","iso_global_10"].forEach(id=>{if(v[id])verdicts.push(verdictIsolement(v,id));});
  if(verdicts.every(x=>x.ok===null))return {texte:"—",ok:null};
  if(verdicts.some(x=>x.ok===false))return {texte:"Non conforme : une ou plusieurs mesures sont hors tolérance",ok:false};
  if(verdicts.some(x=>x.ok===null))return {texte:"À compléter (mesures manquantes)",ok:null};
  return {texte:"L'ensemble des résistances est conforme",ok:true};
}

// ── fabrique de champs ───────────────────────────────────────────────────────────────────
const photo=(id,label,categorie,extra)=>({id,label,type:"photo_requise",categorie:categorie||label,required:true,...extra});
const photoLibre=(id,label,categorie,extra)=>({id,label,type:"photo_requise",categorie:categorie||label,required:true,libre:true,...extra});
const fait=(id,label,extra)=>({id,label,type:"fait",required:true,...extra});
const titre=(id,label,extra)=>({id,label,type:"titre",...extra});
const mes=(id,label,unite,groupe,extra)=>({id,label,type:"mesure",unite,required:true,groupe,...extra});
const verdict=(id,label,calcul,extra)=>({id,label,type:"verdict",verdict:calcul,...extra});
const OK_HS=["OK","HS"];
// même choix que les autres fiches : « Pas de délai demandé » dans la liste d'unités (la durée disparaît alors, aucune échéance n'est calculée)
const PAS_DE_DELAI="Pas de délai demandé";

// Essais moteur seul (petite et grande vitesse, avant et arrière) puis intensités ; suf = "" avant démontage, "_ap" après remontage
function essaisSansTurbine(suf){
  const out=[];
  [["pv","Petite vitesse"],["gv","Grande vitesse"]].forEach(([k,nom])=>{
    out.push(titre("t_sans_"+k+suf,nom+" — moteur seul",{prefixe:true}));
    [["av","avant"],["ar","arrière"]].forEach(([c,cote])=>{
      out.push(mes("vib_"+k+"_"+c+"_mms"+suf,"Vibration "+cote+" (mm/s)","mm/s","vib_"+k+"_"+c+suf));
      out.push(mes("vib_"+k+"_"+c+"_ge"+suf,"Vibration "+cote+" (Ge)","Ge","vib_"+k+"_"+c+suf));
    });
    [1,2,3].forEach(p=>out.push(mes("int_"+k+"_p"+p+suf,"Intensité Ph"+p,"A","int_"+k+suf)));
  });
  return out;
}
// Essais avec la turbine : capteur côté volute, donc mesure arrière seulement
function essaisAvecTurbine(suf){
  const out=[];
  [["pv","Petite vitesse"],["gv","Grande vitesse"]].forEach(([k,nom])=>{
    out.push(titre("t_avec_"+k+suf,nom+" — avec la turbine",{prefixe:true}));
    out.push(mes("tvib_"+k+"_mms"+suf,"Vibration arrière (mm/s)","mm/s","tvib_"+k+suf));
    out.push(mes("tvib_"+k+"_ge"+suf,"Vibration arrière (Ge)","Ge","tvib_"+k+suf));
    [1,2,3].forEach(p=>out.push(mes("tint_"+k+"_p"+p+suf,"Intensité Ph"+p,"A","tint_"+k+suf)));
  });
  return out;
}

export const E_RECEPTION="Réception";
export const E_MOTEUR_CONTROLE="Bloc moteur — contrôle";
export const E_MOTEUR_ESSAIS="Bloc moteur — essais";
export const E_MOTEUR_DEMONTAGE="Bloc moteur — démontage";
export const E_MOTEUR_REMONTAGE="Bloc moteur — remontage";
export const E_CHEMINEE="Remontage cheminée";
export const ETAPES_CHEMINEE=[E_RECEPTION,E_MOTEUR_CONTROLE,E_MOTEUR_ESSAIS,E_MOTEUR_DEMONTAGE,E_MOTEUR_REMONTAGE,E_CHEMINEE];

export const CHAMPS_CHEMINEE={
  [E_RECEPTION]:[
    {id:"tech_reception",label:"Technicien",type:"technicien",required:true},
    {id:"date_entree",label:"Date d'entrée",type:"date",required:true,groupe:"rail_entree"},
    {id:"de",label:"N° DV",type:"text",required:true,groupe:"rail_entree",prefixe:"DV"},
    {id:"client",label:"Client",type:"client",required:true},
    {id:"delai_valeur",label:"Délai demandé par le client",type:"number",required:true,groupe:"delai_pair",condition:v=>v.delai_unite!==PAS_DE_DELAI},
    {id:"delai_unite",label:"Unité",type:"select",options:["Jours","Semaine(s)","Mois",PAS_DE_DELAI],required:true,groupe:"delai_pair"},
    {id:"n_cheminee",label:"N° de cheminée",type:"text",required:true,aide:{texte:"Le n° de cheminée se lit sur la plaque jaune de la cheminée, à la ligne « n° de série »."}},
    {id:"cheminee_origine",label:"SNCF ou IMATEQ",type:"choix",options:["SNCF","IMATEQ"],required:true,note:"décide du changement des isolateurs"},
    {id:"msg_sncf",type:"conseil",condition:siSncf,texte:"Cheminée SNCF : tous les isolateurs sont changés. "+ISOLATEURS_SNCF_PAR_CHEMINEE+" isolateurs sont décomptés automatiquement du stock SNCF dès l'enregistrement de cette étape. Le numéro de gravure des 8 plaques est à noter à la fin (Remontage cheminée)."},
    {id:"n_engin",label:"N° d'engin",type:"text",required:true,condition:siSncf,note:"étiquette rouge",groupe:"rail_engin"},
    {id:"symbole",label:"Symbole",type:"text",required:true,condition:siSncf,groupe:"rail_engin"},
    {id:"msg_imateq",type:"conseil",condition:siImateq,texte:"Cheminée IMATEQ : seuls les isolateurs cassés sont changés. Le nombre d'isolateurs changés est demandé à la fin (Remontage cheminée) et décompté du stock IMATEQ. Indiquez ici le n° de loco."},
    {id:"n_loco",label:"N° de loco",type:"text",required:true,condition:siImateq},
    {id:"enleve_nos_soins",label:"Enlèvement par nos soins",type:"oui_non",required:true,groupe:"rail_transport"},
    {id:"livraison_transporteur",label:"Livraison transporteur",type:"oui_non",required:true,groupe:"rail_transport"},
    titre("t_palette","Contrôle de la palette à la réception"),
    {id:"ill_palette",type:"illustration",src:"/rail/palettisation.png",legende:"Palettisation à contrôler (points 1 à 4)",largeur:300},
    photo("ph_palette","Photo de la palette à la réception","Palette à la réception"),
    {id:"palettisation_conforme",label:"Palettisation conforme",type:"oui_non",required:true},
    {id:"palette_obs",label:"Observation",type:"text",required:false,dictee:true},
    {id:"plaques_deja_gravees",label:"Des plaques de la cheminée sont-elles déjà gravées ?",type:"oui_non",required:true,note:"gravure = entretien déjà fait"},
    {id:"plaques_gravees_texte",label:"Lesquelles (positions 1 à 8) et quels numéros de gravure",type:"text",required:true,dictee:true,condition:siDejaGravees},
    titre("t_deballage","Photos au déballage"),
    photo("ph_globalite","Globalité","Déballage globalité"),
    photo("ph_plaque_jaune","Plaque jaune","Déballage plaque jaune"),
    photo("ph_plaque_moteur","Plaque moteur","Déballage plaque moteur"),
    photo("ph_plaque_pressostat","Plaque pressostat","Déballage plaque pressostat"),
    photo("ph_plaque_inox","Plaque inox","Déballage plaque inox"),
    {id:"deballage_obs",label:"Observation / défauts constatés",type:"text",required:false,dictee:true},
  ],
  [E_MOTEUR_CONTROLE]:[
    {id:"tech_moteur_controle",label:"Technicien",type:"technicien",required:true},
    titre("t_ident_moteur","Moteur",{prefixe:true}),
    {id:"marque_moteur",label:"Marque",type:"select",options:["Siemens","Autre"],defaut:"Siemens",required:true,autreTexte:true,groupe:"rail_mot1"},
    {id:"type_moteur",label:"Type",type:"text",required:true,groupe:"rail_mot1"},
    {id:"puissance",label:"Puissance",type:"select",options:["4,3/17","Autre"],defaut:"4,3/17",required:true,unite:"kW",autreTexte:true,note:"2 vitesses",groupe:"rail_mot2"},
    {id:"vitesse",label:"Vitesse",type:"select",options:["1455/2900","Autre"],defaut:"1455/2900",required:true,unite:"tr/mn",autreTexte:true,note:"2 vitesses",groupe:"rail_mot2"},
    {id:"numero_serie",label:"N° de série",type:"text",required:true,groupe:"rail_mot3"},
    {id:"fixation",label:"Fixation",type:"text",required:false,groupe:"rail_mot3"},
    {id:"tension",label:"Tension",type:"select",options:["400V Y/YY","Autre"],defaut:"400V Y/YY",required:true,autreTexte:true,groupe:"rail_mot4"},
    titre("t_bornes","Boîte à bornes"),
    {id:"bornes_etat",label:"État (ouverture de la boîte à bornes)",type:"select",options:OK_HS,required:true,groupe:"rail_bornes1"},
    {id:"bornes_cablage",label:"État du câblage",type:"select",options:OK_HS,required:true,groupe:"rail_bornes1"},
    {id:"bornes_repere",label:"Repère des câbles",type:"select",options:OK_HS,required:true,groupe:"rail_bornes2"},
    {id:"bornes_presse_etoupe",label:"Presse-étoupe",type:"select",options:["OK","HS","ABS"],required:true,groupe:"rail_bornes2"},
    fait("bornes_serrage","Vérification du serrage"),
    titre("t_isol_moteur","Isolement masse enroulement sous 1 kV (UVW)"),
    {id:"isol_masse",label:"Isolement masse (1 kV)",type:"ohm",required:true,groupe:"rail_isol"},
    {id:"isol_masse_dar",label:"DAR",type:"number",required:false,groupe:"rail_isol"},
    {id:"isol_obs",label:"Observation",type:"text",required:false,dictee:true},
    titre("t_adx","Onde de choc ADX6"),
    {id:"msg_adx",type:"conseil",texte:"Faire l'onde de choc sur l'ADX6, sortir les deux rapports (PV et GV) et les mettre dans le NAS. Joignez ici une capture de chacun."},
    photo("ph_adx_pv","Rapport ADX6 — petite vitesse (PV)","Rapport ADX6 petite vitesse"),
    photo("ph_adx_gv","Rapport ADX6 — grande vitesse (GV)","Rapport ADX6 grande vitesse"),
    {id:"champ_magnetique",label:"Mesure de champ magnétique (si faite)",type:"text",required:false,dictee:true},
    titre("t_desacouplage","Désaccouplage"),
    photo("ph_desaccouplage","Photo du désaccouplage","Désaccouplage"),
  ],
  [E_MOTEUR_ESSAIS]:[
    {id:"tech_moteur_essais",label:"Technicien",type:"technicien",required:true},
    {id:"ill_couplage",type:"illustration",src:"/rail/couplage-2-vitesses.png",legende:"Couplage des 2 vitesses",largeur:340},
    titre("t_essai_avec","Essai de rotation avec la turbine"),
    {id:"msg_capteur",type:"conseil",texte:"Attention : mettre le capteur sur le côté de la volute (mesure à l'arrière seulement)."},
    {id:"turbine_etat",label:"État de la turbine",type:"select",options:OK_HS,required:true},
    ...essaisAvecTurbine(""),
    titre("t_demontage_turbine","Démontage de la turbine"),
    photo("ph_demontage_turbine","Photo du démontage de la turbine","Démontage de la turbine"),
    titre("t_essai_sans","Essai de rotation sans turbine (moteur seul)"),
    ...essaisSansTurbine(""),
  ],
  [E_MOTEUR_DEMONTAGE]:[
    {id:"tech_demontage",label:"Technicien",type:"technicien",required:true},
    titre("t_roul_av","Côté avant"),
    {id:"type_roulement_av",label:"Roulement avant — type",type:"roulement",required:true},
    {id:"etat_roulement_av",label:"État du roulement avant",type:"select",options:["RAS","Usé","HS"],required:true,groupe:"rail_rav"},
    {id:"roulement_av_change",label:"Roulement avant changé",type:"oui_non",required:false,groupe:"rail_rav"},
    {id:"circlips_av_pos",label:"Circlips (avant)",type:"select",options:["Av","Ar","Ventilo","Abs"],required:true,groupe:"rail_cav"},
    {id:"rondelle_av_pos",label:"Rondelle souplesse (avant)",type:"select",options:["Av","Ar","Abs"],required:true,groupe:"rail_cav"},
    {id:"etat_flasque_av",label:"État visuel flasque avant",type:"select",options:["OK","Marqué"],required:true,groupe:"rail_vav"},
    {id:"etat_arbre_av",label:"État visuel arbre avant",type:"select",options:["OK","Marqué"],required:true,groupe:"rail_vav"},
    {id:"joint_av",label:"Joint avant (1 lèvre ou 2)",type:"joints",required:false},
    {id:"diam_arbre_av",label:"Diamètre arbre avant",type:"number",unite:"mm",required:true,groupe:"rail_dav"},
    {id:"diam_flasque_av",label:"Diamètre flasque avant",type:"number",unite:"mm",required:true,groupe:"rail_dav"},
    titre("t_roul_ar","Côté arrière"),
    {id:"type_roulement_ar",label:"Roulement arrière — type",type:"roulement",required:true},
    {id:"etat_roulement_ar",label:"État du roulement arrière",type:"select",options:["RAS","Usé","HS"],required:true,groupe:"rail_rar"},
    {id:"roulement_ar_change",label:"Roulement arrière changé",type:"oui_non",required:false,groupe:"rail_rar"},
    {id:"circlips_ar_pos",label:"Circlips (arrière)",type:"select",options:["Av","Ar","Ventilo","Abs"],required:true,groupe:"rail_car"},
    {id:"rondelle_ar_pos",label:"Rondelle souplesse (arrière)",type:"select",options:["Av","Ar","Abs"],required:true,groupe:"rail_car"},
    {id:"etat_flasque_ar",label:"État visuel flasque arrière",type:"select",options:["OK","Marqué"],required:true,groupe:"rail_var"},
    {id:"etat_arbre_ar",label:"État visuel arbre arrière",type:"select",options:["OK","Marqué"],required:true,groupe:"rail_var"},
    {id:"joint_ar",label:"Joint arrière (1 lèvre ou 2)",type:"joints",required:false},
    {id:"diam_arbre_ar",label:"Diamètre arbre arrière",type:"number",unite:"mm",required:true,groupe:"rail_dar"},
    {id:"diam_flasque_ar",label:"Diamètre flasque arrière",type:"number",unite:"mm",required:true,groupe:"rail_dar"},
    titre("t_photos_demontage","Photos"),
    photo("ph_bobinage_av","Photo du stator avant","Stator avant",{anciennesCategories:["Bobinage avant"]}),
    photo("ph_bobinage_ar","Photo du stator arrière","Stator arrière",{anciennesCategories:["Bobinage arrière"]}),
    photo("ph_roulements","Photo des roulements","Roulements"),
    {id:"nettoyage_hp",label:"Nettoyage HP",type:"select",options:["Oui","Non"],required:true,groupe:"rail_hp"},
    {id:"etuvage_stator",label:"Étuvage",type:"select",options:["Oui","Non"],required:true,groupe:"rail_hp"},
    {id:"obs_demontage",label:"Observations",type:"text",required:false,dictee:true},
    {id:"a_recommander",label:"À recommander",type:"text",required:false,dictee:true},
  ],
  [E_MOTEUR_REMONTAGE]:[
    {id:"tech_moteur_remontage",label:"Technicien",type:"technicien",required:true},
    titre("t_isol_apres","Isolement masse enroulement sous 1 kV (UVW) — après étuvage"),
    {id:"isol_masse_ap",label:"Isolement masse (1 kV)",type:"ohm",required:true,groupe:"rail_isol_ap"},
    {id:"isol_masse_dar_ap",label:"DAR",type:"number",required:false,groupe:"rail_isol_ap"},
    fait("serrage_bornier","Contrôle du serrage de la boîte à bornes (remettre les fils devant leurs emplacements)"),
    fait("serrage_presse_etoupe","Contrôle du serrage du presse-étoupe"),
    titre("t_essai_sans_ap","Essai de rotation sans turbine (moteur seul)"),
    ...essaisSansTurbine("_ap"),
    fait("serrage_turbine","Vérifier le serrage de la turbine"),
    fait("vis_centrale_collee","Coller la vis centrale"),
    titre("t_essai_avec_ap","Essai de rotation avec la turbine"),
    {id:"msg_capteur_ap",type:"conseil",texte:"Attention : mettre le capteur sur le côté de la volute (mesure à l'arrière seulement)."},
    ...essaisAvecTurbine("_ap"),
    titre("t_remontage_cheminee","Remontage de la cheminée"),
    {id:"ill_couples",type:"illustration",src:"/rail/couples-serrage.png",legende:"Couples de serrage (vis lubrifiées A2-70)",largeur:340},
    fait("remontage_platines","Remonter la cheminée avec les deux platines inox et la plaque des pressostats"),
    fait("couple_tresses","Vérifier le couple de serrage des tresses de masse et des vis de jonction"),
    fait("feutre_vert","Après remise en place : mettre du feutre VERT sur les vis"),
  ],
  [E_CHEMINEE]:[
    {id:"tech_cheminee",label:"Technicien",type:"technicien",required:true},
    titre("t_entretien_res","Entretien des résistances après nettoyage et étuvage"),
    fait("integrite_resistances","Vérifier l'intégrité de chaque résistance (si casse des isolateurs : les changer)"),
    titre("t_verif","Vérification après réparation"),
    {id:"msg_normes",type:"conseil",texte:"Normes : chaque résistance 0,8025 Ω ± 5 % ("+PLAGE_RACK+") ; 4 résistances en série 3,21 Ω ± 5 % ("+PLAGE_SERIE+") ; isolement 5 kV et 10 kV : 1 GΩ minimum. La conformité s'affiche toute seule."},
    ...NUMEROS.flatMap(i=>[
      titre("t_res_"+i,"Résistance N°"+i,{prefixe:true}),
      {id:"iso5_"+i,label:"Isolement 5 kV",type:"ohm",required:true,groupe:"rail_iso_"+i},
      {id:"iso10_"+i,label:"Isolement 10 kV",type:"ohm",required:true,groupe:"rail_iso_"+i},
      {id:"res_"+i,label:"Résistance",type:"number",unite:"Ω",required:true,groupe:"rail_res_"+i},
      {id:"casse_"+i,label:"Casse (nbr)",type:"number",required:true,groupe:"rail_res_"+i},
      fait("serrage_"+i,"Contrôle du serrage",{groupe:"rail_fin_"+i}),
      verdict("verdict_res_"+i,"Conformité",v=>verdictResistance(v,i),{groupe:"rail_fin_"+i}),
    ]),
    titre("t_casse","Isolateurs cassés"),
    photo("ph_isolateurs_casses","Photos des résistances avec les isolateurs cassés","Isolateurs cassés",{condition:siCasse}),
    fait("plaque_mica","Remonter la plaque de mica du fond"),
    fait("barrettes_couplage","Remettre en place les résistances avec les barrettes de couplage"),
    titre("t_mesures","Résistances partielles et globale"),
    {id:"msg_procedure",type:"conseil",texte:"Reprendre la procédure du démontage pour les mesures partielles (Rack 1 = N°1 à 4, Rack 2 = N°5 à 8)."},
    {id:"res_partielle_r1",label:"Résistance partielle Rack 1 (N°1 à 4)",type:"number",unite:"Ω",required:true,groupe:"rail_rp1"},
    verdict("verdict_rp1","Conformité",v=>verdictSerie(v,"res_partielle_r1"),{groupe:"rail_rp1"}),
    {id:"res_partielle_r2",label:"Résistance partielle Rack 2 (N°5 à 8)",type:"number",unite:"Ω",required:true,groupe:"rail_rp2"},
    verdict("verdict_rp2","Conformité",v=>verdictSerie(v,"res_partielle_r2"),{groupe:"rail_rp2"}),
    {id:"res_globale",label:"Résistance globale Rack 1+2",type:"number",unite:"Ω",required:true},
    titre("t_isol_cheminee","Isolement"),
    {id:"iso_partiel_5",label:"Isolement partiel Rack 1/2 — 5 kV",type:"ohm",required:true,groupe:"rail_ip"},
    {id:"iso_partiel_10",label:"Isolement partiel Rack 1/2 — 10 kV",type:"ohm",required:true,groupe:"rail_ip"},
    {id:"iso_global_5",label:"Isolement global R1+2/masse — 5 kV",type:"ohm",required:true,groupe:"rail_ig"},
    {id:"iso_global_10",label:"Isolement global R1+2/masse — 10 kV",type:"ohm",required:true,groupe:"rail_ig"},
    verdict("verdict_conclusion","Conclusion sur les résistances",conclusionResistances),
    titre("t_gravure","Gravure des 8 plaques"),
    {id:"msg_deja_gravees",type:"conseil",condition:siDejaGravees,texte:v=>"Plaques déjà gravées à l'arrivée : "+(v.plaques_gravees_texte||"—")},
    {id:"msg_gravure_sncf",type:"conseil",condition:siSncf,texte:"Cheminée SNCF : le numéro de gravure des 8 plaques est obligatoire."},
    ...[[1,4],[5,8]].flatMap(([a,b])=>NUMEROS.filter(i=>i>=a&&i<=b).map(i=>({id:"gravure_"+i,label:"Plaque N°"+i+" — numéro de gravure",type:"text",required:siSncf,groupe:"rail_grav_"+a}))),
    titre("t_isolateurs","Changement des isolateurs"),
    {id:"msg_iso_sncf",type:"conseil",condition:siSncf,texte:"Cheminée SNCF : tous les isolateurs sont changés ("+ISOLATEURS_SNCF_PAR_CHEMINEE+", déjà décomptés du stock SNCF)."},
    {id:"isolateurs_changes",label:"Nombre d'isolateurs changés (stock IMATEQ)",type:"number",required:true,condition:siImateq,note:"ce nombre est décompté du stock IMATEQ"},
    {id:"lot_isolateurs",label:"N° de lot des isolateurs",type:"text",required:true,condition:siSncf},
    {id:"lot_isolateurs_imateq",label:"N° de lot des isolateurs (si connu)",type:"text",required:false,condition:siImateq},
    titre("t_finitions","Après serrage et remise en place des panneaux de façade"),
    fait("serrage_couple","Contrôle du serrage au couple"),
    fait("feutre_rouge","Mettre du feutre ROUGE sur les vis"),
    {id:"deflecteur",label:"Déflecteur d'air",type:"select",options:["Remplacé","Non remplacé","Fourni par le client","Manquant"],required:true},
    fait("vis_controlees","Vérifier que toutes les vis ont été contrôlées"),
    {id:"tech_vis",label:"Contrôle des vis par",type:"technicien",required:true},
    photo("ph_etat_visuel","État visuel de l'ensemble","État visuel de l'ensemble"),
    photo("ph_palettisation_depart","Palettisation (départ de nos ateliers)","Palettisation au départ"),
    photo("ph_fermeture_porte","Fermeture de la porte","Fermeture de la porte"),
    {id:"rapport_fait",label:"Rapport rédigé",type:"fait",required:false},
    titre("t_livraison","Livraison"),
    {id:"bon_livraison",label:"Bon de livraison (BL)",type:"text",required:true,groupe:"rail_liv"},
    {id:"date_mise_dispo",label:"Date de mise à disposition",type:"date",required:true,groupe:"rail_liv"},
    {id:"site_livraison",label:"Site de livraison",type:"text",required:true},
    titre("t_qualite","Signatures contrôle qualité"),
    {id:"qualite_tech_1",label:"Contrôle qualité — technicien 1",type:"technicien",required:true},
    {id:"qualite_tech_2",label:"Contrôle qualité — technicien 2",type:"technicien",required:true},
    titre("t_depart_atelier","Départ de l'atelier"),
    {id:"msg_depart_atelier",type:"conseil",texte:"Photos de la cheminée au départ de notre atelier : au moins une, autant que nécessaire (bouton +)."},
    photoLibre("ph_depart_atelier","Photos au départ de l'atelier","Départ de l'atelier"),
  ],
};

export const champsChemineePour=()=>CHAMPS_CHEMINEE;
export const etapesCheminee=()=>ETAPES_CHEMINEE;
