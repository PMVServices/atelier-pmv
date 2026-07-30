/* eslint-disable */
import {
  Document, Packer, Paragraph, TextRun, ImageRun, Header, PageBreak,
  HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType,
  BorderStyle, VerticalAlign,
} from "docx";
import { ISO_CHART_B64, LOGO_B64 } from "./pdfUtils";

// ─── Helpers image ──────────────────────────────────────────────────────
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

function readDimensions(bytes) {
  return new Promise((resolve) => {
    const blob = new Blob([bytes]);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth || 400, h: img.naturalHeight || 300 }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ w: 400, h: 300 }); };
    img.src = url;
  });
}

async function loadImage(src) {
  if (!src) return null;
  try {
    let bytes;
    if (src.indexOf("data:") === 0) {
      bytes = base64ToBytes(src);
    } else {
      const res = await fetch(src);
      bytes = new Uint8Array(await res.arrayBuffer());
    }
    const { w, h } = await readDimensions(bytes);
    return { data: bytes, type: detectType(bytes), w, h };
  } catch (e) { return null; }
}

function fitBox(img, maxW, maxH) {
  if (!img) return { width: 1, height: 1 };
  const ratio = Math.min(maxW / img.w, maxH / img.h, 1);
  return { width: Math.round(img.w * ratio), height: Math.round(img.h * ratio) };
}

function imgParagraph(img, maxW, maxH, keepNext) {
  if (!img) return null;
  const size = fitBox(img, maxW, maxH);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    keepNext: !!keepNext,
    children: [new ImageRun({ type: img.type, data: img.data, transformation: size })],
  });
}

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function sideBySideImages(imgA, imgB, maxW, maxH) {
  const cellA = imgA ? [imgParagraph(imgA, maxW, maxH)] : [new Paragraph("")];
  const cellB = imgB ? [imgParagraph(imgB, maxW, maxH)] : [new Paragraph("")];
  if (!imgA && !imgB) return null;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [new TableRow({
      children: [
        new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, verticalAlign: VerticalAlign.TOP, children: cellA }),
        new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, verticalAlign: VerticalAlign.TOP, children: cellB }),
      ],
    })],
  });
}

// ─── Helpers texte ──────────────────────────────────────────────────────
function clean(val) { return (val || "").replace("Autre:", "").trim(); }
function has(val) { return val !== undefined && val !== null && String(val).trim() !== ""; }

function heading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 200, after: 200 },
    keepNext: true,
    border: { left: { style: BorderStyle.SINGLE, size: 24, color: "1B4F8A", space: 8 } },
    children: [new TextRun({ text, bold: true, color: "1B4F8A", size: 32 })],
  });
}
function subhead(text) {
  return new Paragraph({ spacing: { before: 120, after: 80 }, keepNext: true, children: [new TextRun({ text: text.toUpperCase(), bold: true, color: "9CA3AF", size: 18 })] });
}
function p(text, opts) { return new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: text || "", size: 24, ...opts })] }); }
function pLines(lines) {
  return lines.map((l) => p(l));
}
function verdictRun(data, key) {
  const val = data[key] || "";
  if (val === "Conforme") return new TextRun({ text: "conforme", bold: true, color: "22863A", size: 24 });
  if (val === "Non conforme") return new TextRun({ text: "non conforme", bold: true, color: "D73A49", size: 24 });
  if (val.indexOf("Autre:") === 0) return new TextRun({ text: clean(val), size: 24 });
  return null;
}
function fieldCell(label, value) {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    borders: noBorders,
    margins: { top: 60, bottom: 200, left: 0, right: 200 },
    children: [
      new Paragraph({ children: [new TextRun({ text: (label || "").toUpperCase(), size: 16, color: "9CA3AF" })] }),
      new Paragraph({ children: [new TextRun({ text: value || "", size: 24, bold: true })] }),
    ],
  });
}
function fieldsGrid(pairs) {
  const rows = [];
  for (let i = 0; i < pairs.length; i += 2) {
    rows.push(new TableRow({ children: [fieldCell(pairs[i][0], pairs[i][1]), pairs[i + 1] ? fieldCell(pairs[i + 1][0], pairs[i + 1][1]) : fieldCell("", "")] }));
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, rows });
}

export async function genRapportDocx(v, data, photos) {
  v = v || {}; data = data || {}; photos = photos || {};
  function txt(id) { return clean(v[id]); }
  function num(id, unite) { const t = v[id]; return has(t) ? (t + (unite ? " " + unite : "")) : ""; }
  function isolPart(id) { const parts = (v[id] || "").split("_"); return parts[0] ? (parts[0] + (parts[1] ? " " + parts[1] : " GΩ")) : ""; }
  function parseCaptures() { try { const a = JSON.parse(data.adx_captures || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function sec() {
    try { const s = JSON.parse(data.sections || "{}"); return { electrique: s.electrique !== false, avant: s.avant !== false, mecanique: s.mecanique !== false, apres: s.apres !== false, conclusion: s.conclusion !== false }; }
    catch (e) { return { electrique: true, avant: true, mecanique: true, apres: true, conclusion: true }; }
  }
  const sections = sec();
  const now = new Date().toLocaleDateString("fr-FR");
  const dateRapport = data.date ? new Date(data.date).toLocaleDateString("fr-FR") : now;
  const dateReception = v.date_entree ? new Date(v.date_entree).toLocaleDateString("fr-FR") : "";

  // Préchargement des images utilisées
  const [logo, isoChart, imgVueEnsemble, imgPlaque, imgSkfAvDem, imgSkfArDem, imgStatorAv, imgStatorAr, imgSkfAvRem, imgSkfArRem, imgApres] = await Promise.all([
    loadImage(LOGO_B64), loadImage(ISO_CHART_B64),
    loadImage(photos.vue_ensemble), loadImage(photos.plaque_moteur),
    loadImage(photos.skf_av_dem), loadImage(photos.skf_ar_dem),
    loadImage(photos.stator_av), loadImage(photos.stator_ar),
    loadImage(photos.skf_av_rem), loadImage(photos.skf_ar_rem),
    loadImage(data.photo_apres_url),
  ]);
  const captures = parseCaptures();
  const captureImgs = await Promise.all(captures.map((c) => loadImage(c.url)));

  const CONTENT_W = 620; // largeur utile approx en px (page A4 - marges)

  // ─── En-tête (répété automatiquement par Word sur chaque page) ───────
  const headerChildren = [new Paragraph({
    tabStops: [{ type: "right", position: 9026 }],
    children: [
      ...(logo ? [new ImageRun({ type: logo.type, data: logo.data, transformation: fitBox(logo, 90, 40) })] : []),
      new TextRun({ text: "\tRapport ", size: 18, color: "6B7280" }),
      new TextRun({ text: txt("de") || "—", size: 18, color: "1B4F8A", bold: true }),
      new TextRun({ text: " — " + (txt("client") || "—"), size: 18, color: "6B7280" }),
    ],
  })];

  // ─── Couverture ────────────────────────────────────────────────────
  const coverSub = [txt("marque_moteur"), num("puissance", "kW"), txt("materiel_lieu")].filter(Boolean).join(" · ");
  const coverChildren = [
    ...(logo ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 300 }, children: [new ImageRun({ type: logo.type, data: logo.data, transformation: fitBox(logo, 220, 100) })] })] : []),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "RAPPORT D'ENTRETIEN", size: 20, color: "9CA3AF" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: "Moteur électrique", bold: true, size: 44 })] }),
    ...(coverSub ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: coverSub, bold: true, color: "E8720C", size: 26 })] })] : []),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: "PMV Services, votre spécialiste de l'entretien du moteur électrique et annexe. Ceci est un rapport d'entretien réalisé sur le chantier " + (txt("de") || "—") + (txt("client") ? " pour " + txt("client") : "") + ".", size: 20, color: "6B7280" })] }),
    fieldsGrid([["Client", txt("client")], ["Référence", txt("de")], ["Date", data.mois_annee || now], ["", ""]]),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // ─── Informations chantier ─────────────────────────────────────────
  const infoPairs = [["Client", txt("client")], ["Référence chantier", txt("de")], ["Adresse du chantier", data.adresse_chantier], ["Contact", data.contact], ["Référence / localisation", txt("materiel_lieu")], ["Bordereau d'expédition", data.bordereau], ["Date de réception", dateReception]].filter((f) => has(f[1]));
  const infoChildren = [];
  if (infoPairs.length) { infoChildren.push(heading("Informations chantier")); infoChildren.push(fieldsGrid(infoPairs)); }
  if (has(data.descriptif_travaux)) { infoChildren.push(heading("Travaux réalisés")); infoChildren.push(p(data.descriptif_travaux)); }

  // ─── Blocs conditionnels (mêmes règles que le HTML : on ne garde que ce qui a du contenu) ───
  const blocks = []; // { labels: [...], children: [...] }

  if (sections.electrique) {
    const arriveeImgs = [imgVueEnsemble, imgPlaque].filter(Boolean);
    const caption = [txt("type_moteur") ? "Modèle : " + txt("type_moteur") : "", txt("numero_serie") ? "N° : " + txt("numero_serie") : ""].filter(Boolean).join(" — ");
    if (arriveeImgs.length || caption) {
      const ch = [heading("Photo du moteur à l'arrivée")];
      arriveeImgs.forEach((img, idx) => ch.push(imgParagraph(img, CONTENT_W, 420, idx < arriveeImgs.length - 1 || !!caption)));
      if (caption) ch.push(new Paragraph({ children: [new TextRun({ text: caption, bold: true, size: 24 })] }));
      blocks.push({ labels: ["Photo du moteur à l'arrivée"], children: ch });
    }

    const elecLines = [];
    if (isolPart("isol_masse")) elecLines.push(new Paragraph({ children: [new TextRun({ text: "Isolement enroulement / masse = " + isolPart("isol_masse") + (num("isol_masse_dar") ? " avec un Dar de " + num("isol_masse_dar") : ""), size: 24 })] }));
    if (isolPart("isol_uv")) elecLines.push(new Paragraph({ children: [new TextRun({ text: "U / V = " + isolPart("isol_uv") + " / 1000V" + (num("isol_uv_dar") ? " avec un Dar de " + num("isol_uv_dar") : ""), size: 24 })] }));
    if (isolPart("isol_vw")) elecLines.push(new Paragraph({ children: [new TextRun({ text: "V / W = " + isolPart("isol_vw") + " / 1000V" + (num("isol_vw_dar") ? " avec un Dar de " + num("isol_vw_dar") : ""), size: 24 })] }));
    if (isolPart("isol_wu")) elecLines.push(new Paragraph({ children: [new TextRun({ text: "W / U = " + isolPart("isol_wu") + " / 1000V" + (num("isol_wu_dar") ? " avec un Dar de " + num("isol_wu_dar") : ""), size: 24 })] }));
    const vBobinage = verdictRun(data, "verdict_bobinage");
    if (vBobinage) elecLines.push(new Paragraph({ children: [new TextRun({ text: "Les valeurs d'isolement entre enroulements sont ", size: 24 }), vBobinage] }));
    const vMasse = verdictRun(data, "verdict_masse");
    if (vMasse) elecLines.push(new Paragraph({ children: [new TextRun({ text: "L'isolement à la masse est ", size: 24 }), vMasse] }));
    if (elecLines.length) {
      const ch = [heading("Rapport électrique du bobinage"), ...elecLines];
      blocks.push({ labels: ["Rapport électrique du bobinage"], children: ch });
    }

    captures.forEach((c, i) => {
      const img = captureImgs[i];
      if (!img) return;
      const ch = [subhead("Capture d'appareil"), imgParagraph(img, CONTENT_W, 620, !!c.caption)];
      if (c.caption) ch.push(p(c.caption));
      blocks.push({ labels: [], children: ch });
    });
  }

  if (sections.avant) {
    const intAvant = [num("int_p1_avant", "A"), num("int_p2_avant", "A"), num("int_p3_avant", "A")].filter(Boolean);
    const vibLines = [];
    if (num("vib_av_mms_avant")) vibLines.push("Vibration avant : " + num("vib_av_mms_avant", "mm/s") + (num("vib_av_ge_avant") ? " " + num("vib_av_ge_avant", "Ge") : ""));
    if (num("vib_ar_mms_avant")) vibLines.push("Vibration arrière : " + num("vib_ar_mms_avant", "mm/s") + (num("vib_ar_ge_avant") ? " " + num("vib_ar_ge_avant", "Ge") : ""));
    const photosAvant = sideBySideImages(imgSkfAvDem, imgSkfArDem, 280, 260);
    const hasContent = intAvant.length || vibLines.length || data.commentaire_vibration_avant || photosAvant;
    if (hasContent) {
      const ch = [];
      const labels = [];
      if (intAvant.length) { ch.push(heading("Relevé consommation électrique")); ch.push(p("Le moteur consomme à vide sous 400V " + intAvant.join(", ") + " par phase.")); labels.push("Relevé consommation électrique"); }
      if (vibLines.length || data.commentaire_vibration_avant || photosAvant) {
        ch.push(heading("Mesure de vibration avant entretien"));
        ch.push(subhead("Avant intervention"));
        vibLines.forEach((l) => ch.push(p(l)));
        if (data.commentaire_vibration_avant) ch.push(p(data.commentaire_vibration_avant));
        if (photosAvant) ch.push(photosAvant);
        labels.push("Mesure de vibration avant entretien");
      }
      blocks.push({ labels, children: ch });
    }
  }

  if (sections.mecanique) {
    const portees = [];
    function porteeLine(label, valId, verdictKey) {
      const val = num(valId, "mm");
      if (!val) return;
      const vv = verdictRun(data, verdictKey);
      portees.push(new Paragraph({ children: [new TextRun({ text: label + " est de " + val + (vv ? ", cette valeur est " : "."), size: 24 }), ...(vv ? [vv, new TextRun({ text: ".", size: 24 })] : [])] }));
    }
    porteeLine("La portée interne côté commande", "mesure_arbre_av", "verdict_arbre_av");
    porteeLine("La portée extérieure côté commande", "mesure_flasque_av", "verdict_flasque_av");
    porteeLine("La portée interne côté opposé commande", "mesure_arbre_ar", "verdict_arbre_ar");
    porteeLine("La portée extérieure côté opposé commande", "mesure_flasque_ar", "verdict_flasque_ar");
    const roulementsLines = [];
    if (txt("type_roulement_av")) roulementsLines.push("Roulement avant (côté commande) : " + txt("type_roulement_av"));
    if (txt("type_roulement_ar")) roulementsLines.push("Roulement arrière (côté opposé commande) : " + txt("type_roulement_ar"));
    const photosDemontage = sideBySideImages(imgStatorAv, imgStatorAr, 280, 260);
    if (portees.length || roulementsLines.length || photosDemontage || data.commentaire_roulements) {
      const ch = [heading("Partie mécanique après extraction des roulements"), ...portees];
      if (data.commentaire_roulements) ch.push(p(data.commentaire_roulements));
      roulementsLines.forEach((l) => ch.push(p(l)));
      if (photosDemontage) ch.push(photosDemontage);
      if (photosDemontage && data.commentaire_demontage) ch.push(p(data.commentaire_demontage));
      blocks.push({ labels: ["Partie mécanique après extraction des roulements"], children: ch });
    }
  }

  if (sections.apres) {
    const vibApresParts = [];
    if (num("vib_av_mms_apres")) vibApresParts.push(num("vib_av_mms_apres", "mm/s") + " CC");
    if (num("vib_ar_mms_apres")) vibApresParts.push(num("vib_ar_mms_apres", "mm/s") + " COC");
    const photosApres = sideBySideImages(imgSkfAvRem, imgSkfArRem, 280, 260);
    const int400 = [num("int_p1_apres", "A"), num("int_p2_apres", "A"), num("int_p3_apres", "A")].filter(Boolean);
    const int560 = [num("int_560_p1_apres", "A"), num("int_560_p2_apres", "A"), num("int_560_p3_apres", "A")].filter(Boolean);
    const consoLines = [];
    if (int400.length) consoLines.push("Le moteur consomme à vide sous 400V " + int400.join(", ") + " par phase.");
    if (int560.length) consoLines.push("Le moteur consomme sous 560V " + int560.join(", ") + " par phase.");
    if (data.ensemble_libre) consoLines.push(data.ensemble_libre);
    if (vibApresParts.length || photosApres || consoLines.length) {
      const ch = [];
      const labels = [];
      if (vibApresParts.length || photosApres) {
        ch.push(heading("Essai mécanique après entretien et remplacement des roulements"));
        ch.push(subhead("Après intervention"));
        if (vibApresParts.length) ch.push(p("Le moteur vibre à " + vibApresParts.join(" et ") + " pour une norme à 3mm/s."));
        if (photosApres) ch.push(photosApres);
        labels.push("Essai mécanique après entretien et remplacement des roulements");
      }
      if (consoLines.length) {
        ch.push(heading("Relevé consommation électrique et mesure de vibration après entretien"));
        consoLines.forEach((l) => ch.push(p(l)));
        labels.push("Relevé consommation électrique et mesure de vibration après entretien");
      }
      blocks.push({ labels, children: ch });
    }
  }

  if (sections.conclusion) {
    const vMeca = verdictRun(data, "verdict_meca");
    const vElec = verdictRun(data, "verdict_elec");
    const conclLines = [];
    if (vMeca) conclLines.push(new Paragraph({ children: [new TextRun({ text: "Le moteur est ", size: 24 }), vMeca, new TextRun({ text: " mécaniquement", size: 24 })] }));
    if (vElec) conclLines.push(new Paragraph({ children: [new TextRun({ text: "Le moteur est ", size: 24 }), vElec, new TextRun({ text: " électriquement", size: 24 })] }));
    if (conclLines.length || imgApres || data.commentaire_apres) {
      const ch = [heading("Conclusion"), ...conclLines];
      if (data.commentaire_apres) ch.push(p(data.commentaire_apres));
      if (imgApres) ch.push(imgParagraph(imgApres, CONTENT_W, 420));
      const signLines = [];
      if (data.certifie_par) signLines.push("Entretien certifié conforme par " + data.certifie_par + (dateRapport ? " le " + dateRapport : ""));
      if (data.realise_par) signLines.push("Rapport réalisé par " + data.realise_par + (dateRapport ? " le " + dateRapport : ""));
      signLines.forEach((l) => ch.push(p(l)));
      blocks.push({ labels: conclLines.length ? ["Conclusion"] : [], children: ch });
    }
  }

  // ─── Sommaire (construit d'après ce qui a réellement du contenu) ─────
  const sommaireLines = ["Norme ISO"].concat(blocks.reduce((acc, b) => acc.concat(b.labels), []));
  const sommaireChildren = [
    heading("Sommaire"),
    ...sommaireLines.map((s, i) => p((i + 1) + ". " + s)),
  ];
  if (isoChart) sommaireChildren.push(imgParagraph(isoChart, CONTENT_W, 500));

  const body = [
    ...coverChildren,
    ...infoChildren,
    ...sommaireChildren,
  ];
  blocks.forEach((b) => body.push(...b.children));

  const doc = new Document({
    sections: [{
      properties: { titlePage: true, page: { margin: { top: 1080, bottom: 900, left: 900, right: 900, header: 500, footer: 500 } } },
      headers: { default: new Header({ children: headerChildren }), first: new Header({ children: [] }) },
      children: body,
    }],
  });

  return Packer.toBlob(doc);
}

export async function exporterRapportDocx(v, data, photos, filename) {
  const blob = await genRapportDocx(v, data, photos);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (filename || "rapport") + ".docx";
  a.click();
}
