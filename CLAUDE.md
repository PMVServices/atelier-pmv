# Atelier PMV

Avant toute modification, lire `docs/CAHIER_DES_CHARGES.md` : il liste ce qui est en place et validé (rôles, fiches, matériel, stock, alertes, affichage mobile).

- Ne pas modifier ce qui existe sans accord ; si une demande contredit le cahier des charges, le signaler avant de coder, puis mettre le document à jour.
- Après toute modification visible : exécuter le contrôle d'affichage du chapitre 3 (320 / 360 / 390 / 768 / 900 / 1280 / 1366 px, administrateur et technicien, aucun débordement horizontal) et `CI=true npm run build`.
- **Configuration de la Maintenance** : l'utilisateur modifie les champs des fiches (atelier et chantier), les colonnes du planning **et les rapports client** (rubriques masquées ou renommées, textes modifiés, blocs ajoutés avec des champs de la fiche : onglet « Rapports ») depuis la page « Maintenance », **sans toucher au code** (config en base, `parametres_app`). Avant toute demande qui touche à ces champs, à une étape, au planning ou à un rapport client, lancer `node scripts/lire-config.js` (lecture seule) et en tenir compte : champ renommé, masqué, déplacé, rendu facultatif, champ ajouté. Ne jamais changer l'`id` d'un champ du code ni d'une rubrique de rapport (listes `ANCRES_*`, ids des blocs) : la configuration s'y accroche ; ne pas défaire une modification de la Maintenance sans le dire.
- Répondre en français, court ; demander en cas d'ambiguïté ; ne jamais toucher aux données réelles sans demande ; ne jamais saisir de clés ou mots de passe à la place de l'utilisateur.
