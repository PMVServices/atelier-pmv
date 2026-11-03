import React, {useState, useEffect, useContext, useMemo, useCallback} from "react";
import {SUPA_URL, H} from "./supabase";
import {PersonneCtx} from "./Acces";
import {useStock, stockPourDossiers} from "./Stock";
import {cleNom, lireDossiers, modifierDossiers, nouvelId, etatAvant, phraseAvant, joursAvant} from "./dossiersCommandes";
import {lireFournisseurs, modifierFournisseurs, trouverFiche, etatFranco, cleFiche, propreFiche} from "./fournisseursFiches";

// Dossiers de commandes par fournisseur (demande du 02/11/2026, onglet Matériel, administrateur seulement).
// Un « mini-dossier » par fournisseur : ce qu'il y a à lui commander, pour regrouper les commandes (frais de port). On y met des lignes à la main (même sans rapport avec l'appli),
// et les lignes de l'appli y arrivent toutes seules (stock à renouveler, demandes des techniciens, pièces des fiches). Chaque ligne peut avoir un N° de chantier et un
// « à commander avant le » (alerte en retard / bientôt : ici, sur le tableau de bord et dans le mail du matin). « Commandé chez X » vide le dossier : rien n'est gardé
// (seulement la date de la dernière commande). La logique et l'accès à la base sont dans dossiersCommandes.js.
const BLEU = "#1B4F8A";
const CARTE = { background: "#fff", border: "1px solid #E2E6EA", borderRadius: 12, overflow: "hidden" };
const INP = { width: "100%", padding: "9px 10px", borderRadius: 8, border: "1.5px solid #D1D5DB", fontSize: 15, boxSizing: "border-box", background: "#fff", fontFamily: "inherit" };
const LBL = { display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".04em", margin: "10px 0 4px" };
const BTN = { background: BLEU, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
const BTN_O = { background: "#fff", color: BLEU, border: "1.5px solid " + BLEU, borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const ETATS = {
  retard: { lib: "En retard", fond: "#FFF1F2", coul: "#B42318", bord: "#F4B4BC" },
  bientot: { lib: "À passer bientôt", fond: "#FFF7ED", coul: "#B45309", bord: "#F3D9A8" },
};
const ORIGINES = { main: ["✋", "À la main"], stock: ["🗃", "Stock"], demande: ["🛒", "Demande"], fiche: ["📁", "Fiche atelier"] };
const txt = (x) => String(x == null ? "" : x).trim();
const euro = (n) => Number(n).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const ilYa = (iso) => { const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); return isNaN(j) ? "" : j <= 0 ? "aujourd'hui" : j === 1 ? "hier" : "il y a " + j + " j"; };
const dateFr = (iso) => { const d = new Date(iso); return isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }); };
// petit bouton « maison » : pas un <button> (sur tablette, les boutons sont agrandis et déformeraient les lignes)
function Act({ children, onClick, titre, style }) {
  const agir = (e) => { e.stopPropagation(); onClick(e); };
  return <span role="button" tabIndex={0} title={titre} onClick={agir} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); agir(e); } }} style={{ cursor: "pointer", ...style }}>{children}</span>;
}
function Fenetre({ titre, children, onFermer }) {
  return (<div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 400, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 12, overflowY: "auto" }} onClick={(e) => { if (e.target === e.currentTarget) onFermer(); }}>
    <div role="dialog" aria-label={titre} style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 520, padding: "16px 18px 20px", boxShadow: "0 12px 40px rgba(0,0,0,.3)", margin: "auto 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <h3 style={{ fontSize: 17, margin: 0 }}>{titre}</h3>
        <button type="button" onClick={onFermer} aria-label="Fermer" style={{ background: "#F3F4F6", border: 0, borderRadius: 10, width: 40, height: 40, fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>
      {children}
    </div>
  </div>);
}

// lignes de toutes origines, une seule liste
function assembler({ store, demandes, pieces, articles, cmdStock }) {
  const reg = store.reg || {};
  const parRef = {};
  (articles || []).forEach((a) => { parRef[cleNom(a.reference)] = a; });
  const article = (...noms) => { for (const n of noms) { const a = n ? parRef[cleNom(n)] : null; if (a) return a; } return null; };
  const prixDe = (a) => (a && Number(a.prix_unitaire) > 0 ? Number(a.prix_unitaire) : null);
  const out = [];
  store.lignes.forEach((l) => out.push({ ...l, cle: "main:" + l.id, origine: "main", prixU: l.prix }));
  (demandes || []).filter((d) => d.statut === "a_commander" && !String(d.demande_id || "").startsWith("stock-")).forEach((d) => {
    const cle = "dem:" + d.id, r = reg[cle] || {}, a = article(d.designation);
    out.push({ cle, origine: "demande", id: d.id, fournisseur: txt(r.f) || (a ? txt(a.fournisseur1) : ""), designation: txt(d.designation), quantite: d.quantite || 1,
      chantier: r.c !== undefined ? txt(r.c) : txt(d.chantier), avant: r.avant || "", prixU: prixDe(a), note: txt(r.note) || txt(d.commentaire), cree: d.created_at, par: txt(d.demandeur) });
  });
  (pieces || []).filter((p) => p.statut === "A_recommander" || !p.statut).forEach((p) => {
    const cle = "fiche:" + p.id, r = reg[cle] || {}, a = article(p.reference, p.designation);
    out.push({ cle, origine: "fiche", id: p.id, fournisseur: txt(r.f) || (a ? txt(a.fournisseur1) : ""), designation: txt(p.designation) + (p.reference ? " — " + txt(p.reference) : ""), quantite: 1,
      chantier: r.c !== undefined ? txt(r.c) : txt(p.de), avant: r.avant || "", prixU: prixDe(a), note: txt(r.note), cree: p.created_at, par: "" });
  });
  stockPourDossiers.aRenouveler(articles || []).filter((a) => !stockPourDossiers.enCommande(a, cmdStock)).forEach((a) => {
    const cle = "stock:" + a.id, r = reg[cle] || {};
    out.push({ cle, origine: "stock", id: a.id, a, fournisseur: txt(r.f) || txt(a.fournisseur1), designation: stockPourDossiers.libelle(a) + (a.dimensions ? " (" + a.dimensions + ")" : ""),
      quantite: stockPourDossiers.quantite(a), chantier: "", avant: "", prixU: prixDe(a), note: txt(r.note), cree: null, par: "" });
  });
  return out;
}

export default function VueDossiers({ demandes, pieces, onPieceStatut, recharger }) {
  const ctx = useContext(PersonneCtx);
  const par = ctx && ctx.moi ? String(ctx.moi.initiales || ctx.moi.prenom || "") : "";
  const stock = useStock();
  const [store, setStore] = useState(null);
  const [erreur, setErreur] = useState("");
  const [cmdStock, setCmdStock] = useState(null);
  const [rech, setRech] = useState("");
  const [filtre, setFiltre] = useState("tous"); // tous | retard | bientot | sans
  const [form, setForm] = useState(null);       // ligne en cours d'édition (objet vide = nouvelle ligne à la main)
  const [commande, setCommande] = useState(null); // {cle, nom, lignes, choisies:Set}
  const [occupe, setOccupe] = useState(false);
  const [msg, setMsg] = useState("");
  const [fournisseurs, setFournisseurs] = useState({ liste: [] }); // fiches fournisseurs (franco, port, délai, contact) : fournisseursFiches.js
  const [fenetreFour, setFenetreFour] = useState(false);
  const chargerFournisseurs = useCallback(async () => { try { setFournisseurs(await lireFournisseurs()); } catch (e) { /* les dossiers restent utilisables sans les fiches */ } }, []);
  useEffect(() => { chargerFournisseurs(); }, [chargerFournisseurs]);

  const charger = useCallback(async () => {
    try { setStore(await lireDossiers()); setErreur(""); } catch (e) { setErreur(e.message || "Lecture impossible."); }
  }, []);
  useEffect(() => { charger(); }, [charger]);
  const chargerCmdStock = useCallback(async () => { try { setCmdStock(await stockPourDossiers.commandesEnCours()); } catch (e) { /* le stock reste affiché sans cette information */ } }, []);
  useEffect(() => { chargerCmdStock(); }, [chargerCmdStock]);

  const maintenant = new Date();
  const toutes = useMemo(() => (store ? assembler({ store, demandes, pieces, articles: stock.articles, cmdStock }) : []), [store, demandes, pieces, stock.articles, cmdStock]);
  // une seule écriture par nom de fournisseur (celle du stock en priorité)
  const canon = useMemo(() => {
    const c = {};
    const noter = (n) => { const t = txt(n); if (t && !c[cleNom(t)]) c[cleNom(t)] = t; };
    (stock.articles || []).forEach((a) => [a.fournisseur1, a.fournisseur2, a.fournisseur3].forEach(noter));
    (store ? store.fournisseurs : []).forEach(noter);
    (store ? store.lignes : []).forEach((l) => noter(l.fournisseur));
    // les noms de la liste des fournisseurs s'ajoutent, sauf ceux que le stock écrit déjà autrement (« AMAZON » pour « AMAZON BUSINESS EU SARL ») : pas deux dossiers pour un même fournisseur
    const dejaVus = new Set(Object.values(c).map((n) => trouverFiche(fournisseurs.liste, n)).filter(Boolean));
    fournisseurs.liste.forEach((f) => { if (!dejaVus.has(f) && !c[cleNom(f.nom)]) c[cleNom(f.nom)] = f.nom; });
    return c;
  }, [stock.articles, store, fournisseurs]);
  const connus = Object.values(canon).sort((a, b) => a.localeCompare(b, "fr"));
  // le nom tel qu'il est déjà écrit dans les dossiers (même si on saisit l'écriture de la liste : « QUINCAILLERIE SETIN » → « Setin »)
  const nomCanon = (n) => {
    const t = txt(n); if (!t) return "";
    if (canon[cleNom(t)]) return canon[cleNom(t)];
    const f = trouverFiche(fournisseurs.liste, t);
    if (f) { const meme = Object.values(canon).find((x) => trouverFiche(fournisseurs.liste, x) === f); if (meme) return meme; }
    return t;
  };

  // les fournisseurs de la liste que le stock ou les dossiers utilisent déjà : ils passent en premier dans l'écran « Fournisseurs »
  const habituels = useMemo(() => {
    const s = new Set();
    const noter = (n) => { const f = trouverFiche(fournisseurs.liste, n); if (f) s.add(f); };
    (stock.articles || []).forEach((a) => [a.fournisseur1, a.fournisseur2, a.fournisseur3].forEach(noter));
    (store ? store.fournisseurs : []).forEach(noter);
    (store ? store.lignes : []).forEach((l) => noter(l.fournisseur));
    return s;
  }, [stock.articles, store, fournisseurs]);

  const q = cleNom(rech);
  const visibles = toutes.filter((l) => {
    const e = etatAvant(l.avant, maintenant);
    if (filtre === "retard" && e !== "retard") return false;
    if (filtre === "bientot" && e !== "bientot") return false;
    if (filtre === "sans" && l.fournisseur) return false;
    return !q || cleNom(l.designation).includes(q) || cleNom(l.chantier).includes(q) || cleNom(l.fournisseur).includes(q) || cleNom(l.note).includes(q);
  });
  const dossiers = (() => {
    const m = new Map();
    visibles.forEach((l) => {
      const k = l.fournisseur ? cleNom(l.fournisseur) : "";
      if (!m.has(k)) m.set(k, { cle: k, nom: l.fournisseur ? nomCanon(l.fournisseur) : "", lignes: [] });
      m.get(k).lignes.push(l);
    });
    const jMin = (d) => d.lignes.reduce((j, l) => { const x = joursAvant(l.avant, maintenant); return x == null ? j : Math.min(j, x); }, 9999);
    return Array.from(m.values()).sort((a, b) => (a.cle === "") - (b.cle === "") || jMin(a) - jMin(b) || b.lignes.length - a.lignes.length || a.nom.localeCompare(b.nom, "fr"));
  })();

  const nbRetard = toutes.filter((l) => etatAvant(l.avant, maintenant) === "retard").length;
  const nbBientot = toutes.filter((l) => etatAvant(l.avant, maintenant) === "bientot").length;
  const nbSans = toutes.filter((l) => !l.fournisseur).length;

  // ── enregistrement d'une ligne (à la main) ou de ses réglages (ligne venue de l'appli) ──
  async function sauver(f) {
    setOccupe(true);
    try {
      const four = nomCanon(f.fournisseur);
      const nouveau = await modifierDossiers((s) => {
        const o = { ...s, reg: { ...s.reg }, fournisseurs: s.fournisseurs.slice() };
        if (four && !o.fournisseurs.some((x) => cleNom(x) === cleNom(four)) && !canon[cleNom(four)]) o.fournisseurs.push(four);
        if (f.origine === "main" || !f.cle) {
          const id = f.id || nouvelId();
          const ligne = { id, fournisseur: four, designation: f.designation, quantite: f.quantite, chantier: f.chantier, avant: f.avant, prix: f.prixU === "" ? null : f.prixU, note: f.note, cree: f.cree || new Date().toISOString(), par: f.par || par };
          o.lignes = s.lignes.filter((x) => x.id !== id).concat([ligne]);
        } else {
          const v = { f: four || undefined, avant: f.avant || undefined, c: f.chantier !== f.chantierSource ? f.chantier : undefined, note: f.note !== f.noteSource ? f.note : undefined };
          const vide = !v.f && !v.avant && v.c === undefined && v.note === undefined;
          if (vide) delete o.reg[f.cle]; else o.reg[f.cle] = { ...v, d: f.designation, q: f.quantite };
        }
        return o;
      });
      setStore(nouveau); setForm(null); setMsg("✓ Enregistré.");
    } catch (e) { setMsg("⚠ Enregistrement impossible : " + e.message); }
    setOccupe(false);
  }
  // ── fiches fournisseurs : renvoient "" si tout va bien, sinon le message d'erreur à afficher dans la fenêtre ──
  async function sauverFournisseur(orig, f) {
    setOccupe(true);
    try {
      const ancienne = orig ? cleFiche(orig.nom) : null, nouvelle = cleFiche(f.nom);
      const n = await modifierFournisseurs((s) => {
        if (nouvelle !== ancienne && s.liste.some((x) => cleFiche(x.nom) === nouvelle)) throw new Error("Un fournisseur porte déjà ce nom.");
        const i = ancienne ? s.liste.findIndex((x) => cleFiche(x.nom) === ancienne) : -1;
        const liste = s.liste.slice();
        if (i >= 0) liste[i] = propreFiche(f); else liste.push(propreFiche(f));
        return { ...s, liste };
      });
      setFournisseurs(n); setMsg("✓ Fiche de " + txt(f.nom) + " enregistrée.");
      setOccupe(false); return "";
    } catch (e) { setOccupe(false); return "Enregistrement impossible : " + e.message; }
  }
  async function supprimerFournisseur(f) {
    setOccupe(true);
    try {
      const k = cleFiche(f.nom);
      setFournisseurs(await modifierFournisseurs((s) => ({ ...s, liste: s.liste.filter((x) => cleFiche(x.nom) !== k) })));
      setMsg("✓ " + f.nom + " retiré de la liste.");
      setOccupe(false); return "";
    } catch (e) { setOccupe(false); return "Suppression impossible : " + e.message; }
  }
  async function supprimer(l) {
    setOccupe(true);
    try { setStore(await modifierDossiers((s) => ({ ...s, lignes: s.lignes.filter((x) => x.id !== l.id) }))); setForm(null); setMsg("✓ Ligne supprimée."); }
    catch (e) { setMsg("⚠ Suppression impossible : " + e.message); }
    setOccupe(false);
  }
  // ── « Commandé chez X » : les lignes cochées sortent du dossier ; les lignes de l'appli passent « commandées » là où elles sont suivies ──
  async function patch(chemin, corps) {
    try { const r = await fetch(SUPA_URL + "/rest/v1/" + chemin, { method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(corps) }); const d = await r.json().catch(() => null); return r.ok && Array.isArray(d) && d.length > 0; } catch (e) { return false; }
  }
  async function validerCommande() {
    if (!commande) return;
    const choisies = commande.lignes.filter((l) => commande.choisies.has(l.cle));
    if (!choisies.length) return;
    setOccupe(true);
    const faites = [], ratees = [];
    for (const l of choisies) {
      let ok = true;
      if (l.origine === "demande") ok = await patch("demandes_materiel?id=eq." + l.id, { statut: "commande", date_commande: new Date().toISOString() });
      else if (l.origine === "fiche") ok = onPieceStatut ? await onPieceStatut(l.id, "Commande") : await patch("suivi_pieces?id=eq." + l.id, { statut: "Commande", updated_at: new Date().toISOString() });
      else if (l.origine === "stock") { const r = await stockPourDossiers.passerCommande(l.a, stock.articles, l.quantite, par); ok = !!(r && r.ok); }
      (ok ? faites : ratees).push(l);
    }
    try {
      const ids = new Set(faites.filter((l) => l.origine === "main").map((l) => l.id)), cles = new Set(faites.map((l) => l.cle));
      const maintenantIso = new Date().toISOString();
      const nouveau = await modifierDossiers((s) => {
        const reg = { ...s.reg }; cles.forEach((c) => { delete reg[c]; });
        const derniere = { ...s.derniere }; if (faites.length) derniere[commande.cle || "sans"] = maintenantIso;
        return { ...s, lignes: s.lignes.filter((x) => !ids.has(x.id)), reg, derniere };
      });
      setStore(nouveau);
    } catch (e) { ratees.push(...faites.filter((l) => l.origine === "main")); }
    if (recharger) await recharger();
    await stock.recharger(); await chargerCmdStock();
    setCommande(null); setOccupe(false);
    const restent = commande.lignes.length - faites.length;
    setMsg(ratees.length ? "⚠ " + faites.length + " ligne(s) commandée(s), " + ratees.length + " n'ont pas pu être enregistrées (connexion ?) : elles restent dans le dossier."
      : "✓ " + faites.length + " ligne" + (faites.length > 1 ? "s" : "") + " commandée" + (faites.length > 1 ? "s" : "") + " chez " + (commande.nom || "ce fournisseur") + (restent > 0 ? " — " + restent + " reste" + (restent > 1 ? "nt" : "") + " dans le dossier." : " : le dossier est vidé."));
  }

  // ── présentation d'une ligne ──
  const tag = (t, fond, coul, bord) => <span style={{ fontSize: 11, fontWeight: 700, background: fond, color: coul, border: "1px solid " + (bord || fond), borderRadius: 10, padding: "1px 8px", whiteSpace: "nowrap" }}>{t}</span>;
  function ligneUI(l, dansCommande) {
    const e = etatAvant(l.avant, maintenant), et = ETATS[e];
    const [ico, libO] = ORIGINES[l.origine];
    return (<div key={l.cle} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 14px", borderTop: "1px solid #EEF1F5", background: et && !dansCommande ? et.fond : "#fff" }}>
      {dansCommande && <input type="checkbox" checked={commande.choisies.has(l.cle)} onChange={(ev) => setCommande((c) => { const n = new Set(c.choisies); if (ev.target.checked) n.add(l.cle); else n.delete(l.cle); return { ...c, choisies: n }; })} aria-label={"Commander " + l.designation} style={{ width: 22, height: 22, marginTop: 2, flexShrink: 0 }}/>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, overflowWrap: "anywhere" }}><b>{l.designation}</b> <span style={{ color: "#4B5563" }}>× {l.quantite}</span>{l.prixU != null && <span style={{ color: "#6B7280", fontSize: 12 }}> · {euro(l.prixU * l.quantite)}</span>}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
          {tag(ico + " " + libO, "#F3F4F6", "#4B5563")}
          {l.chantier && <Act onClick={() => setRech(l.chantier)} titre="Voir tout ce qui est à commander pour ce chantier">{tag("🏗 " + l.chantier, "#EEF4FF", BLEU, "#AFC6E6")}</Act>}
          {l.avant && tag("⏰ " + phraseAvant(l.avant, maintenant), et ? et.fond : "#F0FFF4", et ? et.coul : "#22863A", et ? et.bord : "#BFE3C8")}
          {l.cree && <span style={{ fontSize: 11, color: "#9CA3AF" }}>{ilYa(l.cree)}{l.par ? " · " + l.par : ""}</span>}
        </div>
        {l.note && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3, overflowWrap: "anywhere" }}>{l.note}</div>}
      </div>
      {!dansCommande && <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <Act onClick={() => setForm({ ...l, chantierSource: l.origine === "main" ? "" : l.chantier, noteSource: l.origine === "main" ? "" : l.note })} titre="Modifier / choisir le fournisseur / fixer une date limite" style={{ fontSize: 15 }}>✏️</Act>
      </div>}
    </div>);
  }
  function dossierUI(d) {
    const jours = d.lignes.map((l) => joursAvant(l.avant, maintenant)).filter((x) => x != null);
    const jMin = jours.length ? Math.min(...jours) : null;
    const e = jMin == null ? "sans" : jMin < 0 ? "retard" : jMin <= 2 ? "bientot" : "ok";
    const et = ETATS[e];
    const connu = d.lignes.filter((l) => l.prixU != null), total = connu.reduce((s, l) => s + l.prixU * l.quantite, 0);
    const anciens = d.lignes.map((l) => l.cree).filter(Boolean).sort();
    const derniere = store && store.derniere ? store.derniere[d.cle || "sans"] : null;
    return (<div key={d.cle || "sans"} style={{ ...CARTE, borderColor: et ? et.bord : "#E2E6EA", marginBottom: 12 }}>
      <div style={{ background: et ? et.fond : "#F8F9FA", padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: d.nom ? BLEU : "#B45309" }}>📁 {d.nom || "Sans fournisseur"}</div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>
            {d.lignes.length} ligne{d.lignes.length > 1 ? "s" : ""}{connu.length ? " · ≈ " + euro(total) + (connu.length < d.lignes.length ? " (+ " + (d.lignes.length - connu.length) + " sans prix)" : "") : ""}
            {anciens.length ? " · la plus ancienne : " + ilYa(anciens[0]) : ""}{derniere ? " · dernière commande le " + dateFr(derniere) : ""}
          </div>
          {et && <div style={{ marginTop: 3 }}>{tag("⏰ " + et.lib + (jMin < 0 ? " : " + (-jMin) + " j" : jMin === 0 ? " : aujourd'hui" : ""), "#fff", et.coul, et.bord)}</div>}
          {d.nom && (() => {
            const fiche = trouverFiche(fournisseurs.liste, d.nom), fr = etatFranco(fiche, total, d.lignes.length - connu.length, connu.length);
            const infos = fiche ? [fiche.tel && "📞 " + fiche.tel, fiche.mail && "✉ " + fiche.mail, fiche.delai != null && "🚚 livraison ≈ " + fiche.delai + " j"].filter(Boolean) : [];
            return (<div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: "4px 8px", alignItems: "center", fontSize: 12, color: "#4B5563" }}>
              {fr && (fr.aucunPrix ? tag("Franco " + euro(fr.franco) + " (aucun prix connu)", "#F3F4F6", "#4B5563") : fr.atteint ? tag("✓ Franco atteint (" + euro(fr.franco) + ")" + (fr.incertain ? " ≈" : ""), "#F0FFF4", "#22863A", "#BFE3C8") : tag("Franco " + euro(fr.franco) + " : il manque " + (fr.incertain ? "≈ " : "") + euro(fr.manque), "#FFF7ED", "#B45309", "#F3D9A8"))}
              {fr && !fr.atteint && !fr.aucunPrix && fr.port > 0 && <span>port ≈ {euro(fr.port)} sous le franco</span>}
              {infos.map((x) => <span key={x} style={{ overflowWrap: "anywhere" }}>{x}</span>)}
              <Act onClick={() => setFenetreFour({ edit: fiche || { nom: d.nom } })} titre={fiche ? "Fiche du fournisseur : franco, frais de port, délai, contact" : "Créer la fiche de ce fournisseur"} style={{ color: BLEU, fontWeight: 600 }}>{fiche ? (fr ? "📇 Fiche" : "📇 Franco, délai… à renseigner") : "📇 Créer la fiche"}</Act>
            </div>);
          })()}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={BTN_O} onClick={() => setForm({ origine: "main", fournisseur: d.nom, designation: "", quantite: 1, chantier: "", avant: "", prixU: "", note: "" })}>➕ Ligne</button>
          {d.nom && <button type="button" style={BTN} onClick={() => setCommande({ cle: d.cle, nom: d.nom, lignes: d.lignes, choisies: new Set(d.lignes.map((l) => l.cle)) })}>✓ Commandé</button>}
        </div>
      </div>
      {d.lignes.map((l) => ligneUI(l, false))}
    </div>);
  }

  if (erreur) return <div role="alert" style={{ background: "#FFF1F2", border: "1px solid #D73A49", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>⚠ {erreur} <button type="button" onClick={charger} style={{ ...BTN_O, marginLeft: 8 }}>Réessayer</button></div>;
  if (!store) return <div style={{ textAlign: "center", padding: 30, color: "#9CA3AF" }}>Chargement…</div>;
  const chip = (id, lib, n) => <button type="button" key={id} aria-pressed={filtre === id} onClick={() => setFiltre(id)} style={{ ...BTN_O, background: filtre === id ? BLEU : "#fff", color: filtre === id ? "#fff" : BLEU, padding: "5px 12px", fontSize: 12 }}>{lib}{n != null ? " (" + n + ")" : ""}</button>;
  return (<div>
    <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 10px" }}>Un dossier par fournisseur pour regrouper ce qu'il y a à commander. Ajoutez vos lignes (même sans rapport avec l'appli) ; le stock à renouveler, les demandes des techniciens et les pièces des fiches arrivent tout seuls. Fixez un « à commander avant le » : l'alerte apparaît ici, sur le tableau de bord et dans le mail du matin.</p>
    <div style={{ ...CARTE, padding: "12px 14px", marginBottom: 12, overflow: "visible" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input type="search" value={rech} onChange={(e) => setRech(e.target.value)} placeholder="🔍 Chercher un article, un fournisseur, un N° de chantier…" aria-label="Chercher" style={{ ...INP, flex: "1 1 260px", width: "auto" }}/>
        <button type="button" style={BTN} onClick={() => setForm({ origine: "main", fournisseur: "", designation: "", quantite: 1, chantier: "", avant: "", prixU: "", note: "" })}>➕ Ajouter une ligne</button>
        <button type="button" style={BTN_O} onClick={() => setFenetreFour({ edit: null })}>📇 Fournisseurs ({fournisseurs.liste.length})</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        {chip("tous", "Tout", toutes.length)}{chip("retard", "⏰ En retard", nbRetard)}{chip("bientot", "À passer bientôt", nbBientot)}{chip("sans", "Sans fournisseur", nbSans)}
      </div>
    </div>
    {msg && <div role="status" style={{ background: msg.indexOf("⚠") === 0 ? "#FFF1F2" : "#F0FFF4", border: "1px solid " + (msg.indexOf("⚠") === 0 ? "#D73A49" : "#22863A"), borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12, display: "flex", justifyContent: "space-between", gap: 8 }}><span>{msg}</span><Act onClick={() => setMsg("")} titre="Fermer">✕</Act></div>}
    {dossiers.length === 0
      ? <div style={{ textAlign: "center", padding: 40, color: "#9CA3AF", background: "#fff", borderRadius: 10, border: "1px dashed #D1D5DB" }}>{toutes.length ? "Aucune ligne ne correspond." : "Rien à commander pour le moment. Ajoutez une ligne pour commencer."}</div>
      : <div className="grille-large">{dossiers.map(dossierUI)}</div>}
    {form && <FormLigne init={form} connus={connus} occupe={occupe} onSauver={sauver} onSupprimer={supprimer} onFermer={() => setForm(null)}/>}
    {fenetreFour && <FenetreFournisseurs liste={fournisseurs.liste} habituels={habituels} depart={fenetreFour.edit} occupe={occupe} onSauver={sauverFournisseur} onSupprimer={supprimerFournisseur} onFermer={() => setFenetreFour(false)}/>}
    {commande && <Fenetre titre={"Commandé chez " + commande.nom} onFermer={() => { if (!occupe) setCommande(null); }}>
      <p style={{ fontSize: 13, color: "#4B5563", margin: "8px 0" }}>Cochez ce qui est commandé : ces lignes sortent du dossier (ce qui n'est pas coché y reste). Le stock concerné passe « En commande », les demandes et pièces des fiches passent « commandées ».</p>
      <div style={{ ...CARTE, maxHeight: "50vh", overflowY: "auto" }}>{commande.lignes.map((l) => ligneUI(l, true))}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" disabled={occupe || commande.choisies.size === 0} onClick={validerCommande} style={{ ...BTN, opacity: occupe || commande.choisies.size === 0 ? .5 : 1 }}>{occupe ? "Enregistrement…" : "✓ Commandé (" + commande.choisies.size + ")"}</button>
        <button type="button" disabled={occupe} onClick={() => setCommande(null)} style={BTN_O}>Annuler</button>
      </div>
    </Fenetre>}
  </div>);
}

function FormLigne({ init, connus, occupe, onSauver, onSupprimer, onFermer }) {
  const main = init.origine === "main";
  const neuve = main && !init.id;
  const [fournisseur, setFournisseur] = useState(init.fournisseur || "");
  const [designation, setDesignation] = useState(init.designation || "");
  const [quantite, setQuantite] = useState(String(init.quantite || 1));
  const [chantier, setChantier] = useState(init.chantier || "");
  const [avant, setAvant] = useState(init.avant || "");
  const [prix, setPrix] = useState(init.prixU == null || init.prixU === "" ? "" : String(init.prixU).replace(".", ","));
  const [note, setNote] = useState(init.note || "");
  const [conf, setConf] = useState(false);
  const prixN = txt(prix) === "" ? null : Number(txt(prix).replace(",", ".").replace(/\s/g, ""));
  const prixOk = prixN == null || (isFinite(prixN) && prixN >= 0);
  const valide = (!main || txt(designation) !== "") && prixOk;
  const stock = init.origine === "stock";
  const sauver = () => onSauver({ ...init, fournisseur: txt(fournisseur), designation: txt(designation), quantite: Math.max(1, parseInt(quantite, 10) || 1), chantier: txt(chantier), avant: stock ? "" : avant, prixU: main ? prixN : init.prixU, note: txt(note) });
  const champ = (lib, val, set, ph, extra) => <div><label style={LBL}>{lib}</label><input type="text" value={val} onChange={(e) => set(e.target.value)} placeholder={ph} style={INP} {...extra}/></div>;
  return (<Fenetre titre={neuve ? "Ajouter une ligne" : main ? "Modifier la ligne" : "Réglages de la ligne"} onFermer={onFermer}>
    {!main && <p style={{ fontSize: 12, color: "#6B7280", margin: "8px 0 0" }}>Cette ligne vient de l'appli ({ORIGINES[init.origine][1].toLowerCase()}) : <b>{init.designation}</b> × {init.quantite}. Vous pouvez choisir le fournisseur{init.origine === "stock" ? "" : ", fixer une date limite"} et ajouter une note.</p>}
    <datalist id="dos-noms">{connus.map((x) => <option key={x} value={x}/>)}</datalist>
    {champ("Fournisseur", fournisseur, setFournisseur, "SEFI, ABE, Amazon… (ou un nouveau nom)", { list: "dos-noms", autoComplete: "off" })}
    {main && champ("Désignation *", designation, setDesignation, "Courroie SPA 1250", { autoFocus: neuve })}
    {main && <div><label style={LBL}>Quantité</label><input type="number" min="1" value={quantite} onChange={(e) => setQuantite(e.target.value)} style={INP} inputMode="numeric"/></div>}
    {init.origine !== "stock" && champ("N° de chantier", chantier, setChantier, "DV0053, DE7334…", { autoComplete: "off" })}
    {!stock && <div><label style={LBL}>À commander avant le</label><div style={{ display: "flex", gap: 8 }}><input type="date" value={avant} onChange={(e) => setAvant(e.target.value)} style={INP}/>{avant && <button type="button" onClick={() => setAvant("")} style={BTN_O} aria-label="Effacer la date">✕</button>}</div>
      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>Passée cette date, ou à moins de 2 jours, la ligne est signalée (ici, sur le tableau de bord et dans le mail du matin).</div></div>}
    {main && champ("Prix unitaire (€, facultatif)", prix, setPrix, "12,50", { inputMode: "decimal", autoComplete: "off" })}
    {!prixOk && <div style={{ fontSize: 12, color: "#B42318" }}>Le prix doit être un nombre.</div>}
    <label style={LBL}>Note</label>
    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} style={{ ...INP, resize: "vertical" }}/>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
      <button type="button" disabled={occupe || !valide} onClick={sauver} style={{ ...BTN, opacity: occupe || !valide ? .5 : 1 }}>{occupe ? "Enregistrement…" : "💾 Enregistrer"}</button>
      <button type="button" onClick={onFermer} style={BTN_O}>Annuler</button>
      {main && !neuve && !conf && <button type="button" onClick={() => setConf(true)} style={{ ...BTN_O, color: "#D73A49", borderColor: "#D73A49" }}>🗑 Supprimer</button>}
    </div>
    {main && !neuve && conf && <div style={{ background: "#FFF5F5", border: "1px solid #D73A49", borderRadius: 8, padding: "8px 10px", marginTop: 10 }}>
      <div style={{ fontSize: 13, color: "#8A1F2B" }}>Supprimer cette ligne ?</div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}><button type="button" disabled={occupe} onClick={() => onSupprimer(init)} style={{ ...BTN, background: "#D73A49" }}>Oui, supprimer</button><button type="button" onClick={() => setConf(false)} style={BTN_O}>Non</button></div>
    </div>}
  </Fenetre>);
}

// ── écran « Fournisseurs » : la liste (export EBP) et, pour chacun, franco de port, frais de port, délai de livraison, contact (fournisseursFiches.js) ──
const resumeFiche = (f) => [f.franco != null ? "franco " + euro(f.franco) : "", f.port != null ? "port " + euro(f.port) : "", f.delai != null ? f.delai + " j" : ""].filter(Boolean).join(" · ");
function FenetreFournisseurs({ liste, habituels, depart, occupe, onSauver, onSupprimer, onFermer }) {
  const [edit, setEdit] = useState(depart || null);   // fiche en cours de modification ; null = la liste
  const [rech, setRech] = useState("");
  const [seuls, setSeuls] = useState("habituels");    // habituels | tous | sans
  const [err, setErr] = useState("");
  const q = cleNom(rech);
  const montrees = liste.filter((f) => {
    if (q) return cleNom(f.nom).includes(q) || cleNom(f.code).includes(q);
    if (seuls === "habituels") return habituels.has(f);
    if (seuls === "sans") return f.franco == null;
    return true;
  }).sort((a, b) => (habituels.has(b) - habituels.has(a)) || a.nom.localeCompare(b.nom, "fr"));
  const chip = (id, lib) => <button type="button" key={id} aria-pressed={seuls === id} onClick={() => setSeuls(id)} style={{ ...BTN_O, background: seuls === id ? BLEU : "#fff", color: seuls === id ? "#fff" : BLEU, padding: "5px 12px", fontSize: 12 }}>{lib}</button>;
  async function agir(promesse, retour) { setErr(""); const e = await promesse; if (e) setErr(e); else if (depart) onFermer(); else retour(); }
  const dansListe = edit ? liste.find((x) => cleFiche(x.nom) === cleFiche(edit.nom)) : null;
  if (edit) return <FormFournisseur init={edit} existe={!!dansListe} occupe={occupe} erreur={err}
    onSauver={(f) => agir(onSauver(dansListe || null, f), () => setEdit(null))}
    onSupprimer={() => agir(onSupprimer(edit), () => setEdit(null))} onFermer={() => (depart ? onFermer() : setEdit(null))}/>;
  return (<Fenetre titre="📇 Fournisseurs" onFermer={onFermer}>
    <p style={{ fontSize: 12, color: "#6B7280", margin: "8px 0" }}>Renseignez pour chaque fournisseur le <b>franco de port</b> (montant à partir duquel le port est offert), les <b>frais de port</b> en dessous, et le <b>délai de livraison</b> : le dossier de commandes affiche alors « il manque X € pour le franco ».</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <input type="search" value={rech} onChange={(e) => setRech(e.target.value)} placeholder="🔍 Nom ou code" aria-label="Chercher un fournisseur" style={{ ...INP, flex: "1 1 180px", width: "auto" }}/>
      <button type="button" style={BTN} onClick={() => setEdit({ nom: "" })}>➕ Nouveau</button>
    </div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>{chip("habituels", "Mes fournisseurs (" + habituels.size + ")")}{chip("sans", "Sans franco")}{chip("tous", "Tous (" + liste.length + ")")}</div>
    <div style={{ ...CARTE, maxHeight: "55vh", overflowY: "auto" }}>
      {montrees.length === 0 && <div style={{ padding: 18, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>{liste.length ? "Aucun fournisseur ne correspond." : "La liste est vide : elle sera chargée avec l'import des fournisseurs."}</div>}
      {montrees.map((f, i) => (<div key={cleFiche(f.nom)} onClick={() => setEdit(f)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setEdit(f); }} style={{ padding: "10px 14px", borderTop: i ? "1px solid #EEF1F5" : 0, cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, overflowWrap: "anywhere" }}>{f.nom}{habituels.has(f) && <span style={{ marginLeft: 6, fontSize: 11, color: "#22863A", fontWeight: 600 }}>● utilisé</span>}</div>
          <div style={{ fontSize: 12, color: "#6B7280", overflowWrap: "anywhere" }}>{[f.code, f.tel, f.mail].filter(Boolean).join(" · ")}</div>
        </div>
        <div style={{ fontSize: 12, color: resumeFiche(f) ? BLEU : "#B45309", textAlign: "right", flexShrink: 0 }}>{resumeFiche(f) || "à renseigner"} ✏️</div>
      </div>))}
    </div>
  </Fenetre>);
}
function FormFournisseur({ init, existe, occupe, erreur, onSauver, onSupprimer, onFermer }) {
  const num = (x) => (x == null || x === "" ? "" : String(x).replace(".", ","));
  const [nom, setNom] = useState(init.nom || "");
  const [code, setCode] = useState(init.code || "");
  const [mail, setMail] = useState(init.mail || "");
  const [tel, setTel] = useState(init.tel || "");
  const [franco, setFranco] = useState(num(init.franco));
  const [port, setPort] = useState(num(init.port));
  const [delai, setDelai] = useState(num(init.delai));
  const [note, setNote] = useState(init.note || "");
  const [conf, setConf] = useState(false);
  const bon = (x) => { const t = txt(x).replace(",", ".").replace(/\s/g, ""); return t === "" || (isFinite(Number(t)) && Number(t) >= 0); };
  const valide = txt(nom) !== "" && bon(franco) && bon(port) && bon(delai);
  const champ = (lib, val, set, ph, extra) => <div><label style={LBL}>{lib}</label><input type="text" value={val} onChange={(e) => set(e.target.value)} placeholder={ph} style={INP} autoComplete="off" {...extra}/></div>;
  return (<Fenetre titre={existe ? "Fiche fournisseur" : "Nouveau fournisseur"} onFermer={onFermer}>
    {champ("Nom *", nom, setNom, "SEFI, ABE…", { autoFocus: !existe })}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0 10px" }}>
      {champ("Franco de port (€)", franco, setFranco, "300", { inputMode: "decimal" })}
      {champ("Frais de port sous le franco (€)", port, setPort, "15", { inputMode: "decimal" })}
      {champ("Délai de livraison (jours)", delai, setDelai, "2", { inputMode: "numeric" })}
    </div>
    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>Le franco est le montant de commande à partir duquel le fournisseur n'a plus de frais de port. Laissez vide ce que vous ne connaissez pas.</div>
    {champ("Téléphone", tel, setTel, "02 47 00 00 00", { inputMode: "tel" })}
    {champ("E-mail", mail, setMail, "commandes@fournisseur.fr", { inputMode: "email" })}
    {champ("Code (tiers EBP)", code, setCode, "FR00057")}
    <label style={LBL}>Note</label>
    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Jour de livraison, contact, compte client…" style={{ ...INP, resize: "vertical" }}/>
    {!bon(franco) || !bon(port) || !bon(delai) ? <div style={{ fontSize: 12, color: "#B42318", marginTop: 6 }}>Franco, frais de port et délai doivent être des nombres.</div> : null}
    {erreur && <div role="alert" style={{ fontSize: 13, color: "#B42318", marginTop: 8 }}>⚠ {erreur}</div>}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
      <button type="button" disabled={occupe || !valide} onClick={() => onSauver({ code, nom: txt(nom), mail, tel, franco, port, delai, note })} style={{ ...BTN, opacity: occupe || !valide ? .5 : 1 }}>{occupe ? "Enregistrement…" : "💾 Enregistrer"}</button>
      <button type="button" onClick={onFermer} style={BTN_O}>Annuler</button>
      {existe && !conf && <button type="button" onClick={() => setConf(true)} style={{ ...BTN_O, color: "#D73A49", borderColor: "#D73A49" }}>🗑 Retirer de la liste</button>}
    </div>
    {existe && conf && <div style={{ background: "#FFF5F5", border: "1px solid #D73A49", borderRadius: 8, padding: "8px 10px", marginTop: 10 }}>
      <div style={{ fontSize: 13, color: "#8A1F2B" }}>Retirer {init.nom} de la liste des fournisseurs ? (Ses lignes de commande ne sont pas touchées.)</div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}><button type="button" disabled={occupe} onClick={onSupprimer} style={{ ...BTN, background: "#D73A49" }}>Oui, retirer</button><button type="button" onClick={() => setConf(false)} style={BTN_O}>Non</button></div>
    </div>}
  </Fenetre>);
}
