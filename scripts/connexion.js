// Connexion des scripts d'administration à la base Supabase (13/11/2026).
// Depuis la fermeture de la base (règles RLS), la clé publique ne donne plus accès à rien : les scripts (sauvegarde, lecture de la configuration…) doivent se connecter avec le
// compte de l'atelier, comme les appareils de l'appli. Le MOT DE PASSE n'est jamais écrit dans un fichier ni dans le dépôt.
//   node scripts/connexion.js            → demande l'identifiant et le mot de passe (saisie masquée) et garde la connexion de ce PC
//   node scripts/connexion.js --etat     → dit si ce PC est connecté
//   node scripts/connexion.js --oublier  → efface la connexion gardée sur ce PC
// Ce qui est gardé sur le PC (fichier ~/.pmv-atelier-session.json, hors du dépôt) : l'identifiant et un jeton de renouvellement, pas le mot de passe. Supprimer ce fichier (ou --oublier) déconnecte le PC.
// Les scripts appellent jeton() : session gardée → renouvelée toute seule ; sinon variables d'environnement PMV_EMAIL / PMV_MOT_DE_PASSE (tâche planifiée) ; sinon saisie au clavier.
const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");

const src = fs.readFileSync(path.join(__dirname, "..", "src", "supabase.js"), "utf8");
const URL_ = (src.match(/SUPA_URL\s*=\s*"([^"]+)"/) || [])[1];
const KEY = (src.match(/SUPA_KEY\s*=\s*"([^"]+)"/) || [])[1];
const FICHIER = process.env.PMV_SESSION_FICHIER || path.join(os.homedir(), ".pmv-atelier-session.json");

function lireSession() { try { const s = JSON.parse(fs.readFileSync(FICHIER, "utf8")); return s && s.refresh_token ? s : null; } catch (e) { return null; } }
function ecrireSession(email, j) { fs.writeFileSync(FICHIER, JSON.stringify({ email, refresh_token: j.refresh_token, date: new Date().toISOString() }), { mode: 0o600 }); }
function demander(question, masque) {
  return new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (masque) rl._writeToOutput = function (s) { if (s.indexOf(question) === 0) rl.output.write(s); };
    rl.question(question, (a) => { rl.close(); if (masque) process.stdout.write("\n"); res(a); });
  });
}
async function appeler(grant, corps) {
  const r = await fetch(URL_ + "/auth/v1/token?grant_type=" + grant, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY }, body: JSON.stringify(corps) });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok && !!j.access_token, status: r.status, j };
}

async function jeton() {
  if (!URL_ || !KEY) throw new Error("Impossible de lire SUPA_URL / SUPA_KEY dans src/supabase.js");
  const s = lireSession();
  if (s) {
    const r = await appeler("refresh_token", { refresh_token: s.refresh_token });
    if (r.ok) { ecrireSession(s.email, r.j); return r.j.access_token; }
    if (r.status >= 500) throw new Error("Supabase ne répond pas (" + r.status + ")");
    // jeton refusé : connexion expirée ou révoquée → on repasse par l'identifiant et le mot de passe
  }
  let email = process.env.PMV_EMAIL, mdp = process.env.PMV_MOT_DE_PASSE;
  if (!email || !mdp) {
    if (!process.stdin.isTTY) throw new Error("Ce PC n'est pas connecté à la base. Dans un terminal, lance une fois : node scripts/connexion.js");
    email = email || (await demander("Identifiant (adresse mail) : ", false)).trim();
    mdp = mdp || (await demander("Mot de passe (saisie masquée) : ", true));
  }
  const r = await appeler("password", { email, password: mdp });
  if (!r.ok) throw new Error(r.status === 400 || r.status === 401 ? "Identifiant ou mot de passe incorrect." : "Connexion refusée (HTTP " + r.status + ").");
  ecrireSession(email, r.j);
  return r.j.access_token;
}
// en-têtes prêts à l'emploi pour les requêtes REST / stockage
async function entetes(extra) { const t = await jeton(); return { apikey: KEY, Authorization: "Bearer " + t, ...(extra || {}) }; }
module.exports = { jeton, entetes, URL_, KEY, FICHIER };

if (require.main === module) {
  (async () => {
    if (process.argv.includes("--oublier")) { try { fs.unlinkSync(FICHIER); console.log("Connexion effacée de ce PC."); } catch (e) { console.log("Ce PC n'était pas connecté."); } return; }
    if (process.argv.includes("--etat")) { const s = lireSession(); console.log(s ? "Ce PC est connecté (" + s.email + ", depuis le " + s.date.slice(0, 10) + ")." : "Ce PC n'est pas connecté."); return; }
    await jeton();
    const s = lireSession();
    console.log("Connexion réussie" + (s ? " (" + s.email + ")" : "") + ". Les scripts (sauvegarde, lecture de la configuration…) peuvent maintenant s'en servir.");
  })().catch((e) => { console.error("Erreur : " + e.message); process.exit(1); });
}
