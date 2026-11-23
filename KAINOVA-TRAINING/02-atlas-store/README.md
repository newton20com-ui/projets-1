# Atlas Store — Kainova Training / Projet 02

**Évolution pilote en préparation, distincte de la démonstration V2 déjà publiée.** Ce dossier contient le frontend original (conservé), des interfaces de commande et d'administration, une API Supabase Edge Function, des migrations PostgreSQL, des tests et une documentation d'exploitation.

**État au 23 novembre 2026 :** code préparé sur la branche `feature/02-atlas-store-pilot`. **Aucune base Atlas indépendante n'a encore été créée ou migrée ; aucune commande réelle n'a été enregistrée ou testée.** L'existence du code ne signifie pas que la boutique est opérationnelle. La branche `main` reste le site démonstratif actuellement déployé. N'activez pas le checkout auprès de clients avant tous les tests de `docs/TEST_REPORT.md`.


## Mode laboratoire utilisable immédiatement (sans Supabase)

**Administration accessible** : ouvrez `/admin.html` sur le site Atlas Store (lien « Administration » dans la navigation). Aucune connexion n'est demandée **en laboratoire**. C'est volontaire : il ne s'agit PAS d'un espace privé sécurisé, et aucun changement n'affecte les autres visiteurs ou appareils.

Le laboratoire est maintenant **interactif et persistant dans ce navigateur** :

1. Ouvrez l'administration, onglet **Produits** : créez ou modifiez un article, son prix, ses images, ses variantes et ses stocks ; archivez-le ou publiez-le en test.
2. Modifiez **Catégories** et **Paramètres** (options de retrait/livraison et frais de livraison de test).
3. Ouvrez la **Boutique**, ajoutez un produit disponible au panier, sélectionnez ses variantes, affichez le récapitulatif et cliquez **Passer une commande de test**.
4. Utilisez un **nom et un contact fictifs** (ex. « Client Test », « 000000000 »). La commande est enregistrée dans le localStorage de **ce même navigateur**, avec une référence `AT-TEST-...` et un lien de suivi local.
5. Retournez sur `/admin.html` (même navigateur et même domaine) → **Commandes** : consultez les lignes, modifiez l'état, ajoutez des notes et exportez un CSV. L'annulation restaure le stock local.
6. Depuis le tableau de bord, le bouton **Réinitialiser toutes les données de test** efface les essais locaux après confirmation.

### Limites impératives du laboratoire

- Ce n'est **pas** une boutique commerciale opérationnelle. Ni authentification, ni base de données distante, ni emails transactionnels, ni paiement, ni commandes reçues par un serveur.
- Les valeurs modifiées, produits ajoutés, images téléversées et informations des commandes sont stockés **dans le navigateur** ; ils ne se synchronisent pas entre appareils, et disparaîtront si l'on supprime les données du site. Certaines navigations privées bloquent le stockage.
- Comme l'administration de test est librement accessible à tous, **n'y saisissez jamais de vraie donnée client ou de données confidentielles**. Les produits initiaux sont fictifs et les photos indicatives.
- Les prix et stocks sont recalculés dans le code local, ce qui suffit à apprendre/tester le parcours, mais **ne protège pas contre la manipulation du navigateur ou les commandes concurrentes de plusieurs appareils**.
- Les vrais comptes administrateurs, commandes commerciales, emails, sauvegardes centralisées et contrôles serveur exigent un **projet Supabase Atlas dédié** configuré et testé. Il est volontairement absent ; les valeurs publiques `js/config.js` restent vides.
- Dès qu'un backend réel sera configuré, la boutique passera au mode serveur : l'administration demandera une authentification et seules les références réellement publiées pourront être commandées.

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
| `supabase/seed.sql`, `supabase/generate-seed.mjs` | Import reproductible des **16 produits fictifs en brouillon** |
| `supabase/functions/atlas-api/` | API serveur, commandes et vérification admin |
| `docs/` | Architecture, données, déploiement, sécurité, opérations, pédagogie et résultats de test |

## Mode démonstration / mode connecté

`js/config.js` contient deux champs publics vides par défaut. Tant qu'ils restent vides, l'ancien catalogue fictif fonctionne localement ; **aucune commande ne peut être transmise au serveur**. Si un projet Supabase Atlas dédié est configuré, le frontend charge le catalogue via l'API. **En cas de panne réseau, il n'affiche pas les faux stocks de démo comme si les commandes étaient réelles.**

Le panier reste dans le navigateur. Après chargement du catalogue live, il est revalidé contre les produits et variantes disponibles et les anciennes entrées incompatibles sont éliminées. Il n'y a pas de migration automatique des données personnelles d'un appareil à un autre.

Les **16 produits de démonstration** sont importés comme `draft` et `is_demo=true`. Une vraie boutique pilote doit créer ou vérifier des références authentiques et les publier avec `is_demo=false`. Seuls les produits publiés et non fictifs peuvent être commandés.

## Lancer localement

Pour consulter la démo : ouvrir `index.html` avec un serveur statique local (par exemple l'extension Live Server dans VS Code, sans compilation). Un navigateur bloquant `file://` pour les modules ES doit passer par un serveur statique.

Pour l'administration : `/admin.html` sur le domaine du projet, **après** la configuration Supabase et l'invitation d'un compte autorisé.

Les tests de logique existants s'exécutent avec Node.js :

```bash
node tests/test_logic.mjs
node tests/test_render.mjs
node tests/test_upgrade.mjs
node tests/test_api_mock.mjs
node supabase/generate-seed.mjs
```

Ces tests ne remplacent pas les tests réels contre une base SQL et le navigateur. **Aucune transaction réelle n'a été testée tant que Supabase Atlas reste non configuré.**

## Déploiement Vercel

Un **nouveau projet Vercel** doit pointer sur le sous-dossier `KAINOVA-TRAINING/02-atlas-store` du dépôt commun, framework `Other`, sans commande de compilation. Ne jamais remplacer le projet Vercel Nova Studio. La branche stable `main` ne doit être mise à jour qu'après la validation de la branche de travail et de la base Atlas. Les secrets API restent dans Supabase, jamais dans `js/config.js`.

Pour la procédure complète : [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Pour les incidents : [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Limites et garde-fous

- **Sans base Atlas dédiée, tout le frontend reste un exercice**, pas une boutique recevant des commandes.
- Les photos de démonstration provenant de banques d'images ne prouvent pas l'existence du modèle, de sa marque ou de son stock.
- Aucune transaction de carte ni de mobile money ; les paiements sont hors ligne, statut initial `unpaid`.
- Aucun administrateur inscrit automatiquement. Un opérateur doit être invité par le propriétaire Supabase et explicitement autorisé.
- L'URL de suivi est privée, expire après 30 jours et ne remplace pas une authentification client générale.
- Le CSV exporté par l'administrateur contient des données personnelles : le conserver de manière sécurisée.
- Les validations juridiques, emails vérifiés, sauvegardes, frais de services et tests réels sont nécessaires avant de recevoir des commandes de vrais clients.

**Ce que l'utilisateur doit comprendre après ce projet** est détaillé dans [docs/LEARNING.md](docs/LEARNING.md), avec les endroits précis où chaque notion apparaît et des moyens de l'observer sans écrire de code.
