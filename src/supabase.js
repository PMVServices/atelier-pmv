// Accès à la base Supabase (clé publique "anon"), partagé par App.js et les modules séparés (Stock.js…).
export const SUPA_URL = "https://pupbzngvudprcweukuoi.supabase.co";
export const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1cGJ6bmd2dWRwcmN3ZXVrdW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxODY3NDAsImV4cCI6MjA5Nzc2Mjc0MH0.jn025v42M3qNpAKfvy49cdCySBdTqwRz99b1EfaKYoo";
export const H = {"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY};

// ── Connexion de l'appareil (12/11/2026) ──────────────────────────────────────────────────────────────
// Chaque appareil (tablette, PC) se connecte UNE fois avec le compte de l'atelier créé dans Supabase (Authentication > Users) : identifiant et
// mot de passe, jamais écrits dans le code. Une fois connecté, TOUTES les requêtes vers Supabase partent avec le jeton de l'appareil à la place
// de la clé publique : la base peut alors être fermée à tout ce qui n'est pas connecté (règles RLS réservées au rôle « authenticated »).
// Tant qu'un appareil n'est pas connecté, rien ne change pour lui : il utilise la clé publique, comme avant.
// La session reste sur l'appareil (localStorage) et se renouvelle toute seule (jeton d'une heure + jeton de renouvellement).
const CLE_APPAREIL = "pmv_appareil";
const lireSession = () => { try { const x = JSON.parse(localStorage.getItem(CLE_APPAREIL) || "null"); return x && x.access_token && x.refresh_token ? x : null; } catch (e) { return null; } };
let session = lireSession();
const ecouteurs = new Set();
const fetchNatif = typeof window !== "undefined" && window.fetch ? window.fetch.bind(window) : null;
export const etatAppareil = () => (session ? { connecte: true, email: session.email || "" } : { connecte: false, email: "" });
// s'abonner aux changements (connexion, déconnexion, session perdue) ; renvoie la fonction de désabonnement
export function surAppareil(f) { ecouteurs.add(f); return () => { ecouteurs.delete(f); }; }
function appliquer(nouvelle, enregistrer) {
  const avant = !!session;
  session = nouvelle;
  if (enregistrer) { try { if (nouvelle) localStorage.setItem(CLE_APPAREIL, JSON.stringify(nouvelle)); else localStorage.removeItem(CLE_APPAREIL); } catch (e) { /* stockage indisponible : la session vaut pour cette ouverture */ } }
  H.Authorization = "Bearer " + (nouvelle ? nouvelle.access_token : SUPA_KEY);
  if (avant !== !!nouvelle) ecouteurs.forEach((f) => { try { f(etatAppareil()); } catch (e) { /* un écouteur en erreur n'empêche pas les autres */ } });
}
if (session) H.Authorization = "Bearer " + session.access_token;
const depuisReponse = (j, email) => ({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (Number(j.expires_in) || 3600), email: (j.user && j.user.email) || email || "" });

export async function connecterAppareil(email, motDePasse) {
  let r;
  try { r = await fetchNatif(SUPA_URL + "/auth/v1/token?grant_type=password", { method: "POST", headers: { "Content-Type": "application/json", apikey: SUPA_KEY }, body: JSON.stringify({ email: String(email || "").trim(), password: String(motDePasse || "") }) }); }
  catch (e) { throw new Error("Connexion impossible (réseau ?)."); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    if (j && j.error_code === "email_not_confirmed") throw new Error("Ce compte n'est pas encore confirmé dans Supabase.");
    throw new Error(r.status === 400 || r.status === 401 ? "Identifiant ou mot de passe incorrect." : "Connexion refusée (" + r.status + ").");
  }
  appliquer(depuisReponse(j, email), true);
  return etatAppareil();
}
// déconnecte CET appareil seulement (scope=local) : les autres appareils connectés avec le même compte le restent
export async function deconnecterAppareil() {
  const ancienne = session;
  appliquer(null, true);
  if (ancienne) { try { await fetchNatif(SUPA_URL + "/auth/v1/logout?scope=local", { method: "POST", headers: { apikey: SUPA_KEY, Authorization: "Bearer " + ancienne.access_token } }); } catch (e) { /* hors ligne : la session locale est effacée quand même */ } }
}
// renouvelle le jeton ; un seul renouvellement à la fois ; si un autre onglet l'a déjà fait, on reprend le sien
let renouvellement = null;
function rafraichir() {
  if (renouvellement) return renouvellement;
  renouvellement = (async () => {
    const stock = lireSession();
    if (stock && session && stock.refresh_token !== session.refresh_token && stock.expires_at * 1000 - Date.now() > 60000) { appliquer(stock, false); return; }
    const jeton = (stock || session || {}).refresh_token;
    if (!jeton) { appliquer(null, true); throw new Error("Appareil déconnecté"); }
    let r;
    try { r = await fetchNatif(SUPA_URL + "/auth/v1/token?grant_type=refresh_token", { method: "POST", headers: { "Content-Type": "application/json", apikey: SUPA_KEY }, body: JSON.stringify({ refresh_token: jeton }) }); }
    catch (e) { throw new Error("réseau"); } // hors ligne : on garde la session, on réessaiera
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.access_token) { appliquer(depuisReponse(j, session && session.email), true); return; }
    if (r.status === 400 || r.status === 401 || r.status === 403) {
      const autre = lireSession(); // refusé : un autre onglet vient peut-être de le renouveler
      if (autre && autre.refresh_token !== jeton) { appliquer(autre, false); return; }
      appliquer(null, true); throw new Error("Appareil déconnecté");
    }
    throw new Error("renouvellement refusé (" + r.status + ")");
  })().finally(() => { renouvellement = null; });
  return renouvellement;
}
const jetonExpire = async (r) => {
  if (r.status === 401) return true;
  if (r.status !== 400 && r.status !== 403) return false;
  try { const t = await r.clone().text(); return /jwt/i.test(t) && /expired/i.test(t); } catch (e) { return false; }
};
// Toutes les requêtes de l'appli vers Supabase passent ici (y compris celles qui écrivent encore la clé publique dans leurs en-têtes) :
// appareil connecté → jeton de l'appareil, renouvelé juste avant d'expirer, et une nouvelle tentative si la base répond « jeton expiré ».
if (fetchNatif) {
  window.fetch = async function (entree, init) {
    if (!session || typeof entree !== "string" || entree.indexOf(SUPA_URL) !== 0 || entree.indexOf(SUPA_URL + "/auth/v1/") === 0) return fetchNatif(entree, init);
    if (session.expires_at * 1000 - Date.now() < 60000) { try { await rafraichir(); } catch (e) { /* hors ligne ou session perdue : la requête part quand même */ } }
    const avecJeton = () => {
      const o = { ...(init || {}) };
      const brut = o.headers || {};
      const h = typeof Headers !== "undefined" && brut instanceof Headers ? Object.fromEntries(brut.entries()) : { ...brut };
      Object.keys(h).forEach((k) => { if (k.toLowerCase() === "authorization") delete h[k]; });
      h.Authorization = "Bearer " + (session ? session.access_token : SUPA_KEY);
      o.headers = h;
      return o;
    };
    let r = await fetchNatif(entree, avecJeton());
    if (session && (await jetonExpire(r))) { try { await rafraichir(); } catch (e) { return r; } r = await fetchNatif(entree, avecJeton()); }
    return r;
  };
  // un autre onglet du même appareil s'est connecté ou déconnecté : on suit
  window.addEventListener("storage", (e) => { if (e.key === CLE_APPAREIL) appliquer(lireSession(), false); });
  // retour sur l'appli après une longue veille : on renouvelle tout de suite si le jeton arrive à sa fin
  document.addEventListener("visibilitychange", () => { if (!document.hidden && session && session.expires_at * 1000 - Date.now() < 300000) rafraichir().catch(() => {}); });
}
export const db = {
  async get(t,p=""){try{const r=await fetch(SUPA_URL+"/rest/v1/"+t+p,{headers:{...H,"Prefer":"return=representation"}});return r.json();}catch(e){return[];}},
  async post(t,b){try{const r=await fetch(SUPA_URL+"/rest/v1/"+t,{method:"POST",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify(b)});return r.json();}catch(e){return null;}},
  async patch(t,p,b){try{const r=await fetch(SUPA_URL+"/rest/v1/"+t+p,{method:"PATCH",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify(b)});return r.json();}catch(e){return null;}},
  async del(t,p){try{await fetch(SUPA_URL+"/rest/v1/"+t+p,{method:"DELETE",headers:H});}catch(e){}},
  async uploadPhoto(path,file){const r=await fetch(SUPA_URL+"/storage/v1/object/photos/"+path,{method:"POST",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":file.type,"x-upsert":"true"},body:file});if(!r.ok){const e=await r.text();throw new Error(e);}return true;},
  photoUrl(path){return SUPA_URL+"/storage/v1/object/public/photos/"+path;},
  async deleteFile(path){try{await fetch(SUPA_URL+"/storage/v1/object/photos/"+path,{method:"DELETE",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}});}catch(e){}},
  async upsert(table,body,conflict){
    const r=await fetch(SUPA_URL+"/rest/v1/"+table+"?on_conflict="+conflict,{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(body)});
    if(!r.ok){const e=await r.text();throw new Error(e);}
    return null;
  }
};
