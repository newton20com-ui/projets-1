# Kainova Training — Notre recette de vibe coding

**État : méthode évolutive, version 0.2 — 23 novembre 2026.**

## Objectif

À travers **30 projets progressifs**, apprendre à piloter la construction de produits numériques avec l'IA : exprimer le besoin, juger le résultat, identifier les défauts, rechercher des solutions et itérer jusqu'à obtenir une réalisation satisfaisante. L'utilisateur pilote les décisions et les évaluations ; l'assistant implémente, teste, explique les choix et corrige. **Le but n'est pas d'imposer l'écriture manuelle de code.**

Cette méthode n'est **pas figée**. Après chaque projet, nous y ajoutons les méthodes réellement utiles découvertes ensemble. Nous distinguons ce qui a été essayé, ce qui a échoué et ce que nous choisissons de réutiliser.

## Règle validée n° 1 — Rechercher des références variées avant de concevoir l'interface

**Origine : Projet 01 — Nova Studio.**

**Constat :** un site peut être fonctionnel et techniquement correct tout en étant peu satisfaisant visuellement pour le commanditaire. Se contenter de reproduire une composition habituelle ou une palette récurrente ne suffit pas.

**Méthode retenue :**
1. Étudier **plusieurs références visuelles pertinentes**, sans se limiter à deux plateformes. Selon le projet : Dribbble, Awwwards, Behance, Land-book, Lapa Ninja, Godly, Mobbin, SiteInspire, One Page Love, Aura, et les véritables sites de référence du secteur.
2. Comparer la typographie, les hiérarchies, les mises en page, les couleurs, les espacements, les interactions et le rendu mobile.
3. Sélectionner les principes utiles au **produit et à sa cible**, pas une esthétique à copier mécaniquement.
4. Concevoir une **direction originale** et expliciter les choix ; ne pas copier intégralement les travaux d'autres designers.
5. Implémenter, tester sur plusieurs tailles d'écran, puis examiner le rendu réel.
6. Recueillir le jugement de l'utilisateur, corriger sans s'accrocher au premier rendu et répéter jusqu'à validation.

**Critère pratique :** la direction visuelle doit être choisie intentionnellement pour chaque produit. Ne pas transformer le style du projet précédent en modèle automatique.

## Règle validée n° 2 — Utiliser des médias authentiques ou photoréalistes, pas seulement du code graphique

**Origine : Projet 02 — Atlas Store.**

**Constat :** une interface peut être bien conçue mais perdre sa crédibilité quand les produits, lieux ou personnes sont représentés uniquement par des dessins SVG fabriqués en code.

**Méthode :**
1. Identifier dès le cadrage les visuels essentiels : produits, photos de contexte, portraits, scènes d'usage, illustrations de données.
2. Pour les objets réels, chercher en priorité des **photographies réelles pertinentes et de qualité** (constructeur avec autorisation, banques compatibles, photos fournies par le client). Sinon, créer des rendus **photoréalistes générés** clairement identifiés comme tels quand cela convient.
3. Utiliser des icônes et SVG pour les éléments d'interface, la signalétique, les schémas et les illustrations intentionnelles — pas comme substitut automatique à toute photo.
4. Vérifier **l'exactitude du sujet**, les droits d'usage, les marques visibles, la qualité, le cadrage, l'optimisation et la cohérence mobile.
5. Éviter les images distantes instables ; privilégier des fichiers optimisés et hébergés localement quand c'est possible, avec un repli fonctionnel.
6. Ne jamais présenter une photo illustrative, un rendu généré ou une maquette comme la preuve d'un produit commercialisé, de son stock ou de ses caractéristiques.

**Limite observée sur Atlas Store :** les photos sont indicatives de produits fictifs et certaines sont servies par un CDN externe ; elles ne constituent pas des fiches photographiques exactes de références vendues.

## Boucle de travail provisoire

**Besoin → références/recherche → choix de direction → construction par l'IA → tests → retour utilisateur → recherches et corrections → validation → leçon consignée.**

Cette boucle pourra évoluer avec les prochains projets. Aucun projet n'est déclaré validé par le seul fait que le code fonctionne ou qu'un déploiement existe.

## Journal des apprentissages

| Projet | Observation | Méthode conservée | Statut |
| --- | --- | --- | --- |
| 01 — Nova Studio | La recherche visuelle multi-sources a contribué à une V2 davantage appréciée que la première proposition. | Règle n° 1 : recherche et analyse de références multiples, direction artistique adaptée, itération sur retour réel. | Validée comme pratique |
| 02 — Atlas Store | Le rendu exclusivement SVG manquait de réalisme pour une boutique de produits. | Règle n° 2 : photos réelles ou rendus photoréalistes pertinents, droits vérifiés, exactitude et repli. | Validée comme pratique |\n| 03 et suivants | À documenter à mesure de l'avancement. | À enrichir après chaque projet. | En attente |

## Discipline de mise à jour

- Ne garder comme **règle validée** que les pratiques effectivement utiles ou expressément approuvées.
- Ajouter un exemple précis, le contexte et les limites de chaque règle.
- Corriger ou supprimer une règle si elle devient inefficace.
- Conserver les leçons transversales dans ce document ; les consignes spécifiques restent dans le README de chaque projet.
