# KAINOVA TRAINING — PROJET 02 — ATLAS STORE
## Cahier des charges d'évolution vers une boutique administrable et exploitable

**Statut :** cahier des charges destiné à Codex, non encore implémenté.  
**Dépôt existant :** `newton20com-ui/projets-1`  
**Dossier existant :** `KAINOVA-TRAINING/02-atlas-store/`  
**Principe :** améliorer l'existant sans supprimer Nova Studio ni écraser son déploiement.

## 1. Mission

Tu es Codex. Audite le code réellement présent sur la branche par défaut du dépôt et transforme Atlas Store, actuellement une démonstration frontend, en une boutique opérationnelle pour un commerçant pilote. Tu es responsable du code, des migrations, de la configuration documentée, des tests, de l'accessibilité, de la sécurité et de la livraison. L'utilisateur travaille en vibe coding et ne doit pas écrire le code lui-même. Ne déclare jamais une intégration testée si tu ne l'as pas testée.

Ne commence pas un autre projet. Ne réécris pas aveuglément l'interface existante. Conserve autant que possible sa qualité graphique, ses parcours et ses fonctionnalités de recherche, filtrage, variantes et panier. Préserve le Projet 01 et tous ses déploiements.

## 2. État initial vérifié sur GitHub

Le dépôt contient `KAINOVA-TRAINING/02-atlas-store/README.md`, `index.html`, `css/style.css`, `js/app.js`, `js/products.js`, `js/catalog.js`, `js/cart.js`, `js/storage.js`, ainsi que des tests mentionnés dans le README. Le README décrit 16 produits fictifs, une navigation par fragments, des variantes, des filtres combinés et un panier localStorage. Le code inspecté confirme que le catalogue est défini dans `products.js`, que les calculs de panier sont effectués côté client et que les produits sont fictifs. Il n'existe pas dans ces modules de backend, de gestion de commandes ou d'administration. L'exécution des tests et l'interface déployée ne sont pas encore vérifiées.

Avant tout changement, inspecte tous les fichiers, la configuration Git et les éventuelles modifications non commitées. Établis un diagnostic précis, puis implémente. Ne détruis aucune donnée utilisateur existante sans stratégie de migration.

## 3. Objectif produit

Deux espaces cohérents :

1. **Boutique publique** : un visiteur découvre les produits, choisit les variantes, constitue un panier, saisit ses informations, sélectionne une méthode de livraison/retrait et valide une commande. Il reçoit un numéro de commande et peut consulter son statut avec un mécanisme sécurisé.
2. **Administration privée** : un commerçant authentifié crée, modifie, publie, masque ou archive les produits, catégories, variantes, prix, images et stocks ; consulte et traite les commandes ; configure les coordonnées de contact et les paramètres de vente ; consulte les indicateurs essentiels.

Le produit doit être réellement exploitable en mode pilote, pas une simulation qui prétend enregistrer des commandes.

## 4. Architecture cible et décision technique

Le frontend HTML/CSS/JavaScript existant peut être conservé si une architecture évolutive est possible. Choisis explicitement entre (a) garder le frontend et ajouter une API sécurisée ou (b) migrer vers un framework full-stack uniquement si le coût de maintenance et l'intégration le justifient. Explique les avantages, limites, risques et coûts de la décision. Évite une refonte esthétique inutile.

Utilise une base PostgreSQL managée ou une alternative justifiée, des migrations versionnées, un stockage d'images compatible avec les usages, une authentification administrateur sécurisée et un environnement de déploiement reproductible. Les règles de sécurité doivent être appliquées côté serveur et/ou par des politiques d'accès en base, jamais uniquement dans l'interface. Les secrets restent dans les variables d'environnement du fournisseur, jamais dans Git ni dans les messages publics.

Prévois des environnements de développement/test et production séparés si les ressources disponibles le permettent.

## 5. Catalogue et administration

- Tableau de bord privé protégé par authentification, avec déconnexion et récupération de compte selon le fournisseur d'identité.
- CRUD complet des catégories et produits ; champs : identifiant, slug, titre, description, caractéristiques, prix numérique en FCFA, catégorie, images, statut de publication, stock, variantes, date de création et modification.
- Variantes avec identifiants stables, supplément de prix et stock distincts ; empêcher les combinaisons invalides.
- Téléversement et suppression d'images, contrôle de type/taille, stockage, nettoyage des fichiers inutilisés, images de secours et textes alternatifs.
- Brouillon, publication, archivage et suppression contrôlée ; ne pas casser l'historique des commandes lorsqu'un produit est supprimé.
- Recherche, filtres, tri, pagination si nécessaire, état vide, validation de formulaire, erreurs explicites.
- Paramètres commerçant : nom commercial, contacts, numéro WhatsApp, email de notification, modalités de livraison/retrait, devise FCFA, textes légaux et horaires facultatifs.
- Import initial des 16 produits de démonstration par script reproductible, en conservant une indication claire qu'ils sont fictifs jusqu'à leur remplacement par des produits réels.
- Ne pas permettre à un visiteur de modifier les prix ou le stock par manipulation du navigateur.

## 6. Boutique publique

- Conserver le design et les fonctionnalités existantes, tout en remplaçant la source locale des produits par la base de données.
- Chargement, erreur réseau, absence de produits, produit non publié, variante épuisée, image indisponible et panier expiré : états traités proprement.
- Panier persistant localement, mais **revalidation côté serveur** de tous les prix, variantes, quantités, disponibilités et frais au moment de créer la commande.
- Prix en entiers FCFA, sans calcul monétaire en nombres flottants ; total recalculé par le serveur.
- Formulaire de commande : nom, contact, ville/quartier/adresse ou point de retrait selon l'option, notes facultatives, consentements requis. Collecter uniquement les données nécessaires.
- Confirmation avec référence unique et message véridique ; ne jamais afficher « commande enregistrée » avant confirmation effective du serveur.
- Suivi de commande sécurisé : lien à jeton imprévisible et expirant ou connexion client, sans exposer les commandes d'autrui.
- Informations de livraison, frais, délais et modalités explicitement configurables ; pas de promesses fictives.

## 7. Commandes et gestion métier

- Table des commandes et lignes de commande, avec instantané du nom, prix, variante, quantité et devise au moment de l'achat. Les commandes passées restent cohérentes si le catalogue change.
- États : nouvelle, confirmée, en préparation, prête/expédiée, livrée, annulée. Définir les transitions autorisées et l'historique horodaté.
- Gestion des annulations et du stock : choisir et documenter une stratégie de réservation/décrément atomique, empêcher les ventes au-delà du stock, éviter les doubles déductions.
- Protection contre double soumission par clé d'idempotence ou équivalent.
- Interface administrateur : liste, recherche, filtres, détails, notes internes, modification de statut, export CSV sûr et statistiques simples.
- Une commande ne doit pas disparaître lorsqu'un produit est archivé.
- Journaux d'événements métier et traçabilité des actions administrateur sensibles.

## 8. Notifications et WhatsApp

- Envoyer une notification au commerçant lors d'une nouvelle commande via email transactionnel si les identifiants et l'expéditeur vérifié sont disponibles ; gérer erreurs, réessais et journal de livraison.
- Proposer un bouton WhatsApp avec message prérempli pour contacter le commerçant ; ne pas confondre **ouverture de WhatsApp** avec **message envoyé automatiquement**.
- L'envoi automatisé WhatsApp ne sera activé que si une intégration officielle compatible, des consentements et des identifiants sont effectivement configurés.
- Le tableau de bord doit rester la source de vérité même si les notifications échouent.

## 9. Paiements

**Mode obligatoire :** paiement à la livraison ou au retrait, explicitement présenté comme paiement non encore encaissé.

**Mode optionnel conditionnel :** paiement électronique via prestataire réellement disponible pour le pays et le commerçant, après vérification de la compatibilité, des conditions contractuelles et des moyens de test. Ne pas inventer une intégration Stripe, mobile money ou carte bancaire si elle n'est pas disponible.

Pour toute intégration : utiliser le sandbox officiel si disponible ; vérifier signatures des webhooks et événements serveur, montants, devise, identifiants et idempotence ; séparer statut de paiement et statut de commande ; ne jamais considérer un simple retour navigateur comme preuve de paiement ; documenter remboursements, échecs et rapprochements. Aucun numéro de carte ni secret ne doit être demandé dans le chat ou commité.

## 10. Sécurité et confidentialité

- Authentification robuste, autorisations administrateur côté serveur, protections contre accès horizontal aux commandes, moindre privilège.
- Validation des entrées, requêtes paramétrées, protections XSS/CSRF selon architecture, contrôle CORS, rate limiting adapté et protection contre abus de commande.
- Sécuriser les uploads et les URLs de suivi ; ne pas exposer les coordonnées clients dans les logs publics.
- Variables d'environnement documentées dans `.env.example` **sans valeurs secrètes**.
- Politique de conservation/suppression des données personnelles, mentions de confidentialité, conditions de vente adaptées au contexte à faire valider avant exploitation réelle.
- Sauvegarde et restauration documentées ; ne pas promettre une conformité juridique non vérifiée.

## 11. UX et qualité

- Conserver l'identité Atlas Store ; mobile d'abord, 360/390/768/1440 px, navigation clavier, focus visible, libellés, contraste, retours d'action.
- États de chargement, erreurs, confirmations, formulaires invalides et messages d'échec honnêtes.
- Ne pas inventer d'avis clients, de stocks réels, de produits disponibles ni de transactions.
- Optimiser images, chargement et SEO des pages publiques ; éviter l'indexation des pages privées.

## 12. Tests d'acceptation

Automatiser autant que raisonnable et exécuter réellement :

1. Admin non connecté ne peut pas ouvrir les écrans privés ni utiliser les APIs protégées.
2. Admin crée une catégorie et un produit avec image et variantes ; produit publié apparaît publiquement.
3. Admin modifie prix, stock et disponibilité ; catalogue se met à jour.
4. Produit archivé disparaît de la vente sans altérer les commandes passées.
5. Recherche, filtres combinés, tri et navigation fonctionnent sur les données persistantes.
6. Deux variantes du même produit restent distinctes dans le panier.
7. Le serveur refuse les prix modifiés côté navigateur, quantités invalides et stocks insuffisants.
8. Commande validée est enregistrée en base avec lignes et total exacts, référence unique et statut initial.
9. Double clic / requête répétée ne crée pas de commande doublon.
10. Deux clients concurrents ne peuvent pas commander plus que le stock disponible.
11. Commande visible dans l'administration, statuts modifiables avec historique.
12. Suivi client accessible seulement via le mécanisme sécurisé prévu.
13. Échec de notification n'efface pas la commande ; erreur observable.
14. Paiement à la livraison correctement distingué d'un paiement reçu.
15. Si sandbox paiement activé : réussite, refus, doublon webhook, montant invalide, remboursement selon capacités.
16. Écrans mobiles, clavier, erreurs réseau, images invalides, stockage local inaccessible.
17. Migration, build, lint, tests et déploiement reproductibles.

Documente résultats, commandes exécutées, captures ou logs utiles, et limitations. Ne coche pas un test qui n'a pas été exécuté.

## 13. Livrables obligatoires

- Code complet intégré dans le dossier du Projet 02 ; migrations, données de démonstration et tests.
- README utilisateur et technique mis à jour.
- `docs/ARCHITECTURE.md` : schéma logique, flux navigateur → serveur → base → notifications/paiements, décisions et limites.
- `docs/DATA_MODEL.md` : tables, clés, relations, contraintes, états et règles de stock.
- `docs/DEPLOYMENT.md` : configuration des services, variables d'environnement, migrations, déploiement Vercel et retour arrière.
- `docs/OPERATIONS.md` : utilisation admin, gestion commandes, sauvegardes, incident, restauration.
- `docs/SECURITY.md` : modèle de menace, autorisations, risques résiduels et protections.
- `docs/LEARNING.md` : explications pédagogiques pour une personne pratiquant le vibe coding, sans présumer qu'elle écrit le code.
- `docs/TEST_REPORT.md` : scénarios exécutés, résultats, problèmes non résolus.
- `.env.example` sans secrets.

## 14. Pédagogie obligatoire — docs/LEARNING.md

Explique en français avec exemples concrets : frontend vs backend ; requête HTTP ; API ; base de données et SQL ; modèle relationnel ; migration ; authentification vs autorisation ; stockage des images ; variables d'environnement ; validation serveur ; transactions et concurrence ; idempotence ; webhooks ; paiement confirmé vs commande créée ; logs ; sauvegarde ; Git/GitHub ; CI/CD ; Vercel ; coût des services ; diagnostic d'incident. Pour chaque notion, indique **où elle apparaît réellement dans ce projet**, comment l'observer, et comment la tester sans écrire de code. Ajoute un glossaire et une liste de questions de compréhension avec réponses.

## 15. Ordre d'exécution demandé

1. Audit du dépôt et état Git ; inventorier fonctionnalités et tests existants.
2. Plan de migration minimal et architecture cible ; conserver l'interface et Nova Studio.
3. Mise en place base, migrations, authentification et stockage des images.
4. Administration catalogue et paramètres commerçant.
5. Intégration frontend aux données réelles ; migration des 16 produits fictifs.
6. Checkout, commandes, validation serveur, stock et suivi.
7. Notifications et lien WhatsApp.
8. Paiement hors ligne ; sandbox électronique seulement si réellement disponible et configuré.
9. Tests automatiques, sécurité, responsive, documentation.
10. Commit et déploiement indépendant si autorisés et configurés ; rapport final précis.

N'exige pas que l'utilisateur saisisse du code. Demande uniquement les accès ou décisions qui ne peuvent pas être raisonnablement remplacés, en expliquant leur finalité. Pour les secrets, privilégie les interfaces sécurisées du fournisseur. N'effectue pas de transaction réelle sans autorisation explicite.

## 16. Définition de terminé

Le projet est terminé seulement si un commerçant peut se connecter, publier un produit, le voir en boutique, recevoir une commande enregistrée, la consulter, la traiter et permettre au client d'en suivre l'état ; les protections essentielles et les tests sont vérifiés ; la documentation permet de le redéployer et de le maintenir. Toute fonction conditionnelle (notamment paiement électronique) doit être signalée comme configurée/testée, non configurée ou bloquée, jamais simulée silencieusement.

**Commence par auditer le code existant, puis implémente de bout en bout sans commencer le Projet 03.**