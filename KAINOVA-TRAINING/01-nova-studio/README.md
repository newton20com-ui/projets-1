# Nova Studio — Site vitrine (Projet 01)

**Projet pédagogique fictif — Kainova Training.** Site vitrine monopage pour une agence imaginaire de services numériques, destiné aux entrepreneurs, indépendants et petites entreprises francophones.

## Ce que contient le site

- En-tête avec logo, navigation par ancres et menu mobile.
- Présentation principale et deux appels à l'action.
- Quatre services : sites web, identité visuelle, UI/UX et conseil numérique.
- Quatre avantages concrets.
- Trois réalisations illustratives **explicitement fictives** (Luma, Soma et Nord).
- Processus de collaboration en quatre étapes.
- Contact via lien `mailto:` et pied de page.

## Technologies

- **HTML5** : structure, contenus, titres, sections, liens et descriptions accessibles.
- **CSS3** : couleurs, typographie, grilles, styles des composants, adaptation des écrans et mouvements discrets.
- **JavaScript natif** : uniquement le menu mobile (ouvrir, fermer, fermer après sélection ou avec Échap).

Aucun framework, aucune bibliothèque, aucune dépendance, aucune base de données et aucun service externe.

## Structure

```text
01-nova-studio/
├── index.html             # Page unique et contenu
├── style.css              # Design et responsive
├── script.js              # Menu mobile, sans dépendance
├── assets/
│   ├── favicon.svg        # Icône dans l'onglet
│   ├── projet-luma.svg    # Visuel concept architecture
│   ├── projet-soma.svg    # Visuel concept soins
│   └── projet-nord.svg    # Visuel concept conseil
└── README.md              # Documentation
```

## Navigation

Les liens `#services`, `#approche`, `#realisations`, `#processus` et `#contact` mènent aux sections portant ces identifiants. Aucun chargement de page n'est nécessaire. Sur petit écran (900 px et moins), un bouton ouvre la navigation ; son état est exposé aux technologies d'assistance grâce à `aria-expanded`. Le menu se referme après la sélection d'un lien, en cliquant à l'extérieur ou en appuyant sur `Échap`.

Le bouton de contact utilise une adresse fictive `bonjour@nova-studio.example`. Il **ouvre bien le logiciel de messagerie** de la personne (si une application d'email est configurée), mais **aucun message ne peut être livré** à cette adresse de démonstration. Il faut la remplacer par une véritable adresse professionnelle avant une mise en production commerciale. Aucun formulaire n'est simulé.

## Responsive et accessibilité

La mise en page utilise CSS Grid et Flexbox, avec des ajustements à 1180, 900, 620 et 370 px. Les grilles se réorganisent progressivement, le menu devient compact, et les typographies / espacements s'adaptent. Les éléments essentiels sont présents dans le HTML. L'option système « réduire les animations » est prise en charge.

Sont également prévus : un lien d'accès rapide au contenu, des zones sémantiques (`header`, `nav`, `main`, `section`, `footer`), des textes alternatifs pour les projets et des états de focus visibles au clavier.

## Lancer localement

1. Ouvrir le dossier `01-nova-studio`.
2. Double-cliquer sur `index.html` pour l'ouvrir dans un navigateur moderne.
3. Facultatif : pour prévisualiser via un serveur statique, exécuter `python -m http.server 8000` depuis ce dossier, puis ouvrir `http://localhost:8000`.

L'application ne demande ni installation, ni `npm install`, ni serveur applicatif.

## Déploiement sur un hébergement statique

**GitHub Pages** : placer le contenu du dossier dans un dépôt GitHub (ou une branche / dossier configuré pour Pages), puis activer Pages dans *Settings → Pages*. Les chemins relatifs fonctionnent également sous une URL de sous-répertoire.

**Netlify** : déposer directement le dossier `01-nova-studio` sur Netlify Drop, ou relier un dépôt et utiliser ce dossier comme répertoire de publication. Pas de commande de build.

**Vercel** : importer un dépôt et configurer `01-nova-studio` comme *Root Directory* pour un projet statique, sans build ni framework. Si Vercel demande une configuration de framework, choisir *Other*.

Avant une publication destinée à être indexée par Google, **retirer** la balise `<meta name="robots" content="noindex, nofollow" />` du fichier `index.html`. Elle est volontairement présente ici pour éviter l'indexation d'un faux studio. Pour une utilisation commerciale, remplacer aussi les textes et projets fictifs, les mentions légales et l'adresse email.

## Limites assumées

- Nova Studio, ses trois réalisations et son adresse email sont **fictifs**.
- Pas de formulaire, prise de rendez-vous, paiement, suivi analytics, backend, base de données ou CMS.
- Les appels à l'action font défiler la page ou ouvrent l'application email de l'utilisateur.
- Les visuels sont des illustrations vectorielles originales, non des sites de vrais clients.
- L'année du copyright est inscrite en dur pour éviter d'ajouter un script à cette fin.

## Validation technique

À contrôler : présence des sept blocs fonctionnels, liens d'ancrage, ouverture / fermeture du menu mobile, absence de débordement horizontal, affichage aux tailles courantes, visibilité du focus, préférence `prefers-reduced-motion`, absence de requêtes externes et absence d'erreurs JavaScript.

Le projet est **un premier exercice de réalisation et de livraison**, pas une véritable agence prête à recevoir des commandes.
