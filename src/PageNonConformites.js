import React, {useState, useEffect, useMemo, useCallback} from "react";
import {NoticeActivation} from "./Activation";
import {SourcesPhoto, CroixPhoto} from "./Photos";
import {CATEGORIES_NC, MAX_PHOTOS_NC, SQL_NON_CONFORMITES, lireNonConformites, verifierTableNC, nouvelIdNC, creerNonConformite, modifierNonConformite, supprimerNonConformite, envoyerPhotoNC, retirerFichierNC, urlPhotoNC} from "./nonConformites";

// Onglet « Non conformités » (demande du 17/11/2026) : deux boutons, « ✍️ Écrire » et « 📋 Liste ». Voir nonConformites.js pour les règles (qui voit, qui modifie).
const BLEU = "#1B4F8A";
const CARTE = {background: "#fff", border: "1px solid #E2E6EA", borderRadius: 12};
const INP = {width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #D1D5DB", fontSize: 15, boxSizing: "border-box", background: "#fff", fontFamily: "inherit"};
const LBL = {display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".04em", margin: "14px 0 5px"};
const BTN = {background: BLEU, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer"};
const BTN_O = {background: "#fff", color: BLEU, border: "1.5px solid " + BLEU, borderRadius: 8, padding: "9px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer"};
const txt = (x) => String(x == null ? "" : x).trim();
const nomPers = (p) => (String(p.nom || "").toUpperCase() + " " + (p.prenom || "")).trim();
const quand = (iso) => { const d = new Date(iso); return isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", {day: "2-digit", month: "2-digit", year: "numeric"}) + " " + d.toLocaleTimeString("fr-FR", {hour: "2-digit", minute: "2-digit"}); };
const jour = (iso) => { const d = new Date(iso); return isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", {day: "2-digit", month: "2-digit", year: "numeric"}); };
const concernesTexte = (nc) => (nc.global ? "Global" : (Array.isArray(nc.concernes) ? nc.concernes.map((c) => c.nom).join(", ") : ""));
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
function useLargeur() { const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200); useEffect(() => { const f = () => setW(window.innerWidth); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []); return w; }

function Fenetre({titre, children, onFermer, large}) {
  return (<div style={{position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 400, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 12, overflowY: "auto"}} onClick={(e) => { if (e.target === e.currentTarget) onFermer(); }}>
    <div role="dialog" aria-label={titre} style={{background: "#fff", borderRadius: 14, width: "100%", maxWidth: large ? 640 : 480, padding: "16px 18px 20px", boxShadow: "0 12px 40px rgba(0,0,0,.3)", margin: "auto 0"}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10}}>
        <h3 style={{fontSize: 17, margin: 0, overflowWrap: "anywhere"}}>{titre}</h3>
        <button type="button" onClick={onFermer} aria-label="Fermer" style={{background: "#F3F4F6", border: 0, borderRadius: 10, width: 40, height: 40, fontSize: 18, cursor: "pointer", flex: "none"}}>✕</button>
      </div>
      {children}
    </div>
  </div>);
}

export default function PageNonConformites({moi, admin, personnes, Dictee, appendTexte}) {
  const [vue, setVue] = useState(admin ? "liste" : "ecrire");
  const [etat, setEtat] = useState({charge: false, dispo: true, liste: [], erreur: ""});
  const [edition, setEdition] = useState(null); // non-conformité en cours de modification (null = nouvelle)
  const [detail, setDetail] = useState(null);
  const [msg, setMsg] = useState("");
  const concernables = useMemo(() => (personnes || []).filter((p) => p.profil !== "maintenance").sort((a, b) => nomPers(a).localeCompare(nomPers(b), "fr")), [personnes]);

  const charger = useCallback(async () => {
    try { const r = await lireNonConformites({admin, moiId: moi.id}); setEtat({charge: true, dispo: r.dispo, liste: r.liste, erreur: ""}); }
    catch (e) { setEtat((p) => ({...p, charge: true, erreur: e.message || "Lecture impossible."})); }
  }, [admin, moi.id]);
  useEffect(() => { charger(); }, [charger]);

  const apresEnregistrement = (texte) => { setMsg(texte); setEdition(null); setDetail(null); setVue("liste"); charger(); };
  const onglet = (id, lib) => <button type="button" key={id} onClick={() => { setVue(id); if (id === "ecrire") setEdition(null); setMsg(""); }} aria-pressed={vue === id} style={{...BTN_O, flex: "1 1 160px", padding: "12px 14px", fontSize: 15, background: vue === id ? BLEU : "#fff", color: vue === id ? "#fff" : BLEU}}>{lib}{id === "liste" && etat.charge && etat.dispo ? " (" + etat.liste.length + ")" : ""}</button>;

  return (<div style={{maxWidth: "var(--lp,900px)", margin: "0 auto", padding: "20px 16px"}}>
    <h2 style={{fontSize: 20, fontWeight: 700, margin: "0 0 6px"}}>⚠️ Non conformités</h2>
    <p style={{fontSize: 13, color: "#6B7280", margin: "0 0 14px"}}>{admin ? "Vous voyez les non-conformités de tout le monde." : "Vous ne voyez que les non-conformités que vous avez écrites."}</p>
    {etat.charge && !etat.dispo
      ? <NoticeActivation titre="Activer les non-conformités" intro="La base de données doit recevoir une petite table pour ranger les non-conformités. C'est à faire une seule fois, par le responsable. Le texte SQL peut être rejoué sans risque." sql={SQL_NON_CONFORMITES} onVerifier={async () => { const ok = await verifierTableNC(); if (ok === true) charger(); return ok; }}/>
      : <>
        <div style={{display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14}}>{onglet("ecrire", edition ? "✏️ Modifier" : "✍️ Écrire une non-conformité")}{onglet("liste", "📋 Liste")}</div>
        {msg && <div role="status" style={{background: "#F0FFF4", border: "1px solid #22863A", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#22863A", marginBottom: 12, display: "flex", justifyContent: "space-between", gap: 8}}><span>{msg}</span><span role="button" tabIndex={0} onClick={() => setMsg("")} style={{cursor: "pointer"}}>✕</span></div>}
        {etat.erreur && <div role="alert" style={{background: "#FFF5F5", border: "1px solid #D73A49", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#D73A49", marginBottom: 12}}>⚠ {etat.erreur} <button type="button" onClick={charger} style={{...BTN_O, marginLeft: 8, padding: "4px 10px", fontSize: 12}}>Réessayer</button></div>}
        {vue === "ecrire" && <Formulaire key={edition ? edition.id : "nouvelle"} moi={moi} concernables={concernables} Dictee={Dictee} appendTexte={appendTexte} initial={edition} onFait={apresEnregistrement} onAnnuler={edition ? () => { setEdition(null); setVue("liste"); } : null}/>}
        {vue === "liste" && <Liste etat={etat} moi={moi} admin={admin} concernables={concernables} onOuvrir={setDetail}/>}
      </>}
    {detail && <Detail nc={detail} moi={moi} admin={admin} onFermer={() => setDetail(null)}
      onModifier={() => { setEdition(detail); setDetail(null); setVue("ecrire"); setMsg(""); }}
      onSupprimee={() => apresEnregistrement("✓ Non-conformité supprimée (la trace est gardée).")}/>}
  </div>);
}

// ── formulaire : écrire ou modifier ──
function Formulaire({moi, concernables, Dictee, appendTexte, initial, onFait, onAnnuler}) {
  const modif = !!initial;
  const [global, setGlobal] = useState(initial ? !!initial.global : false);
  const [choisies, setChoisies] = useState(() => new Set(initial && Array.isArray(initial.concernes) ? initial.concernes.map((c) => c.id) : []));
  const [categorie, setCategorie] = useState(initial ? initial.categorie : "");
  const [note, setNote] = useState(initial ? initial.note : "");
  const [gardees, setGardees] = useState(() => (initial && Array.isArray(initial.photos) ? initial.photos : [])); // photos déjà enregistrées {chemin, nom}
  const [nouvelles, setNouvelles] = useState([]);                                                              // {fichier, apercu}
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  useEffect(() => () => { nouvelles.forEach((n) => { try { URL.revokeObjectURL(n.apercu); } catch (e) { /* sans effet */ } }); }, []); // eslint-disable-line
  const total = gardees.length + nouvelles.length;
  const bascule = (id) => setChoisies((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const ajouterFichiers = (fs) => setNouvelles((l) => l.concat(fs.slice(0, Math.max(0, MAX_PHOTOS_NC - gardees.length - l.length)).map((f) => ({fichier: f, apercu: URL.createObjectURL(f)}))));
  const valide = txt(note) !== "" && categorie !== "" && (global || choisies.size > 0);
  const aide = !txt(note) ? "Écrivez la non-conformité." : !categorie ? "Choisissez une catégorie." : (!global && choisies.size === 0) ? "Choisissez « Global » ou au moins une personne concernée." : "";

  async function enregistrer() {
    if (!valide || occupe) return;
    setOccupe(true); setErreur("");
    const id = initial ? initial.id : nouvelIdNC();
    const envoyes = [];
    try {
      const concernes = global ? [] : concernables.filter((p) => choisies.has(p.id)).map((p) => ({id: p.id, nom: nomPers(p)}));
      for (let i = 0; i < nouvelles.length; i++) envoyes.push({chemin: await envoyerPhotoNC(id, nouvelles[i].fichier, i), nom: nouvelles[i].fichier.name || ""});
      const photos = gardees.concat(envoyes);
      if (!modif) {
        await creerNonConformite({id, auteur_id: moi.id, auteur_nom: nomPers(moi), global, concernes, categorie, note: txt(note), photos, historique: []});
        onFait("✓ Non-conformité enregistrée.");
      } else {
        const avant = {};
        if (txt(note) !== txt(initial.note)) avant.note = initial.note;
        if (categorie !== initial.categorie) avant.categorie = initial.categorie;
        if (global !== !!initial.global || JSON.stringify(concernes.map((c) => c.id).sort()) !== JSON.stringify((initial.concernes || []).map((c) => c.id).sort())) avant.concernes = initial.global ? "Global" : (initial.concernes || []).map((c) => c.nom);
        const retirees = (initial.photos || []).filter((p) => !gardees.some((g) => g.chemin === p.chemin));
        if (retirees.length) avant.photosRetirees = retirees.map((p) => p.nom || p.chemin);
        if (envoyes.length) avant.photosAjoutees = envoyes.map((p) => p.nom || p.chemin);
        await modifierNonConformite(id, {global, concernes, categorie, note: txt(note), photos}, {date: new Date().toISOString(), par: nomPers(moi), par_id: moi.id, action: "modifiée", avant});
        retirees.forEach((p) => retirerFichierNC(p.chemin));
        onFait("✓ Non-conformité modifiée (la modification est notée dans son historique).");
      }
    } catch (e) {
      envoyes.forEach((p) => retirerFichierNC(p.chemin)); // rien n'a été enregistré : on ne laisse pas de fichiers orphelins
      setErreur(e.message || "L'enregistrement n'a pas abouti."); setOccupe(false);
    }
  }

  const puce = (actif, lib, onClick, cle) => <button type="button" key={cle} onClick={onClick} aria-pressed={actif} style={{border: "1.5px solid " + (actif ? BLEU : "#D1D5DB"), background: actif ? BLEU : "#fff", color: actif ? "#fff" : "#1A1A2E", borderRadius: 20, padding: "8px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 40, textAlign: "left"}}>{lib}</button>;
  return (<div style={{...CARTE, padding: "4px 18px 18px"}}>
    {modif && <div style={{background: "#EEF4FF", border: "1px solid #AFC6E6", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: BLEU, marginTop: 14}}>Modification d'une non-conformité écrite par {initial.auteur_nom} le {jour(initial.created_at)}. Elle sera notée dans son historique.</div>}
    <label style={LBL}>Concerne</label>
    <div style={{display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8}}>
      {puce(global, "🌐 Global", () => { setGlobal((g) => !g); }, "global")}
    </div>
    {!global && <>
      <div style={{fontSize: 12, color: "#6B7280", marginBottom: 6}}>Ou choisissez la ou les personnes concernées :</div>
      <div style={{display: "flex", gap: 8, flexWrap: "wrap"}}>{concernables.map((p) => puce(choisies.has(p.id), nomPers(p), () => bascule(p.id), p.id))}</div>
    </>}
    <label style={LBL} htmlFor="nc-cat">Catégorie *</label>
    <select id="nc-cat" value={categorie} onChange={(e) => setCategorie(e.target.value)} style={INP}>
      <option value="">— Choisir</option>
      {CATEGORIES_NC.concat(categorie && !CATEGORIES_NC.includes(categorie) ? [categorie] : []).map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
    <label style={LBL} htmlFor="nc-note">Non-conformité *</label>
    <div style={{display: "flex", gap: 6, alignItems: "flex-start"}}>
      <textarea id="nc-note" value={note} onChange={(e) => setNote(e.target.value)} rows={6} placeholder="Décrivez ce qui n'est pas conforme : quoi, où, quand…" style={{...INP, resize: "vertical", flex: 1}}/>
      {Dictee && <Dictee onTexte={(t) => setNote((n) => appendTexte ? appendTexte(n, t) : txt(n + " " + t))}/>}
    </div>
    <label style={LBL}>Photos ({total}/{MAX_PHOTOS_NC})</label>
    {total > 0 && <div style={{display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8}}>
      {gardees.map((p) => <div key={p.chemin} style={{position: "relative"}}><img src={urlPhotoNC(p.chemin)} alt={p.nom || "photo"} style={{width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "1px solid #E2E6EA"}}/><CroixPhoto onClick={() => setGardees((l) => l.filter((x) => x.chemin !== p.chemin))}/></div>)}
      {nouvelles.map((n, i) => <div key={n.apercu} style={{position: "relative"}}><img src={n.apercu} alt="nouvelle photo" style={{width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "2px solid " + BLEU}}/><CroixPhoto onClick={() => { try { URL.revokeObjectURL(n.apercu); } catch (e) { /* sans effet */ } setNouvelles((l) => l.filter((_, k) => k !== i)); }}/></div>)}
    </div>}
    {total < MAX_PHOTOS_NC && <SourcesPhoto onFichiers={ajouterFichiers} occupe={occupe}/>}
    {aide && <div style={{fontSize: 12, color: "#8A4B00", marginTop: 12}}>{aide}</div>}
    {erreur && <div role="alert" style={{background: "#FFF5F5", border: "1px solid #D73A49", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#D73A49", marginTop: 12}}>⚠ {erreur}</div>}
    <div style={{display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16}}>
      <button type="button" disabled={!valide || occupe} onClick={enregistrer} style={{...BTN, opacity: !valide || occupe ? .5 : 1}}>{occupe ? "⏳ Enregistrement…" : modif ? "💾 Enregistrer la modification" : "💾 Enregistrer"}</button>
      {onAnnuler && <button type="button" disabled={occupe} onClick={onAnnuler} style={BTN_O}>Annuler</button>}
    </div>
  </div>);
}

// ── liste ──
function Liste({etat, moi, admin, concernables, onOuvrir}) {
  const large = useLargeur() >= 900;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [qui, setQui] = useState("");     // concerné : "" | "__global" | id
  const [redacteur, setRedacteur] = useState("");
  if (!etat.charge) return <div style={{textAlign: "center", padding: 30, color: "#9CA3AF"}}>Chargement…</div>;
  const redacteurs = Array.from(new Map(etat.liste.map((n) => [n.auteur_id, n.auteur_nom])).entries()).sort((a, b) => a[1].localeCompare(b[1], "fr"));
  const visibles = etat.liste.filter((n) => {
    if (cat && n.categorie !== cat) return false;
    if (qui === "__global" ? !n.global : qui ? !(n.concernes || []).some((c) => c.id === qui) : false) return false;
    if (redacteur && n.auteur_id !== redacteur) return false;
    return !q || norm(n.note + " " + n.auteur_nom + " " + concernesTexte(n) + " " + n.categorie).includes(norm(q));
  });
  const filtres = <div style={{display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12}}>
    <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Chercher dans les notes…" aria-label="Chercher" style={{...INP, flex: "2 1 200px", width: "auto"}}/>
    <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Catégorie" style={{...INP, flex: "1 1 150px", width: "auto"}}><option value="">Toutes les catégories</option>{CATEGORIES_NC.map((c) => <option key={c} value={c}>{c}</option>)}</select>
    <select value={qui} onChange={(e) => setQui(e.target.value)} aria-label="Personne concernée" style={{...INP, flex: "1 1 150px", width: "auto"}}><option value="">Tous les concernés</option><option value="__global">🌐 Global</option>{concernables.map((p) => <option key={p.id} value={p.id}>{nomPers(p)}</option>)}</select>
    {admin && <select value={redacteur} onChange={(e) => setRedacteur(e.target.value)} aria-label="Rédacteur" style={{...INP, flex: "1 1 150px", width: "auto"}}><option value="">Tous les rédacteurs</option>{redacteurs.map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}</select>}
  </div>;
  if (!etat.liste.length) return <div style={{textAlign: "center", padding: 40, color: "#9CA3AF", background: "#fff", borderRadius: 10, border: "1px dashed #D1D5DB"}}>{admin ? "Aucune non-conformité pour le moment." : "Vous n'avez écrit aucune non-conformité pour le moment."}</div>;
  const resume = (n) => { const t = txt(n.note).replace(/\s+/g, " "); return t.length > 140 ? t.slice(0, 140) + "…" : t; };
  const nbPh = (n) => (Array.isArray(n.photos) ? n.photos.length : 0);
  return (<div>
    {filtres}
    {!visibles.length && <div style={{textAlign: "center", padding: 24, color: "#9CA3AF"}}>Aucune non-conformité ne correspond.</div>}
    {large && visibles.length > 0 && <div style={{...CARTE, overflow: "hidden"}}><table style={{width: "100%", borderCollapse: "collapse", fontSize: 14}}>
      <thead><tr style={{background: "#F3F6FA", textAlign: "left", fontSize: 12, color: "#4B5563", textTransform: "uppercase", letterSpacing: ".04em"}}>{["Concerné(s)", "Rédacteur", "Date", "Catégorie", "Non-conformité", ""].map((h) => <th key={h} style={{padding: "10px 12px", fontWeight: 700}}>{h}</th>)}</tr></thead>
      <tbody>{visibles.map((n) => <tr key={n.id} onClick={() => onOuvrir(n)} style={{borderTop: "1px solid #EEF1F5", cursor: "pointer", verticalAlign: "top"}}>
        <td style={{padding: "10px 12px", fontWeight: 600, overflowWrap: "anywhere", maxWidth: 200}}>{n.global ? "🌐 Global" : concernesTexte(n)}</td>
        <td style={{padding: "10px 12px", overflowWrap: "anywhere", maxWidth: 160}}>{n.auteur_nom}</td>
        <td style={{padding: "10px 12px", whiteSpace: "nowrap"}}>{jour(n.created_at)}</td>
        <td style={{padding: "10px 12px"}}>{n.categorie}</td>
        <td style={{padding: "10px 12px", color: "#374151", overflowWrap: "anywhere"}}>{resume(n)}{nbPh(n) > 0 && <span style={{color: "#6B7280"}}> · 📷 {nbPh(n)}</span>}{Array.isArray(n.historique) && n.historique.length > 0 && <span title="Modifiée" style={{color: "#B45309"}}> · ✏️</span>}</td>
        <td style={{padding: "10px 12px"}}><span style={{color: BLEU, fontWeight: 600, whiteSpace: "nowrap"}}>Ouvrir ›</span></td>
      </tr>)}</tbody></table></div>}
    {!large && visibles.map((n) => <div key={n.id} role="button" tabIndex={0} onClick={() => onOuvrir(n)} onKeyDown={(e) => { if (e.key === "Enter") onOuvrir(n); }} style={{...CARTE, padding: "12px 14px", marginBottom: 10, cursor: "pointer"}}>
      <div style={{display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#6B7280"}}><span>{jour(n.created_at)} · {n.categorie}</span><span style={{overflowWrap: "anywhere"}}>par {n.auteur_nom}</span></div>
      <div style={{fontWeight: 700, margin: "4px 0", overflowWrap: "anywhere"}}>{n.global ? "🌐 Global" : "Concerné(s) : " + concernesTexte(n)}</div>
      <div style={{fontSize: 14, color: "#374151", overflowWrap: "anywhere"}}>{resume(n)}</div>
      <div style={{fontSize: 12, color: BLEU, fontWeight: 600, marginTop: 6}}>{nbPh(n) > 0 ? "📷 " + nbPh(n) + " · " : ""}{Array.isArray(n.historique) && n.historique.length > 0 ? "✏️ modifiée · " : ""}Ouvrir ›</div>
    </div>)}
  </div>);
}

// ── lecture complète d'une non-conformité ──
function Detail({nc, moi, admin, onFermer, onModifier, onSupprimee}) {
  const [agrandie, setAgrandie] = useState(null);
  const [conf, setConf] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const peutModifier = admin || nc.auteur_id === moi.id;
  const histo = Array.isArray(nc.historique) ? nc.historique : [];
  const ligne = (k, v) => <div style={{display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid #F3F4F6", fontSize: 14}}><span style={{flex: "0 0 108px", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".04em", paddingTop: 2}}>{k}</span><span style={{flex: 1, minWidth: 0, overflowWrap: "anywhere"}}>{v}</span></div>;
  async function supprimer() {
    setOccupe(true); setErreur("");
    try { await supprimerNonConformite(nc.id, {date: new Date().toISOString(), par: nomPers(moi), par_id: moi.id, action: "supprimée", avant: {note: nc.note}}); onSupprimee(); }
    catch (e) { setErreur(e.message || "Suppression impossible."); setOccupe(false); }
  }
  const decrire = (h) => {
    const a = h.avant || {}, p = [];
    if (a.note !== undefined) p.push("texte modifié");
    if (a.categorie !== undefined) p.push("catégorie (avant : " + a.categorie + ")");
    if (a.concernes !== undefined) p.push("personnes concernées (avant : " + (Array.isArray(a.concernes) ? (a.concernes.join(", ") || "aucune") : a.concernes) + ")");
    if (a.photosRetirees) p.push("photo(s) retirée(s)");
    if (a.photosAjoutees) p.push("photo(s) ajoutée(s)");
    return h.action + (p.length ? " : " + p.join(", ") : "");
  };
  return (<Fenetre titre={nc.global ? "Non-conformité globale" : "Non-conformité"} onFermer={onFermer} large>
    <div style={{marginTop: 10}}>
      {ligne("Concerné(s)", nc.global ? "🌐 Global" : concernesTexte(nc))}
      {ligne("Rédacteur", nc.auteur_nom)}
      {ligne("Date", quand(nc.created_at))}
      {ligne("Catégorie", nc.categorie)}
    </div>
    <div style={{whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 15, lineHeight: 1.5, background: "#F8F9FA", border: "1px solid #E2E6EA", borderRadius: 8, padding: "10px 12px", margin: "12px 0"}}>{nc.note}</div>
    {Array.isArray(nc.photos) && nc.photos.length > 0 && <div style={{display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12}}>
      {nc.photos.map((p) => <img key={p.chemin} src={urlPhotoNC(p.chemin)} alt={p.nom || "photo"} onClick={() => setAgrandie(urlPhotoNC(p.chemin))} style={{width: 96, height: 96, objectFit: "cover", borderRadius: 8, border: "1px solid #E2E6EA", cursor: "zoom-in"}}/>)}
    </div>}
    {histo.length > 0 && <details style={{marginBottom: 12}}>
      <summary style={{cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#B45309"}}>✏️ Historique des modifications ({histo.length})</summary>
      <div style={{marginTop: 6}}>{histo.map((h, i) => <div key={i} style={{fontSize: 13, color: "#4B5563", padding: "4px 0", borderBottom: "1px solid #F3F4F6", overflowWrap: "anywhere"}}><b>{quand(h.date)}</b> — {h.par} : {decrire(h)}</div>)}</div>
    </details>}
    {erreur && <div role="alert" style={{background: "#FFF5F5", border: "1px solid #D73A49", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#D73A49", marginBottom: 10}}>⚠ {erreur}</div>}
    <div style={{display: "flex", gap: 8, flexWrap: "wrap"}}>
      {peutModifier && <button type="button" onClick={onModifier} style={BTN}>✏️ Modifier</button>}
      {admin && !conf && <button type="button" onClick={() => setConf(true)} style={{...BTN_O, color: "#D73A49", borderColor: "#D73A49"}}>🗑 Supprimer</button>}
      <button type="button" onClick={onFermer} style={BTN_O}>Fermer</button>
    </div>
    {admin && conf && <div style={{background: "#FFF5F5", border: "1px solid #D73A49", borderRadius: 8, padding: "8px 10px", marginTop: 10}}>
      <div style={{fontSize: 13, color: "#8A1F2B"}}>Supprimer cette non-conformité ? Elle disparaît des listes ; la trace de la suppression reste en base.</div>
      <div style={{display: "flex", gap: 8, marginTop: 8}}><button type="button" disabled={occupe} onClick={supprimer} style={{...BTN, background: "#D73A49"}}>{occupe ? "…" : "Oui, supprimer"}</button><button type="button" onClick={() => setConf(false)} style={BTN_O}>Non</button></div>
    </div>}
    {agrandie && <div onClick={() => setAgrandie(null)} style={{position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, cursor: "zoom-out"}}><img src={agrandie} alt="photo agrandie" style={{maxWidth: "100%", maxHeight: "100%", borderRadius: 8}}/></div>}
  </Fenetre>);
}
