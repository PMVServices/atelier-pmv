import {SUPA_URL, H, db} from "./supabase";

// Non-conformités (demande du 17/11/2026) : logique et accès à la base, sans écran (l'écran est dans PageNonConformites.js).
// Une non-conformité = un texte libre écrit par la personne qui a ouvert l'appli, GLOBALE (personne en particulier) ou visant une ou plusieurs personnes, avec une catégorie et des photos.
// Rangée dans la table `non_conformites` (SQL ci-dessous, à coller une fois dans Supabase). Les photos sont des fichiers du dossier de stockage « photos », sous `non-conformites/<id>/`,
// leurs chemins sont dans la colonne `photos` (ils ne sont dans AUCUNE autre table : à compter comme « utilisés » dans toute analyse de photos orphelines).
// Qui voit quoi : l'administrateur voit tout ; les autres profils ne lisent QUE leurs propres non-conformités (filtre `auteur_id` dans la requête). Barrière d'interface : le compte de connexion est partagé.
// Modifier : la personne qui l'a écrite et l'administrateur (chaque modification est notée dans `historique`) ; supprimer : l'administrateur seulement (suppression « douce » : la ligne reste, marquée, avec sa trace).
export const CATEGORIES_NC = ["Sécurité", "Qualité du travail", "Organisation", "Matériel / outillage", "Client / fournisseur", "Autre"];
export const MAX_PHOTOS_NC = 8;
const TABLE = "non_conformites";

export const SQL_NON_CONFORMITES = `-- Non-conformités : une table, rejouable sans risque
create table if not exists public.non_conformites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  auteur_id text not null,
  auteur_nom text not null,
  global boolean not null default false,
  concernes jsonb not null default '[]'::jsonb,
  categorie text not null default 'Autre',
  note text not null default '',
  photos jsonb not null default '[]'::jsonb,
  historique jsonb not null default '[]'::jsonb,
  supprimee boolean not null default false
);
create index if not exists non_conformites_auteur_idx on public.non_conformites (auteur_id);
alter table public.non_conformites enable row level security;
drop policy if exists appareil_connecte on public.non_conformites;
create policy appareil_connecte on public.non_conformites for all to authenticated using (true) with check (true);`;

async function requete(chemin, methode, corps) {
  const r = await fetch(SUPA_URL + "/rest/v1/" + chemin, { method: methode || "GET", headers: { ...H, Prefer: "return=representation" }, body: corps ? JSON.stringify(corps) : undefined });
  const j = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, j };
}
// {dispo, liste} ; dispo=false : la table n'existe pas encore (écran d'activation) ; lève une erreur si la base ne répond pas
export async function lireNonConformites({ admin, moiId }) {
  const filtre = admin ? "" : "&auteur_id=eq." + encodeURIComponent(moiId);
  const r = await requete(TABLE + "?select=*&supprimee=eq.false&order=created_at.desc&limit=1000" + filtre);
  if (!r.ok) {
    if (r.j && r.j.code === "PGRST205") return { dispo: false, liste: [] };
    throw new Error("Lecture impossible (HTTP " + r.status + ").");
  }
  return { dispo: true, liste: Array.isArray(r.j) ? r.j : [] };
}
export async function verifierTableNC() {
  try { const r = await requete(TABLE + "?select=id&limit=1"); if (r.ok) return true; if (r.j && r.j.code === "PGRST205") return false; return null; } catch (e) { return null; }
}
export const nouvelIdNC = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "nc-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
export async function creerNonConformite(nc) {
  const r = await requete(TABLE, "POST", nc);
  if (!r.ok || !Array.isArray(r.j) || !r.j[0]) throw new Error("L'enregistrement n'a pas abouti (HTTP " + r.status + ").");
  return r.j[0];
}
async function relire(id) {
  const r = await requete(TABLE + "?select=*&id=eq." + encodeURIComponent(id));
  if (!r.ok || !Array.isArray(r.j) || !r.j[0]) throw new Error("Non-conformité introuvable (supprimée ?).");
  return r.j[0];
}
// applique `champs` et ajoute `entree` à l'historique (relu juste avant : on n'écrase pas la trace d'une autre fenêtre)
export async function modifierNonConformite(id, champs, entree) {
  const actuelle = await relire(id);
  const historique = (Array.isArray(actuelle.historique) ? actuelle.historique : []).concat([entree]);
  const r = await requete(TABLE + "?id=eq." + encodeURIComponent(id), "PATCH", { ...champs, historique, updated_at: new Date().toISOString() });
  if (!r.ok || !Array.isArray(r.j) || !r.j[0]) throw new Error("La modification n'a pas abouti (HTTP " + r.status + ").");
  return r.j[0];
}
export const supprimerNonConformite = (id, entree) => modifierNonConformite(id, { supprimee: true }, entree);

// fichiers : le dossier « photos » du stockage, sous non-conformites/<id>/
export async function envoyerPhotoNC(ncId, fichier, rang) {
  const ext = (String(fichier.name || "").match(/\.[a-z0-9]+$/i) || [".jpg"])[0].toLowerCase();
  const chemin = "non-conformites/" + ncId + "/" + Date.now().toString(36) + "_" + rang + ext;
  await db.uploadPhoto(chemin, fichier);
  return chemin;
}
export const retirerFichierNC = (chemin) => db.deleteFile(chemin);
export const urlPhotoNC = (chemin) => db.photoUrl(chemin);
