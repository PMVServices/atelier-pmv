// Étape « non réalisable » d'une fiche atelier : l'état et la justification sont rangés dans les valeurs de la fiche,
// sous des clés tirées du nom de l'étape (donc stables même si la liste des étapes change) :
//   nr_<étape>  = « Oui » (étape non réalisable) ou « Non » ; nrj_<étape> = justification (obligatoire).
// Ces clés sont enregistrées avec la fiche, reprises par l'aperçu, le PDF et les exports HTML / ZIP.
export function cleEtapeNr(nom){
  return String(nom||"").normalize("NFD").replace(/[^\x00-\x7f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
}
export const cleNr=nom=>"nr_"+cleEtapeNr(nom);
export const cleNrJust=nom=>"nrj_"+cleEtapeNr(nom);
