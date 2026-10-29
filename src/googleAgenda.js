// Lien avec Google Agenda (demande du 22/10/2026) : depuis le Planning, « 📅 Programmer » crée un événement « Atelier DE7544 POMPE remontage » (ou démontage, peinture, rapport) à la date et à l'heure
// voulues, dans l'agenda choisi (par son nom). Aucun serveur : la personne qui programme se connecte à son compte Google dans le navigateur (Google Identity Services,
// jeton valable une heure) et l'appli appelle l'API Google Agenda avec ce jeton. L'identifiant client OAuth (public) est réglé une fois par l'administrateur
// (parametres_app, clé « google_client_id »). Les événements créés sont rangés dans parametres_app (clé « planning_agenda ») pour pouvoir les déplacer ou les supprimer.
// Sans connexion possible, un lien « Ouvrir dans Google Agenda » ouvre l'événement pré-rempli (il suffit d'enregistrer).
// Sens inverse (demande du 23/10/2026) : « 🔄 Synchroniser » relit dans Google les événements créés par l'appli et reporte sur les cartes du Planning le nouveau jour / les nouvelles heures,
// le nouveau titre, ou l'événement supprimé (voir synchroniserAgenda). Pas en temps réel : Google ne peut pas prévenir l'appli (pas de serveur), la relecture se fait à l'ouverture du Planning
// (si la personne est déjà connectée à Google) ou au clic sur le bouton.
import {SUPA_URL, H, db} from "./supabase";

export const CLE_AGENDA = "planning_agenda";
export const CLE_CLIENT_ID = "google_client_id";
const PORTEE = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly";
const FUSEAU = "Europe/Paris";
const API = "https://www.googleapis.com/calendar/v3";

// « rapport » (demande du 29/10/2026) : la plage pour rédiger le rapport, proposée pour les cartes de la colonne « Rapport à faire »
export const TRAVAUX = [["demontage", "démontage"], ["remontage", "remontage"], ["peinture", "peinture"], ["rapport", "rapport"]];
export const libTravail = (id) => (TRAVAUX.find((t) => t[0] === id) || [id, id])[1];
// travail proposé d'après la colonne du Planning où se trouve la carte
export const travailDepuisStatut = (statut) => (statut === "A_remonter" ? "remontage" : statut === "Peinture" ? "peinture" : statut === "Rapport_a_faire" ? "rapport" : "demontage");
const TYPES = { "Moteur": "MOTEUR", "Pompe": "POMPE", "Moto-réducteur": "MOTO-RÉDUCTEUR", "Ventilateur": "VENTILATEUR", "Cheminée de freinage": "CHEMINÉE", "Autre": "AUTRE" };
export const nomType = (type) => TYPES[type] || String(type || "").toUpperCase();
// « Atelier DE7544 POMPE remontage » (un chantier sans fiche n'a pas de type de matériel : « Atelier DE7544 remontage »)
export const titreEvenement = ({ de, type, travail }) => ["Atelier", String(de || "").trim(), type ? nomType(type) : "", libTravail(travail)].filter(Boolean).join(" ");

const p2 = (n) => String(n).padStart(2, "0");
// « 2026-10-27 » + « 14:00 » -> « 2026-10-27T14:00:00 » (heure locale, le fuseau est envoyé à part)
export const dateHeure = (jour, heure) => jour + "T" + (heure || "08:00") + ":00";
export const ajouterHeures = (heure, h) => { const [a, b] = String(heure || "08:00").split(":").map((x) => parseInt(x, 10) || 0); const t = Math.min(23 * 60 + 59, a * 60 + b + Math.round(h * 60)); return p2(Math.floor(t / 60)) + ":" + p2(t % 60); };

// ── lien pré-rempli (sans connexion) ──
export function lienPreRempli({ titre, jour, debut, fin, details, invites }) {
  const compact = (j, h) => j.replace(/-/g, "") + "T" + String(h).replace(":", "") + "00";
  const q = ["action=TEMPLATE", "text=" + encodeURIComponent(titre), "dates=" + compact(jour, debut) + "/" + compact(jour, fin), "ctz=" + encodeURIComponent(FUSEAU)];
  if (details) q.push("details=" + encodeURIComponent(details));
  if (invites) q.push("add=" + encodeURIComponent(invites));
  return "https://calendar.google.com/calendar/render?" + q.join("&");
}

// ── connexion Google (jeton d'accès valable environ une heure, gardé pour la session du navigateur) ──
let jeton = null;
const CLE_JETON = "pmv_google_jeton";
function jetonEnMemoire() {
  if (jeton && jeton.exp > Date.now()) return jeton;
  try { const j = JSON.parse(sessionStorage.getItem(CLE_JETON) || "null"); if (j && j.exp > Date.now()) { jeton = j; return j; } } catch (e) { /* pas de jeton gardé */ }
  jeton = null;
  return null;
}
export const estConnecte = () => !!jetonEnMemoire();
export function deconnecter() { jeton = null; try { sessionStorage.removeItem(CLE_JETON); } catch (e) { /* rien */ } }

function chargerGoogle() {
  if (window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve();
  return new Promise((ok, ko) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => ok();
    s.onerror = () => ko(new Error("Le service de connexion Google n'a pas pu être chargé (connexion internet ?)."));
    document.head.appendChild(s);
  });
}
// À appeler depuis un clic (la fenêtre de connexion Google s'ouvre dans une fenêtre surgissante)
export async function connecter(clientId) {
  if (!clientId) throw new Error("L'identifiant client Google n'est pas réglé.");
  await chargerGoogle();
  return new Promise((ok, ko) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId, scope: PORTEE,
        callback: (r) => {
          if (!r || r.error) { ko(new Error(r && r.error_description ? r.error_description : "Connexion refusée.")); return; }
          jeton = { t: r.access_token, exp: Date.now() + Math.max(60, (r.expires_in || 3600) - 120) * 1000 };
          try { sessionStorage.setItem(CLE_JETON, JSON.stringify(jeton)); } catch (e) { /* facultatif */ }
          ok();
        },
        error_callback: (e) => ko(new Error(e && e.type === "popup_closed" ? "La fenêtre de connexion a été fermée." : (e && e.message) || "Connexion impossible.")),
      });
      client.requestAccessToken({ prompt: "" });
    } catch (e) { ko(e); }
  });
}

class ErreurGoogle extends Error { constructor(m, statut) { super(m); this.statut = statut; } }
async function appeler(methode, chemin, corps) {
  const j = jetonEnMemoire();
  if (!j) throw new ErreurGoogle("Connexion à Google expirée : reconnectez-vous.", 401);
  let r;
  try {
    r = await fetch(API + chemin, { method: methode, headers: { Authorization: "Bearer " + j.t, "Content-Type": "application/json" }, body: corps ? JSON.stringify(corps) : undefined });
  } catch (e) { throw new ErreurGoogle("Google Agenda est injoignable (connexion internet ?).", 0); }
  if (r.status === 204) return null;
  let d = null; try { d = await r.json(); } catch (e) { /* pas de corps */ }
  if (!r.ok) {
    if (r.status === 401) deconnecter();
    const m = d && d.error && d.error.message ? d.error.message : "Erreur Google (" + r.status + ")";
    throw new ErreurGoogle(r.status === 401 ? "Connexion à Google expirée : reconnectez-vous." : m, r.status);
  }
  return d;
}

// agendas où l'on peut écrire (le sien et ceux qu'on partage avec soi en modification), le principal en premier
export async function listerAgendas() {
  const d = await appeler("GET", "/users/me/calendarList?minAccessRole=writer&maxResults=250");
  const l = (d && d.items) || [];
  return l.map((c) => ({ id: c.id, nom: c.summaryOverride || c.summary || c.id, principal: !!c.primary, couleur: c.backgroundColor || "" }))
    .sort((a, b) => (b.principal ? 1 : 0) - (a.principal ? 1 : 0) || a.nom.localeCompare(b.nom, "fr"));
}
const corpsEvenement = ({ titre, jour, debut, fin, details, invites }) => ({
  summary: titre,
  description: details || undefined,
  start: { dateTime: dateHeure(jour, debut), timeZone: FUSEAU },
  end: { dateTime: dateHeure(jour, fin), timeZone: FUSEAU },
  attendees: invites ? String(invites).split(/[,;\s]+/).filter((x) => /@/.test(x)).map((email) => ({ email })) : undefined,
});
export const creerEvenement = (calId, e) => appeler("POST", "/calendars/" + encodeURIComponent(calId) + "/events" + (e.invites ? "?sendUpdates=all" : ""), corpsEvenement(e));
export const majEvenement = (calId, eventId, e) => appeler("PATCH", "/calendars/" + encodeURIComponent(calId) + "/events/" + encodeURIComponent(eventId) + (e.invites ? "?sendUpdates=all" : ""), corpsEvenement(e));
// un événement déjà supprimé dans Google (404 / 410) compte comme supprimé
export async function supprimerEvenement(calId, eventId) {
  try { await appeler("DELETE", "/calendars/" + encodeURIComponent(calId) + "/events/" + encodeURIComponent(eventId)); }
  catch (e) { if (e.statut !== 404 && e.statut !== 410) throw e; }
}

// ── événements programmés, rangés dans parametres_app ──
// { [id de la carte]: [{id, calId, calNom, travail, jour, debut, fin, titre, lien, par, cree}] } ; chaque modification relit d'abord la base
export async function lireAgenda() {
  const r = await fetch(SUPA_URL + "/rest/v1/parametres_app?select=valeur&cle=eq." + CLE_AGENDA, { headers: H });
  if (!r.ok) throw new Error("Lecture de l'agenda impossible (" + r.status + ")");
  const rows = await r.json();
  const brut = Array.isArray(rows) && rows[0] && rows[0].valeur ? rows[0].valeur : "{}";
  try { const o = JSON.parse(brut); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; } catch (e) { return {}; }
}
export async function modifierAgenda(modifier) {
  const actuel = await lireAgenda();
  const nouveau = modifier(actuel) || actuel;
  await db.upsert("parametres_app", [{ cle: CLE_AGENDA, valeur: JSON.stringify(nouveau) }], "cle");
  return nouveau;
}
export async function lireClientId() {
  try {
    const r = await fetch(SUPA_URL + "/rest/v1/parametres_app?select=valeur&cle=eq." + CLE_CLIENT_ID, { headers: H });
    const rows = await r.json();
    return Array.isArray(rows) && rows[0] && rows[0].valeur ? String(rows[0].valeur).trim() : "";
  } catch (e) { return ""; }
}
export async function ecrireClientId(id) {
  await db.upsert("parametres_app", [{ cle: CLE_CLIENT_ID, valeur: String(id || "").trim() }], "cle");
}

// ── synchronisation Google -> appli ──
const enc = encodeURIComponent;
// l'heure est demandée à Google en heure de Paris : « 2026-10-27T14:00:00+01:00 » se lit directement (jour = 10 premiers caractères, heure = 11 à 16)
export const lireEvenement = (calId, eventId) => appeler("GET", "/calendars/" + enc(calId) + "/events/" + enc(eventId) + "?timeZone=" + enc(FUSEAU));
// compare l'événement lu dans Google (null ou « cancelled » = supprimé) à l'entrée enregistrée ; renvoie les champs à changer, ou null si rien n'a bougé
export function ecartEvenement(entree, g) {
  if (!g || g.status === "cancelled") return entree.supprime ? null : { supprime: true };
  const s = g.start || {}, e = g.end || {};
  const jour = String(s.dateTime || s.date || "").slice(0, 10);
  const journee = !s.dateTime;
  const debut = journee ? "" : String(s.dateTime).slice(11, 16);
  const memeJour = !e.dateTime || String(e.dateTime).slice(0, 10) === jour;
  const fin = journee ? "" : (memeJour ? String(e.dateTime || "").slice(11, 16) : "23:59");
  const ch = {};
  if (jour && jour !== entree.jour) ch.jour = jour;
  if (jour && debut !== (entree.debut || "")) ch.debut = debut;
  if (jour && fin !== (entree.fin || "")) ch.fin = fin;
  if (g.summary && g.summary !== entree.titre) ch.titre = g.summary;
  if (entree.supprime) ch.supprime = false;
  return Object.keys(ch).length ? ch : null;
}
const classer = (ch) => (ch.supprime === true ? "supprimes" : (ch.jour !== undefined || ch.debut !== undefined || ch.fin !== undefined || ch.supprime === false) ? "deplaces" : "renommes");
// relit dans Google les événements de la table (agendas accessibles avec ce compte seulement : un agenda qu'on ne voit pas ne doit pas faire croire à une suppression ;
// événements passés depuis plus d'une semaine ignorés). Ne modifie rien : renvoie {changements: {id d'événement: champs à changer}, verifies, ignores, echecs, deplaces, supprimes, renommes}
export async function synchroniserAgenda(table) {
  const accessibles = new Set((await listerAgendas()).map((a) => a.id));
  const d = new Date(); d.setDate(d.getDate() - 7);
  const limite = d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
  const aVerifier = []; let ignores = 0;
  Object.keys(table || {}).forEach((carte) => (table[carte] || []).forEach((x) => {
    if (!x || !x.id || !x.calId || String(x.jour || "") < limite) return;
    if (accessibles.has(x.calId)) aVerifier.push(x); else ignores++;
  }));
  const changements = {}; let echecs = 0, i = 0;
  const travailleur = async () => {
    while (i < aVerifier.length) {
      const x = aVerifier[i++];
      try { const c = ecartEvenement(x, await lireEvenement(x.calId, x.id)); if (c) changements[x.id] = c; }
      catch (e) {
        if (e.statut === 404 || e.statut === 410) { const c = ecartEvenement(x, null); if (c) changements[x.id] = c; }
        else if (e.statut === 401) throw e;
        else echecs++;
      }
    }
  };
  await Promise.all([travailleur(), travailleur(), travailleur(), travailleur()]);
  const bilan = { deplaces: 0, supprimes: 0, renommes: 0 };
  Object.keys(changements).forEach((id) => { bilan[classer(changements[id])]++; });
  return { changements, verifies: aVerifier.length - echecs, ignores, echecs, ...bilan };
}
// écrit les changements dans la table de la base (relue d'abord : on ne touche qu'aux événements concernés)
export const enregistrerChangements = (changements) => modifierAgenda((a) => {
  const maj = new Date().toISOString(), o = {};
  Object.keys(a).forEach((carte) => { o[carte] = (a[carte] || []).map((x) => (changements[x.id] ? { ...x, ...changements[x.id], majGoogle: maj } : x)); });
  return o;
});
