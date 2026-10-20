/* eslint-disable */
// Rapport client « cheminée de freinage » au format Word (.docx). Le contenu vient de rapportCheminee.js ; ce fichier ne fait que la mise en page.
import {
  Document, Packer, Paragraph, TextRun, ImageRun, Header, Footer, PageNumber,
  AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign,
  ShadingType, TabStopType, HeadingLevel, UnderlineType,
  HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, VerticalPositionAlign, HorizontalPositionAlign, TextWrappingType,
} from "docx";
import { LOGO_B64 } from "./pdfUtils";
import { BANDE } from "./rapportModele";
import { chargerImage, fitBox, dessinerBande, cm, MARGE_LR, LARGEUR_TWIPS } from "./rapportDocx";
import { construireRapportCheminee, urlsRapportCheminee, adresseImage, valeursDepartRapportCheminee, resoudrePhotosCheminee, dimensionsRang } from "./rapportCheminee";

const FONT = "Calibri";
const NOIR = "000000", GRIS = "404040";
const FOND_VERDICT = { ok: "00FF00", res: "FFFF00", ko: "FF0000" };

const run = (text, o) => new TextRun({ text: text || "", font: FONT, size: 22, color: NOIR, ...o });
function runsDe(parts, o) {
  o = o || {};
  return parts.map((p) => {
    if (typeof p === "string") return run(p, o);
    if (p.b !== undefined) return run(p.b, { ...o, bold: true });
    if (p.bu !== undefined) return run(p.bu, { ...o, bold: true, underline: { type: UnderlineType.SINGLE } });
    if (p.rouge !== undefined) return run(p.rouge, { ...o, color: "FF0000" });
    if (p.v) return run(p.txt, { ...o, shading: { type: ShadingType.CLEAR, fill: FOND_VERDICT[p.v], color: "auto" } });
    return run(p.txt, o);
  });
}
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const trait = { style: BorderStyle.SINGLE, size: 4, color: NOIR };
const bordsNoirs = { top: trait, bottom: trait, left: trait, right: trait };

function titre1(txt, nouvellePage, premier) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, pageBreakBefore: !!nouvellePage, keepNext: true, keepLines: true,
    spacing: { before: nouvellePage || premier ? 0 : 360, after: 200 },
    children: [run(txt, { bold: true, size: 32, underline: { type: UnderlineType.SINGLE } })],
  });
}
function titre2(txt, leger) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2, keepNext: true, keepLines: true, spacing: { before: 260, after: 110 },
    children: [leger ? run(txt, { size: 22 }) : run(txt, { bold: true, size: 24, underline: { type: UnderlineType.SINGLE } })],
  });
}
const paragraphe = (parts, o) => new Paragraph({ keepLines: true, keepNext: !!(o && o.suite), spacing: { before: o && o.espace ? 320 : 0, after: 110, line: 264 }, children: runsDe(parts, o && o.grand ? { size: 26 } : null) });
function imageLigne(img, wCm, hCm, o) {
  o = o || {};
  return new Paragraph({
    alignment: o.centre ? AlignmentType.CENTER : AlignmentType.LEFT, keepNext: !!o.keepNext, keepLines: true,
    spacing: { before: 60, after: o.legende ? 0 : 140 },
    children: [new ImageRun({ type: img.type, data: img.data, transformation: fitBox(img, cm(wCm), cm(hCm)) })],
  });
}
const legende = (txt) => new Paragraph({ alignment: AlignmentType.CENTER, keepLines: true, spacing: { before: 40, after: 120 }, children: [run(txt, { size: 22 })] });

function rangImages(b, img) {
  // même hauteur pour toutes les photos de la ligne, largeurs proportionnelles, jamais de retour à la ligne (voir dimensionsRang)
  const items = b.items.map((it) => ({ it, im: img(it.url) })).filter((x) => x.im);
  const n = items.length;
  const MARGE_CM = 0.2; // marges gauche et droite d'une cellule (40 + 60 twips)
  const { h, largeurs } = dimensionsRang(items.map((x) => x.im.w / x.im.h), b.h, 16.6 - MARGE_CM * n, 0);
  const tw = (c) => Math.round((c + MARGE_CM) * 567);
  const cells = items.map((x, i) => {
    const legendeTexte = b.legendes && x.it.legende;
    return new TableCell({
      width: { size: tw(largeurs[i]), type: WidthType.DXA }, borders: noBorders, verticalAlign: VerticalAlign.TOP, margins: { left: 40, right: 60, top: 20, bottom: 20 },
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT, keepNext: !!legendeTexte, keepLines: true, spacing: { before: 60, after: legendeTexte ? 0 : 140 },
          children: [new ImageRun({ type: x.im.type, data: x.im.data, transformation: { width: Math.max(1, cm(largeurs[i])), height: Math.max(1, cm(h)) } })],
        }),
        ...(legendeTexte ? [legende(legendeTexte)] : []),
      ],
    });
  });
  const colonnes = largeurs.map(tw);
  return new Table({
    width: { size: colonnes.reduce((s, c) => s + c, 0), type: WidthType.DXA }, columnWidths: colonnes,
    borders: { ...noBorders, insideHorizontal: noBorder, insideVertical: noBorder },
    rows: [new TableRow({ cantSplit: true, children: cells })],
  });
}

function tableau(b) {
  const total = Math.round(LARGEUR_TWIPS * (b.largeur || 1));
  const somme = b.cols.reduce((a, c) => a + c, 0);
  const largeurs = b.cols.map((c) => Math.floor(total * c / somme));
  const dernier = b.rows.length - 1;
  return new Table({
    width: { size: largeurs.reduce((a, c) => a + c, 0), type: WidthType.DXA }, columnWidths: largeurs, borders: { ...bordsNoirs, insideHorizontal: trait, insideVertical: trait },
    rows: b.rows.map((r, ri) => new TableRow({
      cantSplit: true,
      children: r.map((c, ci) => {
        if (typeof c === "string") c = { txt: c };
        const taille = (c.taille || 11) * 2;
        const lignes = String(c.txt || "").split("\n");
        return new TableCell({
          width: { size: largeurs[ci], type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP, margins: { top: 30, bottom: 30, left: 60, right: 60 },
          children: lignes.map((t) => new Paragraph({
            alignment: c.align === "center" ? AlignmentType.CENTER : AlignmentType.LEFT, keepNext: ri < dernier, spacing: { after: 0 },
            children: [run(t, { size: taille, bold: !!c.b, ...(c.v ? { shading: { type: ShadingType.CLEAR, fill: FOND_VERDICT[c.v], color: "auto" } } : {}) })],
          })),
        });
      }),
    })),
  });
}

export async function genRapportLivretDocx(v, data, photos) {
  const M = construireRapportCheminee(v, data, photos);

  // chargement des images (une seule fois par adresse)
  const cache = new Map();
  await Promise.all(urlsRapportCheminee(M).map(async (u) => cache.set(u, await chargerImage(adresseImage(u), true))));
  const [logo, bande] = await Promise.all([chargerImage(LOGO_B64, false), dessinerBande()]);
  const img = (u) => cache.get(u) || null;
  const vide = () => new Paragraph("");

  // ── pied de page (pas sur la couverture), aucun en-tête comme dans les rapports d'origine ──
  const pied = new Footer({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: LARGEUR_TWIPS }],
    children: [
      run("PMV ", { bold: true, size: 16, color: GRIS }), run("Services", { bold: true, size: 16, color: "00B050" }),
      run(", " + M.societe.accroche, { size: 16, color: GRIS }),
      run("\tPage ", { size: 20, color: GRIS }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20, bold: true, color: GRIS }),
      run(" sur ", { size: 20, color: GRIS }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 20, bold: true, color: GRIS }),
    ],
  })] });

  // ── 1. page de garde ──
  const C = M.couverture;
  const couv = [];
  couv.push(new Paragraph({
    spacing: { after: 0 },
    children: [
      ...(logo ? [new ImageRun({ type: logo.type, data: logo.data, transformation: fitBox(logo, cm(6), cm(2.7)) })] : []),
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
  couv.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 700, after: 360 }, children: [run(C.titre, { bold: true, size: 44 })] }));
  const dessin = img(M.imagesCouverture.cheminee);
  if (dessin) couv.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new ImageRun({ type: dessin.type, data: dessin.data, transformation: fitBox(dessin, cm(6), cm(8.4)) })] }));
  const logoClient = C.logoClient ? img(M.imagesCouverture.imateq) : null;
  if (logoClient) couv.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new ImageRun({ type: logoClient.type, data: logoClient.data, transformation: fitBox(logoClient, cm(9), cm(3)) })] }));
  else if (C.client) couv.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 200 }, children: [run(C.client, { bold: true, size: 52 })] }));
  couv.push(new Paragraph({ indent: { left: 700 }, spacing: { before: 200, after: 1200 }, children: [run(C.travaux, { size: 24 })] }));
  if (C.date) {
    const orange = { style: BorderStyle.SINGLE, size: 16, color: "F79646" };
    couv.push(new Table({
      alignment: AlignmentType.RIGHT, width: { size: 2950, type: WidthType.DXA }, columnWidths: [2950],
      borders: { top: orange, bottom: orange, left: orange, right: orange, insideHorizontal: noBorder, insideVertical: noBorder },
      rows: [new TableRow({ children: [new TableCell({
        width: { size: 2950, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 90, bottom: 90, left: 100, right: 100 },
        shading: { type: ShadingType.CLEAR, fill: "FFFFFF", color: "auto" },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [run(C.date, { size: 26 })] })],
      })] })],
    }));
  }

  // ── 2. identification ──
  const id = [];
  id.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 80 }, children: logo ? [new ImageRun({ type: logo.type, data: logo.data, transformation: fitBox(logo, cm(5), cm(2.3)) })] : [] }));
  M.societe.lignes.forEach((l) => id.push(new Paragraph({ spacing: { after: 20, line: 340 }, children: [run(l, { size: 24 })] })));
  M.identite.forEach((l, i) => id.push(new Paragraph({
    spacing: { before: i === 0 ? 560 : 330, after: 0 },
    children: [run(l.k, { bold: true, size: 28, underline: { type: UnderlineType.SINGLE } }), run(" " + l.v, { size: 28 })],
  })));
  if (M.descriptif) {
    id.push(new Paragraph({ spacing: { before: 900, after: 140 }, children: [run("Descriptif des travaux réalisés par PMV Services :", { bold: true, size: 26, underline: { type: UnderlineType.SINGLE } })] }));
    id.push(new Paragraph({ indent: { left: 700 }, spacing: { after: 0 }, children: [run(M.descriptif, { size: 23 })] }));
  }

  // ── 3. sommaire + légende des couleurs ──
  const som = [];
  som.push(new Paragraph({ pageBreakBefore: true, spacing: { before: 800, after: 60 }, children: [new TextRun({ text: "Sommaire :", font: "Cambria", size: 28, bold: true, color: "365F91", shading: { type: ShadingType.CLEAR, fill: "D9D9D9", color: "auto" } })] }));
  M.sommaire.forEach((s) => som.push(new Paragraph({ spacing: { after: 50 }, indent: { left: s.niveau === 2 ? 260 : 0 }, children: [run(s.txt, { size: 23 })] })));
  som.push(new Paragraph({ keepNext: true, spacing: { before: 700, after: 160 }, children: [run("Légende des couleurs :", { size: 23 })] }));
  const colTw = Math.floor(LARGEUR_TWIPS / 3);
  som.push(new Table({
    width: { size: colTw * 3, type: WidthType.DXA }, columnWidths: [colTw, colTw, colTw],
    borders: { ...bordsNoirs, insideHorizontal: trait, insideVertical: trait },
    rows: [new TableRow({ cantSplit: true, height: { value: 850, rule: "atLeast" }, children: M.legende.map((l) => new TableCell({
      width: { size: colTw, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 60, right: 60 },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: runsDe([{ v: l.v, txt: l.txt }], { size: 28 }) })],
    })) })],
  }));

  // ── 4. corps ──
  const corps = [];
  let premier = true;
  const visuel = (i) => { const n = M.blocs[i + 1]; return !!n && ["img", "rang", "capture", "table"].indexOf(n.t) >= 0; };
  M.blocs.forEach((b, bi) => {
    if (b.t === "h1") { corps.push(titre1(b.txt, premier, premier)); premier = false; }
    else if (b.t === "h2") corps.push(titre2(b.txt, b.leger));
    else if (b.t === "para") corps.push(paragraphe(b.parts, { ...b, suite: visuel(bi) }));
    else if (b.t === "lignes") {
      b.lignes.forEach((l, k) => corps.push(new Paragraph({
        keepLines: true, keepNext: (k < b.lignes.length - 1 && b.lignes.length <= 8) || (k === b.lignes.length - 1 && visuel(bi)),
        spacing: { before: b.espace && k === 0 ? 320 : 0, after: k === b.lignes.length - 1 ? (b.apres ? 220 : 160) : 40, line: 264 },
        children: runsDe(l),
      })));
    } else if (b.t === "img") {
      const im = img(b.url);
      if (im) corps.push(imageLigne(im, b.w, b.h, { centre: b.centre }));
    } else if (b.t === "rang") {
      if (b.items.some((it) => img(it.url))) corps.push(rangImages(b, img), new Paragraph({ spacing: { after: 80 }, children: [] }));
    } else if (b.t === "capture") {
      const im = img(b.url);
      if (im) corps.push(imageLigne(im, 16.6, b.h, {}));
    } else if (b.t === "table") {
      corps.push(tableau(b), new Paragraph({ spacing: { after: 120 }, children: [] }));
    }
  });

  const marges = { top: 1500, bottom: 1200, left: MARGE_LR, right: MARGE_LR, header: 500, footer: 480 };
  const doc = new Document({
    creator: "PMV Rail",
    title: "Livret de rapport d'intervention " + (M.de || ""),
    styles: { default: { document: { run: { font: FONT, size: 22, color: NOIR } } } },
    sections: [{
      properties: { titlePage: true, page: { size: { width: 11906, height: 16838 }, margin: marges } },
      headers: { default: new Header({ children: [vide()] }), first: new Header({ children: [vide()] }) },
      footers: { default: pied, first: new Footer({ children: [vide()] }) },
      children: [...couv, ...id, ...som, ...corps],
    }],
  });
  return Packer.toBlob(doc);
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") window.__rapportCheminee = { genRapportLivretDocx, construireRapportCheminee, valeursDepartRapportCheminee, resoudrePhotosCheminee };

export async function exporterRapportCheminee(v, data, photos, filename) {
  const blob = await genRapportLivretDocx(v, data, photos);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (filename || "rapport") + ".docx";
  a.click();
}
