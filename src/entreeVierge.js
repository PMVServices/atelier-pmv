// Fiche d'entrée VIERGE à imprimer (demande du 03/11/2026) : quand la tablette n'est pas disponible et qu'un client dépose un matériel, on remplit l'Entrée à la main
// sur une feuille A4, puis on la saisit dans l'appli. Une seule feuille par matériel (moteur, pompe, moto-réducteur, ventilateur, autre matériel, cheminée de freinage).
// Les cases viennent des champs de l'étape d'entrée de la fiche (donc suivent la configuration de la Maintenance : champ renommé, masqué, ajouté).
// genHtmlEntreeVierge(titreType, champs) renvoie le document HTML à imprimer (lancerImpression de pdfUtils.js).
import {LOGO_B64} from "./pdfUtils";
import {DELAI_DATE, PAS_DE_DELAI} from "./delai";

const esc = (x) => String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// ce qui n'est pas une réponse à écrire : conseils, verdicts, illustrations, photos
const SANS_SAISIE = (c) => ["conseil", "verdict", "illustration", "titre", "calcul", "fait"].includes(c.type) || String(c.type || "").startsWith("photo");
const options = (c) => (Array.isArray(c.options) ? c.options : []);
const boite = () => "<i class='b'></i>";
const trait = (mm) => "<span class='t' style='min-width:" + mm + "mm'></span>";
const cases = (c, liste) => liste.map((o) => /^Autre/i.test(o) && c.autreTexte
  ? "<span class='o'>" + boite() + "Autre : " + trait(20) + "</span>"
  : "<span class='o'>" + boite() + esc(o) + "</span>").join("");
const intitule = (c) => esc(String(c.label || c.id).replace(/\s*\(carnet d'adresses\)/i, "")) + (c.required === true ? " *" : "");
const dateAEcrire = () => trait(9) + " / " + trait(9) + " / " + trait(15);

// contenu d'une case (hors intitulé) ; « enfants » = champs qui ne s'affichent que pour une réponse (ex. « Par qui » après « Déposé par nos soins : Oui »)
function contenu(c, enfants) {
  const t = c.type;
  let h;
  if (c.dictee || t === "textarea") return "<div class='zone'></div>";
  if (t === "oui_non") h = "<span class='o'>" + boite() + "Oui</span><span class='o'>" + boite() + "Non</span>";
  else if ((t === "choix" || t === "select") && options(c).length) h = cases(c, options(c));
  else if (t === "date") h = dateAEcrire();
  else h = "<span class='t plein'></span>";
  if (c.unitesChoix && c.unitesChoix.length) h += "<span class='u'>" + cases(c, c.unitesChoix) + "</span>";
  else if (c.unite) h += "<span class='u'>" + esc(c.unite) + "</span>";
  enfants.forEach((e) => {
    const val = Array.isArray(e.condition.valeur) ? e.condition.valeur.join(" / ") : e.condition.valeur;
    h += "<span class='si'>si " + esc(val) + " — " + esc(String(e.label || e.id).toLowerCase()) + " : " + trait(26) + "</span>";
  });
  return h;
}

// délai demandé : la valeur, l'unité et la date précise ne font qu'une seule case sur papier
function contenuDelai(unite) {
  const ops = options(unite);
  const sur = (o) => o === DELAI_DATE
    ? "<span class='o'>" + boite() + esc(o) + " : " + dateAEcrire() + "</span>"
    : "<span class='o'>" + boite() + esc(o) + "</span>";
  const apart = (o) => o === DELAI_DATE || o === PAS_DE_DELAI;
  return trait(12) + ops.filter((o) => !apart(o)).map(sur).join("") + "<div class='ligne2'>" + ops.filter(apart).map(sur).join("") + "</div>";
}

export function genHtmlEntreeVierge(titreType, champs) {
  const liste = (champs || []).filter((c) => c && c.id);
  // un champ « seulement si… » (condition simple sur un autre champ) se range sur la ligne de ce champ
  const parId = new Map(liste.map((c) => [c.id, c]));
  const estEnfant = (c) => c.condition && typeof c.condition === "object" && !Array.isArray(c.condition) && c.condition.champ && parId.has(c.condition.champ)
    && !SANS_SAISIE(parId.get(c.condition.champ)) && ["oui_non", "choix", "select"].includes(parId.get(c.condition.champ).type) && !SANS_SAISIE(c);
  const enfantsDe = (c) => liste.filter((e) => estEnfant(e) && e.condition.champ === c.id);
  // N° DE juste après la date d'entrée, tout en haut : c'est ce qu'on écrit en premier sur le dossier
  const ordre = liste.slice();
  const iDe = ordre.findIndex((c) => c.id === "de"), iDate = ordre.findIndex((c) => c.id === "date_entree");
  if (iDe >= 0 && iDate >= 0) { const [de] = ordre.splice(iDe, 1); ordre.splice(ordre.findIndex((c) => c.id === "date_entree") + 1, 0, de); }
  const delaiUnite = liste.find((c) => c.id === "delai_unite");

  const cellules = [];
  let titrePending = null;
  ordre.forEach((c) => {
    if (c.type === "titre") { titrePending = c.label; return; }
    if (SANS_SAISIE(c) || estEnfant(c)) return;
    if (c.id === "delai_valeur" || c.id === "delai_date") return; // regroupés avec l'unité
    let k, h, grand;
    if (c.id === "delai_unite") {
      const v = liste.find((x) => x.id === "delai_valeur");
      k = esc((v && v.label) || "Délai demandé par le client") + " *"; h = contenuDelai(delaiUnite); grand = true;
    } else {
      const enf = enfantsDe(c);
      k = intitule(c); h = contenu(c, enf);
      const longOptions = options(c).reduce((s, o) => s + String(o).length + 4, 0) + (c.unitesChoix || []).reduce((s, o) => s + String(o).length + 4, 0);
      grand = !!(c.dictee || c.type === "textarea" || longOptions > 46);
    }
    cellules.push({titre: titrePending, html: "<div class='c" + (c.dictee || c.type === "textarea" ? " zt" : "") + "'><div class='k'>" + k + "</div><div class='z'>" + h + "</div></div>", grand, zone: !!(c.dictee || c.type === "textarea")});
    titrePending = null;
  });

  // rangées : deux petites cases côte à côte, une grande case seule (une petite orpheline prend toute la largeur)
  const rangees = [];
  let attente = null;
  const vider = () => { if (attente) { rangees.push({cases: [attente]}); attente = null; } };
  cellules.forEach((cel) => {
    if (cel.titre) { vider(); rangees.push({titre: cel.titre}); }
    if (cel.grand) { vider(); rangees.push({cases: [cel]}); }
    else if (attente) { rangees.push({cases: [attente, cel]}); attente = null; }
    else attente = cel;
  });
  vider();
  const corps = rangees.map((r) => r.titre !== undefined
    ? "<div class='tt'>" + esc(r.titre) + "</div>"
    : "<div class='r" + (r.cases.some((x) => x.zone) ? " rz" : "") + "'>" + r.cases.map((x) => x.html).join("") + "</div>").join("");

  const css = "@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}" +
    "body{font-family:Arial,Helvetica,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".page{width:210mm;height:296mm;padding:9mm 11mm 6mm;display:flex;flex-direction:column;overflow:hidden}" +
    ".haut{display:flex;align-items:center;justify-content:space-between;gap:6mm;border-bottom:2.5px solid #1B4F8A;padding-bottom:3mm}.haut img{height:15mm}" +
    ".doc{text-align:right}.doc b{display:block;font-size:20pt;line-height:1.05;color:#1B4F8A;text-transform:uppercase;letter-spacing:.05em}" +
    ".doc span{display:inline-block;margin-top:1.8mm;padding:1.2mm 5mm;border:.8mm solid #111;border-radius:2mm;font-size:15pt;font-weight:700;text-transform:uppercase;letter-spacing:.06em}" +
    ".note{margin-top:2.2mm;font-size:8pt;color:#555;text-align:center}" +
    ".grille{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;justify-content:space-evenly;font-size:9.5pt;margin-top:1.5mm}" +
    ".r{display:flex;gap:5mm;padding:.5em 0;border-bottom:.2mm dotted #999}.r:last-child{border-bottom:0}.r.rz{flex:1 1 auto}" +
    ".c{flex:1 1 0;min-width:0}.k{font-size:.78em;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#555;margin-bottom:.25em}" +
    ".z{display:flex;flex-wrap:wrap;align-items:flex-end;column-gap:.9em;row-gap:.25em;min-height:2.1em;font-size:1em;line-height:1.25}" +
    ".o{display:inline-flex;align-items:center;white-space:nowrap}.b{display:inline-block;width:1.05em;height:1.05em;border:.3mm solid #111;margin-right:.35em;flex:0 0 auto}" +
    ".t{display:inline-block;border-bottom:.3mm solid #444;height:1.4em;vertical-align:bottom}.t.plein{flex:1 1 20mm;min-width:20mm}" +
    ".u{display:inline-flex;gap:.7em;align-items:center;color:#444;font-size:.92em}.si{display:inline-flex;align-items:flex-end;gap:.3em;color:#333;font-size:.92em}" +
    ".ligne2{flex:1 0 100%;display:flex;gap:1.6em}.zone{width:100%;min-height:15mm;border:.3mm solid #444;border-radius:1mm;flex:1}.c.zt{display:flex;flex-direction:column}.c.zt .z{flex:1;align-items:stretch}" +
    ".tt{margin-top:.3em;padding:.25em .6em;background:#E8EEF6;color:#1B4F8A;font-size:.85em;font-weight:700;text-transform:uppercase;letter-spacing:.06em}" +
    ".pied{margin-top:2mm;padding-top:2mm;border-top:1px solid #bbb;text-align:center;font-size:7.5pt;color:#666}";
  // si les cases dépassent la feuille, on réduit la taille du texte jusqu'à tout faire tenir sur une seule page
  const ajuste = "(function(){var g=document.querySelector('.grille');if(!g)return;var f=9.5;while(g.scrollHeight>g.clientHeight+1&&f>5.5){f-=0.25;g.style.fontSize=f+'pt';}})();";
  return "<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'><title>Fiche d'entrée vierge " + esc(titreType) + "</title><style>" + css + "</style></head><body><div class='page'>" +
    "<div class='haut'><img src='" + LOGO_B64 + "' alt='PMV Services'/><div class='doc'><b>Fiche d'entrée — vierge</b><span>" + esc(titreType) + "</span></div></div>" +
    "<div class='note'>À remplir à la main, à la réception du matériel (tablette indisponible), puis à saisir dans l'appli. * = obligatoire dans l'appli.</div>" +
    "<div class='grille'>" + corps + "</div>" +
    "<div class='pied'>PMV Services — 7 rue des entrepreneurs, 37390 La Membrolle sur Choisille — 09 67 37 27 24 — agence@pmvservices.fr</div>" +
    "</div><script>" + ajuste + "</script></body></html>";
}
