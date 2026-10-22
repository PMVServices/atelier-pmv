// Seuil avec alerte d'une case numérique (demande du 22/10/2026) : la page Maintenance peut poser, sur une case « nombre » ou « mesure » de n'importe quelle fiche
// (atelier ou chantier, cases du code ou cases ajoutées), un maximum et/ou un minimum : champs[id].seuil = {max, min, msg} (ou ajouts[].def.seuil).
// Hors seuil, la case passe en rouge avec un message ; rien n'est bloqué. « seuilMin » (ancienne propriété écrite dans le code) est lu comme un minimum.
// Module sans dépendance (pas d'import).

const num = (x) => { const n = parseFloat(String(x == null ? "" : x).replace(",", ".")); return isNaN(n) ? null : n; };
const fmt = (n) => String(n).replace(".", ",");
const vide = (x) => x === undefined || x === null || x === "";

// {max, min, msg} (nombres ou null) ; null si la case n'a aucun seuil
export function lireSeuil(c) {
  const s = (c && c.seuil) || {};
  const max = num(s.max);
  const min = num(vide(s.min) ? (c && c.seuilMin) : s.min);
  if (max == null && min == null) return null;
  return { max, min, msg: String(s.msg || "").trim() };
}

// Message d'alerte pour la valeur saisie, ou null si la valeur est dans les limites (ou vide)
export function messageSeuil(c, valeur) {
  const s = lireSeuil(c);
  if (!s) return null;
  const x = num(valeur);
  if (x == null) return null;
  const u = c.unite ? " " + c.unite : "";
  if (s.max != null && x > s.max) return s.msg || "Au-dessus du seuil : " + fmt(x) + u + " (maximum " + fmt(s.max) + u + ")";
  if (s.min != null && x < s.min) return s.msg || "En dessous du seuil : " + fmt(x) + u + " (minimum " + fmt(s.min) + u + ")";
  return null;
}

// Résumé lisible pour la Maintenance : « alerte au-dessus de 3 mm/s, en dessous de 0,5 mm/s »
export function resumeSeuil(c) {
  const s = lireSeuil(c);
  if (!s) return "";
  const u = c.unite ? " " + c.unite : "";
  const p = [];
  if (s.max != null) p.push("au-dessus de " + fmt(s.max) + u);
  if (s.min != null) p.push("en dessous de " + fmt(s.min) + u);
  return "alerte " + p.join(", ");
}

// Seuil tel qu'il s'enregistre dans la configuration, à partir des cases du formulaire (texte) ; undefined si rien n'est rempli
export function seuilDepuisSaisie(max, min, msg) {
  const o = {};
  const a = num(max), b = num(min);
  if (a != null) o.max = a;
  if (b != null) o.min = b;
  if (o.max === undefined && o.min === undefined) return undefined;
  const m = String(msg || "").trim();
  if (m) o.msg = m;
  return o;
}
