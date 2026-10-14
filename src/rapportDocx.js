/* eslint-disable */
// Rapport client au format Word (.docx). Le contenu vient de rapportModele.js ; ce fichier ne fait que la mise en page.
import {
  Document, Packer, Paragraph, TextRun, ImageRun, Header, Footer, PageNumber,
  AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign,
  ShadingType, TabStopType, HeadingLevel,
  HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, VerticalPositionAlign, HorizontalPositionAlign, TextWrappingType,
} from "docx";
import { ISO_CHART_B64, LOGO_B64 } from "./pdfUtils";
import { construireRapport, BANDE } from "./rapportModele";

// ─── Charte ─────────────────────────────────────────────────────────────
const FONT = "Arial";
const BLEU = "1B4F8A", VERT = "00B050", GRIS = "6B7280", TEXTE = "1F2937", LIGNE = "D1D5DB", FOND = "F3F6FA";
const PX_CM = 37.8;                       // 96 dpi : taille des images en pixels
const cm = (x) => Math.round(x * PX_CM);
const MARGE_LR = 1247;                    // 2,2 cm
const LARGEUR_TWIPS = 11906 - 2 * MARGE_LR; // largeur utile = 16,6 cm
const LARGEUR = cm(16.6);

// ─── Images ─────────────────────────────────────────────────────────────
function base64ToBytes(dataUri) {
  const base64 = dataUri.split(",")[1] || dataUri;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function detectType(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return "gif";
  return "png";
}
function dimensions(bytes) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([bytes]));
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth || 400, h: img.naturalHeight || 300 }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ w: 400, h: 300 }); };
    img.src = url;
  });
}
// Photos de téléphone (plusieurs Mo, orientation EXIF) : redessinées en JPEG ≤ 1800 px. Le fichier Word passe de ~30 Mo à ~3 Mo
// et l'image est toujours à l'endroit dans Word.
function recompresser(bytes, max, qualite) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([bytes]));
    const img = new Image();
    img.onload = () => {
      try {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
        c.toBlob(async (b) => {
          URL.revokeObjectURL(url);
          if (!b) return resolve(null);
          const buf = new Uint8Array(await b.arrayBuffer());
          resolve(buf.length < bytes.length || k < 1 ? { data: buf, type: "jpg", w, h } : null);
        }, "image/jpeg", qualite);
      } catch (e) { URL.revokeObjectURL(url); resolve(null); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}
async function chargerImage(src, compresser) {
  if (!src) return null;
  try {
    let bytes;
    if (src.indexOf("data:") === 0) bytes = base64ToBytes(src);
    else { const res = await fetch(src); if (!res.ok) return null; bytes = new Uint8Array(await res.arrayBuffer()); }
    const d = await dimensions(bytes);
    let out = { data: bytes, type: detectType(bytes), w: d.w, h: d.h };
    if (compresser && (bytes.length > 350000 || Math.max(d.w, d.h) > 1800)) {
      const c = await recompresser(bytes, 1800, 0.82);
      if (c) out = c;
    }
    return out;
  } catch (e) { return null; }
}
function fitBox(img, maxW, maxH) {
  if (!img) return { width: 1, height: 1 };
  const ratio = Math.min(maxW / img.w, maxH / img.h, 1);
  return { width: Math.max(1, Math.round(img.w * ratio)), height: Math.max(1, Math.round(img.h * ratio)) };
}
// Bande décorative de la page de garde, dessinée sur un canvas d'après la géométrie partagée avec le PDF
async function dessinerBande() {
  const c = document.createElement("canvas"); c.width = BANDE.w; c.height = BANDE.h;
  const g = c.getContext("2d");
  BANDE.formes.forEach((f) => {
    g.fillStyle = f.fill; g.beginPath();
    f.pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath(); g.fill();
  });
  const blob = await new Promise((r) => c.toBlob(r, "image/png"));
  return { data: new Uint8Array(await blob.arrayBuffer()), type: "png", w: BANDE.w, h: BANDE.h };
}

// ─── Briques de mise en page ────────────────────────────────────────────
const run = (text, o) => new TextRun({ text: text || "", font: FONT, size: 22, color: TEXTE, ...o });
function runsDe(parts, o) {
  o = o || {};
  return parts.map((p) => {
    if (typeof p === "string") return run(p, o);
    if (p.b !== undefined) return run(p.b, { ...o, bold: true });
    if (p.v === "ok") return run(p.txt, { ...o, bold: true, color: "1E6B2E", shading: { type: ShadingType.CLEAR, fill: "CDEFD4", color: "auto" } });
    if (p.v === "ko") return run(p.txt, { ...o, bold: true, color: "9C1C1C", shading: { type: ShadingType.CLEAR, fill: "F8D0D0", color: "auto" } });
    return run(p.txt, { ...o, bold: true });
  });
}
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function titreChapitre(n, titre, nouvellePage) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, pageBreakBefore: !!nouvellePage, keepNext: true, keepLines: true,
    spacing: { before: nouvellePage ? 0 : 360, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: VERT, space: 4 } },
    children: [run(n + ". ", { bold: true, size: 30, color: VERT }), run(titre, { bold: true, size: 30, color: BLEU })],
  });
}
function intertitre(txt) {
  return new Paragraph({ keepNext: true, keepLines: true, spacing: { before: 240, after: 100 }, children: [run(txt, { bold: true, size: 24, color: BLEU })] });
}
function paragraphe(parts, o) {
  o = o || {};
  return new Paragraph({ keepLines: true, spacing: { after: o.apres === undefined ? 100 : o.apres, line: 276 }, children: runsDe(parts, o.run) });
}
function legende(txt) {
  return new Paragraph({ alignment: AlignmentType.CENTER, keepLines: true, spacing: { before: 40, after: 120 }, children: [run(txt, { size: 18, color: GRIS, italics: true })] });
}
function imageParagraph(img, maxW, maxH, o) {
  o = o || {};
  return new Paragraph({
    alignment: AlignmentType.CENTER, keepNext: !!o.keepNext, pageBreakBefore: !!o.pageBreakBefore,
    spacing: { before: 60, after: o.legende ? 0 : 140 },
    children: [new ImageRun({ type: img.type, data: img.data, transformation: fitBox(img, maxW, maxH) })],
  });
}
function paireImages(items, imgs) {
  const cellule = (it, img) => new TableCell({
    width: { size: Math.floor(LARGEUR_TWIPS / 2), type: WidthType.DXA }, borders: noBorders, verticalAlign: VerticalAlign.TOP,
    margins: { left: 80, right: 80, top: 40, bottom: 40 },
    children: img ? [imageParagraph(img, cm(7.9), cm(9.2), { keepNext: true, legende: it.legende }), ...(it.legende ? [legende(it.legende)] : [])] : [new Paragraph("")],
  });
  const cells = items.map((it, i) => cellule(it, imgs[i]));
  if (cells.length === 1) cells.push(new TableCell({ width: { size: Math.floor(LARGEUR_TWIPS / 2), type: WidthType.DXA }, borders: noBorders, children: [new Paragraph("")] }));
  return new Table({
    width: { size: LARGEUR_TWIPS, type: WidthType.DXA }, columnWidths: [Math.floor(LARGEUR_TWIPS / 2), Math.floor(LARGEUR_TWIPS / 2)],
    borders: { ...noBorders, insideHorizontal: noBorder, insideVertical: noBorder },
    rows: [new TableRow({ cantSplit: true, children: cells })],
  });
}

function tableauIdentite(lignes) {
  const L = 3100, R = LARGEUR_TWIPS - L;
  const trait = { style: BorderStyle.SINGLE, size: 4, color: LIGNE };
  return new Table({
    width: { size: LARGEUR_TWIPS, type: WidthType.DXA }, columnWidths: [L, R],
    borders: { top: trait, bottom: trait, left: noBorder, right: noBorder, insideHorizontal: trait, insideVertical: noBorder },
    rows: lignes.map((l) => new TableRow({
      cantSplit: true,
      children: [
        new TableCell({ width: { size: L, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: FOND, color: "auto" }, verticalAlign: VerticalAlign.CENTER, margins: { top: 90, bottom: 90, left: 140, right: 100 },
          children: [new Paragraph({ children: [run(l.k, { bold: true, size: 20, color: BLEU })] })] }),
        new TableCell({ width: { size: R, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 90, bottom: 90, left: 160, right: 100 },
          children: l.v.split(/\r?\n/).map((t) => new Paragraph({ children: [run(t, { size: 21 })] })) }),
      ],
    })),
  });
}

// ─── Génération ─────────────────────────────────────────────────────────
export async function genRapportDocx(v, data, photos) {
  const M = construireRapport(v, data, photos);

  // chargement des images (une seule fois par URL)
  const cache = new Map();
  const urls = new Set();
  M.chapitres.forEach((ch) => ch.blocs.forEach((b) => {
    if (b.url) urls.add(b.url);
    if (b.items) b.items.forEach((it) => it.url && urls.add(it.url));
  }));
  await Promise.all([...urls].map(async (u) => cache.set(u, await chargerImage(u, true))));
  const [logo, iso, bande] = await Promise.all([chargerImage(LOGO_B64, false), chargerImage(ISO_CHART_B64, false), dessinerBande()]);
  const img = (u) => cache.get(u) || null;

  // ── en-tête / pied de page (pas sur la couverture) ──
  const enTete = new Header({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: LARGEUR_TWIPS }],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LIGNE, space: 4 } },
    spacing: { after: 0 },
    children: [
      ...(logo ? [new ImageRun({ type: logo.type, data: logo.data, transformation: fitBox(logo, cm(2.6), cm(1.15)) })] : []),
      run("\t" + M.entete, { size: 17, color: GRIS }),
    ],
  })] });
  const pied = new Footer({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: LARGEUR_TWIPS }],
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: LIGNE, space: 4 } },
    children: [
      run("PMV ", { bold: true, size: 17, color: "404040" }), run("Services", { bold: true, size: 17, color: VERT }),
      run(", " + M.societe.accroche, { size: 17, color: "404040" }),
      run("\tPage ", { size: 17, color: "404040" }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 17, bold: true, color: "404040" }),
      run(" sur ", { size: 17, color: "404040" }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 17, bold: true, color: "404040" }),
    ],
  })] });
  const vide = () => new Paragraph("");

  // ── 1. page de garde ──
  const couv = [];
  couv.push(new Paragraph({
    spacing: { after: 0 },
    children: [
      ...(logo ? [new ImageRun({ type: logo.type, data: logo.data, transformation: fitBox(logo, cm(7), cm(3.6)) })] : []),
      // bande décorative, collée en bas de page, derrière le texte
      new ImageRun({
        type: bande.type, data: bande.data, transformation: { width: cm(21), height: Math.round(cm(21) * bande.h / bande.w) },
        floating: {
          horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, align: HorizontalPositionAlign.LEFT },
          verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, align: VerticalPositionAlign.BOTTOM },
          behindDocument: true, allowOverlap: true, wrap: { type: TextWrappingType.NONE },
        },
      }),
    ],
  }));
  couv.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 5200, after: 120 }, children: [run(M.couverture.titre, { bold: true, size: 52, color: TEXTE })] }));
  couv.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [run(M.couverture.objet, { bold: true, size: 36, color: BLEU })] }));
  if (M.couverture.serie) couv.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [run(M.couverture.serie, { size: 26, color: GRIS })] }));
  if (M.couverture.cible) couv.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [run(M.couverture.cible, { size: 24, color: TEXTE })] }));
  couv.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 1500, after: 0 }, children: [run(M.couverture.date, { size: 88, color: "1F2937" })] }));

  // ── 2. identification + sommaire ──
  const id = [];
  id.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 60 }, children: [run("PMV ", { bold: true, size: 26, color: "404040" }), run("Services", { bold: true, size: 26, color: VERT })] }));
  M.societe.adresse.forEach((l) => id.push(new Paragraph({ spacing: { after: 0 }, children: [run(l, { size: 20, color: TEXTE })] })));
  id.push(new Paragraph({ spacing: { after: 0 }, children: [run("Tél : " + M.societe.tel, { size: 20 })] }));
  id.push(new Paragraph({ spacing: { after: 280 }, children: [run(M.societe.mail + "   ·   " + M.societe.site, { size: 20, color: BLEU })] }));
  id.push(new Paragraph({ spacing: { after: 160 }, border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: VERT, space: 4 } }, children: [run("Rapport d'entretien", { bold: true, size: 34, color: BLEU })] }));
  if (M.identite.length) { id.push(tableauIdentite(M.identite)); }
  id.push(new Paragraph({ keepNext: true, spacing: { before: 360, after: 120 }, children: [run("Sommaire", { bold: true, size: 26, color: BLEU })] }));
  M.sommaire.forEach((s) => id.push(new Paragraph({ spacing: { after: 70 }, indent: { left: 200 }, children: [run(s, { size: 22 })] })));

  // ── 3. chapitres ──
  const corps = [];
  M.chapitres.forEach((ch, i) => {
    corps.push(titreChapitre(i + 1, ch.titre, i === 0));
    ch.blocs.forEach((b) => {
      if (b.t === "iso") {
        corps.push(new Paragraph({ keepNext: true, spacing: { before: 60, after: 100 }, children: [run("NORME ISO 10816-3 des vitesses vibratoires des machines tournantes de puissance >15 kW", { bold: true, size: 21 })] }));
        if (iso) corps.push(imageParagraph(iso, LARGEUR, cm(11.4)));
      } else if (b.t === "sous") {
        corps.push(intertitre(b.txt));
      } else if (b.t === "para") {
        corps.push(paragraphe(b.parts));
      } else if (b.t === "lignes") {
        const petit = b.petit ? { size: 19 } : null;
        b.lignes.forEach((l, k) => corps.push(new Paragraph({
          keepLines: true, spacing: { before: b.espace && k === 0 ? 360 : 0, after: k === b.lignes.length - 1 && !b.petit ? 160 : (b.petit ? 50 : 70), line: 276 }, children: runsDe(l, petit),
        })));
      } else if (b.t === "img") {
        const im = img(b.url);
        if (im) {
          const dim = b.taille === "grande" ? [14, 8.2] : b.taille === "petite" ? [11.5, 6.6] : [13, 8];
          corps.push(imageParagraph(im, cm(dim[0]), cm(dim[1]), { legende: b.legende }));
          if (b.legende) corps.push(legende(b.legende));
        }
      } else if (b.t === "paire") {
        const imgs = b.items.map((it) => img(it.url));
        if (imgs.some(Boolean)) corps.push(paireImages(b.items, imgs));
      } else if (b.t === "capture") {
        const im = img(b.url);
        if (im) {
          const taille = fitBox(im, LARGEUR, cm(21.5));
          corps.push(imageParagraph(im, LARGEUR, cm(taille.height > cm(10) ? 20.5 : 21.5), { keepNext: !!b.legende, legende: b.legende }));
          if (b.legende) corps.push(legende(b.legende));
        }
      }
    });
  });

  const marges = { top: 1560, bottom: 1200, left: MARGE_LR, right: MARGE_LR, header: 520, footer: 480 };
  const doc = new Document({
    creator: "PMV Services",
    title: "Rapport d'entretien " + (M.de || ""),
    styles: { default: { document: { run: { font: FONT, size: 22, color: TEXTE } } } },
    sections: [{
      properties: { titlePage: true, page: { size: { width: 11906, height: 16838 }, margin: marges } },
      headers: { default: enTete, first: new Header({ children: [vide()] }) },
      footers: { default: pied, first: new Footer({ children: [vide()] }) },
      children: [...couv, ...id, ...corps],
    }],
  });
  return Packer.toBlob(doc);
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") window.__rapportTest = { genRapportDocx, construireRapport };

export async function exporterRapportDocx(v, data, photos, filename) {
  const blob = await genRapportDocx(v, data, photos);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (filename || "rapport") + ".docx";
  a.click();
}
