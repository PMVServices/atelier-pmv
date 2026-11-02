// Délai demandé par le client et échéance (jours ouvrés = lundi-vendredi).
// Demande du 22/10/2026 : l'échéance est FIXÉE dès que le délai est saisi (« 3 jours » à partir de la date d'entrée devient une date, qui ne bouge plus avec les jours qui passent),
// et on peut aussi choisir directement une date précise (unité « Date précise »). La date fixée est rangée dans la fiche (case cachée « delai_echeance ») ;
// une ancienne fiche sans date rangée la calcule comme avant, depuis sa date d'entrée.
// Module sans dépendance (pas d'import).

export const PAS_DE_DELAI = "Pas de délai demandé";
export const DELAI_DATE = "Date précise";

const p2 = (n) => String(n).padStart(2, "0");
export const dateIso = (d) => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
const ESTISO = /^\d{4}-\d{2}-\d{2}$/;

export function estJourOuvre(date) { const d = date.getDay(); return d !== 0 && d !== 6; }
export function ajouterJoursOuvres(date, n) { const d = new Date(date); let c = 0; while (c < n) { d.setDate(d.getDate() + 1); if (estJourOuvre(d)) c++; } return d; }

// date d'entrée + délai (nombre + unité) -> Date, ou null
export function calculerEcheance(dateEntreeStr, valeur, unite) {
  if (!dateEntreeStr || !valeur || unite === PAS_DE_DELAI || unite === DELAI_DATE) return null;
  const n = parseFloat(valeur);
  if (isNaN(n) || n <= 0) return null;
  const base = new Date(dateEntreeStr + "T00:00:00");
  if (isNaN(base.getTime())) return null;
  if (unite === "Semaine(s)") { base.setDate(base.getDate() + Math.round(n * 7)); return base; }
  if (unite === "Mois") { base.setMonth(base.getMonth() + Math.round(n)); return base; }
  return ajouterJoursOuvres(base, Math.round(n));
}

// date d'échéance (« 2026-10-28 ») qui découle des cases de la fiche, ou ""
export function echeanceFixe(v) {
  v = v || {};
  if (v.delai_unite === DELAI_DATE) return ESTISO.test(String(v.delai_date || "")) ? v.delai_date : "";
  const e = calculerEcheance(v.date_entree, v.delai_valeur, v.delai_unite);
  return e ? dateIso(e) : "";
}
// échéance d'une fiche : la date fixée si elle est rangée, sinon (anciennes fiches) le calcul ; Date ou null
export function echeanceDe(v) {
  v = v || {};
  const iso = ESTISO.test(String(v.delai_echeance || "")) ? v.delai_echeance : echeanceFixe(v);
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}
// Échéance EN VIGUEUR selon la phase de la fiche (demande du 02/11/2026) :
//  - pas de devis ni de bon de commande (« Devis / bon de commande nécessaire » = Non) : la date saisie à l'Entrée est la date de fin, comme avant ;
//  - devis nécessaire : cette 1re date n'est que celle du démontage et du devis (la fiche doit être « Devis envoyé » avant) ; une fois « Devis envoyé », la fiche attend le client : aucune échéance ;
//    quand le bon de commande est reçu, une date de fin est redemandée (case « echeance_fin » du suivi devis) et devient l'échéance.
//  - fiche déjà plus loin que « Devis envoyé » sans date de fin (fiches d'avant ce changement) : la date unique reste sa date de fin.
// statuts : la liste ordonnée des statuts du planning [{id,label}] (celle de la Maintenance comprise) ; renvoie {date, phase: "devis" | "fin"} ou null
const sansAccent = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
export function echeanceActive(v, statut, statuts) {
  v = v || {};
  const base = echeanceDe(v);
  if (v.devis_necessaire !== "Oui") return base ? { date: base, phase: "fin" } : null;
  if (v.bon_commande_recu === "Oui" && ESTISO.test(String(v.echeance_fin || ""))) {
    const f = new Date(v.echeance_fin + "T00:00:00");
    if (!isNaN(f.getTime())) return { date: f, phase: "fin" };
  }
  const ids = (statuts || []).map((s) => s.id);
  const i = ids.indexOf(statut || "A_demonter");
  const iEnvoye = (statuts || []).findIndex((s) => sansAccent(s.label) === "devisenvoye");
  const iDevis = ids.indexOf("Devis");
  if (i < 0) return base ? { date: base, phase: "fin" } : null;
  if (iEnvoye >= 0) {
    if (i < iEnvoye) return base ? { date: base, phase: "devis" } : null;
    if (i === iEnvoye) return null; // devis envoyé : on attend le retour du client
    return base ? { date: base, phase: "fin" } : null;
  }
  return i <= (iDevis >= 0 ? iDevis : 1) ? (base ? { date: base, phase: "devis" } : null) : (base ? { date: base, phase: "fin" } : null);
}
export function joursOuvresRestants(dateEcheance) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const cible = new Date(dateEcheance); cible.setHours(0, 0, 0, 0);
  if (cible.getTime() <= t.getTime()) return 0;
  const d = new Date(t); let c = 0;
  while (d.getTime() < cible.getTime()) { d.setDate(d.getDate() + 1); if (estJourOuvre(d)) c++; }
  return c;
}

// À recalculer (et à ranger dans v.delai_echeance) quand l'une de ces cases change
export const CASES_DELAI = ["delai_valeur", "delai_unite", "delai_date", "date_entree"];

// Les cases de l'étape « Entrée » : délai (nombre + unité) ou date précise, puis l'échéance qui en découle
export function champsDelai() {
  return [
    { id: "delai_valeur", label: "Délai demandé par le client", type: "number", required: true, groupe: "delai_pair", condition: (v) => v.delai_unite !== PAS_DE_DELAI && v.delai_unite !== DELAI_DATE },
    { id: "delai_unite", label: "Unité", type: "select", options: ["Jours", "Semaine(s)", "Mois", DELAI_DATE, PAS_DE_DELAI], required: true, groupe: "delai_pair" },
    { id: "delai_date", label: "Date d'échéance précise", type: "date", required: true, groupe: "delai_pair", condition: (v) => v.delai_unite === DELAI_DATE },
    {
      id: "delai_echeance_info", label: "Échéance", type: "verdict", condition: (v) => !!echeanceDe(v),
      verdict: (v) => {
        const d = echeanceDe(v);
        if (!d) return { ok: null, texte: "—" };
        const date = d.toLocaleDateString("fr-FR");
        return { ok: null, texte: v.devis_necessaire === "Oui"
          ? "Le " + date + " — date d'envoi du devis (démontage + devis). La date de fin sera demandée à la réception du bon de commande."
          : "Le " + date + " — date fixée, elle ne bouge plus avec les jours qui passent" };
      },
    },
  ];
}
