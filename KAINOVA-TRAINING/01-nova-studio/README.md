# Nova Studio — Kainova Training / Projet 01

Site vitrine d'une agence **fictive** de services numériques, entièrement reconstruit dans une direction graphique éditoriale et expressive. Il s'agit d'un exercice du parcours **Kainova Training (30 projets)**, non d'une véritable agence commerciale.

## Le site

Une page en français, avec : en-tête et menu mobile, hero, présentation, quatre expertises, trois réalisations fictives, quatre engagements, quatre étapes de réalisation, contact et pied de page.

Les réalisations **Maison Forma**, **Pulpe** et **Claro** sont des concepts inventés pour la démonstration. Aucune donnée client, aucun chiffre commercial ni témoignage réel ne sont présentés. L'adresse `bonjour@nova-studio.example` est volontairement fictive : le bouton `mailto:` ouvre un logiciel de messagerie mais ne permet pas d'envoyer un email à un vrai destinataire.

## Direction artistique

Références de recherche : approches éditoriales et typographiques visibles sur les pages de concepts de studio créatif de Dribbble (notamment **M@KA / One Collective Design** et **CHAMPS / Jeremy Baraka**), ainsi que la galerie de modèles Aura. Il s'agit d'une création originale, non d'une reproduction de maquette.

Palette : bleu électrique `#2538F5`, orange corail `#FF6448`, fond ivoire `#FFFBF3`, noir `#151512` et accent citron `#F6EF78`. Typographie système sans serif forte et accents italiques Georgia. Aucun framework ni police téléchargée. Les trois visuels du portfolio sont des **SVG originaux créés pour cette démonstration**, hébergés localement.

## Technologies et architecture

- `index.html` : contenu, hiérarchie des titres, liens et structure sémantique.
- `style.css` : identité, mise en page, couleurs, animations simples, responsive, focus clavier et adaptation aux préférences de réduction de mouvement.
- `script.js` : ouverture/fermeture du menu mobile, synchronisation des attributs ARIA, fermeture avec Échap, clic sur lien ou clic extérieur, mise à jour du copyright.
- `assets/favicon.svg` : icône Nova Studio.
- `assets/projet-luma.svg` : visuel du concept Maison Forma.
- `assets/projet-soma.svg` : visuel du concept Pulpe.
- `assets/projet-nord.svg` : visuel du concept Claro.

Aucune dépendance, aucune installation npm, aucune API, aucun backend, aucune base de données.

## Navigation et responsive

Les liens pointent vers les `id` des sections de la même page. Le menu horizontal desktop est remplacé sous 900 px par un menu mobile, piloté par le script natif. Le contenu s'adapte en grilles et colonnes selon la largeur disponible. Le site propose une liaison « Aller au contenu » et des focus visibles. `prefers-reduced-motion` supprime les transitions et le défilement fluide.

## Lancement local

Décompresser le dossier et ouvrir directement `index.html` dans un navigateur récent. Le site fonctionne avec le protocole `file://` ou un serveur statique standard, sans étape de construction.

## Déploiement Vercel

1. Importer le dépôt GitHub `newton20com-ui/projets-1` dans Vercel.
2. Régler **Root Directory** sur `KAINOVA-TRAINING/01-nova-studio`.
3. Sélectionner le preset **Other** (HTML/CSS/JS). Ne pas ajouter de commande de build ni de variable d'environnement.
4. Déployer la branche `main`.

Chaque futur projet d'entraînement peut avoir son propre projet Vercel, relié au même dépôt, mais avec un autre dossier racine.

## Limites intentionnelles

Pas de formulaire, chat, réservation, compte utilisateur, paiement, CMS ou API. Les cartes des démonstrations présentent des visuels, sans prétendre ouvrir des études de cas inexistantes. Les adresses fictives et l'avis « projet fictif » doivent être remplacés uniquement si un jour une véritable activité les justifie. `robots=noindex,nofollow` est volontaire pour une démonstration qui ne représente pas une entreprise réelle.
