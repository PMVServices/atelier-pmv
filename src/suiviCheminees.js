// Suivi des cheminées / résistances de freinage (demande du 30/10/2026) : logique pure (aucun accès à la base), utilisée par PageSuiviCheminees.js.
// Une « ligne » = un passage (un N° DV ou DE) : n° de cheminée, n° de moteur, n° d'engin / loco et n° de gravage. Les lignes viennent de deux sources :
//  - les fiches atelier « Cheminée de freinage » (lues en direct, jamais recopiées) ;
//  - les anciennes informations, saisies ou importées d'un fichier Excel, rangées à part (parametres_app, clé « suivi_cheminees ») sans fiche.
// Quand un même N° DV existe dans les deux, les deux lignes sont fondues en une : la fiche fait foi, l'ancien complète, les écarts sont signalés.

export const CHAMPS_FICHE_SUIVI = ["n_cheminee", "numero_serie", "n_engin", "symbole", "n_loco", "cheminee_origine", "plaques_gravees_texte", "date_entree"]
  .concat([1, 2, 3, 4, 5, 6, 7, 8].map((i) => "gravure_" + i));

const txt = (x) => String(x == null ? "" : x).trim();
// comparaison / recherche : minuscules, sans espace, tiret, barre ni apostrophe (« 2170967-001-013 » = « 2170967 001 013 »)
export const norm = (x) => txt(x).toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

// « DV30 », « dv 030 », « DV0030 » -> « DV0030 » ; « DE5040  » -> « DE5040 » ; autre texte : tel quel
export function numeroPmv(t) {
  const s = txt(t).toUpperCase().replace(/\s+/g, "");
  const m = /^(DE|DV)0*(\d+)/.exec(s);
  return m ? m[1] + m[2].padStart(4, "0") : s;
}
export const rangPmv = (pmv) => { const m = /^(DE|DV)(\d+)/.exec(pmv || ""); return m ? (m[1] === "DV" ? 1000000 : 0) + parseInt(m[2], 10) : -1; }; // les DV (récents) avant les DE

// ── plages de numéros de gravage ──
export function compresser(plages) {
  const l = (plages || []).filter((p) => p && isFinite(p[0]) && isFinite(p[1])).map((p) => [Math.min(p[0], p[1]), Math.max(p[0], p[1])]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out = [];
  l.forEach((p) => { const d = out[out.length - 1]; if (d && p[0] <= d[1] + 1) d[1] = Math.max(d[1], p[1]); else out.push([p[0], p[1]]); });
  return out;
}
// « 259 à 266 », « 259-266, 270 » -> [[259,266],[270,270]]
export function lirePlages(t) {
  const out = []; let reste = txt(t);
  reste = reste.replace(/(\d+)\s*(?:à|a|-|–|→)\s*(\d+)/gi, (m, a, b) => { out.push([parseInt(a, 10), parseInt(b, 10)]); return " "; });
  (reste.match(/\d+/g) || []).forEach((n) => out.push([parseInt(n, 10), parseInt(n, 10)]));
  return compresser(out);
}
const n3 = (n) => String(n).padStart(3, "0");
export const texteGravure = (plages) => (plages || []).map((p) => (p[0] === p[1] ? n3(p[0]) : n3(p[0]) + " → " + n3(p[1]))).join(" ; ");
// gravures d'une fiche (« 2026-10-312 » ×8) -> {plages, prefixe: « 2026-10 »}
export function gravuresDeFiche(v) {
  const l = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => txt(v["gravure_" + i])).filter(Boolean);
  const nums = []; let prefixe = "";
  l.forEach((s) => { const m = /^(.*?)(\d+)\D*$/.exec(s); if (m) { nums.push([parseInt(m[2], 10), parseInt(m[2], 10)]); if (!prefixe) prefixe = m[1].replace(/[-/\s]+$/, ""); } });
  return { plages: compresser(nums), prefixe };
}

// ── fusion fiches + anciennes lignes ──
// fiches : lignes de la table `fiches` (type cheminée) ; valeurs : {id de fiche: {champ: valeur}} ; anciens : lignes rangées (voir propre dans PageSuiviCheminees.js)
export function construireLignes(fiches, valeurs, anciens) {
  const lignes = [];
  (fiches || []).forEach((f) => {
    const v = (valeurs && valeurs[f.id]) || {};
    const g = gravuresDeFiche(v);
    const sncf = v.cheminee_origine === "SNCF";
    lignes.push({
      cle: "f" + f.id, pmv: numeroPmv(f.de), type: "cheminee", cheminee: txt(v.n_cheminee), moteur: txt(v.numero_serie),
      loco: txt(v.n_engin || v.n_loco), symbole: sncf ? txt(v.symbole) : "", plages: g.plages, prefixeGrav: g.prefixe, arrivee: txt(v.plaques_gravees_texte), notes: "",
      client: txt(f.client), origine: txt(v.cheminee_origine), date: txt(v.date_entree) || txt(f.created_at).slice(0, 10), statut: f.statut_chantier || "", etape: f.etape_active,
      fiche: f, deFiche: true, deAncien: false, ecarts: [], idAncien: "", supprimee: false,
    });
  });
  const pris = new Set();
  (anciens || []).forEach((a) => {
    const pmv = numeroPmv(a.pmv);
    // la fiche du même N° DV (et de la même cheminée, si les deux la connaissent) absorbe la ligne ancienne
    const cible = lignes.find((l) => l.deFiche && !pris.has(l.cle) && l.pmv === pmv && (!l.cheminee || !a.cheminee || norm(l.cheminee) === norm(a.cheminee)));
    if (cible) {
      pris.add(cible.cle);
      const ecart = (cle, lib, fv, av) => { if (fv && av && norm(fv) !== norm(av)) cible.ecarts.push({ cle, champ: lib, fiche: fv, ancien: av }); };
      ecart("cheminee", "N° de cheminée", cible.cheminee, a.cheminee); ecart("moteur", "N° de moteur", cible.moteur, a.moteur); ecart("loco", "Engin / loco", cible.loco, a.loco);
      if (cible.plages.length && a.plages.length && texteGravure(cible.plages) !== texteGravure(a.plages)) cible.ecarts.push({ cle: "gravure", champ: "Gravures", fiche: texteGravure(cible.plages), ancien: texteGravure(a.plages) });
      if (!cible.cheminee) cible.cheminee = a.cheminee;
      if (!cible.moteur) cible.moteur = a.moteur;
      if (!cible.loco) { cible.loco = a.loco; if (!cible.symbole) cible.symbole = a.symbole || ""; }
      if (!cible.plages.length) cible.plages = a.plages;
      if (a.notes) cible.notes = a.notes;
      if (!cible.client) cible.client = a.client;
      cible.deAncien = true; cible.idAncien = a.id;
      return;
    }
    lignes.push({
      cle: "a" + a.id, pmv, type: a.type, cheminee: a.cheminee, moteur: a.moteur, loco: a.loco, symbole: a.symbole || "", plages: a.plages, prefixeGrav: a.prefixeGrav || "", arrivee: "", notes: a.notes,
      client: a.client || "", origine: a.origine || "", date: a.date || "", statut: "", etape: null, fiche: null, deFiche: false, deAncien: true, ecarts: [], idAncien: a.id, supprimee: a.source === "supprimee",
    });
  });
  return lignes;
}

// chaque numéro de gravage de la ligne, avec le préfixe « 2026-10- » des fiches (plages longues : non détaillées)
export function gravuresListe(l) {
  const out = [];
  (l.plages || []).forEach((p) => { if (p[1] - p[0] <= 60) for (let n = p[0]; n <= p[1]; n++) out.push((l.prefixeGrav ? l.prefixeGrav + "-" : "") + n3(n)); });
  return out;
}

// ── recherche : un numéro (ou un morceau) -> les colonnes où il se trouve ──
// Un numéro de 1 à 3 chiffres cherche aussi dans les plages de gravure (« 262 » retrouve 259 → 266) et le N° DV correspondant (« 22 » = DV0022).
export function correspondances(l, requete) {
  const q = norm(requete);
  if (!q) return null;
  const res = new Set();
  const dans = (s) => norm(s).indexOf(q) >= 0;
  if (/^\d+$/.test(q) && q.length <= 4 && (q.length <= 3 || q[0] !== "0")) {
    const n = parseInt(q, 10);
    if ((l.plages || []).some((p) => n >= p[0] && n <= p[1])) res.add("gravure");
  }
  if (/^\d{1,4}$/.test(q) && rangPmv(l.pmv) >= 0 && parseInt(q, 10) === parseInt(l.pmv.slice(2), 10)) res.add("pmv");
  // un à deux chiffres seuls : plages et N° DV seulement (un morceau si court ressortirait trop de lignes) ; sinon morceau de numéro ou de texte
  if (!(/^\d+$/.test(q) && q.length <= 2) && q.length >= 2) {
    if (dans(l.pmv) || norm(l.pmv).replace(/^(de|dv)0+/, "$1").indexOf(q) >= 0) res.add("pmv");
    if (dans(l.cheminee)) res.add("cheminee");
    if (dans(l.moteur)) res.add("moteur");
    if (dans(l.loco) || dans(l.symbole)) res.add("loco");
    if (dans(l.arrivee) || gravuresListe(l).some((g) => norm(g).indexOf(q) >= 0)) res.add("gravure");
    if (dans(l.notes) || dans(l.client)) res.add("notes");
    // la valeur de l'ancien tableau, quand elle diffère de celle de la fiche, reste cherchable (colonne « Remarques », où l'écart est affiché)
    (l.ecarts || []).forEach((e) => { if (dans(e.ancien)) res.add("notes"); });
  }
  return Array.from(res);
}

// ── lecture du fichier Excel des anciennes informations ──
// rows : feuille lue en tableau de tableaux (texte). Repère la ligne d'en-têtes (N°PMV / DV, Loco, N° Cheminée, N°moteur, Résist. seul, N° de gravage),
// ignore les lignes vides et les en-têtes répétés, lit les plages « 259 à 266 », « Comme DV0026 », « nr » et les remarques à droite.
export function analyserFeuille(rows) {
  const lignesBrutes = (rows || []).map((r) => (r || []).map((c) => txt(c)));
  let ent = -1; const col = {};
  for (let i = 0; i < lignesBrutes.length && ent < 0; i++) {
    const c = {};
    lignesBrutes[i].forEach((cell, j) => {
      if (/^n°?\s*(pmv|dv|de)\b|^(pmv|dv|de)$/i.test(cell) && c.pmv === undefined) c.pmv = j;
      else if (/loco|engin/i.test(cell) && c.loco === undefined) c.loco = j;
      else if (/chemin/i.test(cell) && c.cheminee === undefined) c.cheminee = j;
      else if (/moteur/i.test(cell) && c.moteur === undefined) c.moteur = j;
      else if (/r[ée]sist.*seul/i.test(cell) && c.seul === undefined) c.seul = j;
      else if (/grav/i.test(cell) && c.grav === undefined) c.grav = j;
    });
    if (c.pmv !== undefined && Object.keys(c).length >= 3) { ent = i; Object.assign(col, c); }
  }
  if (ent < 0) return { erreur: "Les colonnes attendues n'ont pas été trouvées (N°PMV ou DV, N° cheminée, N° moteur, N° de gravage…).", lignes: [], avertissements: [], ignorees: [] };
  const avertissements = [], ignorees = [], brutes = [];
  const lit = (r, j) => (j === undefined ? "" : txt(r[j]));
  for (let i = ent + 1; i < lignesBrutes.length; i++) {
    const r = lignesBrutes[i];
    const pmvBrut = lit(r, col.pmv);
    if (!/^(DE|DV)\s*\d+/i.test(pmvBrut)) continue; // ligne vide, en-tête répété…
    const pmv = numeroPmv(pmvBrut);
    if (pmvBrut.toUpperCase().replace(/\s+/g, "") !== pmv) avertissements.push("Ligne " + (i + 1) + " : « " + pmvBrut + " » lu comme " + pmv + ".");
    let loco = lit(r, col.loco); if (/^nr$/i.test(loco)) loco = "NR";
    const seul = /^x$/i.test(lit(r, col.seul));
    let plages = [], comme = "", notes = "";
    if (col.grav !== undefined) {
      const g0 = lit(r, col.grav), g1 = lit(r, col.grav + 1), g2 = lit(r, col.grav + 2);
      const cm = /comme\s*((?:DE|DV)\s*\d+)/i.exec(g0);
      if (cm) comme = numeroPmv(cm[1]);
      else if (/\d/.test(g0)) {
        const a = parseInt(g0.replace(/[^\d]/g, ""), 10);
        const b = /^(à|a|-|–|→)$/i.test(g1) && /\d/.test(g2) ? parseInt(g2.replace(/[^\d]/g, ""), 10) : a;
        plages = [[a, b]];
      }
      const debutNotes = col.grav + (/^(à|a|-|–|→)$/i.test(g1) ? 3 : 1);
      notes = r.slice(debutNotes).filter(Boolean).join(" ");
      if (!comme && g0 && !/\d/.test(g0)) notes = (g0 + " " + notes).trim();
    }
    brutes.push({ ligne: i + 1, pmv, type: seul ? "resistance" : "cheminee", cheminee: lit(r, col.cheminee), moteur: lit(r, col.moteur), loco, plages, comme, notes });
  }
  // regroupe les lignes d'un même N° (DE5040 en 3 lignes : 001-016, 017-032, 033-038)
  const parCle = new Map();
  brutes.forEach((b) => {
    const k = b.pmv + "|" + b.type + "|" + norm(b.cheminee);
    const e = parCle.get(k);
    if (!e) { parCle.set(k, { ...b, plages: compresser(b.plages), nbLignes: 1 }); return; }
    e.plages = compresser(e.plages.concat(b.plages)); e.nbLignes++;
    if (!e.moteur) e.moteur = b.moteur; if (!e.loco) e.loco = b.loco; if (!e.comme) e.comme = b.comme;
    if (b.notes && e.notes.indexOf(b.notes) < 0) e.notes = (e.notes + " " + b.notes).trim();
  });
  const liste = Array.from(parCle.values());
  liste.filter((e) => e.nbLignes > 1).forEach((e) => avertissements.push(e.pmv + " : " + e.nbLignes + " lignes regroupées en une seule (" + texteGravure(e.plages) + ")."));
  // « Comme DV0026 » : mêmes gravures qu'un autre passage
  liste.forEach((e) => {
    if (!e.comme) return;
    const ref = liste.find((x) => x.pmv === e.comme && x !== e);
    if (ref && ref.plages.length) { e.plages = ref.plages.map((p) => p.slice()); e.notes = ("Mêmes gravures que " + e.comme + ". " + e.notes).trim(); }
    else { e.notes = ("Comme " + e.comme + " (gravures non retrouvées dans le fichier). " + e.notes).trim(); avertissements.push(e.pmv + " : « comme " + e.comme + " » mais ce N° n'a pas de gravures dans le fichier."); }
  });
  // lignes sans aucune information (seul le N° DV est écrit : la fiche, si elle existe, les remplira)
  const utiles = liste.filter((e) => {
    const vide = !e.cheminee && !e.moteur && !e.loco && !e.plages.length && !e.notes && e.type !== "resistance";
    if (vide) ignorees.push(e.pmv);
    return !vide;
  });
  // chevauchements de plages entre deux N° différents (sauf regravure expliquée dans les remarques)
  const cite = (notes, n) => new RegExp("-0*" + n + "(?!\\d)").test(notes || "");
  const chev = [];
  for (let i = 0; i < utiles.length; i++) for (let j = i + 1; j < utiles.length; j++) {
    const a = utiles[i], b = utiles[j]; if (a.pmv === b.pmv || a.comme === b.pmv || b.comme === a.pmv) continue; // « comme DV0026 » : mêmes plages voulues
    a.plages.forEach((pa) => b.plages.forEach((pb) => {
      const lo = Math.max(pa[0], pb[0]), hi = Math.min(pa[1], pb[1]);
      if (lo > hi) return;
      if ((cite(a.notes, lo) && cite(a.notes, hi)) || (cite(b.notes, lo) && cite(b.notes, hi))) return;
      chev.push(a.pmv + " (" + texteGravure([pa]) + ") et " + b.pmv + " (" + texteGravure([pb]) + ") se chevauchent : " + texteGravure([[lo, hi]]) + ".");
    }));
  }
  const lignes = utiles.map((e) => ({ pmv: e.pmv, type: e.type, cheminee: e.cheminee, moteur: e.moteur, loco: e.loco, symbole: "", plages: e.plages, notes: e.notes, cleImport: e.pmv + "|" + e.type + "|" + norm(e.cheminee) }));
  return { lignes, avertissements: chev.concat(avertissements), ignorees, source: { entete: ent + 1, lignesLues: brutes.length } };
}
