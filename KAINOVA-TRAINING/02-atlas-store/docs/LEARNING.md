# Comprendre Atlas Store — apprendre le vibe coding sans écrire du code

Le but est de savoir **piloter** une IA qui développe, poser les bonnes questions, vérifier le résultat et prendre des décisions techniques. Le code existe pour être inspecté si nécessaire, **pas pour t'obliger à le recopier**.

## 1. Frontend et backend

Le **frontend** est ce que tu vois : produits, navigation, panier, formulaires. Le **backend** est le système qui vérifie et enregistre les actions importantes. Dans Atlas, `index.html` + `js/app.js` affichent les écrans ; l'Edge Function `supabase/functions/atlas-api/index.ts` fait le travail côté serveur.

**Observation sans coder :** modifier une quantité dans le panier change immédiatement le montant visible. Mais un produit n'est acheté que lorsque l'API accepte la commande. Débrancher Internet bloque le checkout : un écran qui s'affiche n'est pas une preuve d'enregistrement.

## 2. Requête HTTP et API

Une **requête HTTP** est un message envoyé par le navigateur. Une **API** est un ensemble d'adresses qui acceptent ces messages : `/catalog` pour lire les produits, `/checkout` pour enregistrer une commande, `/tracking` pour le suivi, `/admin/*` pour les employés autorisés.

**Où ?** `js/api.js` et `supabase/functions/atlas-api/index.ts`.

**À observer :** dans l'outil Développement du navigateur → Réseau / Network, clique « Préparer ma commande ». Tu verras une requête `POST /checkout`. Un `200` signifie seulement que cette requête a été acceptée ; il faut encore contrôler que la commande apparaît dans l'admin et en base.

## 3. Base de données et SQL

La **base de données** conserve les produits et les commandes même après fermeture du navigateur. **SQL** est le langage qui crée et interroge ses tables. Une table ressemble à un tableau structuré mais possède des contraintes : prix positif, identifiant unique, statut reconnu.

**Où ?** migration `supabase/migrations/20261123133000_atlas_pilot.sql`, tables `atlas_products`, `atlas_orders`, `atlas_order_items`.

**À observer :** après activation réelle du backend, ajouter un produit dans l'admin, recharger sur un autre navigateur et vérifier qu'il est encore là. Ne pas tester cette propriété avec le seul ancien panier local.

## 4. Modèle relationnel

Les tables sont reliées par des **clés étrangères** : un produit appartient à une catégorie, une variante appartient à un produit, une ligne appartient à une commande. Une commande conserve en plus une **copie du nom, de la variante et du prix** au moment où elle a été acceptée.

**Pourquoi ?** Si tu renommes le produit demain, la commande d'hier doit toujours montrer l'ancien intitulé payé ou promis. **À observer** : modifier le nom d'un produit après une commande de test ; vérifier que l'historique garde son instantané.

## 5. Migration

Une **migration** est un changement de structure documenté et versionné. Elle permet de retrouver les tables exactes attendues par une version du code. Une migration n'est pas le transfert automatique des paniers déjà enregistrés sur les téléphones.

**Où ?** `supabase/migrations/` et `supabase/seed.sql`.

**À observer :** inspecter dans Supabase les tables créées par la migration. Le seed crée les 16 produits fictifs en brouillon ; ils ne doivent pas être vendables sans remplacement et publication explicite.

## 6. Authentification vs autorisation

**Authentification** : « Qui es-tu ? » (email + mot de passe vérifiés par Supabase Auth). **Autorisation** : « As-tu le droit d'administrer Atlas ? » (ta présence dans `atlas_admins`, vérifiée côté serveur). Un compte Supabase valide n'est pas automatiquement administrateur.

**Où ?** `js/admin.js`, `js/api.js`, `requireAdmin()` dans l'Edge Function, table `atlas_admins`.

**À observer :** sans connexion, `/admin.html` ne montre que la connexion ; un utilisateur authentifié mais non ajouté à `atlas_admins` doit encore être refusé par l'API.

## 7. Stockage des images

Le **Stockage d'objets** (Supabase Storage) conserve les photos indépendamment de la base, qui contient leurs URL et légendes. L'image doit avoir des droits d'utilisation, la bonne taille et montrer le produit réel. Une icône SVG n'est pas une photo produit.

**Où ?** `uploadImage()` dans `js/api.js`, bucket `atlas-products`, table `atlas_product_images`.

**À observer :** importer une photo dans l'admin, enregistrer le produit, puis contrôler sur téléphone. Essayer de téléverser un fichier HTML ou trop gros : le système doit refuser.

## 8. Variables d'environnement et secrets

Certaines valeurs sont **publiques** : URL de l'API, clé Supabase *publishable*. D'autres sont **secrètes** : clé serveur `service_role`, clé d'envoi d'email et secrets HMAC. Les secrets ne sont pas dans GitHub, même privé.

**Où ?** `js/config.js` (public), `.env.example` (noms de variables vides), paramètres Secrets de Supabase (valeurs réelles).

**À observer :** lire les fichiers GitHub ; aucune clé serveur utilisable ne doit apparaître. Les secrets de production ne doivent pas être envoyés dans un message de chat.

## 9. Validation côté serveur

Le frontend empêche de sélectionner « -2 » comme quantité, mais un utilisateur peut modifier les données avec les outils de son navigateur. La **validation serveur** consiste à relire les produits, les prix, le stock et les frais dans la base avant d'accepter la commande.

**Où ?** `atlas_place_order()` dans la migration SQL. **À observer :** essayer de commander un article épuisé (avec une base de test) ; l'API doit refuser, même si le navigateur affiche un ancien stock.

## 10. Transactions et concurrence

Une **transaction** regroupe des opérations qui réussissent toutes ou échouent toutes. Ici : vérifier les stocks, retirer les quantités, créer la commande, enregistrer ses lignes et le lien de suivi. La **concurrence** signifie que deux clients peuvent agir en même temps ; le serveur verrouille les variantes pour éviter deux ventes du dernier exemplaire.

**Où ?** `atlas_place_order()` et les instructions `FOR UPDATE`.

**À observer :** lancer deux commandes de test concurrentes sur le dernier exemplaire. Une seule doit être acceptée. Le suivi stock doit rester cohérent.

## 11. Idempotence

Imagine que tu cliques deux fois ou que ta connexion coupe après la validation. L'**idempotence** permet de répéter la même demande sans créer deux commandes. Chaque tentative garde un identifiant stable et le serveur vérifie que les données associées n'ont pas changé.

**Où ?** `atlas-pending-order` dans `js/app.js`, `request_key` et `payload_hash` dans `atlas_orders`.

**À observer :** répéter la même demande côté serveur avec la même clé ; elle doit renvoyer la même référence. Pour des données différentes avec la même clé, l'API doit refuser.

## 12. Webhooks et preuve de paiement

Un **webhook** est un message serveur-à-serveur envoyé par un prestataire lorsqu'un événement survient (par exemple un paiement confirmé). Il peut être répété ; il doit être authentifié par signature et contrôlé avant de changer le statut d'un paiement.

**Dans Atlas :** aucun webhook de paiement n'est installé, car le mode prévu est **paiement hors ligne à la remise**. `payment_status='unpaid'` initialement. Un clic client, un écran de confirmation de commande ou un lien WhatsApp **ne sont pas une preuve de paiement**.

**À observer :** créer une commande de test : elle est enregistrée mais non payée. L'administrateur ne peut la marquer payée qu'en confirmant avoir effectivement reçu les fonds hors ligne.

## 13. Logs et notifications

Un **log** décrit ce qui s'est passé : erreur technique, changement de statut, tentative de notification. La commande doit exister même si un email échoue.

**Où ?** `atlas_notifications`, `atlas_order_events`, `atlas_audit`, logs Edge Function.

**À observer :** sans clé Resend, vérifier que la commande est toujours enregistrée et que la notification apparaît comme non configurée. Les données personnelles ne doivent pas être visibles dans des logs publics.

## 14. Sauvegarde et restauration

Une **sauvegarde** est une copie récupérable. Une **restauration** signifie remettre la base dans un état utilisable après une erreur. Le simple fait que les données soient dans le cloud ne prouve pas qu'une sauvegarde adaptée est disponible.

**À observer :** vérifier les options de sauvegarde du plan Supabase. Tester une restauration dans un environnement séparé avant de toucher à la production. Aucune restauration réelle n'a été vérifiée dans cet exercice au moment de la documentation.

## 15. Git, GitHub, CI/CD et Vercel

**Git** conserve les versions du code ; **GitHub** héberge le dépôt et ses branches ; **CI/CD** automatise tests et déploiements ; **Vercel** héberge ici les pages HTML/CSS/JS, tandis que Supabase héberge le serveur et la base.

**Où ?** `KAINOVA-TRAINING/02-atlas-store` dans le dépôt commun, branche `feature/02-atlas-store-pilot`, Vercel root directory spécifique.

**À observer :** ouvrir le projet Vercel Atlas et Nova Studio : leurs adresses et déploiements doivent être indépendants. Une modification dans Atlas ne doit pas supprimer un fichier de Nova Studio.

## 16. Coûts des services

Une architecture full-stack peut avoir des coûts de base de données, stockage, trafic, email et déploiements. Le coût peut changer avec le plan et l'usage ; **ne jamais supposer qu'une opération de création de projet ou d'email est gratuite**. Le propriétaire doit voir le coût annoncé et approuver toute charge nouvelle.

**À observer :** tableaux de bord Supabase et Vercel (usage et facturation). L'organisation Supabase doit être choisie avant la création d'un projet Atlas indépendant.

## 17. Diagnostic d'incident

Face à un bug, ne pas simplement demander « refais tout ». Suivre la chaîne : **interface → réseau → réponse API → logs serveur → base de données**. Vérifier le message exact, la fréquence, l'environnement et l'impact. Ne modifier aucune donnée réelle sans sauvegarde.

**À observer :** rendre l'API volontairement inaccessible sur une prévisualisation ; le site doit afficher une erreur réseau au lieu d'inventer un stock disponible.

---

## Glossaire court

- **API** : interface d'échanges entre logiciels.
- **Endpoint** : adresse précise d'une fonctionnalité de l'API.
- **Frontend** : partie visible et interactive.
- **Backend** : partie serveur de traitement et de contrôle.
- **SQL** : langage de la base relationnelle.
- **RLS** : règles de visibilité et d'accès aux lignes de la base.
- **JWT** : jeton d'authentification signé.
- **CRUD** : créer, consulter, modifier, supprimer.
- **Stockage d'objets** : service pour fichiers, photos et documents.
- **Migration** : modification versionnée du schéma.
- **Idempotence** : éviter les doublons quand une requête est répétée.
- **HMAC** : calcul cryptographique d'un jeton avec une clé secrète.
- **Webhook** : notification technique entre serveurs.
- **CI/CD** : automatisation de vérification et de livraison.
- **Rollback** : retour contrôlé à une version précédente.

## Questions de compréhension et réponses

1. **Le panier contient « 15 000 FCFA », cela prouve-t-il qu'une commande a été payée ?** Non. C'est un affichage de montant indicatif, pas une preuve de transaction.
2. **Qui décide du prix final ?** La fonction SQL côté serveur, à partir des prix numériques en base.
3. **Pourquoi deux variantes possèdent-elles des identifiants différents ?** Pour distinguer leurs prix, stocks et lignes de commandes.
4. **Est-ce qu'un compte Supabase quelconque peut ouvrir le tableau de bord ?** Non, il doit aussi être dans `atlas_admins`.
5. **Pourquoi garder une copie du prix dans `atlas_order_items` ?** Pour préserver l'historique lorsque le prix catalogue change.
6. **Qu'arrive-t-il après une panne d'email ?** La commande reste enregistrée ; la notification est journalisée comme échec/non configurée.
7. **Le lien de suivi est-il public ?** Non, il contient un jeton secret temporaire ; ne pas le partager.
8. **Le bouton WhatsApp envoie-t-il automatiquement un message ?** Non : une ouverture de conversation et un envoi automatique sont deux opérations différentes.
9. **Pourquoi développer sur une branche séparée ?** Pour que la version déployée et validée reste utilisable pendant les tests de l'évolution.
10. **Quand peut-on dire que le pilote est opérationnel ?** Quand base, Auth, commandes, stock, sécurité, parcours mobile et déploiement ont été testés avec succès sur une instance dédiée et que les conditions d'exploitation ont été vérifiées.


## Une expérience observable avant le backend : le laboratoire local

Atlas Store propose un mode laboratoire lorsque `js/config.js` n'est pas configuré. Les fonctions de `js/lab-store.js` reçoivent les événements depuis `js/api.js` et enregistrent les changements dans `localStorage`. Tu peux observer les commandes de test dans `/admin.html` puis comparer les stocks après achat et annulation. Cela permet de comprendre le flux UI → événements → données locales, **mais n'est pas une vraie API**. Le backend Supabase réel appliquera séparément les permissions, les calculs et les transactions SQL.
