// Page de garde du dossier papier (demande du 29/10/2026) : une feuille A4 complète, imprimée à la fin de l'étape « Entrée » et glissée devant le dossier.
// Elle reprend l'essentiel de l'entrée du matériel : N° de DE, client, date d'entrée, délai demandé (s'il y en a un), type de matériel, marque, contact.
// genHtmlPageDeGarde(v, typeMateriel) renvoie le document HTML à imprimer (lancerImpression de pdfUtils.js).
import {LOGO_B64} from "./pdfUtils";
import {echeanceDe, PAS_DE_DELAI, DELAI_DATE} from "./delai";

const esc = (x) => String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const propre = (x) => String(x == null ? "" : x).replace(/^Autre:\s*/i, "").trim();
const dateFr = (d) => d.toLocaleDateString("fr-FR", {day: "2-digit", month: "2-digit", year: "numeric"});
function dateIsoFr(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return "";
  const d = new Date(iso + "T00:00:00");
  return isNaN(d.getTime()) ? "" : dateFr(d);
}

// « 15 jours ouvrés — pour le 20/11/2026 », « Pour le 20/11/2026 », ou "" (pas de délai demandé)
export function texteDelai(v) {
  v = v || {};
  const u = v.delai_unite;
  if (!u || u === PAS_DE_DELAI) return "";
  const ech = echeanceDe(v);
  if (u === DELAI_DATE) return ech ? "Pour le " + dateFr(ech) : "";
  const n = String(v.delai_valeur || "").trim();
  if (!n) return "";
  const lib = u === "Jours" ? "jours ouvrés" : u === "Semaine(s)" ? "semaine(s)" : u === "Mois" ? "mois" : String(u).toLowerCase();
  return n + " " + lib + (ech ? " — pour le " + dateFr(ech) : "");
}

// type de matériel tel qu'on le dit à l'atelier : Pompe, Moteur, Ventilateur… (« Autre » : le type saisi à la main)
export function libelleType(v, type) {
  if (type === "Autre") return propre(v.type_materiel_libre) || "Autre matériel";
  return type || "Moteur";
}

// marques à l'entrée : une seule ligne pour un moteur ; « Pompe : … / Moteur : … » quand il y a deux éléments
export function lignesMarque(v, type) {
  v = v || {};
  const duo = {
    "Pompe": [["Pompe", "marque_pompe"], ["Moteur", "marque_moteur"]],
    "Moto-réducteur": [["Réducteur", "marque_reducteur"], ["Moteur", "marque_moteur"]],
    "Ventilateur": [["Ventilateur", "marque_ventilateur"], ["Moteur", "marque_moteur"]],
  }[type];
  if (duo) return duo.map(([lib, id]) => (propre(v[id]) ? lib + " : " + propre(v[id]) : "")).filter(Boolean);
  const m = propre(v.marque_moteur);
  return m ? [m] : [];
}

export function genHtmlPageDeGarde(v, type) {
  v = v || {};
  const de = propre(v.de), client = propre(v.client);
  const nomClient = client.length > 46 ? 22 : client.length > 28 ? 28 : 36;
  const lignes = [];
  const ligne = (cle, valeurs, sous) => {
    const l = (Array.isArray(valeurs) ? valeurs : [valeurs]).filter(Boolean);
    if (!l.length && !sous) return;
    lignes.push("<div class='l'><div class='k'>" + esc(cle) + "</div><div class='v'>" + l.map((x) => "<div>" + esc(x) + "</div>").join("") + (sous ? "<div class='s'>" + sous + "</div>" : "") + "</div></div>");
  };
  ligne("Date d'entrée", dateIsoFr(v.date_entree));
  ligne("Délai demandé", texteDelai(v));
  ligne("Type de matériel", libelleType(v, type), propre(v.materiel_lieu) ? "Réf. / localisation : " + esc(propre(v.materiel_lieu)) : "");
  ligne("Marque", lignesMarque(v, type));
  const contactSous = [propre(v.telephone) ? "Tél : " + esc(propre(v.telephone)) : "", propre(v.mail) ? esc(propre(v.mail)) : ""].filter(Boolean).join("   ·   ");
  // sans nom de contact, le téléphone et le mail passent en gros
  if (propre(v.contact)) ligne("Contact", propre(v.contact), contactSous);
  else ligne("Contact", [propre(v.telephone) ? "Tél : " + propre(v.telephone) : "", propre(v.mail)]);
  const css = "@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}" +
    "body{font-family:Arial,Helvetica,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".page{width:210mm;height:296mm;padding:15mm 16mm 12mm;display:flex;flex-direction:column;overflow:hidden}" +
    ".haut{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1B4F8A;padding-bottom:5mm}.haut img{height:22mm}" +
    ".doc{text-align:right;font-size:15pt;font-weight:700;color:#1B4F8A;text-transform:uppercase;letter-spacing:.06em}.doc small{display:block;margin-top:1.5mm;font-size:9.5pt;font-weight:400;color:#666;letter-spacing:0;text-transform:none}" +
    ".de{margin-top:9mm;text-align:center;border:1.2mm solid #111;border-radius:5mm;padding:7mm 4mm 8mm}.de small{display:block;font-size:14pt;letter-spacing:.1em;color:#555}" +
    ".de b{display:block;margin-top:2mm;font-size:84pt;line-height:1.05;letter-spacing:.02em;overflow-wrap:anywhere}" +
    ".client{margin-top:8mm;text-align:center}.client small{display:block;font-size:12pt;letter-spacing:.2em;text-transform:uppercase;color:#555}.client b{display:block;margin-top:1.5mm;font-size:" + nomClient + "pt;line-height:1.15;overflow-wrap:anywhere}" +
    ".lignes{margin-top:8mm;flex:1;display:flex;flex-direction:column;justify-content:space-evenly}" +
    ".l{display:flex;align-items:baseline;gap:6mm;border-bottom:1px solid #bbb;padding:4mm 0 3.5mm}.k{flex:0 0 58mm;font-size:12.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#555}" +
    ".v{flex:1;min-width:0;font-size:23pt;font-weight:700;line-height:1.2;overflow-wrap:anywhere}.s{margin-top:1.5mm;font-size:12pt;font-weight:400;color:#444}" +
    ".pied{margin-top:5mm;padding-top:3mm;border-top:1px solid #bbb;text-align:center;font-size:9pt;color:#666}";
  const imprime = dateFr(new Date());
  return "<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'><title>Page de garde " + esc(de) + "</title><style>" + css + "</style></head><body><div class='page'>" +
    "<div class='haut'><img src='" + LOGO_B64 + "' alt='PMV Services'/><div class='doc'>Dossier d'entrée<small>Imprimé le " + imprime + "</small></div></div>" +
    "<div class='de'><small>Numéro de DE</small><b>" + esc(de || "—") + "</b></div>" +
    "<div class='client'><small>Client</small><b>" + esc(client || "—") + "</b></div>" +
    "<div class='lignes'>" + lignes.join("") + "</div>" +
    "<div class='pied'>PMV Services — 7 rue des entrepreneurs, 37390 La Membrolle sur Choisille — 09 67 37 27 24 — agence@pmvservices.fr</div>" +
    "</div></body></html>";
}
