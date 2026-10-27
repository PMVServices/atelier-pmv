// Contrôle des vibrations (demande du 22/10/2026), partagé par les fiches atelier (message d'erreur sous la case) et les rapports client (conclusion).
//  • Vitesse vibratoire : au-dessus de 3 mm/s la machine vibre → non conforme.
//  • Ge (enveloppe) : roulement « normal » 60XX / 62XX / 63XX → 1 Ge au plus ; roulement NU → 2 Ge au plus.
//    Autre roulement, ou type pas (encore) renseigné : aucune limite connue, la valeur n'est pas jugée.
// Module sans dépendance (pas d'import).

export const SEUIL_MMS = 3;
export const LIMITE_GE_NORMAL = 1;
export const LIMITE_GE_NU = 2;

const num = (x) => { const n = parseFloat(String(x == null ? "" : x).replace(",", ".")); return isNaN(n) ? null : n; };
const fmt = (n) => String(n).replace(".", ",");
const nettoyer = (s) => String(s == null ? "" : s).replace(/^Autre:\s*/i, "").trim();

// Limite de Ge d'un roulement d'après sa référence (« 6309 ZZ C3 », « NU 311 C3 », « Autre:… »), null si on ne la connaît pas
export function limiteGe(ref) {
  const t = nettoyer(ref).toUpperCase();
  if (/^NU/.test(t)) return LIMITE_GE_NU;
  if (/^6[023]\d\d(?!\d)/.test(t)) return LIMITE_GE_NORMAL;
  return null;
}

// organe : m = moteur, p = pompe, r = réducteur, v = ventilateur
const ORGANES = {
  m: { nom: "moteur", art: "le moteur" },
  p: { nom: "pompe", art: "la pompe" },
  r: { nom: "réducteur", art: "le réducteur" },
  v: { nom: "ventilateur", art: "le ventilateur" },
};
const COTES = {
  m: { av: "côté commande", ar: "côté opposé commande" },
  p: { av: "avant", ar: "arrière" },
  r: { av: "avant", ar: "arrière" },
  v: { av: "côté entraînement", ar: "côté opposé" },
};
const ORDRE_ORGANES = ["m", "p", "r", "v"];

// Nom des cases de la fiche : vib_av_mms_avant, vib_ar_ge_apres, vib_av_mms_avant_m (moteur d'une pompe), vib_p_av_mms_apres (pompe), vib_r_… (réducteur), vib_v_… (ventilateur)
const RE_ID = /^vib_(?:([prv])_)?(av|ar)_(mms|ge)_(avant|apres)(_m|_ms)?$/;
export function decrireCase(id) {
  const m = RE_ID.exec(String(id || ""));
  if (!m) return null;
  const organe = m[1] || "m";
  return { organe, cote: m[2], mesure: m[3], moment: m[4], idRoulement: "type_roulement_" + m[2] + (m[1] ? "_" + m[1] : "") };
}

// Message à afficher sous une case de mesure : null (pas une case de vibration, ou vide) | {ok:true} | {ok:false, message}
export function controleVibration(id, valeur, v) {
  const d = decrireCase(id);
  if (!d) return null;
  const x = num(valeur);
  if (x == null) return null;
  if (d.mesure === "mms") {
    return x > SEUIL_MMS ? { ok: false, message: "Non conforme : " + fmt(x) + " mm/s, au-dessus de " + SEUIL_MMS + " mm/s (" + ORGANES[d.organe].art + " vibre)" } : { ok: true };
  }
  const ref = nettoyer(v && v[d.idRoulement]);
  const lim = limiteGe(ref);
  if (lim == null) return { ok: true, nonJuge: true };
  return x > lim ? { ok: false, message: "Non conforme : " + fmt(x) + " Ge, au-dessus de " + lim + " Ge (limite d'un roulement " + ref + ")" } : { ok: true };
}

// Les mesures d'un moment (« avant » ou « apres » entretien), regroupées par organe et par côté, avec leur verdict
export function lireVibrations(v, moment) {
  const lignes = {};
  Object.keys(v || {}).forEach((id) => {
    const d = decrireCase(id);
    if (!d || d.moment !== moment) return;
    const x = num(v[id]);
    if (x == null) return;
    const cle = d.organe + "." + d.cote;
    const l = lignes[cle] || (lignes[cle] = { organe: d.organe, cote: d.cote, mms: null, ge: null, mmsTxt: "", geTxt: "", ref: "", limGe: null, mmsOk: null, geOk: null });
    if (d.mesure === "mms") { l.mms = x; l.mmsTxt = String(v[id]).trim(); l.mmsOk = x <= SEUIL_MMS; }
    else {
      l.ge = x; l.geTxt = String(v[id]).trim(); l.ref = nettoyer(v[d.idRoulement]); l.limGe = limiteGe(l.ref);
      l.geOk = l.limGe == null ? null : x <= l.limGe;
    }
  });
  return Object.keys(lignes).map((k) => lignes[k]).sort((a, b) => ORDRE_ORGANES.indexOf(a.organe) - ORDRE_ORGANES.indexOf(b.organe) || (a.cote === b.cote ? 0 : a.cote === "av" ? -1 : 1));
}

// Lignes « Mesure de Ge CC : 0.8 Ge, conforme (limite : …) » du moteur pour un moment (côté commande = CC, côté opposé commande = COC), avec le verdict de chaque côté
export function lignesGeMoteur(v, moment) {
  return lireVibrations(v, moment).filter((x) => x.organe === "m" && x.ge != null).map((x) => {
    const cote = x.cote === "av" ? "CC" : "COC";
    const debut = "Mesure de Ge " + cote + " : " + x.geTxt + " Ge";
    if (x.limGe == null) return [debut + " (pas de limite définie : " + (x.ref ? "roulement " + x.ref : "type de roulement non renseigné") + ")."];
    const limite = " (limite : " + x.limGe + " Ge au plus pour un roulement " + x.ref + ").";
    return x.geOk ? [debut + ", ", { v: "ok", txt: "conforme" }, limite] : [debut + ", ", { v: "ko", txt: "non conforme" }, limite];
  });
}

// Petite conclusion pour un rapport : null s'il n'y a aucune mesure, sinon { ok, parts } (parts : morceaux de phrase du modèle de rapport, voir rapportModele.js)
// moment : "avant" | "apres" ; libelle : « avant entretien » / « après entretien »
export function conclusionVibrations(v, moment, libelle) {
  const l = lireVibrations(v, moment);
  if (!l.length) return null;
  const plusieurs = new Set(l.map((x) => x.organe)).size > 1;
  const hors = [];
  l.forEach((x) => {
    const pre = (plusieurs ? ORGANES[x.organe].nom + " " : "") + COTES[x.organe][x.cote] + " : ";
    // un seul « côté … : » par côté, même si la vitesse et le Ge dépassent tous les deux
    const depassements = [];
    if (x.mmsOk === false) depassements.push(x.mmsTxt + " mm/s (norme : " + SEUIL_MMS + " mm/s au plus)");
    if (x.geOk === false) depassements.push(x.geTxt + " Ge (limite : " + x.limGe + " Ge au plus pour un roulement " + x.ref + ")");
    if (depassements.length) hors.push(pre + depassements.join(" et "));
  });
  const titre = { b: "Conclusion sur les vibrations " + libelle + " : " };
  if (hors.length) return { ok: false, parts: [titre, { v: "ko", txt: "non conformes" }, " — " + hors.join(" ; ") + "."] };
  const jugeGe = l.some((x) => x.geOk === true), nonJugeGe = l.some((x) => x.ge != null && x.geOk == null);
  const aMms = l.some((x) => x.mmsOk === true);
  const criteres = [aMms ? "vitesse vibratoire de " + SEUIL_MMS + " mm/s au plus" : "", jugeGe ? "Ge de " + LIMITE_GE_NORMAL + " au plus (" + LIMITE_GE_NU + " pour un roulement NU)" : ""].filter(Boolean).join(" et ");
  return { ok: true, parts: [titre, { v: "ok", txt: "conformes" }, (criteres ? " — " + criteres : "") + (nonJugeGe ? (criteres ? ", " : " — ") + "Ge non jugé (type de roulement non renseigné)" : "") + "."] };
}
