import React, {useState, useEffect, useMemo} from "react";
import {SUPA_URL, H, db} from "./supabase";
import {TYPE_CHEMINEE} from "./railClients";
import {CHAMPS_FICHE_SUIVI, norm, numeroPmv, rangPmv, compresser, lirePlages, texteGravure, construireLignes, correspondances, analyserFeuille, detecterOrigine} from "./suiviCheminees";

// Suivi des cheminées / résistances de freinage (demande du 30/10/2026) : un tableau, une ligne par passage (N° DV), avec le n° de cheminée, de moteur, d'engin / loco et de gravage.
// Les lignes des fiches atelier « Cheminée de freinage » sont lues en direct (rien n'est recopié : elles se mettent à jour toutes seules) ; les anciennes informations, sans fiche,
// sont rangées dans `parametres_app` (clé « suivi_cheminees », liste JSON : aucune table à créer), importées d'un fichier Excel ou saisies à la main par l'administrateur.
// Tout le monde voit la page ; seul l'administrateur ajoute, corrige, supprime ou importe des anciennes lignes. La logique (fusion, recherche, lecture du fichier) est dans suiviCheminees.js.
export const CLE_SUIVI = "suivi_cheminees";
const txt = (x) => String(x == null ? "" : x).trim();

const propre = (l) => ({
  id: String(l.id), pmv: numeroPmv(l.pmv), type: l.type === "resistance" ? "resistance" : "cheminee", cheminee: txt(l.cheminee), moteur: txt(l.moteur), loco: txt(l.loco), symbole: txt(l.symbole),
  plages: compresser(Array.isArray(l.plages) ? l.plages : []), prefixeGrav: txt(l.prefixeGrav), notes: txt(l.notes), client: txt(l.client), origine: txt(l.origine), date: txt(l.date),
  source: l.source === "supprimee" ? "supprimee" : "ancien", cree: l.cree || new Date().toISOString(), par: txt(l.par), ficheId: l.ficheId ? String(l.ficheId) : "",
});

// lit les anciennes lignes ; lève une erreur si la base ne répond pas (jamais confondre « injoignable » et « vide »)
export async function lireSuivi() {
  const r = await fetch(SUPA_URL + "/rest/v1/parametres_app?select=valeur&cle=eq." + CLE_SUIVI, { headers: H });
  if (!r.ok) throw new Error("Lecture du suivi impossible (" + r.status + ")");
  const rows = await r.json();
  const brut = Array.isArray(rows) && rows[0] && rows[0].valeur ? rows[0].valeur : "[]";
  try { const l = JSON.parse(brut); return Array.isArray(l) ? l.filter((e) => e && e.id).map(propre) : []; } catch (e) { return []; }
}
// relit la liste, applique `modifier(liste) -> nouvelle liste`, enregistre : on n'écrase jamais le travail d'une autre personne
export async function modifierSuivi(modifier) {
  const nouveau = modifier(await lireSuivi()).map(propre);
  await db.upsert("parametres_app", [{ cle: CLE_SUIVI, valeur: JSON.stringify(nouveau) }], "cle");
  return nouveau;
}
async function lireFichesCheminee() {
  const r = await fetch(SUPA_URL + "/rest/v1/fiches?select=*&type_materiel=eq." + encodeURIComponent(TYPE_CHEMINEE) + "&order=created_at.desc&limit=2000", { headers: H });
  if (!r.ok) throw new Error("Lecture des fiches impossible (" + r.status + ")");
  const l = await r.json();
  return Array.isArray(l) ? l : [];
}
async function lireValeurs(ids) {
  const par = {};
  for (let i = 0; i < ids.length; i += 40) {
    const r = await fetch(SUPA_URL + "/rest/v1/fiche_valeurs?select=fiche_id,champ_id,valeur&fiche_id=in.(" + ids.slice(i, i + 40).join(",") + ")&champ_id=in.(" + CHAMPS_FICHE_SUIVI.join(",") + ")&limit=5000", { headers: H });
    if (!r.ok) throw new Error("Lecture des fiches impossible (" + r.status + ")");
    const rows = await r.json();
    (Array.isArray(rows) ? rows : []).forEach((x) => { if (ids.indexOf(x.fiche_id) >= 0) (par[x.fiche_id] = par[x.fiche_id] || {})[x.champ_id] = x.valeur; });
  }
  return par;
}
// Appelé juste avant la suppression d'une fiche cheminée, si on veut garder sa ligne dans le suivi (elle devient alors une ancienne ligne « fiche supprimée »)
export async function conserverLigneCheminee(fiche, par) {
  const valeurs = await lireValeurs([fiche.id]);
  const l = construireLignes([fiche], valeurs, [])[0];
  const notes = [l.arrivee ? "Gravures à l'arrivée : " + l.arrivee + "." : "", "Fiche supprimée le " + new Date().toLocaleDateString("fr-FR") + "."].filter(Boolean).join(" ");
  const ligne = { id: "sup_" + fiche.id, pmv: l.pmv, type: "cheminee", cheminee: l.cheminee, moteur: l.moteur, loco: l.loco, symbole: l.symbole, plages: l.plages, prefixeGrav: l.prefixeGrav, notes, client: l.client, origine: l.origine, date: l.date, source: "supprimee", par: par || "", ficheId: fiche.id };
  await modifierSuivi((a) => a.filter((x) => x.id !== ligne.id).concat([ligne]));
}

// ── présentation ──
const BLEU = "#1B4F8A";
const CARTE = { background: "#fff", border: "1px solid #E2E6EA", borderRadius: 12, padding: "12px 14px" };
const INP = { width: "100%", padding: "9px 10px", borderRadius: 8, border: "1.5px solid #D1D5DB", fontSize: 14, boxSizing: "border-box", background: "#fff", fontFamily: "inherit" };
const LBL = { display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".04em", margin: "10px 0 4px" };
const BTN = { background: BLEU, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
const BTN_O = { background: "#fff", color: BLEU, border: "1.5px solid " + BLEU, borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const SURBRILLANCE = { background: "#FEF3C7", borderRadius: 4, padding: "0 3px" };
const TH = { textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".04em", padding: "8px 10px", borderBottom: "2px solid #E2E6EA", whiteSpace: "nowrap" };
const TD = { padding: "9px 10px", borderBottom: "1px solid #EEF0F3", verticalAlign: "top", fontSize: 13 };

function useLargeur() { const [w, setW] = useState(window.innerWidth); useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []); return w; }
// Petit bouton « maison » : volontairement pas un <button> (sur tablette, les boutons sont agrandis et déformeraient le tableau)
function Act({ children, onClick, titre, style }) {
  const agir = (e) => { e.stopPropagation(); onClick(e); };
  return <span role="button" tabIndex={0} title={titre} onClick={agir} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); agir(e); } }} style={{ cursor: "pointer", ...style }}>{children}</span>;
}
const dateFr = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? m[3] + "/" + m[2] + "/" + m[1] : ""; };
const cleTri = (l) => rangPmv(l.pmv);
// « SNCF » ou « IMATEQ », comme dans la fiche atelier (champ « SNCF ou IMATEQ ») ; pastille pleine pour se lire d'un coup d'œil
const COULEURS_ORIGINE = { SNCF: ["#1B4F8A", "#fff"], IMATEQ: ["#D97706", "#fff"] };
function Origine({ valeur, surbrillance }) {
  const c = COULEURS_ORIGINE[valeur];
  if (!c) return <span style={{ color: "#9CA3AF" }} title="Origine non précisée">—</span>;
  return <span style={{ display: "inline-block", fontSize: 11, fontWeight: 800, letterSpacing: ".03em", background: c[0], color: c[1], borderRadius: 10, padding: "2px 10px", outline: surbrillance ? "3px solid #FDE68A" : "none" }}>{valeur}</span>;
}

export default function PageSuiviCheminees({ admin, par, onOuvrirFiche }) {
  const [etat, setEtat] = useState({ charge: false, erreur: "", fiches: [], valeurs: {}, anciens: [] });
  const [q, setQ] = useState("");
  const [type, setType] = useState("tous");
  const [src, setSrc] = useState("tous");
  const [orig, setOrig] = useState("tous");       // origine : tous | SNCF | IMATEQ
  const [groupe, setGroupe] = useState(false);
  const [edition, setEdition] = useState(null);   // ligne ancienne en cours d'édition (objet vide = nouvelle)
  const [apercu, setApercu] = useState(null);     // aperçu d'un import Excel
  const [msg, setMsg] = useState("");
  const [occupe, setOccupe] = useState(false);
  const largeur = useLargeur();
  const cartes = largeur < 820;

  async function charger() {
    try {
      const fiches = await lireFichesCheminee();
      const valeurs = await lireValeurs(fiches.map((f) => f.id));
      const anciens = await lireSuivi();
      setEtat({ charge: true, erreur: "", fiches, valeurs, anciens });
    } catch (e) { setEtat((p) => ({ ...p, charge: true, erreur: e.message || "Lecture impossible." })); }
  }
  useEffect(() => { charger(); }, []);

  const lignes = useMemo(() => construireLignes(etat.fiches, etat.valeurs, etat.anciens), [etat]);
  const passages = useMemo(() => { const c = {}; lignes.forEach((l) => { if (l.cheminee) c[norm(l.cheminee)] = (c[norm(l.cheminee)] || 0) + 1; }); return c; }, [lignes]);
  const nbCheminees = Object.keys(passages).length;
  const nbSeules = lignes.filter((l) => l.type === "resistance").length;
  const nbSncf = lignes.filter((l) => l.origine === "SNCF").length, nbImateq = lignes.filter((l) => l.origine === "IMATEQ").length;

  const vus = useMemo(() => {
    const out = [];
    lignes.forEach((l) => {
      if (type !== "tous" && l.type !== type) return;
      if (src === "fiche" && !l.deFiche) return;
      if (src === "ancien" && !l.deAncien) return;
      if (orig !== "tous" && l.origine !== orig) return;
      const m = q.trim() ? correspondances(l, q) : null;
      if (m && !m.length) return;
      out.push({ l, m: m || [] });
    });
    if (groupe) out.sort((a, b) => (a.l.cheminee ? 0 : 1) - (b.l.cheminee ? 0 : 1) || norm(a.l.cheminee).localeCompare(norm(b.l.cheminee)) || cleTri(a.l) - cleTri(b.l));
    else out.sort((a, b) => cleTri(b.l) - cleTri(a.l));
    return out;
  }, [lignes, q, type, src, orig, groupe]);

  // ── actions ──
  async function enregistrerLigne(f) {
    setOccupe(true);
    try {
      const ligne = { ...f, id: f.id || "sc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), source: f.source || "ancien", par: f.par || par || "" };
      const anciens = await modifierSuivi((a) => a.filter((x) => x.id !== ligne.id).concat([ligne]));
      setEtat((p) => ({ ...p, anciens })); setEdition(null); setMsg("✓ Ligne enregistrée.");
    } catch (e) { setMsg("⚠ Enregistrement impossible : " + e.message); }
    setOccupe(false);
  }
  async function supprimerLigne(id) {
    setOccupe(true);
    try { const anciens = await modifierSuivi((a) => a.filter((x) => x.id !== id)); setEtat((p) => ({ ...p, anciens })); setEdition(null); setMsg("✓ Ligne supprimée."); }
    catch (e) { setMsg("⚠ Suppression impossible : " + e.message); }
    setOccupe(false);
  }
  async function choisirFichier(e) {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f) return;
    setMsg(""); setOccupe(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      let res = null;
      for (const nom of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[nom], { header: 1, raw: false, defval: "" });
        const origine = detecterOrigine(rows, f.name);
        const r = analyserFeuille(rows, origine);
        if (!r.erreur) { res = { ...r, feuille: nom, origine }; break; }
      }
      if (!res) throw new Error("Les colonnes attendues n'ont pas été trouvées (N°PMV ou DV, N° cheminée, N° moteur, N° de gravage…).");
      setApercu({ ...res, fichier: f.name });
    } catch (err) { setMsg("⚠ Ce fichier n'a pas pu être lu : " + (err && err.message ? err.message : "erreur") + " Utilisez un fichier Excel .xlsx."); }
    setOccupe(false);
  }
  async function importer() {
    if (!apercu) return;
    setOccupe(true);
    try {
      const maintenant = new Date().toISOString();
      const nouvelles = apercu.lignes.map((l) => ({ ...l, origine: apercu.origine || "", id: "imp_" + l.cleImport, source: "ancien", cree: maintenant, par: par || "" }));
      const ids = new Set(nouvelles.map((x) => x.id));
      const anciens = await modifierSuivi((a) => a.filter((x) => !ids.has(x.id)).concat(nouvelles));
      setEtat((p) => ({ ...p, anciens })); setMsg("✓ " + nouvelles.length + " lignes importées depuis « " + apercu.fichier + " »."); setApercu(null);
    } catch (e) { setMsg("⚠ Import impossible : " + e.message); }
    setOccupe(false);
  }
  async function exporter() {
    try {
      const XLSX = await import("xlsx");
      const tete = ["N° DV / DE", "Type", "N° de cheminée", "N° de moteur", "N° d'engin / loco", "Symbole", "N° de gravage", "Gravures à l'arrivée", "Client", "Origine", "Date d'entrée", "Source", "Remarques"];
      const lib = (l) => (l.deFiche && l.deAncien ? "Fiche + ancien" : l.deFiche ? "Fiche" : l.supprimee ? "Fiche supprimée" : "Ancien");
      const aoa = [tete].concat(vus.map(({ l }) => [l.pmv, l.type === "resistance" ? "Résistance seule" : "Cheminée", l.cheminee, l.moteur, l.loco, l.symbole, (l.prefixeGrav ? l.prefixeGrav + " · " : "") + texteGravure(l.plages), l.arrivee, l.client, l.origine, dateFr(l.date), lib(l), l.notes]));
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = [12, 16, 14, 20, 16, 12, 26, 28, 16, 10, 12, 14, 50].map((w) => ({ wch: w }));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Suivi cheminées");
      XLSX.writeFile(wb, "Suivi cheminees " + new Date().toISOString().slice(0, 10) + ".xlsx");
    } catch (e) { setMsg("⚠ Export impossible : " + e.message); }
  }

  // ── cellules (partagées entre le tableau et les cartes du téléphone) ──
  const lien = (valeur, style) => <Act onClick={() => setQ(valeur)} titre="Chercher ce numéro : tous ses passages" style={{ color: BLEU, textDecoration: "underline dotted", overflowWrap: "anywhere", ...style }}>{valeur}</Act>;
  const vide = <span style={{ color: "#9CA3AF" }}>—</span>;
  function cellules({ l, m }) {
    const hl = (k) => (m.includes(k) ? SURBRILLANCE : {});
    const nb = l.cheminee ? passages[norm(l.cheminee)] : 0;
    const badge = (t, fond, coul) => <span style={{ fontSize: 10, fontWeight: 700, background: fond, color: coul, borderRadius: 10, padding: "1px 7px", whiteSpace: "nowrap" }}>{t}</span>;
    const source = l.deFiche ? badge(l.deAncien ? "Fiche + ancien" : "Fiche", "#EEF4FF", BLEU) : l.supprimee ? badge("Fiche supprimée", "#FFF7ED", "#B45309") : badge("Ancien", "#F3F4F6", "#4B5563");
    return {
      pmv: <div><b style={{ fontSize: 14, ...hl("pmv") }}>{lien(l.pmv)}</b>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", marginTop: 3 }}>{source}{l.type === "resistance" && badge("Résistance seule", "#F5F3FF", "#6D28D9")}</div>
        {(l.client || l.date) && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>{[l.client, dateFr(l.date)].filter(Boolean).join(" · ")}</div>}</div>,
      cheminee: l.cheminee ? <span style={hl("cheminee")}>{lien(l.cheminee)}{nb > 1 && <Act onClick={() => setQ(l.cheminee)} titre="Voir tous les passages de cette cheminée" style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: "#FEF3C7", color: "#92400E", borderRadius: 10, padding: "1px 6px" }}>×{nb}</Act>}</span> : vide,
      moteur: l.moteur ? <span style={hl("moteur")}>{lien(l.moteur)}</span> : vide,
      loco: l.loco === "NR" ? <span style={hl("loco")} title="NR : il n'y en a pas">NR</span>
        : l.loco ? <span><span style={hl("loco")}>{lien(l.loco)}</span>{l.symbole && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>symbole {l.symbole}</div>}</span> : vide,
      origine: <Origine valeur={l.origine} surbrillance={m.includes("origine")}/>,
      gravure: (l.plages.length || l.arrivee) ? <div><span style={hl("gravure")}>{l.plages.length ? <b>{texteGravure(l.plages)}</b> : vide}</span>{l.prefixeGrav && <span style={{ fontSize: 11, color: "#6B7280" }}> ({l.prefixeGrav})</span>}
        {l.arrivee && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>À l'arrivée : {l.arrivee}</div>}</div> : vide,
      remarques: <div>{l.notes && <span style={{ ...hl("notes"), fontSize: 12, overflowWrap: "anywhere" }}>{l.notes}</span>}
        {l.ecarts.map((e, i) => <div key={i} style={{ fontSize: 11, color: "#B45309", marginTop: 3 }}>⚠ {e.champ} : fiche « {e.fiche} » ≠ ancien tableau « {e.ancien} »</div>)}
        {!l.notes && !l.ecarts.length && vide}</div>,
      actions: <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {l.fiche && onOuvrirFiche && <Act onClick={() => onOuvrirFiche(l.fiche)} titre="Ouvrir la fiche atelier" style={{ ...BTN_O, padding: "3px 9px", fontSize: 12 }}>📄 Fiche</Act>}
        {admin && l.idAncien && <Act onClick={() => setEdition(etat.anciens.find((a) => a.id === l.idAncien) || null)} titre="Modifier cette ancienne ligne" style={{ ...BTN_O, padding: "3px 9px", fontSize: 12 }}>✏️ Modifier</Act>}</div>,
    };
  }

  const entetesGroupe = (item, i) => {
    if (!groupe) return null;
    const prec = i > 0 ? vus[i - 1].l : null;
    const cle = norm(item.l.cheminee);
    if (prec && norm(prec.cheminee) === cle) return null;
    const n = item.l.cheminee ? passages[cle] : 0;
    return <div style={{ margin: "14px 0 6px", fontSize: 13, fontWeight: 700, color: BLEU }}>{item.l.cheminee ? "Cheminée " + item.l.cheminee + " · " + n + " passage" + (n > 1 ? "s" : "") : "Sans n° de cheminée"}</div>;
  };

  return (<div style={{ maxWidth: "var(--lp,1200px)", margin: "0 auto", padding: "20px 16px" }}>
    <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>🚆 Suivi des cheminées et résistances de freinage</h2>
    <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 12px" }}>Tapez un numéro (DV, cheminée, moteur, engin / loco ou gravage) : les autres informations s'affichent. Touchez un numéro du tableau pour voir tous ses passages. Les lignes des fiches se mettent à jour toutes seules.</p>

    <div style={{ ...CARTE, marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un N° de DV, de cheminée, de moteur, d'engin / loco ou de gravage…" aria-label="Chercher un numéro" style={{ ...INP, fontSize: 15 }}
          autoFocus={typeof window.matchMedia === "function" && window.matchMedia("(pointer: fine)").matches}/>
        {q && <button type="button" onClick={() => setQ("")} style={BTN_O} aria-label="Effacer la recherche">✕</button>}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
        {[["tous", "Tout"], ["cheminee", "Cheminées"], ["resistance", "Résistances seules"]].map(([id, lib]) => <button type="button" key={id} aria-pressed={type === id} onClick={() => setType(id)} style={{ ...BTN_O, background: type === id ? BLEU : "#fff", color: type === id ? "#fff" : BLEU, padding: "5px 12px", fontSize: 12 }}>{lib}</button>)}
        <span style={{ width: 8 }}/>
        {[["tous", "SNCF + IMATEQ"], ["SNCF", "SNCF"], ["IMATEQ", "IMATEQ"]].map(([id, lib]) => <button type="button" key={id} aria-pressed={orig === id} onClick={() => setOrig(id)} style={{ ...BTN_O, background: orig === id ? BLEU : "#fff", color: orig === id ? "#fff" : BLEU, padding: "5px 12px", fontSize: 12 }}>{lib}</button>)}
        <span style={{ width: 8 }}/>
        {[["tous", "Toutes les sources"], ["fiche", "Fiches"], ["ancien", "Anciens"]].map(([id, lib]) => <button type="button" key={id} aria-pressed={src === id} onClick={() => setSrc(id)} style={{ ...BTN_O, background: src === id ? BLEU : "#fff", color: src === id ? "#fff" : BLEU, padding: "5px 12px", fontSize: 12 }}>{lib}</button>)}
        <span style={{ width: 8 }}/>
        <button type="button" aria-pressed={groupe} onClick={() => setGroupe(!groupe)} style={{ ...BTN_O, background: groupe ? BLEU : "#fff", color: groupe ? "#fff" : BLEU, padding: "5px 12px", fontSize: 12 }}>Regrouper par cheminée</button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#6B7280", flex: "1 1 220px" }}>{etat.charge ? lignes.length + " passage" + (lignes.length > 1 ? "s" : "") + " · " + nbCheminees + " cheminée" + (nbCheminees > 1 ? "s" : "") + (nbSeules ? " · " + nbSeules + " résistance" + (nbSeules > 1 ? "s" : "") + " seule" + (nbSeules > 1 ? "s" : "") : "") + " · " + nbSncf + " SNCF · " + nbImateq + " IMATEQ" + (vus.length !== lignes.length ? " · " + vus.length + " affiché" + (vus.length > 1 ? "s" : "") : "") : "Chargement…"}</span>
        <button type="button" onClick={exporter} disabled={!vus.length} style={BTN_O}>⬇ Exporter en Excel</button>
        {admin && <button type="button" onClick={() => setEdition({})} style={BTN_O}>➕ Ajouter une ligne</button>}
        {admin && <label style={{ ...BTN_O, display: "inline-flex", alignItems: "center", cursor: occupe ? "default" : "pointer", opacity: occupe ? .6 : 1 }}>📥 Importer un fichier Excel<input type="file" accept=".xlsx,.xlsm,.xls" onChange={choisirFichier} disabled={occupe} style={{ display: "none" }}/></label>}
      </div>
    </div>

    {msg && <div role="status" style={{ background: msg.indexOf("⚠") === 0 ? "#FFF1F2" : "#F0FFF4", border: "1px solid " + (msg.indexOf("⚠") === 0 ? "#D73A49" : "#22863A"), borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12, display: "flex", justifyContent: "space-between", gap: 8 }}><span>{msg}</span><Act onClick={() => setMsg("")} titre="Fermer">✕</Act></div>}
    {etat.erreur && <div role="alert" style={{ background: "#FFF1F2", border: "1px solid #D73A49", borderRadius: 8, padding: "10px 12px", fontSize: 13, marginBottom: 12 }}>⚠ {etat.erreur} <button type="button" onClick={charger} style={{ ...BTN_O, marginLeft: 8 }}>Réessayer</button></div>}
    {etat.charge && !etat.erreur && !vus.length && <div style={{ ...CARTE, textAlign: "center", color: "#6B7280", fontSize: 14 }}>{lignes.length ? "Aucune ligne ne correspond à cette recherche." : "Aucune cheminée pour le moment : les fiches « Cheminée de freinage » apparaîtront ici" + (admin ? ", et vous pouvez importer vos anciennes informations avec « Importer un fichier Excel »." : ".")}</div>}

    {vus.length > 0 && !cartes && <div style={{ ...CARTE, padding: 0, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
        <thead><tr>{["N° DV / DE", "Origine", "N° de cheminée", "N° de moteur", "N° d'engin / loco", "N° de gravage", "Remarques", ""].map((t, i) => <th key={i} style={TH}>{t}</th>)}</tr></thead>
        <tbody>{vus.map((it, i) => {
          const c = cellules(it);
          const gr = entetesGroupe(it, i);
          return (<React.Fragment key={it.l.cle}>
            {gr && <tr><td colSpan={8} style={{ background: "#F8F9FA", padding: "6px 10px" }}>{gr}</td></tr>}
            <tr><td style={TD}>{c.pmv}</td><td style={TD}>{c.origine}</td><td style={TD}>{c.cheminee}</td><td style={TD}>{c.moteur}</td><td style={TD}>{c.loco}</td><td style={TD}>{c.gravure}</td><td style={{ ...TD, maxWidth: 280 }}>{c.remarques}</td><td style={TD}>{c.actions}</td></tr>
          </React.Fragment>);
        })}</tbody>
      </table>
    </div>}

    {vus.length > 0 && cartes && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{vus.map((it, i) => {
      const c = cellules(it);
      const ligne = (lib, val) => <div style={{ display: "flex", gap: 8, padding: "5px 0", borderTop: "1px solid #F1F2F4", fontSize: 13 }}><span style={{ flex: "0 0 96px", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>{lib}</span><span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{val}</span></div>;
      return (<React.Fragment key={it.l.cle}>{entetesGroupe(it, i)}
        <div style={CARTE}>{c.pmv}{ligne("Origine", c.origine)}{ligne("Cheminée", c.cheminee)}{ligne("Moteur", c.moteur)}{ligne("Engin / loco", c.loco)}{ligne("Gravage", c.gravure)}{(it.l.notes || it.l.ecarts.length > 0) && ligne("Remarques", c.remarques)}
          <div style={{ marginTop: 8 }}>{c.actions}</div></div></React.Fragment>);
    })}</div>}

    {edition && <FormLigne init={edition} occupe={occupe} onSauver={enregistrerLigne} onSupprimer={supprimerLigne} onFermer={() => setEdition(null)}/>}
    {apercu && <ApercuImport apercu={apercu} occupe={occupe} onOrigine={(o) => setApercu((a) => ({ ...a, origine: o }))} onImporter={importer} onFermer={() => setApercu(null)}/>}
  </div>);
}

// ── fenêtres ──
function Fenetre({ titre, children, onFermer, large }) {
  return (<div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 400, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 12, overflowY: "auto" }} onClick={(e) => { if (e.target === e.currentTarget) onFermer(); }}>
    <div role="dialog" aria-label={titre} style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: large ? 720 : 520, padding: "16px 18px 20px", boxShadow: "0 12px 40px rgba(0,0,0,.3)", margin: "auto 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <h3 style={{ fontSize: 17, margin: 0 }}>{titre}</h3>
        <button type="button" onClick={onFermer} aria-label="Fermer" style={{ background: "#F3F4F6", border: 0, borderRadius: 10, width: 40, height: 40, fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>
      {children}
    </div>
  </div>);
}

function FormLigne({ init, occupe, onSauver, onSupprimer, onFermer }) {
  const neuve = !init.id;
  const [pmv, setPmv] = useState(init.pmv || "");
  const [type, setType] = useState(init.type || "cheminee");
  const [cheminee, setCheminee] = useState(init.cheminee || "");
  const [moteur, setMoteur] = useState(init.moteur || "");
  const [loco, setLoco] = useState(init.loco || "");
  const [origine, setOrigine] = useState(init.origine || "");
  const [grav, setGrav] = useState(texteGravure(init.plages || []).replace(/ → /g, " à "));
  const [client, setClient] = useState(init.client || "");
  const [notes, setNotes] = useState(init.notes || "");
  const [conf, setConf] = useState(false);
  const pmvOk = /^(DE|DV)\s*\d+$/i.test(pmv.trim());
  const sauver = () => onSauver({ ...init, pmv: numeroPmv(pmv), type, cheminee: cheminee.trim(), moteur: moteur.trim(), loco: loco.trim(), origine, plages: lirePlages(grav), client: client.trim(), notes: notes.trim() });
  const champ = (lib, val, set, ph, extra) => <div><label style={LBL}>{lib}</label><input type="text" value={val} onChange={(e) => set(e.target.value)} placeholder={ph} style={INP} {...extra}/></div>;
  return (<Fenetre titre={neuve ? "Ajouter une ancienne ligne" : "Modifier la ligne " + init.pmv} onFermer={onFermer}>
    <p style={{ fontSize: 12, color: "#6B7280", margin: "8px 0 0" }}>Ancienne information, sans fiche atelier. Les cases vides restent vides.</p>
    {champ("N° DV ou DE *", pmv, setPmv, "DV0022")}
    {!pmvOk && pmv.trim() !== "" && <div style={{ fontSize: 12, color: "#B42318" }}>Écrivez le N° comme DV0022 ou DE5040.</div>}
    <label style={LBL}>Type</label>
    <select value={type} onChange={(e) => setType(e.target.value)} style={INP} aria-label="Type"><option value="cheminee">Cheminée</option><option value="resistance">Résistance seule (sans cheminée)</option></select>
    <label style={LBL}>SNCF ou IMATEQ</label>
    <select value={origine} onChange={(e) => setOrigine(e.target.value)} style={INP} aria-label="SNCF ou IMATEQ"><option value="">Non précisé</option><option value="SNCF">SNCF</option><option value="IMATEQ">IMATEQ</option></select>
    {champ("N° de cheminée", cheminee, setCheminee, "59578")}
    {champ("N° de moteur", moteur, setMoteur, "2170967-001-013")}
    <div><label style={LBL}>N° d'engin / loco</label>
      <div style={{ display: "flex", gap: 8 }}><input type="text" value={loco} onChange={(e) => setLoco(e.target.value)} placeholder="79034" style={INP}/><button type="button" onClick={() => setLoco("NR")} style={BTN_O} title="NR : il n'y en a pas">NR</button></div></div>
    {champ("N° de gravage (plages)", grav, setGrav, "259 à 266 ; 270")}
    {champ("Client (facultatif)", client, setClient, "IMATEQ")}
    <label style={LBL}>Remarques (regravure, anomalie…)</label>
    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...INP, resize: "vertical" }}/>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
      <button type="button" disabled={occupe || !pmvOk} onClick={sauver} style={{ ...BTN, opacity: occupe || !pmvOk ? .5 : 1 }}>{occupe ? "Enregistrement…" : "💾 Enregistrer"}</button>
      <button type="button" onClick={onFermer} style={BTN_O}>Annuler</button>
      {!neuve && !conf && <button type="button" onClick={() => setConf(true)} style={{ ...BTN_O, color: "#D73A49", borderColor: "#D73A49" }}>🗑 Supprimer</button>}
    </div>
    {!neuve && conf && <div style={{ background: "#FFF5F5", border: "1px solid #D73A49", borderRadius: 8, padding: "8px 10px", marginTop: 10 }}>
      <div style={{ fontSize: 13, color: "#8A1F2B" }}>Supprimer définitivement la ligne {init.pmv} ?</div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}><button type="button" disabled={occupe} onClick={() => onSupprimer(init.id)} style={{ ...BTN, background: "#D73A49" }}>Oui, supprimer</button><button type="button" onClick={() => setConf(false)} style={BTN_O}>Non</button></div>
    </div>}
  </Fenetre>);
}

function ApercuImport({ apercu, occupe, onOrigine, onImporter, onFermer }) {
  const l = apercu.lignes;
  return (<Fenetre titre="Importer un fichier Excel" onFermer={onFermer} large>
    <p style={{ fontSize: 13, margin: "8px 0" }}><b>{apercu.fichier}</b> (feuille « {apercu.feuille} ») : {apercu.source.lignesLues} lignes lues, <b>{l.length} lignes</b> à importer
      ({l.filter((x) => x.type === "resistance").length} résistances seules).</p>
    <div style={{ background: "#F8F9FA", border: "1px solid #E2E6EA", borderRadius: 8, padding: "8px 12px", margin: "8px 0" }}>
      <label style={{ ...LBL, margin: "0 0 4px" }}>Ces cheminées sont-elles SNCF ou IMATEQ ?</label>
      <select value={apercu.origine || ""} onChange={(e) => onOrigine(e.target.value)} style={INP} aria-label="Origine des lignes importées">
        <option value="">Non précisée</option><option value="SNCF">SNCF</option><option value="IMATEQ">IMATEQ</option></select>
      <p style={{ fontSize: 11, color: "#6B7280", margin: "4px 0 0" }}>{apercu.origine ? "Repérée d'après le titre ou le nom du fichier : vérifiez." : "Non repérée dans le fichier."} Même choix que dans la fiche atelier (« SNCF ou IMATEQ »).</p></div>
    {apercu.ignorees.length > 0 && <p style={{ fontSize: 12, color: "#4B5563", margin: "4px 0" }}>Ignorées car vides (seul le N° est écrit) : {apercu.ignorees.join(", ")}.</p>}
    {apercu.avertissements.length > 0 && <div style={{ background: "#FFF8E1", border: "1px solid #E8720C", borderRadius: 8, padding: "8px 12px", margin: "8px 0" }}>
      <b style={{ fontSize: 13, color: "#B45309" }}>À vérifier ({apercu.avertissements.length})</b>
      <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12, lineHeight: 1.5 }}>{apercu.avertissements.map((a, i) => <li key={i}>{a}</li>)}</ul>
      <p style={{ fontSize: 11, color: "#6B7280", margin: "6px 0 0" }}>Rien ne bloque l'import : vous pourrez corriger chaque ligne ensuite avec « Modifier ».</p></div>}
    <div style={{ maxHeight: 220, overflow: "auto", border: "1px solid #E2E6EA", borderRadius: 8, margin: "8px 0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead><tr>{["N°", "Cheminée", "Moteur", "Loco", "Gravage"].map((t) => <th key={t} style={{ ...TH, position: "sticky", top: 0, background: "#fff" }}>{t}</th>)}</tr></thead>
        <tbody>{l.map((x) => <tr key={x.cleImport}><td style={TD}><b>{x.pmv}</b>{x.type === "resistance" ? " (résistance seule)" : ""}</td><td style={TD}>{x.cheminee || "—"}</td><td style={TD}>{x.moteur || "—"}</td><td style={TD}>{x.loco || "—"}</td><td style={TD}>{texteGravure(x.plages) || "—"}</td></tr>)}</tbody>
      </table>
    </div>
    <p style={{ fontSize: 12, color: "#6B7280", margin: "4px 0 10px" }}>Si ces lignes ont déjà été importées, elles sont remplacées (les autres lignes ne sont pas touchées).</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" disabled={occupe || !l.length} onClick={onImporter} style={{ ...BTN, opacity: occupe || !l.length ? .5 : 1 }}>{occupe ? "Import…" : "✅ Importer " + l.length + " lignes"}</button>
      <button type="button" onClick={onFermer} style={BTN_O}>Annuler</button>
    </div>
  </Fenetre>);
}
