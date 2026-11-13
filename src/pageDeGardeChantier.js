import React, {useState} from "react";
import {LOGO_B64, lancerImpression} from "./pdfUtils";
import {normaliserNumero} from "./railClients";

// Page de garde de CHANTIER (demande du 13/11/2026) : une feuille A4 pour un dossier qui ne passe pas par l'atelier (pas de fiche d'entrée), créée depuis le tableau de bord.
// On donne le N° de chantier, le client et un bref résumé de la demande ; la feuille reprend le style de la page de garde de l'entrée atelier (pageDeGarde.js) et ajoute trois cadres de suivi
// à remplir à la main : demande de prix, attente du retour du client, devis / commande / livraison. « Page vierge » = la même feuille sans rien de rempli. Rien n'est enregistré.
const esc = (x) => String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const propre = (x) => String(x == null ? "" : x).replace(/\s+/g, " ").trim();
const aujourdhui = () => new Date().toLocaleDateString("fr-FR", {day: "2-digit", month: "2-digit", year: "numeric"});
const PERSONNES = ["DN", "SC", "TP", "TV"];

const case_ = () => "<i class='b'></i>";
const trait = (mm) => "<span class='t' style='min-width:" + mm + "mm'></span>";
const date = () => trait(9) + "/" + trait(9) + "/" + trait(13);
const faitPar = () => "Fait par " + PERSONNES.map((x) => "<span class='o'>" + case_() + x + "</span>").join("") + "<span class='o'>" + case_() + "Autre " + trait(14) + "</span>";
const relances = () => ["1<sup>ère</sup> relance le", "2<sup>ème</sup> relance le", "3<sup>ème</sup> relance le"].map((x) => "<div class='l'>" + x + " " + date() + " " + faitPar() + "</div>").join("");
const ligneFournisseur = (lib) => "<div class='fourn'><span class='lib'>" + lib + "</span><span class='t'></span>" + case_() + "<span>;</span><span class='t'></span>" + case_() + "</div>";

// d = {chantier, client, resume} ; vide => feuille vierge (rien d'imprimé dans les trois zones, des lignes à remplir à la main)
export function genHtmlPageDeGardeChantier(d) {
  d = d || {};
  const chantier = propre(d.chantier), client = propre(d.client), resume = String(d.resume || "").trim();
  const vierge = !chantier && !client && !resume;
  const tailleChantier = chantier.length > 9 ? 26 : chantier.length > 7 ? 32 : 40;
  const tailleClient = client.length > 40 ? 16 : client.length > 26 ? 20 : 24;
  const resumeHtml = resume
    ? "<p>" + esc(resume).replace(/\r?\n/g, "<br>") + "</p>"
    : "<div class='reglures'><i></i><i></i><i></i></div>";
  const css = "@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}body{font-family:Arial,Helvetica,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".page{width:210mm;height:296mm;padding:11mm 14mm 8mm;display:flex;flex-direction:column;overflow:hidden}" +
    ".haut{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1B4F8A;padding-bottom:3.5mm}.haut img{height:17mm}.doc{text-align:right;font-size:15pt;font-weight:700;color:#1B4F8A;text-transform:uppercase;letter-spacing:.06em}.doc small{display:block;margin-top:1mm;font-size:9pt;font-weight:400;color:#666;letter-spacing:0;text-transform:none}" +
    ".id{display:flex;gap:6mm;margin-top:6mm;align-items:stretch}.de{flex:0 0 66mm;text-align:center;border:1mm solid #111;border-radius:4mm;padding:3mm 2mm 4mm;display:flex;flex-direction:column;justify-content:center}.de small,.cl small{display:block;font-size:9.5pt;letter-spacing:.14em;text-transform:uppercase;color:#555}" +
    ".de b{display:block;margin-top:1mm;line-height:1.05;letter-spacing:.02em;overflow-wrap:anywhere}.de .vide{display:flex;align-items:flex-end;justify-content:center;gap:2mm;margin-top:2mm;height:14mm;font-size:34pt;font-weight:700}.de .vide span{flex:1;border-bottom:.4mm solid #444;height:9mm;max-width:38mm}" +
    ".cl{flex:1;min-width:0;border-bottom:1px solid #bbb;padding:3mm 0 0;display:flex;flex-direction:column;justify-content:center}.cl b{display:block;margin-top:1.5mm;line-height:1.15;overflow-wrap:anywhere}.cl .vide{margin-top:7mm;border-bottom:.4mm solid #444;height:8mm}" +
    ".dem{margin-top:5mm;border:.4mm solid #444;border-radius:3mm;padding:2.5mm 4mm 3.5mm}.dem small{display:block;font-size:9pt;letter-spacing:.12em;text-transform:uppercase;color:#555;margin-bottom:1mm}.dem p{margin:0;font-size:11.5pt;line-height:1.35;overflow-wrap:anywhere}" +
    ".reglures i{display:block;height:7.5mm;border-bottom:.3mm solid #999}" +
    ".cadre{margin-top:4.5mm;border:.5mm solid #333;border-radius:8mm;padding:3.5mm 6mm 3.5mm;font-size:10pt;flex:1;display:flex;flex-direction:column;justify-content:space-evenly}.cadre .titre{font-size:8.5pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#1B4F8A}" +
    ".l{display:block;line-height:1.75}.t{display:inline-block;border-bottom:.3mm solid #444;height:1.15em;vertical-align:bottom}.o{display:inline-flex;align-items:center;margin-left:2mm;white-space:nowrap}.b{display:inline-block;width:3.4mm;height:3.4mm;border:.3mm solid #111;margin-right:1.2mm;flex:0 0 auto}" +
    ".fourn{display:flex;gap:2.5mm;align-items:flex-end;height:7.5mm}.fourn .t{flex:1;height:1.15em}.fourn .lib{flex:0 0 8mm}" +
    ".pied{margin-top:3mm;padding-top:2mm;border-top:1px solid #bbb;text-align:center;font-size:8pt;color:#666}";
  return "<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'><title>Page de garde chantier " + esc(chantier) + "</title><style>" + css + "</style></head><body><div class='page'>" +
    "<div class='haut'><img src='" + LOGO_B64 + "' alt='PMV Services'/><div class='doc'>Dossier de chantier<small>" + (vierge ? "Créé le " + trait(8) + "/" + trait(8) + "/" + trait(11) : "Créé le " + aujourdhui()) + "</small></div></div>" +
    "<div class='id'><div class='de'><small>N° de chantier</small>" + (chantier ? "<b style='font-size:" + tailleChantier + "pt'>" + esc(chantier) + "</b>" : "<div class='vide'>DE<span></span></div>") + "</div>" +
    "<div class='cl'><small>Client</small>" + (client ? "<b style='font-size:" + tailleClient + "pt'>" + esc(client) + "</b>" : "<div class='vide'></div>") + "</div></div>" +
    "<div class='dem'><small>Demande du client</small>" + resumeHtml + "</div>" +
    "<div class='cadre'><div class='titre'>Demande de prix</div><div class='l'>Demande de prix faite le " + date() + " " + faitPar() + "</div>" + ligneFournisseur("À :") + ligneFournisseur("") + ligneFournisseur("") + relances() + "</div>" +
    "<div class='cadre'><div class='titre'>Attente du retour du client</div><div class='l'>Attente retour client le " + date() + " " + faitPar() + "</div><div class='l'>Raison : <span class='t' style='width:calc(100% - 20mm)'></span></div>" + relances() + "</div>" +
    "<div class='cadre'><div class='titre'>Devis, commande, livraison</div><div class='l'>Devis envoyé au client le " + date() + " " + faitPar() + "</div><div class='l'>Commande acceptée le " + date() + "</div><div class='l'>N° de commande client : " + trait(60) + "</div><div class='l'>Livraison du matériel prévue le " + date() + "</div></div>" +
    "<div class='pied'>PMV Services — 7 rue des entrepreneurs, 37390 La Membrolle sur Choisille — 09 67 37 27 24 — agence@pmvservices.fr</div>" +
    "</div></body></html>";
}

// ── bouton « Page de garde » du tableau de bord + fenêtre de saisie ──
const BLEU = "#1B4F8A";
const INP = {width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #D1D5DB", fontSize: 15, boxSizing: "border-box", background: "#fff", fontFamily: "inherit"};
const LBL = {display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".04em", margin: "12px 0 4px"};
const BTN = {background: BLEU, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer"};
const BTN_O = {background: "#fff", color: BLEU, border: "1.5px solid " + BLEU, borderRadius: 8, padding: "9px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer"};

export function BoutonPageDeGardeChantier({clients}) {
  const [ouvert, setOuvert] = useState(false);
  const [chantier, setChantier] = useState("");
  const [client, setClient] = useState("");
  const [resume, setResume] = useState("");
  const pret = propre(chantier) !== "" && propre(client) !== "";
  const fermer = () => { setOuvert(false); setChantier(""); setClient(""); setResume(""); };
  const imprimer = () => { if (!pret) return; lancerImpression(genHtmlPageDeGardeChantier({chantier: normaliserNumero(chantier, client), client, resume})); fermer(); };
  const vierge = () => { lancerImpression(genHtmlPageDeGardeChantier({})); fermer(); };
  return (<>
    <button type="button" onClick={() => setOuvert(true)} style={{...BTN_O, display: "inline-flex", alignItems: "center", gap: 6}}>📄 Page de garde</button>
    {ouvert && <div onClick={fermer} style={{position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 400, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 12, overflowY: "auto"}}>
      <div role="dialog" aria-label="Page de garde de chantier" onClick={(e) => e.stopPropagation()} style={{background: "#fff", borderRadius: 14, width: "100%", maxWidth: 480, padding: "16px 18px 20px", boxShadow: "0 12px 40px rgba(0,0,0,.3)", margin: "auto 0"}}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10}}>
          <h3 style={{fontSize: 17, margin: 0}}>📄 Page de garde de chantier</h3>
          <button type="button" onClick={fermer} aria-label="Fermer" style={{background: "#F3F4F6", border: 0, borderRadius: 10, width: 40, height: 40, fontSize: 18, cursor: "pointer"}}>✕</button>
        </div>
        <p style={{fontSize: 12, color: "#6B7280", margin: "6px 0 0"}}>Pour un dossier qui ne passe pas par l'atelier. Une feuille A4 à imprimer avec les cadres de suivi (demande de prix, attente du client, devis et commande). Rien n'est enregistré.</p>
        <label style={LBL} htmlFor="pgc-chantier">N° de chantier *</label>
        <input id="pgc-chantier" type="text" value={chantier} onChange={(e) => setChantier(e.target.value)} onBlur={() => setChantier((c) => normaliserNumero(c, client))} placeholder="DE7421 ou 7421" style={INP} autoComplete="off" autoFocus/>
        <label style={LBL} htmlFor="pgc-client">Client *</label>
        <input id="pgc-client" type="text" list="pgc-clients" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Choisir dans la liste ou saisir" style={INP} autoComplete="off"/>
        <datalist id="pgc-clients">{(clients || []).map((c) => <option key={c} value={c}/>)}</datalist>
        <label style={LBL} htmlFor="pgc-resume">Résumé de la demande du client</label>
        <textarea id="pgc-resume" value={resume} onChange={(e) => setResume(e.target.value)} rows={4} maxLength={600} placeholder="Ex : remplacement de deux moteurs 15 kW, chiffrage avant vendredi…" style={{...INP, resize: "vertical"}}/>
        <div style={{display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16}}>
          <button type="button" disabled={!pret} onClick={imprimer} style={{...BTN, opacity: pret ? 1 : .5}}>🖨 Imprimer</button>
          <button type="button" onClick={vierge} style={BTN_O} title="La même feuille sans rien de rempli, à compléter à la main">Imprimer une page vierge</button>
          <button type="button" onClick={fermer} style={{...BTN_O, borderColor: "#D1D5DB", color: "#6B7280"}}>Annuler</button>
        </div>
      </div>
    </div>}
  </>);
}
