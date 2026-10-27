// Nettoyage HP, mesures et étuvage du stator (demande du 27/10/2026). Ce bloc ouvre l'étape « Matériel au démontage moteur » (pompe, moto-réducteur) ou
// « Information matériel au démontage » (moteur) et la question « Moteur neuf » vient juste après lui.
//   Nettoyage HP = Non : rien d'autre ici. Oui : mesure d'isolement masse après nettoyage puis « Étuvage du stator » (Non = mesures bonnes, on continue).
//   L'isolement enroulements (plus petite valeur) + DAR ne se demande que si on passe à l'étuvage : il est dans chaque série (demande du 27/10/2026).
//   Étuvage = Oui : série de mesures n°1 + « Mesures bonnes ? » ; Non : « Repasser à l'étuve ? »
//   (Oui : série suivante, 5 séries au maximum ; Non : moteur HS, on répond ensuite à « Moteur neuf »).
// sfx : "_m" (pompe, moto-réducteur) ou "" (moteur). Les mesures de la série k ont l'id de celles d'après nettoyage suivi de _e<k>. Module sans dépendance.
export const NB_SERIES_ETUVAGE = 5;

// la série k (1 à 5) s'affiche si le nettoyage est fait, le stator étuvé, et si toutes les séries précédentes étaient « pas bonnes » avec un nouveau passage à l'étuve
export function serieVisible(v, k, sfx = "") {
  if (v["nettoyage_hp" + sfx] !== "Oui" || v["etuvage_stator" + sfx] !== "Oui") return false;
  for (let i = 1; i < k; i++) if (v["mesures_bonnes" + sfx + "_e" + i] !== "Non" || v["etuve_encore" + sfx + "_e" + i] !== "Oui") return false;
  return true;
}
// suffixe des mesures à retenir : "" (après nettoyage) ou "_e<k>" (dernière série affichée et remplie) ; sert au rapport du moteur
export function derniereSerie(v, sfx = "") {
  let s = "";
  for (let k = 1; k <= NB_SERIES_ETUVAGE; k++) if (serieVisible(v, k, sfx) && (v["isol_enroul_min" + sfx + "_e" + k] || v["isol_masse_hp" + sfx + "_e" + k])) s = "_e" + k;
  return s;
}

// extra : condition supplémentaire commune à tout le bloc (moteur : l'essai à vide était possible, sinon le bloc reste dans l'étape de rotation)
export function champsHpEtuvage(sfx = "", extra = null) {
  const nettoyee = (v) => v["nettoyage_hp" + sfx] === "Oui";
  const champs = [
    {id: "nettoyage_hp" + sfx, label: "Nettoyage HP", type: "select", options: ["Oui", "Non"], required: true, note: "« Oui » : mesures et étuvage à remplir ; « Non » : rien d'autre ici"},
    {id: "isol_masse_hp" + sfx, label: "Mesure isolement masse (suite HP)", type: "ohm", required: true, condition: nettoyee},
    {id: "etuvage_stator" + sfx, label: "Étuvage du stator", type: "select", options: ["Oui", "Non"], required: true, condition: nettoyee, note: "« Non » = les mesures sont bonnes, on continue ; « Oui » : nouvelle série de mesures après l'étuvage"},
  ];
  for (let k = 1; k <= NB_SERIES_ETUVAGE; k++) {
    const visible = (v) => serieVisible(v, k, sfx);
    const e = sfx + "_e" + k;
    const apres = " — après étuvage n°" + k;
    const pasBonnes = (v) => visible(v) && v["mesures_bonnes" + e] === "Non";
    champs.push(
      {id: "titre_etuvage" + e, label: "Mesures après étuvage n°" + k, type: "titre", condition: visible},
      {id: "isol_masse_hp" + e, label: "Isolement masse" + apres, type: "ohm", required: true, condition: visible},
      {id: "isol_enroul_min" + e, label: "Isolement enroulements — plus petite valeur" + apres, type: "ohm", required: true, groupe: "isol_enroul_pair" + e, condition: visible},
      {id: "isol_enroul_min" + e + "_dar", label: "DAR enroulements" + apres, type: "number", unite: "DAR", required: false, groupe: "isol_enroul_pair" + e, condition: visible},
      {id: "mesures_bonnes" + e, label: "Mesures bonnes ?" + apres, type: "select", options: ["Oui", "Non"], required: true, condition: visible},
    );
    if (k < NB_SERIES_ETUVAGE) champs.push({id: "etuve_encore" + e, label: "Repasser à l'étuve ?", type: "select", options: ["Oui", "Non"], required: true, condition: pasBonnes,
      note: "« Non » = moteur HS : répondre ensuite à « Moteur neuf » (plus bas) pour savoir si on en prend un neuf"});
    else champs.push({id: "conseil_etuvage" + sfx, type: "conseil", texte: NB_SERIES_ETUVAGE + " étuvages au maximum : si les mesures ne sont toujours pas bonnes, le moteur est HS. Répondez ensuite à « Moteur neuf » (plus bas).", condition: pasBonnes});
  }
  return extra ? champs.map((c) => ({...c, condition: c.condition ? (v) => extra(v) && c.condition(v) : extra})) : champs;
}
