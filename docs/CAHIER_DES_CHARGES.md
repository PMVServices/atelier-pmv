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
- En-tête : barre d'onglets complète seulement à partir de **1400 px** ; en dessous, menu ☰. Chaque nouvel onglet élargit la barre : après en avoir ajouté un, remesurer le pire cas (administrateur au nom très long) et ajuster ce seuil (`isMobile` et le décalage de l'en-tête de fiche chantier dans `App.js`).
  La pastille de la personne connectée est dans l'en-tête (ordinateur), la ligne « personne » en haut du menu ☰ (téléphone / tablette) ; l'en-tête de `/stock/` n'a que l'icône.
  Le badge de stockage se compacte sous 380 px (« Gérer » masqué) puis 340 px (barre masquée).
  Le nom du technicien dans l'en-tête est tronqué (110 px max) avec le nom complet en info-bulle.
- Une règle globale `@media (pointer: coarse)` agrandit boutons et champs (≈ 44-47 px) sur écran tactile : en tenir compte pour tout élément placé dans l'en-tête ou dans une ligne serrée.
- Fiche chantier/atelier : champs courts rangés par deux seulement à partir de 600 px (`grilleCols`, `useWidth`) ; une colonne en dessous.
  Colonnes de cartes : 1 colonne < 600 px, 2 colonnes de 600 à 899 px, le nombre prévu au-delà.
- **Tableau de bord** : sur téléphone (moins de 600 px) seuls le bouton « Matériel à commander » et les raccourcis s'affichent ; les notifications (matériel, fiches urgentes, à faire rapidement, devis en attente, commandes, fiches à exporter) s'affichent sur tablette et ordinateur. Dans « Fiches terminées à exporter », chaque fiche a un bouton « Déjà fait » qui la retire de la liste sans télécharger (même marqueur que l'export).
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
4. Cas le plus chargé de l'en-tête (PC) : administrateur + technicien choisi avec un long nom, au seuil de la barre complète (1400 px) et un pixel en dessous.
5. Remettre le navigateur de test dans son état initial (rôle, brouillon, taille de fenêtre) et ne laisser aucune donnée de test dans la base.

## 4. Accès et rôles

- **Code de l'appareil** (`PIN_CODE` dans `App.js`) : demandé **une seule fois par appareil**, puis mémorisé (`pmv_pin_ok`) ; ensuite l'appli demande seulement qui ouvre.
- **« Qui ouvre l'application ? »** à chaque ouverture : tous les noms (Nom Prénom) visibles d'un coup en boutons larges (grille, sans défilement interne tant que la liste tient à l'écran, recherche au-delà de 24 personnes), bouton « Continuer : <dernière personne> » en tête. Le **profil de la personne** choisie décide de ce qu'elle voit : Administrateur, Technicien ou Commercial. Le choix est gardé pour la session (un rechargement ne redemande pas), la fermeture de l'appli le redemande.
- **Changer de personne** : pastille de la personne dans l'en-tête (ordinateur) ou ligne en haut du menu ☰ (téléphone / tablette) → fenêtre « Changer de personne » ; l'administrateur y trouve aussi « Gérer les accès ». Même mécanisme dans l'écran /stock/.
- **Liste des personnes** : base `parametres_app`, clé `acces_personnes` (JSON : id, nom, prénom, profil, initiales). Gérée dans l'écran « Accès » (administrateur) : ajout un par un ou par lot (« Nom Prénom » par ligne), changement de profil, initiales (celles des techniciens existants, pour préremplir « qui a fait la fiche »), retrait ; au moins un administrateur doit rester, on ne peut pas se retirer soi-même.
- **Première utilisation** (aucune personne enregistrée) : écran qui demande le code administrateur historique (une seule fois, constante `ADMIN_CODE` de `App.js`) puis le nom et le prénom du premier administrateur.
- Une personne qui a des initiales n'a plus à les donner à chaque nouvelle fiche ; l'ancienne pastille « initiales du technicien » de l'en-tête a disparu.
- **Limite à rappeler** : le code de l'appareil protège l'entrée, mais il est commun et visible dans le code du site ; ensuite l'accès repose sur le choix du nom. Barrière d'interface uniquement, la base reste accessible avec la clé publique de l'appli. Le dépôt GitHub est public.

| Zone | Technicien | Administrateur | Commercial |
|---|---|---|---|
| Tableau de bord | sans le bloc de traitement | complet | oui, version à lui : relances à faire + raccourcis de ses onglets |
| Fiche Atelier / Fiche Chantier | création et modification | idem | **lecture seule** : liste, aperçu, ZIP + PDF ; ni création, ni modification, ni photos, ni suppression, ni statut |
| Planning | déplacement des cartes, statuts | idem | lecture seule (carte → aperçu) |
| Rapport | oui | oui | oui |
| Calendrier | oui | oui + stock de départ | oui |
| Suivi clients (relance devis, prospection, RDV, devis refusés) | non | non | oui, **lui seul** |
| Clients (fiche client, lecture seule) | non | oui | oui |
| Matériel | « Mes demandes » en lecture seule | traitement complet, origines, alertes mail (matériel + résumé du commercial) | non |
| Stock | Sortie / Entrée + opérateur | tout | non |
| Stats | non | oui | non |
| Accès | non | oui | non |
| Demande de matériel | oui | oui | non |

- Ordre des onglets du Commercial : Tableau de bord, **Suivi clients**, **Clients**, Calendrier, Fiche Atelier, Fiche Chantier, Planning, Rapport. Son accueil est son tableau de bord.
- Le Commercial ne voit pas la jauge de stockage de l'en-tête.

## 5. Fiche Atelier

- Types de matériel et étapes existants ; photos, aperçu, export PDF + ZIP, duplication, dossiers client → N° DE → lieu.
- N° DE toujours au format « DE0000 » (des chiffres seuls reçoivent le préfixe DE).
- Une fiche peut être préremplie depuis une fiche chantier (case « Entretien en atelier »).
- **Technicien de chaque étape** (fiche atelier) : la personne qui a ouvert l'appli (si elle a des initiales) est cochée d'office quand le champ est vide. Si on **décoche son nom**, l'appli demande « Qui utilise l'application ? » (fenêtre par-dessus la fiche, qui reste ouverte) : la personne choisie devient celle qui a ouvert (en-tête) et se coche à la place ; « Annuler » remet le coche. Cocher un deuxième technicien ne pose aucune question. La fiche chantier garde son propre champ technicien.
- Le bouton « Ajouter photo » de la liste atelier fonctionne (upload via `db.uploadPhoto`).
- Types proposés au choix « Nouvelle fiche » : Moteur, Pompe, Moto-réducteur, **Autre matériel** (il remplace les anciennes cartes « Bientôt disponible » Ventilation et Réducteur, qui n'étaient pas utilisables).
  « Autre matériel » (`type_materiel` = « Autre ») suit exactement le déroulement du moteur (mêmes étapes, devis, rapport) ; seul s'ajoute le champ obligatoire « Type de matériel » (ventilateur, treuil, compresseur…) saisi à la main, juste avant « Matériel / Identification lieux ». Il apparaît dans l'en-tête, l'aperçu et le PDF.
- **Entrée** (moteur, pompe, moto-réducteur, autre matériel) : obligatoires — marque moteur, puissance, vitesse, type, numéro de série, fixation et contact. Case « Rapport client demandé ? » (Oui/Non, obligatoire) après « Devis / bon de commande nécessaire ». Délai demandé : l'unité propose « Pas de délai demandé » (la durée disparaît alors, aucune échéance n'est calculée).
- **Moteur neuf** : les trois choix sont Oui / Non / **Ne sais pas encore** ; « Ne sais pas encore » se comporte comme « Non » partout. Pour le moteur seul et « Autre matériel », la question est posée en premier dans « Infos électriques » (`moteur_neuf_debut`) ; avec « Oui », seuls le technicien reste à renseigner et la fiche s'arrête après cette étape (statut « Terminée », le statut chantier n'est pas modifié). Pompe et moto-réducteur : la question existante (étape « Matériel au démontage moteur ») gagne seulement l'option « Ne sais pas encore ».
- **DAR enroulements** : une 2e mesure (DAR) est rangée à côté de « Isolement enroulements — plus petite valeur » dans les étapes de rotation avant démontage (moteur, pompe, moto-réducteur).
- **Photos** (fiches atelier et chantier, listes atelier et chantier) : on peut glisser-déposer une ou plusieurs photos sur le bloc d'ajout après avoir choisi la catégorie (sur ordinateur) ; chaque vignette a une petite croix ✕ (avec confirmation) qui supprime la ligne en base puis le fichier s'il n'est plus utilisé. Le numéro d'une nouvelle photo ne reprend jamais un nom existant. La croix n'est pas un `<button>` : sur tablette les boutons sont agrandis.
- **Photos de chantier** : la table `fiches_chantier_photos` n'a pas les colonnes `etape` et `categorie_slug` ; tant que ce SQL n'est pas exécuté, les photos sont enregistrées (liste, ZIP, PDF) mais ne réapparaissent pas dans les étapes de la fiche après rechargement :
  `alter table fiches_chantier_photos add column if not exists etape text default ''; alter table fiches_chantier_photos add column if not exists categorie_slug text;`
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

## 6 bis. Rapport client (Word et PDF)

Modèle de référence : le rapport « DE7591 Rapport d'entretien » de PMV (7 pages). Le contenu est construit une seule fois (`src/rapportModele.js`) puis mis en page en Word (`src/rapportDocx.js`) et en aperçu / PDF (`src/pdfUtils.js`) : les deux versions disent toujours la même chose. Toute évolution du contenu se fait dans `rapportModele.js`.

- **Structure** : page de garde (logo, « Rapport d'entretien », matériel, n° de série, client — DE, mois/année en grand sur une bande décorative) → page d'identification (coordonnées PMV, tableau client / référence / adresse / contact / localisation / n° et date de commande achat / bordereau / date de réception / départ de nos ateliers / descriptif des travaux, sommaire) → chapitres numérotés dans l'ordre du modèle : 1 Norme ISO et identification (tableau ISO, photo et description de la plaque), 2 Mesures avant entretien (photo à l'arrivée, essai mécanique avant démontage côté commande / côté opposé, mesures, consommation à vide), 3 Photo et observation au démontage, 4 Mesure des parties mécaniques (portées avec verdict, roulements installés), 5 Rapport électrique du bobinage (« après nettoyage / étuvage » selon la fiche ; valeurs U/V, V/W, W/U, masse, DAR ; captures d'appareil une par page), 6 Mesures après entretien (essai mécanique, mesure électrique à vide et en charge), 7 Conclusion (verdicts, photo après entretien, départ de nos ateliers, certifié par / réalisé par, liste du matériel de contrôle).
- Un chapitre sans contenu n'est pas imprimé ; les cases « Sections à inclure » du formulaire restent respectées. Verdicts : « conforme » surligné en vert, « non conforme » en rouge, texte libre en gras.
- En-tête (logo, « Rapport d'entretien — DE — client ») et pied de page (« PMV Services, votre spécialiste de l'entretien du moteur électrique et annexe », « Page X sur Y ») sur toutes les pages sauf la couverture.
- Formulaire : champs ajoutés « N° / date commande achat », « Départ de nos ateliers (date) », « Départ de nos ateliers — contrôle final » (texte proposé : arbre protégé et serrage de la boîte à bornes vérifié), « Matériel de contrôle utilisé — dates de validité » (liste proposée, modifiable ; bouton pour la garder comme liste habituelle, stockée dans `parametres_app`, clé `rapport_materiel_controle`), « certifié par » / « réalisé par » à choix multiple (« CD et DN »). **Les dates de validité du matériel de contrôle sont à vérifier avant chaque envoi.**
- Photos allégées à l'export (1800 px, JPEG) : le Word passe d'environ 28 Mo à environ 2 Mo, le PDF de 76 Mo à environ 2 Mo ; l'orientation des photos de téléphone est corrigée.
- Test : en développement (`npm start`), `window.__rapportTest.genRapportDocx(v, data, photos)` et `window.__rapportTestHtml.genRapportHtmlLeger(...)` génèrent le rapport sans passer par l'interface ; le Word se contrôle en l'ouvrant dans Word, le PDF en l'imprimant depuis Edge.
- À savoir : l'onglet Rapport affichait « 0 fiche » tant que « Fiche Atelier » n'avait pas été ouvert ; la liste des fiches est maintenant chargée dès l'ouverture de l'appli.

## 6 ter. Calendriers (onglet « Calendrier »)

- But : noter à qui on a remis un calendrier annuel pour ne pas en redonner. Accessible aux deux rôles (technicien et administrateur).
- Table Supabase `calendriers` (SQL dans `SQL_CALENDRIER`, `src/Calendrier.js`, à coller une fois par le responsable ; tant qu'elle manque, l'onglet affiche l'écran d'activation) : édition (année du calendrier), date de remise, client, contact, nombre de grands, nombre de petits, noté par.
- « Donner un calendrier » : un client (liste des clients existante, ajout possible), puis un ou plusieurs contacts **du même client** (liste du carnet de contacts existante, ajout possible), avec le nombre de grands et de petits pour chacun ; date de remise (aujourd'hui par défaut) et édition (année suivante à partir de septembre). Les contacts déjà connus du client (remises précédentes, carnet rattaché à la société) sont proposés.
- Avertissements : le client ou le contact a déjà reçu un calendrier pour l'édition choisie (quantités et date affichées).
- **Compteur de stock** (en haut de la page, pour l'édition choisie) : grands et petits restants sur le stock de départ, avec barre (orange sous 20 %, rouge au-delà du stock). Stock de départ de l'édition en cours : **100 grands et 180 petits** ; modifiable par l'administrateur (« Stock de départ »), rangé dans `parametres_app` (clé `calendrier_stock_<édition>` = « grands,petits »). Une autre édition sans stock saisi affiche seulement les quantités données ; « Toutes » masque le compteur. Le formulaire annonce le stock restant après l'enregistrement et prévient si on dépasse le stock.
- Liste : barre de recherche (client, contact, date, mois, mots dans le désordre, sans accents), filtre par édition, regroupement par client avec totaux grands / petits, date et personne qui a noté, suppression d'une ligne avec confirmation.

## 6 quater. Suivi clients — relance devis, prospection, RDV, devis refusés (profil Commercial uniquement)

- Onglet « Suivi clients » à **quatre sous-onglets** : **Relance devis** (ouvert par défaut), **Prospection**, **RDV**, **Devis refusés**. Les trois premiers portent une pastille rouge (relances en retard / RDV d'aujourd'hui ou passés non clôturés). À l'ouverture, la page tombe sur le premier sous-onglet qui a une alerte (devis, puis RDV, puis prospection), sinon sur Relance devis.
- Tables Supabase `suivi_devis`, `suivi_prospects` et `suivi_rdv` : **un seul SQL à coller** (`SQL_SUIVI_CLIENTS` = `SQL_SUIVI_DEVIS` + `SQL_PROSPECTS` + `SQL_RDV`, `src/SuiviClients.js`, rejouable sans risque, met aussi à jour une base qui avait l'ancienne version : colonne `motif_refus`). Tant qu'une table manque (ou que la colonne `motif_refus` manque), le sous-onglet concerné affiche l'écran d'activation. Visible et chargé pour le Commercial ; chargé aussi pour l'administrateur (fiche client, lecture seule).

### Relance devis

- Une ligne = un devis : **N° de DE** (normalisé « DE1234 » ; si une fiche atelier ou chantier porte ce DE, son client est proposé), **client** (liste des clients existante, ajout possible), **contact** (carnet de contacts existant ; ajout d'une nouvelle personne avec son numéro et son mail ; téléphone et mail repris du carnet), objet, montant HT, date du devis, statut (À envoyer, Envoyé — en attente, Accepté, Refusé, Sans suite), commentaire, historique.
- **Relance** : soit une **date précise**, soit un **délai** (jours, semaines ou mois à partir de la date du devis, ex. 8 semaines), soit aucune. Quand la date est atteinte ou dépassée, la ligne passe en rouge (orange le jour même), l'onglet affiche une pastille avec le nombre de relances à faire et le tableau de bord du Commercial liste ces relances (visible aussi sur téléphone).
- « ✓ Relancé » : note facultative, la prochaine relance reprend le même délai (modifiable) ; chaque relance et chaque changement de statut est gardé dans l'historique de la ligne.
- Tableau interactif (à partir de 1000 px) ou cartes (téléphone, tablette portrait) : recherche, filtre par statut, tri (relance, client, date, montant), statut modifiable directement, appel téléphonique et mail de relance préremplis en un geste, export CSV de la liste affichée, indicateurs (à relancer, en attente avec montant total, acceptés avec taux de réponses positives, refusés).
- **Lien avec les fiches** : si une fiche atelier porte le même N° de DE, un lien « 📂 fiche atelier » l'ouvre (lecture seule) et le retour ramène au même sous-onglet ; le nom du client ouvre sa fiche client.
- Les devis **Refusé** et **Sans suite** ne figurent plus dans « Relance devis » (la tuile « Refusés » renvoie vers leur sous-onglet).

### Devis refusés

- Passer un devis en Refusé ou Sans suite (liste déroulante du statut) ouvre une fenêtre qui demande le **motif** (obligatoire : prix trop élevé, délai trop long, concurrent retenu, pas de budget / projet reporté, projet abandonné, plus de réponse, autre) et une précision facultative ; le tout va dans l'historique et la colonne `motif_refus`. Le formulaire d'un devis propose aussi le motif.
- Sous-onglet : liste (tableau ≥ 1000 px, cartes sinon), puces de filtre par motif avec effectifs, recherche, nombre de devis et montant refusé, « ↩ Remettre en suivi » (statut Envoyé, relance dans 4 semaines), modification, suppression.

### RDV

- Table `suivi_rdv` : date, heure, entreprise (client ou prospect, même champ que la prospection), contact (carnet), téléphone, mail, lieu (lien vers la carte), objet, statut (Prévu, Fait, Annulé), compte rendu.
- Tuiles : À venir (dont aujourd'hui), À clôturer (prévu mais date passée), Faits, Annulés ; « ✓ Fait » demande un compte rendu facultatif. Ouvert par défaut sur « À clôturer » s'il y en a. Un RDV d'aujourd'hui ou passé non clôturé compte dans la pastille de l'onglet.
- Le tableau de bord du Commercial liste les RDV d'aujourd'hui, de demain et à clôturer.

### Prospection

- Deux listes dans le même tableau (filtre par tuile ou par « Afficher ») : **À démarcher** (entreprises à aller voir : nom, secteur d'activité, potentiel de travail, contact facultatif) et **Démarchés** (entreprise déjà contactée : contact, téléphone, mail, date du démarchage, **relance par date ou par délai**, 4 semaines proposées). Boutons « ➕ À démarcher » et « ➕ Déjà démarché ».
- **Nom d'entreprise** : proposé à partir de la liste des clients existante ; un nom qui n'y figure pas porte l'étiquette **Prospect** (sinon « Client »). Un prospect n'est PAS ajouté à la liste des clients des fiches.
- Contact : carnet de contacts existant (ajout possible avec téléphone et mail) ; téléphone et mail repris du carnet. Secteur : suggestions tirées des secteurs déjà saisis.
- Statuts : À démarcher → **Démarché** (bouton « ✓ Démarché » : note + date ou délai de relance) → Devenu client / Pas intéressé. « ✓ Relancé » : note + prochaine relance (mêmes règles que les devis) ; tout est gardé dans l'historique. Repasser un prospect en « À démarcher » efface sa relance.
- Relance : même code couleur que les devis (rouge en retard, orange aujourd'hui, jaune sous 7 jours, vert au-delà) ; seuls les prospects « Démarché » sont suivis. Recherche, tri (relance, entreprise, secteur, dernier ajouté), export CSV, appel et mail de relance préremplis. Tableau à partir de 1000 px, cartes en dessous.

### Notifications du Commercial

- Dans l'appli : calculées à l'ouverture (et au chargement de la page) en comparant les dates à la date du jour ; aucune notification poussée, rien quand l'appli est fermée.
- Où elles apparaissent : pastille rouge sur l'onglet « Suivi clients » (devis + prospects en retard ou à faire aujourd'hui + RDV d'aujourd'hui ou passés), pastille sur chaque sous-onglet, blocs « Relances à faire » et « Rendez-vous » du tableau de bord (avec appel en un geste), lignes rouges ou orange dans les tableaux, bouton « prospects à démarcher ».
- **Résumé du matin par mail** (voir § 9) : relances de devis et de prospection en retard ou du jour, RDV d'aujourd'hui, de demain et passés à clôturer, relances des 7 prochains jours, nombre d'entreprises à démarcher.

## 6 quinquies. Clients (profils Commercial et Administrateur, lecture seule)

- Onglet « Clients » : liste de tous les clients (liste des clients des fiches + noms rencontrés dans devis, fiches, calendriers, prospection, RDV), recherche par nom ou N° de DE, filtre (tous / suivi en cours / prospects seulement), 60 par page ; étiquette Client ou Prospect ; dernière activité.
- **Fiche d'un client** : tout ce que l'appli sait de lui, sans saisie supplémentaire (elle « s'approvisionne » toute seule) : contacts (carnet rattaché à la société, contacts des devis, des fiches atelier et chantier, des calendriers, de la prospection et des RDV, avec téléphone et mail et l'origine de chaque contact), devis suivis (statut, relance, motif de refus, lien vers la fiche atelier), fiches atelier (ouverture en lecture seule, retour sur la fiche client), fiches chantier, calendriers remis, prospection, rendez-vous.
- Rapprochement par **nom de client identique** (sans accents ni majuscules) ; les contacts du carnet sont rattachés par la société (même règle que l'onglet Calendrier). Aucune table de plus : `src/Clients.js` lit les données existantes. Le nom d'un client dans le suivi clients (devis, RDV, prospection) ouvre sa fiche.

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
- **Résumé du matin du Commercial** (`src/ResumeCommercial.js`) : second résumé, **à une autre adresse** (réglage « Résumé du matin pour le commercial », page Matériel, administrateur), mêmes règles (un seul par jour, jours et heure réglables, première ouverture de l'appli après l'heure, tous appareils et tous profils confondus, rien si rien à faire), **même compte EmailJS** que l'alerte matériel (service, modèle, clé publique à renseigner une fois dans le bloc des alertes matériel). Clés `parametres_app` : `resume_commercial_actif`, `_adresse`, `_jours`, `_heure`, `_dernier`. Contenu : relances de devis et de prospection à faire, RDV d'aujourd'hui et de demain, RDV passés à clôturer, relances des 7 jours, nombre d'entreprises à démarcher. Aucun mail si personne n'ouvre l'appli ce jour-là.

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
