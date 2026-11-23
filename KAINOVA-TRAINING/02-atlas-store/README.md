# Atlas Store — Kainova Training / Projet 02

**Statut au 23 novembre 2026 : backend Supabase dédié créé et API déployée ; boutique GitHub/Vercel reliée au serveur.** La création du premier compte administrateur et les vérifications de commande en conditions réelles restent à effectuer avant toute utilisation commerciale.

- Site public : https://projets-1-02-atlas-store.vercel.app/
- Administration sécurisée : https://projets-1-02-atlas-store.vercel.app/admin.html (compte Supabase autorisé nécessaire)
- Laboratoire indépendant, sans authentification ni serveur : https://projets-1-02-atlas-store.vercel.app/admin.html?lab=1
- Boutique laboratoire : https://projets-1-02-atlas-store.vercel.app/?lab=1#/catalogue
- Supabase dédié : projet `bdcayckhcoejmmphivhp` ; organisation « Olivia » ; distinct de toute autre application.

Les **16 références initiales** sont étiquetées `[TEST]` et rendues commandables pour les essais techniques, avec faux stocks et prix. Les commandes en mode serveur, si confirmées, sont enregistrées réellement dans PostgreSQL ; **elles ne constituent ni ventes commerciales, ni paiements, ni obligations de livrer**. N'utilisez que des coordonnées fictives et aucune information privée pour les essais.

## Deux modes à ne pas confondre

**Boutique connectée (URL habituelle).** Le catalogue, les variantes et les stocks proviennent de Supabase ; le panier reste local puis le serveur revalide la commande et décrémente les stocks si la création réussit. Une commande ne doit jamais être annoncée comme validée sans réponse positive du serveur. L'administration exige une connexion Supabase Auth et une entrée dans la table `atlas_admins`.

**Laboratoire local (`?lab=1`).** Le catalogue, les commandes et l'administration fonctionnent uniquement dans `localStorage`. Il ne nécessite pas de compte et permet de tout explorer sans toucher à PostgreSQL. Ce mode **n'est pas sécurisé** et ne doit jamais contenir de données réelles. Les modifications effectuées dans ce mode ne se retrouvent pas dans l'administration serveur.

## Activer le premier administrateur

1. Dans le projet [Supabase Atlas — Auth / Users](https://supabase.com/dashboard/project/bdcayckhcoejmmphivhp/auth/users), utilisez **Add user → Send invitation** avec votre adresse email personnelle, ou créez votre utilisateur de façon sécurisée depuis le tableau de bord. **Ne partagez jamais de mot de passe dans ce dépôt ni dans le chat.**
2. Après création, le propriétaire doit autoriser explicitement cet utilisateur dans `public.atlas_admins` en utilisant son UUID depuis Supabase (aucune promotion automatique des comptes inscrits).
3. Connectez-vous à `/admin.html` avec ce compte. Les autres utilisateurs authentifiés restent refusés par l'API.

L'invitation, la vérification des emails et les tests complets d'authentification restent à réaliser. Les notifications par email de commande requièrent aussi une configuration de fournisseur dédiée.

## Objectif produit

Boutique d'accessoires technologiques en FCFA, destinée à un commerçant pilote : boutique publique, catalogue administrable, variantes, photos, stocks, panier local, enregistrement sécurisé de commandes sans paiement en ligne, suivi par lien secret et tableau de bord privé. Il n'y a **ni paiement en ligne, ni confirmation de paiement fictive**.

## Technologies

- **Frontend** : HTML5 / CSS3 / JavaScript natif. Il conserve l'identité d'Atlas Store.
- **Serveur** : Supabase Edge Function `atlas-api` (Deno, sans framework serveur).
- **Base** : PostgreSQL Supabase, migrations SQL versionnées.
- **Authentification** : Supabase Auth pour les comptes administrateurs invités manuellement ; vérification de l'identité **et** de l'autorisation côté serveur.
- **Images** : Supabase Storage, bucket isolé `atlas-products`, JPG / PNG / WebP / AVIF, 5 Mo maximum.
- **Commande** : fonction SQL transactionnelle, prix calculés en entiers FCFA côté serveur, stock revalidé et décrémenté atomiquement, identifiant d'idempotence et lien de suivi à jeton expirant.
- **Notifications** : email Resend optionnel, enregistré en journal ; un échec ne supprime jamais une commande. Un bouton WhatsApp de contact peut être ajouté depuis les paramètres, sans annoncer l'envoi d'un message automatique.

## Dossiers importants

| Emplacement | Rôle |
| --- | --- |
| `index.html`, `css/style.css`, `js/app.js` | Vues publiques, accueil, catalogue, panier, checkout et suivi |
| `js/products.js` | Catalogue DEMO d'origine conservé hors connexion backend |
| `js/live-catalog.js` | Transformation des données API en objets attendus par l'interface |
| `js/api.js`, `js/config.js` | Appels serveur, login admin, clés **publiques seulement** |
| `js/cart.js`, `js/storage.js` | Panier et `localStorage`, validation locale conservée |
| `admin.html`, `css/admin.css`, `js/admin.js` | Interface privée administrateur (identité, catalogue, commandes, catégories, paramètres, images) |
| `supabase/migrations/` | Tables, contraintes, RLS, functions transactionnelles |
| `supabase/seed.sql`, `supabase/generate-seed.mjs` | Import reproductible des **16 produits fictifs initialement en brouillon** |
| `supabase/functions/atlas-api/` | API serveur, commandes et vérification admin |
| `docs/` | Architecture, données, déploiement, sécurité, opérations, pédagogie et résultats de test |

## Comportement serveur et données tests

`js/config.js` contient exclusivement l'URL du projet Supabase Atlas et sa **clé publique publishable**. La clé privilégiée du serveur ne se trouve pas dans GitHub ni dans le navigateur.

Le panier est local au navigateur ; lors du checkout, l'API recalcule les prix, valide la disponibilité et transmet l'opération à une fonction SQL transactionnelle. Les liens de suivi ont des jetons non prévisibles et une expiration. En cas d'échec réseau, aucune réussite de commande ne doit être annoncée.

Les 16 produits fictifs ont d'abord été importés en brouillon par `supabase/seed.sql`, puis **activés explicitement comme références [TEST]** dans la base Atlas créée le 23 novembre 2026. Cette activation est un choix pédagogique du propriétaire et n'est **pas** une preuve que les références et leurs stocks sont réels. Les images sont illustratives.

## Lancer localement

Pour consulter la démo : ouvrir `index.html` avec un serveur statique local (par exemple l'extension Live Server dans VS Code, sans compilation). Un navigateur bloquant `file://` pour les modules ES doit passer par un serveur statique.

Pour l'administration : `/admin.html` nécessite un utilisateur Supabase autorisé ; `/admin.html?lab=1` ouvre un laboratoire local sans identifiants.

Les tests de logique existants s'exécutent avec Node.js :

```bash
node tests/test_logic.mjs
node tests/test_render.mjs
node tests/test_upgrade.mjs
node tests/test_api_mock.mjs
node supabase/generate-seed.mjs
```

Ces tests ne remplacent pas les tests réels contre une base SQL et le navigateur. **La migration Supabase et l'API sont déployées, mais un parcours de commande complet via un vrai navigateur et un utilisateur administrateur n'a pas encore été vérifié.**

## Déploiement Vercel

Le projet Vercel Atlas existant utilise le dossier `KAINOVA-TRAINING/02-atlas-store` sur `main`. La publication du Projet 01 Nova Studio reste indépendante. Les secrets d'API restent dans Supabase, jamais dans `js/config.js`.

Pour la procédure complète : [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Pour les incidents : [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Limites et garde-fous

- **La base Atlas dédiée existe**, mais les 16 références actuellement publiées sont des articles de TEST, pas des articles commerciaux. L'utilisation réelle exige des produits exacts et des tests de bout en bout.
- Les photos de démonstration provenant de banques d'images ne prouvent pas l'existence du modèle, de sa marque ou de son stock.
- Aucune transaction de carte ni de mobile money ; les paiements sont hors ligne, statut initial `unpaid`.
- Aucun administrateur inscrit automatiquement. Un opérateur doit être invité par le propriétaire Supabase et explicitement autorisé.
- L'URL de suivi est privée, expire après 30 jours et ne remplace pas une authentification client générale.
- Le CSV exporté par l'administrateur contient des données personnelles : le conserver de manière sécurisée.
- Les validations juridiques, emails vérifiés, sauvegardes, frais de services et tests réels sont nécessaires avant de recevoir des commandes de vrais clients.

**Ce que l'utilisateur doit comprendre après ce projet** est détaillé dans [docs/LEARNING.md](docs/LEARNING.md), avec les endroits précis où chaque notion apparaît et des moyens de l'observer sans écrire de code.
