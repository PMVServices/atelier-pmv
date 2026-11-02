import {useState, useEffect} from "react";
import {SUPA_URL, H, db} from "./supabase";

// Dossiers de commandes par fournisseur (demande du 02/11/2026, administrateur seulement) : logique et accès à la base, sans écran (l'écran est dans Dossiers.js).
// Un « mini-dossier » par fournisseur regroupe ce qu'il y a à lui commander : lignes ajoutées à la main (même sans rapport avec l'appli) et lignes qui viennent de l'appli
// (stock à renouveler, demandes des techniciens, pièces des fiches). Chaque ligne peut porter un N° de chantier et un « à commander avant le » qui déclenche une alerte.
// Rangé dans `parametres_app` (clé « commandes_dossiers », JSON : aucune table à créer) : {lignes, reg, fournisseurs, derniere}
//  - lignes : lignes à la main {id, fournisseur, designation, quantite, chantier, avant, prix, note, cree, par}
//  - reg : réglages des lignes qui viennent de l'appli, par clé « dem:<id> », « fiche:<id> » ou « stock:<id article> » : {f fournisseur, avant, c chantier, note, d désignation, q quantité}
//  - fournisseurs : noms ajoutés à la main ; derniere : {nom de fournisseur normalisé: date de la dernière commande}
// Rien n'est gardé après « Commandé » (les lignes disparaissent), sauf la date de la dernière commande de chaque fournisseur.
export const CLE_DOSSIERS = "commandes_dossiers";
export const JOURS_BIENTOT = 2; // « à passer bientôt » : date limite dans 2 jours ou moins
const txt = (x) => String(x == null ? "" : x).trim();
export const cleNom = (s) => txt(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

const propreLigne = (l) => ({
  id: String(l.id), fournisseur: txt(l.fournisseur), designation: txt(l.designation),
  quantite: l.quantite === "" || l.quantite == null ? 1 : Math.max(1, parseInt(l.quantite, 10) || 1),
  chantier: txt(l.chantier), avant: /^\d{4}-\d{2}-\d{2}$/.test(txt(l.avant)) ? txt(l.avant) : "",
  prix: l.prix === "" || l.prix == null || isNaN(Number(l.prix)) ? null : Number(l.prix),
  note: txt(l.note), cree: l.cree || new Date().toISOString(), par: txt(l.par),
});
export const dossiersVides = () => ({ lignes: [], reg: {}, fournisseurs: [], derniere: {} });
export function lireStore(brut) {
  try {
    const o = JSON.parse(brut || "{}") || {};
    return {
      lignes: Array.isArray(o.lignes) ? o.lignes.filter((l) => l && l.id).map(propreLigne) : [],
      reg: o.reg && typeof o.reg === "object" && !Array.isArray(o.reg) ? o.reg : {},
      fournisseurs: Array.isArray(o.fournisseurs) ? o.fournisseurs.map(txt).filter(Boolean) : [],
      derniere: o.derniere && typeof o.derniere === "object" && !Array.isArray(o.derniere) ? o.derniere : {},
    };
  } catch (e) { return dossiersVides(); }
}
// lève une erreur si la base ne répond pas (jamais confondre « injoignable » et « vide »)
export async function lireDossiers() {
  const r = await fetch(SUPA_URL + "/rest/v1/parametres_app?select=valeur&cle=eq." + CLE_DOSSIERS, { headers: H });
  if (!r.ok) throw new Error("Lecture des dossiers impossible (" + r.status + ")");
  const rows = await r.json();
  return lireStore(Array.isArray(rows) && rows[0] ? rows[0].valeur : "");
}
// relit d'abord la base (on n'écrase jamais le travail d'une autre fenêtre), applique modifier(store) -> nouveau store, enregistre
export async function modifierDossiers(modifier) {
  const actuel = await lireDossiers();
  const nouveau = modifier(actuel) || actuel;
  nouveau.lignes = (nouveau.lignes || []).map(propreLigne);
  await db.upsert("parametres_app", [{ cle: CLE_DOSSIERS, valeur: JSON.stringify(nouveau) }], "cle");
  return nouveau;
}
export const nouvelId = () => "cd_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ── délais ──
export function joursAvant(avant, maintenant) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(txt(avant));
  if (!m) return null;
  const n = maintenant || new Date();
  const aujourdhui = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  return Math.round((new Date(+m[1], +m[2] - 1, +m[3]).getTime() - aujourdhui) / 86400000);
}
export function etatAvant(avant, maintenant) {
  const j = joursAvant(avant, maintenant);
  if (j == null) return "sans";
  return j < 0 ? "retard" : j <= JOURS_BIENTOT ? "bientot" : "ok";
}
export function phraseAvant(avant, maintenant) {
  const j = joursAvant(avant, maintenant);
  if (j == null) return "";
  const d = avant.slice(8, 10) + "/" + avant.slice(5, 7);
  return j < 0 ? "en retard de " + (-j) + " j (avant le " + d + ")" : j === 0 ? "à passer aujourd'hui" : j === 1 ? "à passer demain (" + d + ")" : "avant le " + d + " (dans " + j + " j)";
}

// ── alertes : lignes dont la date limite est dépassée ou proche ──
// valides : {dem:Set d'ids de demandes à commander, fiche:Set d'ids de pièces à recommander} — une réglage dont la ligne a été commandée ailleurs est ignoré (pas d'alerte fantôme)
export function lignesAAlerter(store, valides, maintenant) {
  const out = [];
  (store.lignes || []).forEach((l) => out.push({ cle: "main:" + l.id, fournisseur: l.fournisseur, designation: l.designation, quantite: l.quantite, chantier: l.chantier, avant: l.avant }));
  Object.keys(store.reg || {}).forEach((cle) => {
    const r = store.reg[cle] || {};
    const [type, id] = cle.split(":");
    if (!r.avant || !valides || !valides[type] || !valides[type].has(String(id))) return;
    out.push({ cle, fournisseur: txt(r.f), designation: txt(r.d), quantite: r.q || 1, chantier: txt(r.c), avant: r.avant });
  });
  return out.filter((l) => l.avant && ["retard", "bientot"].indexOf(etatAvant(l.avant, maintenant)) >= 0)
    .sort((a, b) => joursAvant(a.avant, maintenant) - joursAvant(b.avant, maintenant));
}
export const ligneAlerte = (l, maintenant) => "• " + (l.fournisseur || "Sans fournisseur") + " — " + l.designation + " × " + l.quantite + (l.chantier ? " — " + l.chantier : "") + " — " + phraseAvant(l.avant, maintenant);

async function idsActifs() {
  const lire = async (chemin) => { try { const r = await fetch(SUPA_URL + "/rest/v1/" + chemin, { headers: H }); const d = await r.json(); return Array.isArray(d) ? d : null; } catch (e) { return null; } };
  const [dem, fiche] = await Promise.all([
    lire("demandes_materiel?select=id&statut=eq.a_commander&limit=2000"),
    lire("suivi_pieces?select=id&or=(statut.eq.A_recommander,statut.is.null)&limit=2000"),
  ]);
  return { dem: new Set((dem || []).map((x) => String(x.id))), fiche: new Set((fiche || []).map((x) => String(x.id))) };
}
// Pour le tableau de bord (administrateur) : {charge, lignes, retard, bientot}
export function useAlertesDossiers(actif) {
  const [etat, setEtat] = useState({ charge: false, lignes: [], retard: 0, bientot: 0 });
  useEffect(() => {
    if (!actif) return undefined;
    let vivant = true;
    (async () => {
      try {
        const [store, valides] = await Promise.all([lireDossiers(), idsActifs()]);
        const n = new Date(), l = lignesAAlerter(store, valides, n);
        if (vivant) setEtat({ charge: true, lignes: l, retard: l.filter((x) => etatAvant(x.avant, n) === "retard").length, bientot: l.filter((x) => etatAvant(x.avant, n) !== "retard").length });
      } catch (e) { if (vivant) setEtat((p) => ({ ...p, charge: true })); }
    })();
    return () => { vivant = false; };
  }, [actif]);
  return etat;
}
