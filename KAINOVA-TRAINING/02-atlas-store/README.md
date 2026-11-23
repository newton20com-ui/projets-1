# Atlas Store — Projet 02 · Kainova Training

> **Boutique fictive.** Catalogue, prix, disponibilités et stocks sont inventés pour cet exercice. Aucune commande, livraison ou transaction réelle n'est possible.

## Présentation

Atlas Store est une boutique d'accessoires technologiques interactive conçue pour le deuxième projet du parcours Kainova Training (30 projets). L'objectif est de comprendre comment une interface e-commerce fonctionne **entièrement côté navigateur**, sans backend, base de données, compte utilisateur ni paiement.

L'application contient **16 produits fictifs**, dans quatre catégories : audio, charge, smartphone et bureau. Chaque produit affiche désormais **une photographie illustrative** (Unsplash ou Pexels) et **une vue conceptuelle SVG**. En cas d'erreur de chargement, une image SVG locale de secours apparaît. Ces photographies ne représentent pas des modèles Atlas réels.

## Technologies

- **HTML5** — structure sémantique, boutons, champs, navigation et accessibilité.
- **CSS3** — identité visuelle, grilles, mise en page responsive et états interactifs.
- **JavaScript natif (modules ES)** — données structurées, recherche, filtres, tri, navigation, fiche produit, variantes et panier.
- **localStorage** — sauvegarde locale du panier lorsqu'elle est disponible.

Aucun framework, gestionnaire de paquets ni API externe n'est nécessaire. Les nouvelles photographies sont servies par **les CDN d'Unsplash et de Pexels** : une connexion Internet est nécessaire pour les charger. Les SVG de secours sont locaux.

## Architecture

```text
KAINOVA-TRAINING/02-atlas-store/
├── index.html                  # Structure du site et conteneur de l'application
├── css/style.css               # Direction visuelle et adaptations responsive
├── js/
│   ├── products.js             # Les 16 fiches, catégories, variantes et stocks fictifs
│   ├── catalog.js              # Recherche accent-insensible, filtres et tri
│   ├── storage.js              # Validation et persistance sécurisée du panier
│   ├── cart.js                 # Calculs, limites de quantité et logique panier
│   └── app.js                  # Vues, navigation et interactions DOM
├── assets/
│   ├── favicon.svg
│   └── images/                  # 32 SVG conceptuels originaux + repli
├── tests/
│   ├── test_logic.mjs          # Tests exécutable Node (sans dépendances)
│   └── test_site.py            # Scénarios navigateur Playwright (facultatif)
└── README.md
```

### Données produits

`products.js` exporte `PRODUCTS`, un **tableau d'objets**. Chaque objet décrit un produit : identifiant unique, nom, sous-titre, catégorie, prix numérique en FCFA, texte de présentation, caractéristiques, mots-clés, chemins d'images, badges éventuels et `variants`.

Chaque variante a un identifiant, un nom, une couleur, un stock fictif et un éventuel supplément de prix (`extraPrice`). Le produit peut ainsi exister en plusieurs finitions, et une finition avec `stock: 0` ne peut pas être ajoutée.

Le stock maximum par ligne est plafonné à `Math.min(stock, 10)`.

### Recherche, filtres et tri

Dans `catalog.js`, `queryProducts()` part des produits réels du tableau local. Elle applique les filtres **ensemble** : recherche dans les noms, sous-titres, mots-clés et descriptions ; catégorie ; prix maximum ; puis tri. La recherche normalise la casse et les accents (`écouteurs` et `ecouteurs` donnent le même résultat). Un état vide apparaît lorsqu'aucun produit ne correspond.

### Panier

Chaque ligne du panier a la forme :

```js
{ productId: 'neo-pods', variantId: 'noir', quantity: 2 }
```

Le couple `productId` / `variantId` identifie la ligne. Un même produit dans deux coloris forme donc **deux lignes distinctes**. Les prix ne sont jamais enregistrés dans le panier : ils sont recalculés à chaque affichage depuis les données du produit. Le sous-total est la somme des **prix numériques × quantités**. Il est uniquement formaté en FCFA à l'affichage.

Les quantités doivent être des entiers strictement positifs, inférieurs ou égaux au stock fictif et au plafond de 10.

### localStorage : utilité et limites

`storage.js` sauvegarde le panier sous la clé `atlas-store-demo-cart-v1` et le restaure après rechargement. Les données chargées sont **validées** : les entrées inconnues, incohérentes, corrompues, indisponibles ou excessives sont supprimées ou réduites. Si le navigateur interdit localStorage, le panier reste utilisable **en mémoire pour la session courante**, mais ne survit pas au rechargement.

**Important :** les données locales peuvent être effacées ou modifiées librement par l'utilisateur. localStorage n'est ni une base de données fiable pour des commandes réelles, ni un stockage synchronisé ni une preuve de paiement ou de stock.

### Navigation

L'application utilise des URL avec fragment `#` : `#/`, `#/catalogue`, `#/produit/neo-pods`, `#/panier`, `#/recapitulatif`, `#/a-propos`. L'événement `hashchange` met à jour le contenu sans serveur ni réécriture d'URL. Le bouton panier ouvre également un panneau latéral accessible au clavier, refermable avec `Échap`.

### Responsive et accessibilité

Le CSS adapte la grille, la navigation, les filtres et les vues produit aux petits mobiles (360/390 px), tablettes (768 px) et ordinateurs (1440 px). Les contrôles possèdent des labels, des états de focus visibles et des textes alternatifs pour les visuels. Les animations respectent `prefers-reduced-motion`. Une image manquante est remplacée par un SVG local.

## Démarrer localement

**Recommandation : utiliser un petit serveur statique**, car les modules JavaScript ES sont généralement soumis aux restrictions de sécurité du protocole `file://`.

Depuis le dossier `02-atlas-store`, avec Python installé :

```bash
python -m http.server 8000
```

Ouvrez ensuite `http://localhost:8000`. Avec VS Code, l'extension Live Server est également suffisante. Aucune étape de build ou installation de dépendance n'est nécessaire.

## Déployer sur Vercel

Le dépôt principal est `newton20com-ui/projets-1`.

1. Dans Vercel, importez **le même dépôt GitHub**, puis créez un **nouveau projet Vercel** indépendant de Nova Studio.
2. Choisissez `Other` (site statique, sans framework).
3. Sélectionnez **Root Directory** : `KAINOVA-TRAINING/02-atlas-store`.
4. Laissez `Build Command` vide. Aucun dossier de sortie spécifique n'est nécessaire pour ce site HTML statique.
5. Déployez depuis la branche `main`.

N'utilisez **pas** la configuration Vercel existante du Projet 01 : elle doit continuer à pointer vers `KAINOVA-TRAINING/01-nova-studio`.

## Tests

Pour les tests de logique, `node tests/test_logic.mjs` (Node.js moderne) vérifie les produits, la recherche, les filtres combinés, les tris, les calculs de panier, les variantes et la validation du stockage. Les scénarios navigateur (facultatifs) sont dans `tests/test_site.py` et nécessitent une installation de Playwright Python et Chromium ; ils peuvent être exécutés dans un environnement qui autorise la navigation locale.

Les scénarios manuels importants : recherche accent-insensible, filtres cumulés, tri, fiche produit, choix couleur, refus de stock zéro, bouton panier, modification/suppression, confirmation avant vidage, conservation après actualisation, gestion de localStorage invalide et navigation clavier.

## Ce que l'utilisateur doit comprendre après ce projet

1. **JavaScript rend une page interactive** en réagissant à des événements (clic, saisie, changement de valeur, navigation).
2. **Les objets deviennent des cartes visuelles** : le tableau de produits est parcouru pour générer les éléments du catalogue ; on ne copie pas les cartes à la main dans le HTML.
3. **Le panier est une liste de données** : identifiants de produits, variantes et quantités. Les informations affichées sont reconstruites à partir de cette liste.
4. **Les événements modifient un état** : cliquer sur « Ajouter » met à jour le tableau du panier ; l'application recalcule et affiche le compteur et les totaux.
5. **localStorage garde des données dans un navigateur** : utile pour une démo, mais non synchronisé et non garanti.
6. **Le frontend ne suffit pas pour des ventes réelles** : un serveur serait indispensable pour vérifier les stocks, calculer les montants de confiance, protéger les commandes et communiquer avec des systèmes de paiement.

## Limites explicites

- Tous les produits, prix, caractéristiques et stocks sont inventés ; les photographies sont indicatives et les SVG sont des concepts ; aucun visuel ne doit être interprété comme un modèle Atlas effectivement commercialisé.
- Pas d'achat, de paiement, de livraison, de compte, de suivi, de commande WhatsApp ni de backend.
- Pas de synchronisation entre navigateurs ou appareils.
- Pas de garantie de conservation : l'utilisateur peut effacer son navigateur et le stockage peut être désactivé.
- La recherche et les filtres sont propres à la session d'utilisation ; le panier seulement est persistant.
- Cette démonstration n'est **pas un système e-commerce commercial sécurisé**.

## Inspirations de conception (principes, pas copies)

Exploration des références sur Dribbble, Behance, Land-book et Baymard Institute pour la hiérarchie visuelle, la présentation des images, les états des variantes, les filtres et les parcours utilisateur. Les SVG du projet sont originaux. Les photographies proviennent de banques d'images distinctes.


## Images réelles d'illustration : sources et limites

La première version utilisait uniquement des images vectorielles produites par du code. Elle reste disponible dans Git, mais la version actuelle privilégie **des photographies représentatives** : un véritable objet visible au premier regard, plutôt qu'un dessin SVG. Les objets **Atlas restent fictifs**, et une photo peut présenter un autre modèle, une autre couleur, ou une marque réelle. Les caractéristiques du catalogue ne doivent pas être attribuées aux objets photographiés.

Les photos sont issues de [Unsplash](https://unsplash.com/license) et de [Pexels](https://www.pexels.com/license/), dont les licences autorisent leur utilisation dans une démonstration. Les images sont chargées par URL de photo identifiée (pas une recherche aléatoire). Pour une boutique commerciale, il faudrait **les photos exactes des références vendues** et vérifier les droits des marques visibles.

| Article Atlas (fictif) | Source de la photographie d'illustration |
| --- | --- |
| Neo Pods | [Unsplash — écouteurs en boîtier](https://unsplash.com/photos/black-earbuds-and-their-charging-case-ZrL-XNzAmag) |
| Studio Wave | [Unsplash — casque audio](https://unsplash.com/photos/a-person-wearing-a-black-headphone-oEs7aefonI0) |
| Pulse Mini | [Unsplash — enceinte](https://unsplash.com/photos/person-holding-black-and-silver-jbl-portable-speaker-YcEISwbqzsw) |
| Linea C | [Pexels — écouteurs filaires](https://www.pexels.com/photo/black-earphones-on-a-desk-6251/) |
| Volt 35 | [Pexels — adaptateur secteur](https://www.pexels.com/photo/white-adapter-on-a-blue-surface-4097207/) |
| Loop C | [Pexels — câble USB-C](https://www.pexels.com/photo/close-up-photo-of-cord-3921633/) |
| Power 10K | [Pexels — batterie externe](https://www.pexels.com/photo/portable-power-bank-on-minimalist-tech-desk-38648941/) |
| Trio Dock | [Unsplash — accessoires tech](https://unsplash.com/photos/a-keyboard-mouse-controller-and-other-items-on-a-table-qeICalRUfMU) |
| Frame Case | [Pexels — coque de téléphone](https://www.pexels.com/photo/close-up-shot-of-a-clear-phone-case-7360460/) |
| Fold Stand | [Pexels — téléphone sur support](https://www.pexels.com/photo/close-up-of-a-smartphone-on-a-cobra-phone-stand-standing-on-a-desk-16017173/) |
| Clear Edge | [Pexels — verre de protection](https://www.pexels.com/photo/a-hand-holding-a-tempered-glass-of-samsung-galaxy-s9-7742506/) |
| Orbit Grip | [Pexels — ambiance smartphone](https://www.pexels.com/photo/a-person-holding-a-smartphone-11025652/) ; **ne montre pas l'anneau grip exact** |
| Type Mini | [Pexels — clavier](https://www.pexels.com/photo/focus-photography-of-keyboard-824243/) |
| Air Mouse | [Unsplash — souris sans fil](https://unsplash.com/s/photos/wireless-mouse) |
| Link Six | [Pexels — hub USB-C](https://www.pexels.com/photo/portable-hard-disk-with-wire-20076003/) |
| Vision HD | [Pexels — bureau avec webcam](https://www.pexels.com/photo/a-laptop-and-monitor-with-a-webcam-in-a-workspace-10864867/) |

**Limites :** les URL pointent vers des hébergeurs externes et peuvent échouer hors ligne ; dans ce cas une illustration locale apparaît. Les rendus photographiques doivent être contrôlés manuellement sur Vercel. L'hébergement de fichiers optimisés localement serait préférable pour un usage commercial. Les variantes de couleur restent des données fictives et ne modifient pas la photographie.
