// Contrôle qualité : dernière étape de toutes les fiches atelier (sauf la cheminée de freinage), d'après la feuille « Contrôle qualité » du 22/10/2026.
// Une case à cocher par point, aucune n'est obligatoire (c'est une trame). Chaque fiche reçoit : « Moteur » (sauf ventilateur reçu seul), « Pompe » (fiche pompe),
// « Réducteur » (fiche moto-réducteur) et « Fin » (toutes). Module sans dépendance.
export const ETAPE_QUALITE = "Contrôle qualité";

const MOTEUR = [
  ["fixation_plaque", "Fixation plaque moteur"],
  ["bb_joint", "Boîte à bornes — joint (dessous et dessus)"],
  ["bb_serrage_boite", "Boîte à bornes — serrage boîte"],
  ["bb_serrage_bornier", "Boîte à bornes — serrage du bornier"],
  ["bb_couplage", "Boîte à bornes — contrôle du couplage et serrage"],
  ["bb_peinture", "Boîte à bornes — peinture"],
  ["bb_sonde", "Boîte à bornes — sonde"],
  ["bb_pe", "Boîte à bornes — PE"],
  ["bb_obturation", "Boîte à bornes — obturation"],
  ["ventilateur_capot", "Ventilateur / capot"],
  ["accouplement", "Accouplement"],
  ["peinture", "Peinture générale"],
  ["graisseur", "Graisseur propre"],
  ["arbre", "Arbre moteur protection"],
  ["clavette", "Clavette + scotch"],
  ["cable", "Câble électrique"],
  ["fiche", "Fiche électrique"],
];
const REDUCTEUR = [["joint", "Joint"], ["huile", "Plein d'huile"], ["fuite", "Fuite"], ["event", "Évent"]];
const POMPE = [["eau_vide", "Eau vide"], ["serrage_purge", "Serrage purge"], ["nez_roue", "Nez de roue"], ["joint_bride", "Joint de bride"]];
const FIN = [["palette", "Palette perdue ou client"], ["etiquette", "Étiquette PMV"], ["rapport", "Rapport"], ["bl", "BL"]];

// prefixe : le titre précède le libellé des cases qui le suivent dans la fiche imprimée (« Pompe — Eau vide »)
const titre = (id, label, condition, prefixe) => ({ id: "cq_t_" + id, label, type: "titre", ...(prefixe ? { prefixe: true } : {}), ...(condition ? { condition } : {}) });
const caseAcocher = (id, label, condition) => ({ id: "cq_" + id, label, type: "fait", required: false, ...(condition ? { condition } : {}) });

function section(cle, libelle, liste, condition, prefixe) {
  return [titre(cle, libelle, condition, prefixe), ...liste.map(([id, label]) => caseAcocher(id, label, condition))];
}

// Champs de l'étape selon le type de fiche : "Moteur", "Autre", "Pompe", "Moto-réducteur", "Ventilateur"
export function champsQualite(type) {
  // un ventilateur reçu seul n'a pas de moteur à contrôler
  const siMoteur = type === "Ventilateur" ? (v) => v.recu_ventilateur !== "Ventilateur seul" : undefined;
  return [
    ...section("moteur", "Moteur", MOTEUR, siMoteur),
    ...(type === "Moto-réducteur" ? section("reducteur", "Réducteur", REDUCTEUR, undefined, true) : []),
    ...(type === "Pompe" ? section("pompe", "Pompe", POMPE, undefined, true) : []),
    ...section("fin", "Fin", FIN),
  ];
}
