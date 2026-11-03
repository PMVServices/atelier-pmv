import {SUPA_URL, H, db} from "./supabase";

// Fiches fournisseurs (03/11/2026, administrateur seulement) : la liste des fournisseurs (export EBP de l'utilisateur) et, pour chacun, ce qui sert à regrouper les commandes :
// franco de port, frais de port en dessous du franco, délai de livraison, e-mail, téléphone, note.
// Rangé dans `parametres_app` (clé « fournisseurs_fiches », JSON : aucune table à créer) : {liste:[{code, nom, mail, tel, franco, port, delai, note}]}
// La liste n'est PAS dans le code (le dépôt est public) : elle est écrite une fois dans la base, puis modifiée depuis l'écran « 📇 Fournisseurs » (Dossiers.js).
export const CLE_FOURNISSEURS = "fournisseurs_fiches";
const txt = (x) => String(x == null ? "" : x).trim();
const nombre = (x) => { const t = txt(x).replace(",", ".").replace(/\s/g, ""); if (t === "") return null; const n = Number(t); return isFinite(n) && n >= 0 ? n : null; };
export const mots = (s) => txt(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter(Boolean);
export const cleFiche = (s) => mots(s).join("");

export const propreFiche = (f) => ({
  code: txt(f.code), nom: txt(f.nom), mail: txt(f.mail), tel: txt(f.tel),
  franco: nombre(f.franco), port: nombre(f.port), delai: nombre(f.delai) == null ? null : Math.round(nombre(f.delai)), note: txt(f.note),
});
export const fournisseursVides = () => ({ liste: [] });
export function lireStoreFournisseurs(brut) {
  try {
    const o = typeof brut === "string" ? JSON.parse(brut || "{}") : (brut || {});
    return { liste: Array.isArray(o.liste) ? o.liste.filter((f) => f && txt(f.nom)).map(propreFiche) : [] };
  } catch (e) { return fournisseursVides(); }
}
// lève une erreur si la base ne répond pas (jamais confondre « injoignable » et « vide »)
export async function lireFournisseurs() {
  const r = await fetch(SUPA_URL + "/rest/v1/parametres_app?select=valeur&cle=eq." + CLE_FOURNISSEURS, { headers: H });
  if (!r.ok) throw new Error("Lecture des fournisseurs impossible (" + r.status + ")");
  const rows = await r.json();
  return lireStoreFournisseurs(Array.isArray(rows) && rows[0] ? rows[0].valeur : "");
}
// relit d'abord la base (on n'écrase jamais le travail d'une autre fenêtre), applique modifier(store) -> nouveau store, enregistre
export async function modifierFournisseurs(modifier) {
  const actuel = await lireFournisseurs();
  const nouveau = modifier(actuel) || actuel;
  nouveau.liste = (nouveau.liste || []).map(propreFiche);
  await db.upsert("parametres_app", [{ cle: CLE_FOURNISSEURS, valeur: JSON.stringify(nouveau) }], "cle");
  return nouveau;
}

// La fiche d'un nom de dossier. Le stock écrit « AMAZON », « Setin », « WEG » ; la liste EBP « AMAZON BUSINESS EU SARL », « QUINCAILLERIE SETIN », « WEG France » :
// même écriture à la casse, aux accents et aux tirets près, sinon tous les mots du nom du dossier se retrouvent (mots entiers) dans UNE SEULE fiche. « ATEC » ne correspond pas à « DYMATEC ».
export function trouverFiche(liste, nom) {
  const c = cleFiche(nom);
  if (!c) return null;
  const exacte = (liste || []).find((f) => cleFiche(f.nom) === c || (f.code && cleFiche(f.code) === c));
  if (exacte) return exacte;
  const m = mots(nom);
  const proches = (liste || []).filter((f) => { const fm = mots(f.nom); return m.every((x) => fm.includes(x)); });
  return proches.length === 1 ? proches[0] : null;
}

// Franco d'un dossier : total des lignes qui ont un prix, comparé au franco du fournisseur
export function etatFranco(fiche, total, nbSansPrix, nbAvecPrix) {
  if (!fiche || !(fiche.franco > 0)) return null;
  const manque = Math.round((fiche.franco - total) * 100) / 100;
  return { franco: fiche.franco, manque: Math.max(0, manque), atteint: manque <= 0, incertain: nbSansPrix > 0, aucunPrix: !(nbAvecPrix > 0), port: fiche.port };
}
