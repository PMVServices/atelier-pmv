// Fenêtre « 📅 Programmer » du Planning : choisit le travail (démontage / remontage / peinture), la date, l'heure et l'agenda Google, puis crée (ou déplace, ou supprime)
// l'événement « Atelier DE7544 POMPE remontage ». Voir googleAgenda.js pour le principe (connexion Google dans le navigateur, aucun serveur).
import React, {useState, useEffect, useRef} from "react";
import {TRAVAUX, travailDepuisStatut, titreEvenement, ajouterHeures, lienPreRempli, estConnecte, connecter, listerAgendas, creerEvenement, majEvenement,
  supprimerEvenement, modifierAgenda, lireClientId, ecrireClientId, synchroniserAgenda, enregistrerChangements} from "./googleAgenda";

const BLEU = "#1B4F8A";
const INP = {width:"100%",padding:"9px 10px",borderRadius:8,border:"1.5px solid #D1D5DB",fontSize:15,boxSizing:"border-box",background:"#fff",fontFamily:"inherit"};
const LBL = {display:"block",fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".04em",margin:"10px 0 4px"};
const BTN = {background:BLEU,color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",fontWeight:700,fontSize:14,cursor:"pointer",minHeight:44};
const BTN_O = {background:"#fff",color:BLEU,border:"1.5px solid "+BLEU,borderRadius:8,padding:"9px 14px",fontWeight:600,fontSize:13,cursor:"pointer",minHeight:44};
const aujourdhui = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

export default function ProgrammerAgenda({cible, existant, nomPersonne, admin, onFermer, onChange}) {
  const [clientId, setClientId] = useState(null);          // null : lecture en cours ; "" : pas réglé
  const [saisieId, setSaisieId] = useState("");
  const [connecte, setConnecte] = useState(estConnecte());
  const [agendas, setAgendas] = useState(null);
  const [travail, setTravail] = useState(existant ? existant.travail : travailDepuisStatut(cible.statut));
  const [jour, setJour] = useState(existant ? existant.jour : aujourdhui());
  const [debut, setDebut] = useState(existant ? existant.debut || "08:00" : "08:00");
  const [fin, setFin] = useState(existant ? existant.fin || "10:00" : "10:00");
  const [calId, setCalId] = useState(existant ? existant.calId : "");
  const [invites, setInvites] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const [confSuppr, setConfSuppr] = useState(false);

  const titre = titreEvenement({de: cible.de || cible.client, type: cible.type, travail});
  const details = ["Client : " + (cible.client || "—"), cible.materiel ? "Matériel : " + cible.materiel : "", "Programmé" + (nomPersonne ? " par " + nomPersonne : "") + " depuis l'appli Atelier PMV (" + window.location.origin + ")"].filter(Boolean).join("\n");
  const valide = /^\d{4}-\d{2}-\d{2}$/.test(jour) && /^\d{2}:\d{2}$/.test(debut) && /^\d{2}:\d{2}$/.test(fin) && fin > debut;

  useEffect(() => { let vivant = true; lireClientId().then(i => { if (vivant) { setClientId(i); setSaisieId(i); } }); return () => { vivant = false; }; }, []);
  useEffect(() => {
    if (!connecte) return;
    let vivant = true;
    listerAgendas().then(l => { if (!vivant) return; setAgendas(l); setCalId(c => c || (existant && l.some(a => a.id === existant.calId) ? existant.calId : (l[0] ? l[0].id : ""))); })
      .catch(e => { if (!vivant) return; setErreur(e.message); if (e.statut === 401) setConnecte(false); });
    return () => { vivant = false; };
  }, [connecte]);

  async function seConnecter() {
    setErreur(""); setOccupe(true);
    try { await connecter(clientId); setConnecte(true); }
    catch (e) { setErreur(e.message); }
    setOccupe(false);
  }
  async function enregistrerClientId() {
    setErreur(""); setOccupe(true);
    try { await ecrireClientId(saisieId); setClientId(saisieId.trim()); }
    catch (e) { setErreur("Enregistrement impossible : " + e.message); }
    setOccupe(false);
  }
  const nomAgenda = id => ((agendas || []).find(a => a.id === id) || {}).nom || (existant && existant.calId === id ? existant.calNom : id);
  async function enregistrer() {
    if (!valide || !calId) return;
    setErreur(""); setOccupe(true);
    const evt = {titre, jour, debut, fin, details, invites: invites.trim()};
    try {
      let e, ancien = null;
      const garde = existant && !existant.supprime && existant.calId === calId; // supprimé dans Google : on en crée un nouveau
      if (garde) e = await majEvenement(calId, existant.id, evt);
      else { e = await creerEvenement(calId, evt); if (existant && !existant.supprime) ancien = existant; }
      if (ancien) { try { await supprimerEvenement(ancien.calId, ancien.id); } catch (x) { /* l'ancien événement reste à supprimer à la main dans Google */ } }
      const entree = {id: garde ? existant.id : e.id, calId, calNom: nomAgenda(calId), travail, jour, debut, fin, titre, lien: e.htmlLink || "", par: nomPersonne || "", cree: new Date().toISOString()};
      const nouveau = await modifierAgenda(a => { const l = (a[cible.id] || []).filter(x => x.id !== (existant ? existant.id : entree.id) && x.id !== entree.id); l.push(entree); return {...a, [cible.id]: l}; });
      onChange(nouveau); onFermer();
    } catch (e) {
      setErreur(e.message);
      if (e.statut === 401) setConnecte(false);
    }
    setOccupe(false);
  }
  async function supprimer() {
    setErreur(""); setOccupe(true);
    try {
      await supprimerEvenement(existant.calId, existant.id);
      const nouveau = await modifierAgenda(a => ({...a, [cible.id]: (a[cible.id] || []).filter(x => x.id !== existant.id)}));
      onChange(nouveau); onFermer();
    } catch (e) { setErreur(e.message); if (e.statut === 401) setConnecte(false); }
    setOccupe(false);
  }

  return (<div style={{position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 400, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "12px", overflowY: "auto"}} onClick={e => { if (e.target === e.currentTarget && !occupe) onFermer(); }}>
    <div role="dialog" aria-label="Programmer dans l'agenda" style={{background: "#fff", borderRadius: 14, width: "100%", maxWidth: 520, padding: "16px 18px 20px", boxShadow: "0 12px 40px rgba(0,0,0,.3)", margin: "auto 0"}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10}}>
        <h2 style={{fontSize: 18, margin: 0}}>📅 {existant ? (existant.supprime ? "Reprogrammer l'événement" : "Modifier l'événement") : "Programmer dans l'agenda"}</h2>
        <button type="button" onClick={onFermer} aria-label="Fermer" style={{background: "#F3F4F6", border: 0, borderRadius: 10, width: 44, height: 44, fontSize: 18, cursor: "pointer"}}>✕</button>
      </div>
      <p style={{margin: "8px 0 0", fontSize: 14, fontWeight: 700, color: BLEU, overflowWrap: "anywhere"}} data-testid="titre-evenement">{titre}</p>

      <label style={LBL}>Travail</label>
      <div role="group" aria-label="Travail" style={{display: "flex", gap: 8, flexWrap: "wrap"}}>
        {TRAVAUX.map(([id, lib]) => <button type="button" key={id} aria-pressed={travail === id} onClick={() => setTravail(id)} style={{...BTN_O, background: travail === id ? BLEU : "#fff", color: travail === id ? "#fff" : BLEU, textTransform: "capitalize"}}>{lib}</button>)}
      </div>

      <div style={{display: "flex", gap: 10, flexWrap: "wrap"}}>
        <div style={{flex: "1 1 160px"}}><label style={LBL}>Date</label><input type="date" value={jour} onChange={e => setJour(e.target.value)} style={INP}/></div>
        <div style={{flex: "1 1 100px"}}><label style={LBL}>De</label><input type="time" value={debut} onChange={e => { setDebut(e.target.value); if (e.target.value >= fin) setFin(ajouterHeures(e.target.value, 2)); }} style={INP}/></div>
        <div style={{flex: "1 1 100px"}}><label style={LBL}>À</label><input type="time" value={fin} onChange={e => setFin(e.target.value)} style={INP}/></div>
      </div>
      <div style={{display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8}}>
        {[["1 h", 1], ["2 h", 2], ["½ journée", 4], ["Journée", 8]].map(([l, h]) => <button type="button" key={l} onClick={() => setFin(ajouterHeures(debut, h))} style={{...BTN_O, padding: "4px 10px", minHeight: 34, fontSize: 12}}>{l}</button>)}
      </div>
      {!valide && <p style={{fontSize: 12, color: "#B42318", margin: "8px 0 0"}}>Indiquez une date et des heures (l'heure de fin après l'heure de début).</p>}

      {/* connexion Google */}
      <div style={{background: "#F8F9FA", border: "1px solid #E2E6EA", borderRadius: 10, padding: "10px 12px", marginTop: 14}}>
        {clientId === null && <p style={{margin: 0, fontSize: 13, color: "#6B7280"}}>Chargement…</p>}
        {clientId === "" && <>
          <b style={{fontSize: 13}}>Google Agenda n'est pas encore relié</b>
          {admin
            ? <>
              <div style={{fontSize: 12, color: "#4B5563", margin: "6px 0"}}>À faire une seule fois, avec le compte Google de l'entreprise :
                <ol style={{margin: "4px 0 0", paddingLeft: 18, lineHeight: 1.5}}>
                  <li>Sur console.cloud.google.com : créer un projet, puis activer « Google Calendar API ».</li>
                  <li>« Écran de consentement OAuth » : type Interne (si Google Workspace) ou Externe en mode test, avec les adresses Gmail des personnes concernées.</li>
                  <li>« Identifiants » → « Créer des identifiants » → « ID client OAuth », type « Application Web », origine JavaScript autorisée : <b style={{overflowWrap: "anywhere"}}>{window.location.origin}</b></li>
                  <li>Coller ci-dessous l'ID client (il se termine par .apps.googleusercontent.com).</li>
                </ol></div>
              <input type="text" value={saisieId} onChange={e => setSaisieId(e.target.value)} placeholder="123456789-abc….apps.googleusercontent.com" style={INP} aria-label="ID client Google"/>
              <button type="button" disabled={occupe || !/\.apps\.googleusercontent\.com$/.test(saisieId.trim())} onClick={enregistrerClientId} style={{...BTN, marginTop: 8, opacity: /\.apps\.googleusercontent\.com$/.test(saisieId.trim()) ? 1 : .5}}>Enregistrer l'ID client</button>
            </>
            : <p style={{fontSize: 12, color: "#4B5563", margin: "6px 0 0"}}>L'administrateur doit d'abord relier l'appli à Google (à faire une seule fois). En attendant, le bouton ci-dessous ouvre l'événement pré-rempli dans Google Agenda.</p>}
        </>}
        {clientId && !connecte && <div style={{display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap"}}>
          <span style={{fontSize: 13, color: "#4B5563", flex: "1 1 180px"}}>Connectez-vous à votre compte Google (une fenêtre s'ouvre).</span>
          <button type="button" disabled={occupe} onClick={seConnecter} style={BTN}>{occupe ? "Connexion…" : "Se connecter à Google"}</button>
        </div>}
        {clientId && connecte && <>
          <label style={{...LBL, marginTop: 0}}>Agenda</label>
          {agendas === null ? <p style={{margin: 0, fontSize: 13, color: "#6B7280"}}>Chargement des agendas…</p>
            : agendas.length === 0 ? <p style={{margin: 0, fontSize: 13, color: "#B42318"}}>Aucun agenda où écrire n'a été trouvé pour ce compte.</p>
              : <select value={calId} onChange={e => setCalId(e.target.value)} style={INP} aria-label="Agenda">{agendas.map(a => <option key={a.id} value={a.id}>{a.nom}{a.principal ? " (principal)" : ""}</option>)}</select>}
          <label style={LBL}>Inviter quelqu'un (adresse mail, facultatif)</label>
          <input type="text" value={invites} onChange={e => setInvites(e.target.value)} placeholder="prenom@gmail.com" style={INP} autoComplete="off"/>
          <p style={{fontSize: 11, color: "#9CA3AF", margin: "6px 0 0"}}>L'événement est créé dans l'agenda choisi (celui de la personne concernée, s'il est partagé avec vous en modification). Une invitation est envoyée si vous indiquez une adresse.</p>
        </>}
      </div>

      {erreur && <div role="alert" style={{background: "#FFF1F2", border: "1px solid #D73A49", color: "#8A1F2B", borderRadius: 8, padding: "8px 10px", fontSize: 13, marginTop: 10}}>{erreur}</div>}

      <div style={{display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14}}>
        {clientId && connecte && <button type="button" disabled={occupe || !valide || !calId} onClick={enregistrer} style={{...BTN, opacity: (occupe || !valide || !calId) ? .5 : 1}}>{occupe ? "Enregistrement…" : existant ? "💾 Enregistrer les changements" : "📅 Créer l'événement"}</button>}
        <a href={valide ? lienPreRempli({titre, jour, debut, fin, details, invites: invites.trim()}) : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!valide}
          style={{...BTN_O, display: "inline-flex", alignItems: "center", textDecoration: "none", opacity: valide ? 1 : .5, pointerEvents: valide ? "auto" : "none"}}>↗ Ouvrir dans Google Agenda (pré-rempli)</a>
        {existant && !confSuppr && <button type="button" disabled={occupe} onClick={() => setConfSuppr(true)} style={{...BTN_O, color: "#D73A49", borderColor: "#D73A49"}}>🗑 Supprimer</button>}
      </div>
      {existant && confSuppr && <div style={{background: "#FFF5F5", border: "1px solid #D73A49", borderRadius: 8, padding: "8px 10px", marginTop: 10}}>
        <div style={{fontSize: 13, color: "#8A1F2B"}}>Supprimer l'événement « {existant.titre} » de l'agenda {existant.calNom} ?{!connecte ? " (connectez-vous d'abord à Google)" : ""}</div>
        <div style={{display: "flex", gap: 8, marginTop: 8}}>
          <button type="button" disabled={occupe || !connecte} onClick={supprimer} style={{...BTN, background: "#D73A49", opacity: connecte ? 1 : .5}}>Oui, supprimer</button>
          <button type="button" onClick={() => setConfSuppr(false)} style={BTN_O}>Non</button>
        </div>
      </div>}
    </div>
  </div>);
}

// Bouton « 🔄 Synchroniser avec l'agenda » du Planning : relit dans Google les événements programmés depuis l'appli et met les cartes à jour (jour, heures, titre, événement supprimé).
// Se lance seul à l'ouverture du Planning si la personne est déjà connectée à Google ; sinon le clic ouvre d'abord la connexion.
const BTN_SYNCHRO = {fontSize: 12, padding: "5px 12px", borderRadius: 8, border: "1.5px solid " + BLEU, background: "#fff", color: BLEU, cursor: "pointer", fontWeight: 600, minHeight: 34};
const pluriel = (n, un, plus) => n + " " + (n > 1 ? plus : un);
function phraseSynchro(r) {
  const l = [];
  if (r.deplaces) l.push(pluriel(r.deplaces, "déplacé", "déplacés"));
  if (r.supprimes) l.push(pluriel(r.supprimes, "supprimé dans Google", "supprimés dans Google"));
  if (r.renommes) l.push(pluriel(r.renommes, "renommé", "renommés"));
  const h = new Date().toLocaleTimeString("fr-FR", {hour: "2-digit", minute: "2-digit"});
  let t = "✓ Synchronisé à " + h + " : " + (l.length ? l.join(", ") : "rien n'a changé") + " (" + pluriel(r.verifies, "événement vérifié", "événements vérifiés") + ")";
  if (r.ignores) t += " · " + pluriel(r.ignores, "événement non vérifié", "événements non vérifiés") + " : agenda non accessible avec ce compte Google";
  if (r.echecs) t += " · " + pluriel(r.echecs, "événement non lu", "événements non lus") + " (erreur Google)";
  return t;
}
export function SynchroAgenda({agenda, onChange}) {
  const nb = Object.keys(agenda || {}).reduce((n, k) => n + (agenda[k] || []).length, 0);
  const [clientId, setClientId] = useState("");
  const [connecte, setConnecte] = useState(estConnecte());
  const [etat, setEtat] = useState(null); // {occupe} | {ok, txt}
  const dejaFait = useRef(false);
  useEffect(() => { let v = true; lireClientId().then(i => { if (v) setClientId(i); }); return () => { v = false; }; }, []);
  async function lancer() {
    setEtat({occupe: true});
    try {
      const r = await synchroniserAgenda(agenda);
      if (Object.keys(r.changements).length) onChange(await enregistrerChangements(r.changements));
      setEtat({ok: true, txt: phraseSynchro(r)});
    } catch (e) { if (e.statut === 401) setConnecte(false); setEtat({ok: false, txt: e.message}); }
  }
  async function cliquer() {
    if (!connecte) {
      if (!clientId) { setEtat({ok: false, txt: "Google Agenda n'est pas encore relié : l'administrateur doit le régler une fois (fenêtre « Programmer »)."}); return; }
      setEtat({occupe: true});
      try { await connecter(clientId); setConnecte(true); } catch (e) { setEtat({ok: false, txt: e.message}); return; }
    }
    await lancer();
  }
  // à l'ouverture du Planning : synchronisation automatique si la personne est déjà connectée à Google (la table des événements arrive après l'ouverture)
  useEffect(() => { if (nb > 0 && connecte && !dejaFait.current) { dejaFait.current = true; lancer(); } }, [nb > 0]);
  if (nb === 0) return null;
  const occupe = !!(etat && etat.occupe);
  return (<div style={{display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "0 0 10px"}}>
    <button type="button" disabled={occupe} onClick={cliquer} style={{...BTN_SYNCHRO, opacity: occupe ? .6 : 1}}>{occupe ? "⏳ Synchronisation…" : connecte ? "🔄 Synchroniser avec l'agenda" : "🔄 Se connecter à Google et synchroniser"}</button>
    {etat && !etat.occupe && <span role="status" style={{fontSize: 12, color: etat.ok ? "#22863A" : "#B42318", flex: "1 1 220px", minWidth: 0, overflowWrap: "anywhere"}}>{etat.txt}</span>}
  </div>);
}
