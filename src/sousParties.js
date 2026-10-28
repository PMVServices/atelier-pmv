// Sous-parties d'une étape de fiche atelier (demande du 28/10/2026) : « non réalisable » par sous-partie, car on peut faire certaines choses d'une étape mais pas toutes.
// Une sous-partie = un groupe de champs sous un intertitre : intertitre de la trame (INTERTITRES_TRAME, ex. « Vibrations », « Côté avant : roulement, flasque, arbre, joints »)
// ou champ de type « titre » (cheminée, ventilateur, titres ajoutés par la Maintenance). Cochée « non réalisable », elle masque ses champs, ne rend rien obligatoire
// et demande une justification ; l'aperçu, le PDF et les exports la signalent. Clés rangées dans les valeurs de la fiche (comme l'étape non réalisable : etapeNr.js) :
//   nrs_<étape>_<intertitre> = « Oui » ; nrsj_<étape>_<intertitre> = justification (obligatoire).
// Module sans dépendance sauf etapeNr.js : lu par App.js et pdfUtils.js.
import {cleEtapeNr} from "./etapeNr";

// Intertitres de la trame (ordinateur) : ils s'ajoutent tout seuls avant le champ indiqué, sur une nouvelle ligne.
// Les variantes d'un même champ (2e passage « _2 », moteur d'une pompe « _m », pompe « _p ») reçoivent le même intertitre.
export const INTERTITRES_TRAME=(()=>{
  const t={
    // Entrée
    depose_nos_soins:"Dépose et enlèvement",sur_variateur:"Installation et délai",marque_moteur:"Moteur",marque_pompe:"Pompe",marque_reducteur:"Réducteur",devis_necessaire:"Devis et rapport",
    // Infos électriques
    isol_masse:"Isolements",adx_resultat:"Mesure ADX",adx_resultat_var:"Mesure ADX",adx_resultat_novar:"Mesure ADX",plaque_bornes_etat:"Plaque à bornes",sonde_presence:"Sonde",
    // Rotation avant démontage
    int_p1_avant:"Intensités",vib_av_mms_avant:"Vibrations",int_560_p1_avant:"Intensités à 560 V",nettoyage_hp:"Nettoyage et isolement",pression_essai_avant:"Essai en eau / air et pressions",mesures_vib_p_avant:"Vibrations de la pompe",mesures_vib_r_avant:"Vibrations du réducteur",
    // Matériel au démontage moteur
    circlips_av_present:"Circlips, rondelle et ventilateur",type_roulement_av:"Côté avant : roulement, flasque, arbre, joints",type_roulement_ar:"Côté arrière : roulement, flasque, arbre, joints",accoup_present:"Accouplement et poulie",accoup_present_r:"Accouplement et poulie du réducteur",peinture:"Bobinage, rotor et peinture",marque_moteur_neuf:"Moteur neuf",essais_moteur_seul:"Essais du moteur seul",
    // Mécanique pompe au démontage
    diametre_nez_roue:"Roue et volute",etat_jc:"Joint de corps",type_gm_fixe:"Garniture mécanique",roulement_av_p_present:"Roulement avant de la pompe",roulement_ar_p_present:"Roulement arrière de la pompe",marque_pompe_neuve:"Pompe neuve",
    // Essais après remontage (et essais du moteur seul : mêmes sections)
    int_p1_apres_ms:"Intensités",vib_av_mms_apres_ms:"Vibrations",int_560_p1_apres_ms:"Intensités à 560 V",
    int_p1_apres:"Intensités",vib_av_mms_apres:"Vibrations",int_560_p1_apres:"Intensités à 560 V",pression_essai_apres:"Essai en eau / air et pressions",vib_p_av_mms_apres:"Vibrations de la pompe",
  };
  const out={};
  const avecVariantes=["isol_masse","adx_resultat","adx_resultat_var","adx_resultat_novar","int_p1_avant","vib_av_mms_avant","int_560_p1_avant","nettoyage_hp"];
  Object.keys(t).forEach(k=>{out[k]=t[k];if(avecVariantes.includes(k))["_2","_m","_p"].forEach(suf=>{out[k+suf]=t[k];});});
  return out;
})();

export const cleSousPartie=(nomEtape,titre)=>"nrs_"+cleEtapeNr(nomEtape)+"_"+cleEtapeNr(titre);
export const cleSousPartieJust=cle=>"nrsj_"+cle.slice(4);

// Découpe les champs VISIBLES d'une étape en sous-parties, dans l'ordre. visible(c) dit si un champ est affiché (conditions de la fiche).
// Retourne {liste:[{cle, titre, estTitre, debutId, ids, nr, justification}], parDebut:{id du champ qui ouvre la sous-partie: sous-partie}, nrIds:Set des champs masqués, manque:true si une sous-partie
// non réalisable n'a pas de justification}. Les champs avant le premier intertitre n'appartiennent à aucune sous-partie.
export function sousParties(nomEtape,champs,v,visible){
  const liste=[],parDebut={},nrIds=new Set(),vus=new Set(),pris={};
  let courante=null,dernierTitre=false,n=0;
  (champs||[]).forEach(c=>{
    if(vus.has(c.id)||!visible(c))return;
    const membres=c.groupe?champs.filter(cc=>cc.groupe===c.groupe&&visible(cc)):[c];
    membres.forEach(m=>vus.add(m.id));
    let titre=null,estTitre=false;
    if(c.type==="titre"){titre=c.label;estTitre=true;}
    else{const it=INTERTITRES_TRAME[c.id];if(it&&n>0&&!dernierTitre)titre=it;} // même règle que la trame : pas d'intertitre en tête d'étape ni juste après un champ « titre »
    dernierTitre=c.type==="titre";
    if(titre!==null){
      let k=cleSousPartie(nomEtape,titre);pris[k]=(pris[k]||0)+1;if(pris[k]>1)k+="_"+pris[k];
      courante={cle:k,titre,estTitre,debutId:c.id,ids:[]};
      liste.push(courante);parDebut[c.id]=courante;
    }
    if(!estTitre){if(courante)membres.forEach(m=>courante.ids.push(m.id));n++;}
  });
  liste.forEach(s=>{
    s.nr=v&&v[s.cle]==="Oui";
    s.justification=String((v&&v[cleSousPartieJust(s.cle)])||"").trim();
    if(s.nr)s.ids.forEach(i=>nrIds.add(i));
  });
  return {liste,parDebut,nrIds,manque:liste.some(s=>s.nr&&!s.justification)};
}
