// Rapport client : le CONTENU est construit ici, une seule fois, puis mis en page par rapportDocx.js (Word)
// et pdfUtils.js (aperçu / PDF). Ainsi les deux versions disent toujours la même chose.
//
// Un rapport = { couverture, societe, entete, identite[], sommaire[], chapitres[], ... }
// Un chapitre = { id, titre, blocs[] } ; un bloc est l'un de :
//   { t:"sous", txt }                           intertitre
//   { t:"para", parts }                         un paragraphe (parts : voir ci-dessous)
//   { t:"lignes", lignes:[parts, parts…] }      plusieurs lignes serrées
//   { t:"img", url, taille, legende }           une photo seule (taille : "grande" | "moyenne")
//   { t:"paire", items:[{url,legende},…] }      deux photos côte à côte
//   { t:"capture", url, legende }               capture d'appareil (grande image, page dédiée si haute)
//   { t:"iso" }                                 tableau de la norme ISO 10816-3
// parts = tableau de morceaux : "texte" | { b:"texte en gras" } | { v:"ok"|"ko"|"libre", txt }

import { configDuType } from "./configRapports";
import { appliquerChapitres, typeGenerique } from "./rapportPerso";
import { conclusionVibrations } from "./vibrations";

export const SOCIETE = {
  nom: "PMV Services",
  adresse: ["7 rue des entrepreneurs", "37390 La Membrolle sur Choisille"],
  tel: "09 67 37 27 24",
  mail: "agence@pmvservices.fr",
  site: "www.pmvservices.fr",
  accroche: "votre spécialiste de l'entretien du moteur électrique et annexe",
};

// Valeurs proposées au départ dans le formulaire du rapport (modifiables avant export)
export const DEPART_ATELIER_DEFAUT = "L'arbre est protégé et le serrage de la boîte à bornes a été vérifié.";
export const MATERIEL_CONTROLE_DEFAUT =
  "Les mesures électriques d'isolement à 5 et 10 kV ont été réalisées avec le MIT 1025 (date de validité : 06/2027)\n" +
  "Les mesures de résistance électrique ont été réalisées avec le MTR 105 (date de validité : 12/2026)\n" +
  "Les clefs dynamométriques E100105/24W530172 (date de validité : 04/2027)\n" +
  "Megger Baker ADX (date de validité : 09/2026)";

// Bande décorative de la page de garde (dessinée en Word par un canvas, en PDF par un SVG)
export const BANDE = {
  w: 1240, h: 560,
  formes: [
    { fill: "rgba(176,219,241,0.60)", pts: [[0, 150], [420, 80], [840, 120], [1240, 50], [1240, 150], [840, 195], [420, 165], [0, 235]] },
    { fill: "rgba(120,120,120,0.30)", pts: [[330, 90], [780, 150], [780, 480], [330, 545]] },
    { fill: "rgba(36,148,214,0.62)", pts: [[0, 235], [330, 165], [330, 545], [0, 560]] },
    { fill: "rgba(70,165,222,0.38)", pts: [[330, 165], [780, 195], [780, 480], [330, 545]] },
    { fill: "rgba(190,224,243,0.72)", pts: [[780, 195], [1240, 130], [1240, 545], [780, 480]] },
    { fill: "rgba(150,150,150,0.22)", pts: [[330, 545], [780, 480], [1240, 545], [1240, 560], [330, 560]] },
  ],
};

export const ANCRES_MOTEUR = [
  { id: "iso", titre: "Norme ISO et identification du matériel", niveau: 1 },
  { id: "iso.plaque", titre: "Photo plaque moteur", niveau: 2 },
  { id: "avant", titre: "Mesures avant entretien", niveau: 1 },
  { id: "avant.arrivee", titre: "Photo à l'arrivée du moteur", niveau: 2 },
  { id: "avant.essai", titre: "Essai mécanique avant démontage", niveau: 2 },
  { id: "demontage", titre: "Photo et observation au démontage", niveau: 1 },
  { id: "mesures", titre: "Mesure des parties mécaniques", niveau: 1 },
  { id: "electrique", titre: "Rapport électrique du bobinage", niveau: 1 },
  { id: "apres", titre: "Mesures après entretien", niveau: 1 },
  { id: "apres.essai", titre: "Essai mécanique après entretien", niveau: 2 },
  { id: "apres.conso", titre: "Mesure électrique lors des essais en rotation à vide et en charge", niveau: 2 },
  { id: "conclusion", titre: "Conclusion", niveau: 1 },
  { id: "conclusion.depart", titre: "Départ de nos ateliers", niveau: 2 },
  { id: "conclusion.materiel", titre: "Liste du matériel utilisé et date de validité", niveau: 2 },
];
// pompe et ventilateur : tout le contenu vient des blocs ajoutés par la Maintenance ; seule la conclusion (signatures, matériel de contrôle) est prévue
export const ANCRES_GENERIQUE = [
  { id: "conclusion", titre: "Conclusion et signatures", niveau: 1 },
  { id: "conclusion.materiel", titre: "Liste du matériel utilisé et date de validité", niveau: 2 },
];

function clean(val) { return (val || "").replace("Autre:", "").trim(); }
function has(val) { return val !== undefined && val !== null && String(val).trim() !== ""; }

// "CD, DN" -> "CD et DN" ; "AD, CB, DN" -> "AD, CB et DN"
export function listeEt(texte) {
  const l = String(texte || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (l.length <= 1) return l[0] || "";
  return l.slice(0, -1).join(", ") + " et " + l[l.length - 1];
}

// Sections cochées dans le formulaire du rapport (tout est inclus par défaut)
export function sectionsActives(data) {
  try {
    const s = JSON.parse((data && data.sections) || "{}");
    return { electrique: s.electrique !== false, avant: s.avant !== false, mecanique: s.mecanique !== false, apres: s.apres !== false, conclusion: s.conclusion !== false };
  } catch (e) { return { electrique: true, avant: true, mecanique: true, apres: true, conclusion: true }; }
}

function capturesAppareil(data) {
  try { const a = JSON.parse((data && data.adx_captures) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}

// photos._meta (ajouté par les pages de rapport, jamais enregistré) : { type, fiche:[{categorie_nom,url}], champs:{id:{type,label}}, config (brouillon de l'éditeur, sinon la publiée) }
export function construireRapport(v, data, photos) {
  v = v || {}; data = data || {}; photos = photos || {};
  const meta = photos._meta || null;
  const ctxPerso = { v, champs: (meta && meta.champs) || {}, fiche: (meta && meta.fiche) || [] };
  if (meta && typeGenerique(meta.type)) return construireRapportGenerique(v, data, meta, ctxPerso);
  const txt = (id) => clean(v[id]);
  const num = (id, unite) => (has(v[id]) ? String(v[id]).trim() + (unite ? " " + unite : "") : "");
  // valeur d'isolement "346_GΩ" -> "346 GΩ"
  const isol = (id) => { const p = String(v[id] || "").split("_"); return p[0] ? p[0] + " " + (p[1] || "GΩ") : ""; };
  const dar = (id) => (has(v[id]) ? " avec un DAR de " + String(v[id]).trim() : "");
  const sec = sectionsActives(data);
  const fr = (d) => { try { const x = new Date(d); return isNaN(x.getTime()) ? "" : x.toLocaleDateString("fr-FR"); } catch (e) { return ""; } };
  const maintenant = new Date();
  const moisAnnee = has(data.mois_annee) ? String(data.mois_annee).trim() : String(maintenant.getMonth() + 1).padStart(2, "0") + "/" + maintenant.getFullYear();
  const dateRapport = data.date ? fr(data.date) : fr(maintenant);

  // verdict "Conforme" / "Non conforme" / texte libre -> morceau de phrase
  const verdict = (cle) => {
    const val = data[cle] || "";
    if (val === "Conforme") return { v: "ok", txt: "conforme" };
    if (val === "Non conforme") return { v: "ko", txt: "non conforme" };
    if (val.indexOf("Autre:") === 0 && has(clean(val))) return { v: "libre", txt: clean(val) };
    return null;
  };

  // ── identification du matériel ────────────────────────────────────
  const typeLibre = txt("type_materiel_libre");
  const unitePuiss = v.puissance__unite || "kW";
  const puissance = num("puissance", unitePuiss);
  const marque = txt("marque_moteur");
  const serie = txt("numero_serie");
  const objet = typeLibre || "Moteur";
  const couverture = {
    titre: "Rapport d'entretien",
    objet: [typeLibre ? typeLibre + " — moteur" : "Moteur", marque, puissance].filter(Boolean).join(" "),
    serie: serie ? "N° de série " + serie : "",
    cible: [txt("client"), txt("de")].filter(Boolean).join(" — "),
    date: moisAnnee,
  };
  const descriptionPlaque = [
    typeLibre ? typeLibre + " — moteur" : "Moteur", marque, puissance,
    txt("vitesse") ? txt("vitesse") + " tr/mn" : "",
    txt("type_moteur") ? "type : " + txt("type_moteur") : "",
    serie ? "N° " + serie : "",
  ].filter(Boolean).join(" ");

  // ── page d'identification ─────────────────────────────────────────
  const identite = [
    ["Client", txt("client")],
    ["Référence chantier", txt("de")],
    ["Adresse du chantier", data.adresse_chantier],
    ["Contact sur place", data.contact],
    ["Référence ou localisation", txt("materiel_lieu")],
    ["N° / date commande achat", data.commande_achat],
    ["Bordereau d'expédition", data.bordereau],
    ["Date de réception", v.date_entree ? fr(v.date_entree) : ""],
    ["Départ de nos ateliers", data.date_depart ? fr(data.date_depart) : ""],
    ["Descriptif des travaux réalisés par " + SOCIETE.nom, data.descriptif_travaux],
  ].filter((f) => has(f[1])).map((f) => ({ k: f[0], v: String(f[1]).trim() }));

  const chapitres = [];
  const ajouter = (id, titre, blocs) => { if (blocs.length) chapitres.push({ id, titre, blocs }); };

  // ── 1. Norme ISO + plaque signalétique ────────────────────────────
  {
    const b = [{ t: "iso" }];
    if (sec.electrique && (photos.plaque_moteur || descriptionPlaque)) {
      b.push({ t: "sous", id: "iso.plaque", txt: "Photo plaque moteur" });
      if (descriptionPlaque) b.push({ t: "para", parts: [descriptionPlaque] });
      if (photos.plaque_moteur) b.push({ t: "img", url: photos.plaque_moteur, taille: "moyenne" });
    }
    ajouter("iso", "Norme ISO et identification du matériel", b);
  }

  // ── 2. Mesures avant entretien ────────────────────────────────────
  {
    const b = [];
    if (sec.electrique && photos.vue_ensemble) {
      b.push({ t: "sous", id: "avant.arrivee", txt: "Photo à l'arrivée du " + (typeLibre ? "matériel" : "moteur") });
      b.push({ t: "img", url: photos.vue_ensemble, taille: "grande" });
    }
    if (sec.avant) {
      const lignes = [];
      if (num("vib_av_mms_avant")) lignes.push(["Mesure de vibration et de Ge CC : " + num("vib_av_mms_avant", "mm/s") + (num("vib_av_ge_avant") ? " " + num("vib_av_ge_avant", "Ge") : "")]);
      if (num("vib_ar_mms_avant")) lignes.push(["Mesure de vibration et de Ge COC : " + num("vib_ar_mms_avant", "mm/s") + (num("vib_ar_ge_avant") ? " " + num("vib_ar_ge_avant", "Ge") : "")]);
      const intAvant = [num("int_p1_avant", "A"), num("int_p2_avant", "A"), num("int_p3_avant", "A")].filter(Boolean);
      if (intAvant.length) lignes.push(["Le moteur consomme à vide sous 400 V " + intAvant.join(", ") + " par phase."]);
      const pair = [photos.skf_av_dem && { url: photos.skf_av_dem, legende: "Côté commande" }, photos.skf_ar_dem && { url: photos.skf_ar_dem, legende: "Côté opposé commande" }].filter(Boolean);
      const cVibAvant = conclusionVibrations(v, "avant", "avant entretien"); // petite conclusion : vitesse ≤ 3 mm/s, Ge ≤ 1 (2 pour un roulement NU)
      if (pair.length || lignes.length || has(data.commentaire_vibration_avant) || cVibAvant) {
        b.push({ t: "sous", id: "avant.essai", txt: "Essai mécanique avant démontage" });
        if (pair.length) b.push({ t: "paire", items: pair });
        if (lignes.length) b.push({ t: "lignes", lignes });
        if (has(data.commentaire_vibration_avant)) b.push({ t: "para", parts: [String(data.commentaire_vibration_avant).trim()] });
        if (cVibAvant) b.push({ t: "para", parts: cVibAvant.parts });
      }
    }
    ajouter("avant", "Mesures avant entretien", b);
  }

  // ── 3. Photo et observation au démontage ──────────────────────────
  if (sec.mecanique) {
    const b = [];
    const pair = [photos.stator_av && { url: photos.stator_av, legende: "Côté commande" }, photos.stator_ar && { url: photos.stator_ar, legende: "Côté opposé commande" }].filter(Boolean);
    if (pair.length) {
      b.push({ t: "paire", items: pair });
      if (has(data.commentaire_demontage)) b.push({ t: "para", parts: [String(data.commentaire_demontage).trim()] });
    }
    ajouter("demontage", "Photo et observation au démontage", b);
  }

  // ── 4. Mesure des parties mécaniques ──────────────────────────────
  if (sec.mecanique) {
    const b = [];
    const lignes = [];
    const portee = (libelle, valId, verdictKey) => {
      const val = num(valId, "mm"); if (!val) return;
      const vd = verdict(verdictKey);
      lignes.push([libelle + " est de " + val + (vd ? ", cette valeur est " : "."), ...(vd ? [vd, "."] : [])]);
    };
    portee("La portée interne côté commande", "mesure_arbre_av", "verdict_arbre_av");
    portee("La portée extérieure côté commande", "mesure_flasque_av", "verdict_flasque_av");
    portee("La portée interne côté opposé commande", "mesure_arbre_ar", "verdict_arbre_ar");
    portee("La portée extérieure côté opposé commande", "mesure_flasque_ar", "verdict_flasque_ar");
    if (lignes.length) b.push({ t: "lignes", lignes });
    if (has(data.commentaire_roulements)) b.push({ t: "para", parts: [String(data.commentaire_roulements).trim()] });
    const roul = [];
    if (txt("type_roulement_av")) roul.push(["Roulement installé : " + txt("type_roulement_av") + " côté commande"]);
    if (txt("type_roulement_ar")) roul.push(["Roulement installé : " + txt("type_roulement_ar") + " côté opposé commande"]);
    if (roul.length) b.push({ t: "lignes", lignes: roul });
    ajouter("mesures", "Mesure des parties mécaniques", b);
  }

  // ── 5. Rapport électrique du bobinage ─────────────────────────────
  if (sec.electrique) {
    const b = [];
    const lignes = [];
    if (isol("isol_uv")) lignes.push(["U / V = " + isol("isol_uv") + " / 1000 V" + dar("isol_uv_dar")]);
    if (isol("isol_vw")) lignes.push(["V / W = " + isol("isol_vw") + " / 1000 V" + dar("isol_vw_dar")]);
    if (isol("isol_wu")) lignes.push(["W / U = " + isol("isol_wu") + " / 1000 V" + dar("isol_wu_dar")]);
    const vBob = verdict("verdict_bobinage");
    if (vBob) lignes.unshift(["Les valeurs d'isolement entre enroulements sont ", vBob, lignes.length ? " :" : "."]);
    if (isol("isol_enroul_min")) lignes.push(["Isolement entre enroulements, plus petite valeur : " + isol("isol_enroul_min") + dar("isol_enroul_min_dar")]);
    const vMasse = verdict("verdict_masse");
    if (isol("isol_masse")) lignes.push(vMasse ? ["L'isolement à la masse est ", vMasse, " : " + isol("isol_masse") + dar("isol_masse_dar")] : ["Isolement à la masse : " + isol("isol_masse") + dar("isol_masse_dar")]);
    else if (vMasse) lignes.push(["L'isolement à la masse est ", vMasse, "."]);
    if (lignes.length) b.push({ t: "lignes", lignes });
    capturesAppareil(data).forEach((c) => { if (c && c.url) b.push({ t: "capture", url: c.url, legende: has(c.caption) ? String(c.caption).trim() : "" }); });
    const nettoyage = v.nettoyage_hp === "Oui", etuvage = v.etuvage_stator === "Oui";
    const apres = nettoyage && etuvage ? " après nettoyage et étuvage" : nettoyage ? " après nettoyage" : etuvage ? " après étuvage" : "";
    ajouter("electrique", "Rapport électrique du bobinage" + apres, b);
  }

  // ── 6. Mesures après entretien ────────────────────────────────────
  if (sec.apres) {
    const b = [];
    const vib = [];
    if (num("vib_av_mms_apres")) vib.push(num("vib_av_mms_apres", "mm/s") + " CC");
    if (num("vib_ar_mms_apres")) vib.push(num("vib_ar_mms_apres", "mm/s") + " COC");
    const pair = [photos.skf_av_rem && { url: photos.skf_av_rem, legende: "CC — côté commande" }, photos.skf_ar_rem && { url: photos.skf_ar_rem, legende: "COC — côté opposé commande" }].filter(Boolean);
    const cVibApres = conclusionVibrations(v, "apres", "après entretien");
    if (vib.length || pair.length || cVibApres) {
      b.push({ t: "sous", id: "apres.essai", txt: "Essai mécanique après entretien et remplacement des roulements" });
      if (vib.length) b.push({ t: "para", parts: ["Le moteur vibre à " + vib.join(" et ") + " pour une norme à 3 mm/s."] });
      if (cVibApres) b.push({ t: "para", parts: cVibApres.parts });
      if (pair.length) b.push({ t: "paire", items: pair });
    }
    const int400 = [num("int_p1_apres", "A"), num("int_p2_apres", "A"), num("int_p3_apres", "A")].filter(Boolean);
    const int560 = [num("int_560_p1_apres", "A"), num("int_560_p2_apres", "A"), num("int_560_p3_apres", "A")].filter(Boolean);
    const conso = [];
    if (int400.length) conso.push(["Le moteur consomme à vide sous 400 V " + int400.join(", ") + " par phase."]);
    if (int560.length) conso.push(["Le moteur consomme sous 560 V " + int560.join(", ") + " par phase."]);
    if (has(data.ensemble_libre)) {
      const e = String(data.ensemble_libre).trim();
      conso.push([/^l['’]ensemble/i.test(e) ? e : "L'ensemble est " + e + (/[.!]$/.test(e) ? "" : ".")]);
    }
    if (conso.length) {
      b.push({ t: "sous", id: "apres.conso", txt: "Mesure électrique lors des essais en rotation à vide et en charge" });
      b.push({ t: "lignes", lignes: conso });
    }
    ajouter("apres", "Mesures après entretien", b);
  }

  // ── 7. Conclusion ─────────────────────────────────────────────────
  if (sec.conclusion) {
    const b = [];
    const vm = verdict("verdict_meca"), ve = verdict("verdict_elec");
    const lignes = [];
    if (vm) lignes.push(["Le moteur est ", vm, " mécaniquement"]);
    if (ve) lignes.push(["Le moteur est ", ve, " électriquement"]);
    if (lignes.length) b.push({ t: "lignes", lignes });
    if (data.photo_apres_url) b.push({ t: "img", url: data.photo_apres_url, taille: "petite", legende: "Le " + (typeLibre ? "matériel" : "moteur") + " après entretien" });
    if (has(data.commentaire_apres)) { b.push({ t: "sous", id: "conclusion.depart", txt: "Départ de nos ateliers" }); b.push({ t: "para", parts: [String(data.commentaire_apres).trim()] }); }
    const sign = [];
    if (has(data.certifie_par)) sign.push(["Entretien certifié conforme par " + listeEt(data.certifie_par) + " le " + dateRapport]);
    if (has(data.realise_par)) sign.push(["Rapport réalisé par " + listeEt(data.realise_par) + " le " + dateRapport]);
    if (sign.length) b.push({ t: "lignes", lignes: sign, espace: true });
    if (has(data.materiel_controle)) {
      b.push({ t: "sous", id: "conclusion.materiel", txt: "Liste du matériel utilisé et date de validité pour effectuer ce rapport" });
      b.push({ t: "lignes", lignes: String(data.materiel_controle).split(/\r?\n/).map((s) => s.trim()).filter(Boolean).map((s) => [s]), petit: true });
    }
    ajouter("conclusion", "Conclusion", b);
  }

  const modele = {
    objet,
    de: txt("de"),
    client: txt("client"),
    entete: "Rapport d'entretien — " + [txt("de"), txt("client")].filter(Boolean).join(" — "),
    couverture,
    societe: SOCIETE,
    identite,
    chapitres,
    sommaire: chapitres.map((c, i) => (i + 1) + ". " + c.titre),
  };
  return meta && meta.type ? appliquerChapitres(modele, configDuType(meta.type, meta.config), ctxPerso, ANCRES_MOTEUR) : modele;
}

// Rapport d'une pompe, d'un ventilateur… : couverture, identification et conclusion automatiques, tout le reste vient de la Maintenance
function construireRapportGenerique(v, data, meta, ctxPerso) {
  const txt = (id) => clean(v[id]);
  const fr = (d) => { try { const x = new Date(d); return isNaN(x.getTime()) ? "" : x.toLocaleDateString("fr-FR"); } catch (e) { return ""; } };
  const maintenant = new Date();
  const moisAnnee = has(data.mois_annee) ? String(data.mois_annee).trim() : String(maintenant.getMonth() + 1).padStart(2, "0") + "/" + maintenant.getFullYear();
  const dateRapport = data.date ? fr(data.date) : fr(maintenant);
  const lieu = txt("materiel_lieu");
  const couverture = {
    titre: "Rapport d'entretien",
    objet: [meta.type, lieu].filter(Boolean).join(" — "),
    serie: "",
    cible: [txt("client"), txt("de")].filter(Boolean).join(" — "),
    date: moisAnnee,
  };
  const identite = [
    ["Client", txt("client")],
    ["Référence chantier", txt("de")],
    ["Adresse du chantier", data.adresse_chantier],
    ["Contact sur place", data.contact],
    ["Référence ou localisation", lieu],
    ["N° / date commande achat", data.commande_achat],
    ["Bordereau d'expédition", data.bordereau],
    ["Date de réception", v.date_entree ? fr(v.date_entree) : ""],
    ["Départ de nos ateliers", data.date_depart ? fr(data.date_depart) : ""],
    ["Descriptif des travaux réalisés par " + SOCIETE.nom, data.descriptif_travaux],
  ].filter((f) => has(f[1])).map((f) => ({ k: f[0], v: String(f[1]).trim() }));
  const chapitres = [];
  const b = [];
  const sign = [];
  [conclusionVibrations(v, "avant", "avant entretien"), conclusionVibrations(v, "apres", "après entretien")].forEach((c) => { if (c) b.push({ t: "para", parts: c.parts }); });
  if (has(data.certifie_par)) sign.push(["Entretien certifié conforme par " + listeEt(data.certifie_par) + " le " + dateRapport]);
  if (has(data.realise_par)) sign.push(["Rapport réalisé par " + listeEt(data.realise_par) + " le " + dateRapport]);
  if (sign.length) b.push({ t: "lignes", lignes: sign, espace: true });
  if (has(data.materiel_controle)) {
    b.push({ t: "sous", id: "conclusion.materiel", txt: "Liste du matériel utilisé et date de validité pour effectuer ce rapport" });
    b.push({ t: "lignes", lignes: String(data.materiel_controle).split(/\r?\n/).map((s) => s.trim()).filter(Boolean).map((s) => [s]), petit: true });
  }
  if (b.length) chapitres.push({ id: "conclusion", titre: "Conclusion", blocs: b });
  const modele = {
    objet: meta.type,
    de: txt("de"),
    client: txt("client"),
    entete: "Rapport d'entretien — " + [txt("de"), txt("client")].filter(Boolean).join(" — "),
    couverture,
    societe: SOCIETE,
    identite,
    chapitres,
    sommaire: chapitres.map((c, i) => (i + 1) + ". " + c.titre),
  };
  return appliquerChapitres(modele, configDuType(meta.type, meta.config), ctxPerso, ANCRES_GENERIQUE);
}
