# Cahier des charges — Atelier PMV

Ce document fixe ce qui est **en place et validé**. Toute modification doit le respecter ; si une demande le contredit,
on le dit avant de coder et on met ce document à jour une fois la décision prise.
Aucun code d'accès ni clé n'est écrit ici (ils sont saisis par l'utilisateur dans l'application).

## 1. Contexte

- Application interne de PMV Services (Thibaud Perroche) : fiches d'entretien atelier et chantier, planning, matériel à commander, stock.
- React (Create React App) + Supabase (clé anonyme, pas de DDL côté appli : le SQL est collé par l'utilisateur).
- Déploiement : chaque push sur `main` de `PMVServices/atelier-pmv` déclenche Vercel → https://atelier-pmv.vercel.app (PWA).
- Appareils : **iPhone / iPad (usage principal sur le terrain)**, tablette d'atelier partagée, PC.
- Langue : français partout. Réponses courtes, vocabulaire de l'atelier.

## 2. Règles de collaboration

1. Périmètre serré : ne modifier que ce qui est demandé.
2. Ne jamais toucher, supprimer ni « nettoyer » des données réelles sans demande explicite.
3. Tester dans un vrai navigateur avant chaque push (build `CI=true npm run build` : les avertissements sont des erreurs).
4. Ne jamais demander ni saisir de mot de passe, clé ou identifiant à la place de l'utilisateur.
5. En cas d'ambiguïté : poser la question avant de coder.
6. **Ce qui existe ne change pas sans accord** : une nouvelle fonction ne doit pas modifier l'affichage ou le comportement des autres.

## 3. Affichage — contraintes impératives

Un téléphone qui affiche la page dézoomée ou décalée = régression majeure (déjà arrivée : bouton « Admin » ajouté dans l'en-tête).

- **Aucun débordement horizontal** à 320, 360, 390, 768, 900, 1280 et 1366 px de large, dans les deux rôles (technicien et administrateur), avec et sans technicien choisi.
  Sur iPhone, un seul élément trop large dézoome toute la page.
- En-tête : barre d'onglets complète seulement à partir de **1350 px** ; en dessous, menu ☰.
  Le bouton de rôle (🔒 / 🔓 Admin) est dans le menu ☰ sur téléphone/tablette ; l'en-tête de `/stock/` n'a que l'icône.
  Le badge de stockage se compacte sous 380 px (« Gérer » masqué) puis 340 px (barre masquée).
  Le nom du technicien dans l'en-tête est tronqué (110 px max) avec le nom complet en info-bulle.
- Une règle globale `@media (pointer: coarse)` agrandit boutons et champs (≈ 44-47 px) sur écran tactile : en tenir compte pour tout élément placé dans l'en-tête ou dans une ligne serrée.
- Fiche chantier/atelier : champs courts rangés par deux seulement à partir de 600 px (`grilleCols`, `useWidth`) ; une colonne en dessous.
  Colonnes de cartes : 1 colonne < 600 px, 2 colonnes de 600 à 899 px, le nombre prévu au-delà.
- Pas de texte coupé sans solution (retour à la ligne, défilement dans son propre bloc ou points de suspension).

### Contrôle avant chaque livraison (obligatoire pour toute modification visible)

1. `CI=true npm run build` sans erreur.
2. Lancer l'appli, ouvrir les pages touchées **et** le tableau de bord, la liste Atelier, la liste Chantier, Matériel, Stock.
3. Pour chaque largeur de la liste ci-dessus (fenêtre redimensionnée **puis page rechargée**), en administrateur et en technicien :
   `document.documentElement.scrollWidth <= window.innerWidth` et, pour l'en-tête, `scrollWidth <= largeur affichée`.
   Mesure type (console du navigateur) :

   ```js
   const W=innerWidth;
   const e=[...document.querySelectorAll("div")].find(d=>d.style.position==="sticky"&&d.style.top==="0px"&&d.querySelector("img"));
   ({W,pageDebordante:document.documentElement.scrollWidth>W,entete:e.getBoundingClientRect().width+" / "+e.scrollWidth})
   ```
4. Cas le plus chargé de l'en-tête (PC) : administrateur + technicien choisi avec un long nom, à 1350 px.
5. Remettre le navigateur de test dans son état initial (rôle, brouillon, taille de fenêtre) et ne laisser aucune donnée de test dans la base.

## 4. Accès et rôles

- Deux codes seulement : **technicien** (restreint) et **administrateur** (tout). Pas de comptes personnels ni de SSO (décision de l'utilisateur).
- Le rôle est mémorisé sur l'appareil. Bouton 🔒 / 🔓 : dans l'en-tête sur grand écran, dans le menu ☰ sur téléphone/tablette, icône seule dans `/stock/`.
- Limite assumée et à rappeler si on la remet en cause : barrière d'interface uniquement, la base reste accessible avec la clé anonyme.

| Zone | Technicien | Administrateur |
|---|---|---|
| Onglet Stats | non | oui |
| Onglet Matériel | « Mes demandes » en lecture seule (par personne choisie), aucune action | traitement complet des demandes (à commander / commandé…), origines, alerte mail |
| Stock | seulement Sortie / Entrée + opérateur | tout : inventaire, niveaux, catalogue, À renouveler, import Excel, étiquettes, recherche, outils, derniers mouvements |
| Tableau de bord | sans le bloc de traitement | complet |
| Demande de matériel | oui | oui |
| Fiches atelier / chantier, planning, rapports | oui | oui |

## 5. Fiche Atelier

- Types de matériel et étapes existants ; photos, aperçu, export PDF + ZIP, duplication, dossiers client → N° DE → lieu.
- N° DE toujours au format « DE0000 » (des chiffres seuls reçoivent le préfixe DE).
- Une fiche peut être préremplie depuis une fiche chantier (case « Entretien en atelier »).
- Le bouton « Ajouter photo » de la liste atelier fonctionne (upload via `db.uploadPhoto`).
- Types proposés au choix « Nouvelle fiche » : Moteur, Pompe, Moto-réducteur, **Autre matériel** (il remplace les anciennes cartes « Bientôt disponible » Ventilation et Réducteur, qui n'étaient pas utilisables).
  « Autre matériel » (`type_materiel` = « Autre ») suit exactement le déroulement du moteur (mêmes étapes, devis, rapport) ; seul s'ajoute le champ obligatoire « Type de matériel » (ventilateur, treuil, compresseur…) saisi à la main, juste avant « Matériel / Identification lieux ». Il apparaît dans l'en-tête, l'aperçu et le PDF.
- **Puissance** (fiches atelier) : la valeur reste en texte libre ; l'unité se choisit dans une liste — kW par défaut, W, CV, HP, kVA — et s'affiche telle quelle dans l'aperçu, le PDF, le Word et la couverture du rapport. Une fiche sans unité enregistrée reste en kW. L'unité est rangée dans `<champ>__unite` (ex. `puissance__unite`). La fiche chantier garde son champ « Puissance (kW) » inchangé.

## 6. Fiche Chantier

- Couleur : vert pétrole (constante `COULEUR_CHANTIER`), validée « pour le moment ».
- Liste en dossiers **client > N° DE > lieu** ; actions Ouvrir / Aperçu / Dupliquer / ZIP + PDF / photos / suppression ; même aperçu, PDF et ZIP que l'atelier.
- Statut : seulement Récupéré / En attente. Pas de statut « En cours » affiché, pas de lien avec le Planning.
- Le « lieu » = « Matériel / Identification lieux » (`ch_eq_nom`), premier champ de l'étape Équipement.
- N° de chantier = N° DE, un seul champ, rangé à côté du Client.
- 4 étapes : Informations générales → Identification équipement (se termine par la case « Entretien en atelier » pour Pompe / Moteur / Moto-réducteur) → Matériel → Manutention & Observations.
- Étape Matériel : lignes catégorie · désignation × quantité avec 3 états : **À renouveler**, **À commander**, **Utilisé, à ne pas renouveler**. Même sélecteur de catégories que l'assistant « Matériel à commander » (`ChoixMateriel`) + scan d'étiquette QR.
- À l'enregistrement, les lignes « à renouveler » et « à commander » partent automatiquement dans l'onglet Matériel (`synchroniserMaterielChantier`, demande `ch-<id fiche>`, sans doublon, sans modifier une ligne déjà commandée, sans mail).
- Imprimé groupé par état.

## 7. Matériel à commander

- Onglet « Matériel » unique ; chaque groupe affiche son origine : Demande / Stock / Fiche chantier / Fiche atelier (selon le préfixe de `demande_id` : `ch-`, `stock-`, sinon assistant).
- Assistant de demande : catégories Roulements / Garniture / Joints / Paliers / Condensateurs / Outils / Autre, avec scan d'étiquette QR (caméra ; iPhone = QR uniquement). Code inconnu → texte libre (catégorie Autre).
- Suivi des commandes fournisseurs **désactivé** (`SUIVI_COMMANDES=false`) : ne pas supprimer le code, l'onglet s'appelle « À commander ».
- Import de commandes EBP : abandonné.

## 8. Stock

- Articles roulements (6XXX…) et garnitures, import Excel, scan caméra, étiquettes (QR par défaut), sorties/entrées, niveaux mini/maxi.
- « À recommander » = quantité ≤ mini et < maxi. Un article sous son minimum n'envoie aucune alerte instantanée.
- Un scan qui reste devant la caméra compte une seule pièce (nouvelle présentation après 2,5 s = +1) ; rien n'est lu tant que la liste du stock n'est pas chargée.

## 9. Alertes mail

- **Un seul résumé par jour**, jamais un mail par action (quota EmailJS gratuit : 200 mails/mois ; objectif ≈ 20-30).
- Réglages (Matériel > Alerte mail, mode administrateur) : activé, jours (défaut lun-ven), heure (défaut 07:30), adresse, service, modèle, clé publique — saisis par l'utilisateur lui-même.
- Envoi par la première ouverture de l'appli après l'heure réglée, une fois par jour tous appareils confondus, seulement s'il y a quelque chose à signaler (à commander / à renouveler / stock sous le minimum). Aucun mail si personne n'ouvre l'appli ce jour-là.
- Bouton « Envoyer le résumé maintenant » pour tester.

## 10. Contacts

- Carnet Google chargé dans `carnet_contacts` (≈ 1 276 contacts, un numéro par contact). **Ne pas recharger, ne jamais versionner le CSV/JSON source (données personnelles).**
- Champ « Contact » dans les fiches atelier et chantier : recherche par mots dans le désordre, sans accents, par numéro ; « Ajouter » si inconnu ; enregistrement d'un mail / numéro seulement sur clic (jamais automatique).
- Lecture paginée (limite de 1000 lignes par requête).

## 11. Technique à ne pas casser

- `src/App.js` utilise des fins de ligne CRLF ; modifier par script tenant compte des CRLF ou avec l'outil d'édition, jamais par remplacement global aveugle.
- Pagination Supabase pour toute table pouvant dépasser 1000 lignes.
- Paramètres de l'appli : table clé/valeur `parametres_app`.
- Les modifications de base (DDL) passent par un SQL que l'utilisateur colle lui-même ; l'appli affiche un bandeau d'activation tant que la table manque.
- Cache PWA : après un déploiement, prévoir un rechargement forcé côté appareil.
- Un déploiement Vercel peut échouer sans rapport avec le code : relancer avec un commit vide (`git commit --allow-empty`).

## 12. Idées en attente (rien n'est décidé tant que l'utilisateur n'a pas répondu)

- QR sur les fiches imprimées : QR interne (lien vers la fiche, identifiant seul) sur la fiche interne et l'étiquette moteur ; **le client n'a pas accès au site** et ne doit voir que l'utile → contenu du QR « client » à définir (mail pré-rempli à l'atelier avec le N° DE / fiche contact PMV / rien), et quels documents partent chez le client (Rapport client seul ou aussi la fiche).
- Validation des fiches par un administrateur (verrouiller ou tamponner : à définir).
- Douchette : capture des scans + feuille de codes de commande (étiquettes en QR → douchette 2D).
- Données de stock réelles à fournir (mini/maxi garnitures, liste des paliers, condensateurs > 70 µF).
