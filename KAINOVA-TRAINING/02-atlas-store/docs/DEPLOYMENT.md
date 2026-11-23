# Déploiement — projet Atlas indépendant

**Statut** : guide, pas compte-rendu d'un déploiement réalisé. Le 23/11/2026, aucun nouveau Supabase Atlas ni secrets n'a été configuré dans cette conversation. Ne pas modifier la base Supabase d'un autre produit ni le déploiement Vercel Nova Studio.

## 1. Branche Git et hébergement

- Dépôt : `newton20com-ui/projets-1`, **ne travailler que dans** `KAINOVA-TRAINING/02-atlas-store/`.
- Branche de préparation : `feature/02-atlas-store-pilot`. `main` reste la démonstration validée.
- Vercel : projet **Atlas Store** existant ou nouvel import distinct du Projet 01, `Root Directory=KAINOVA-TRAINING/02-atlas-store`, preset Other, framework sans compilation, output directory par défaut.
- Tester d'abord sur un déploiement de **preview de branche** ; ne fusionner sur `main` qu'après l'acceptation réelle.

## 2. Créer un projet Supabase ATLAS indépendant

Le propriétaire doit choisir son organisation Supabase et confirmer les coûts avant la création (un compte peut utiliser plusieurs organisations et chaque organisation peut avoir des coûts différents). On ne réutilise jamais le projet nommé « Alibaba- » sans demande explicite.

Supabase Atlas comprend : PostgreSQL, Auth, Storage, Edge Functions. Une fois le projet créé, inspecter la région, la disponibilité et le tarif. Conserver l'ID du projet dans le registre privé, pas dans les secrets du dépôt.

## 3. Appliquer le schéma et les données

1. Vérifier l'accès exclusif au projet **Atlas** (pas un autre projet).
2. Sauvegarder son état si des données existent.
3. Appliquer `supabase/migrations/20261123133000_atlas_pilot.sql` **sur Atlas uniquement** via Supabase CLI / SQL Editor / MCP selon autorisations ; vérifier tables, RLS, grants, fonction de commande et bucket.
4. Lancer les vérifications Supabase Security Advisor et corriger toute alerte grave.
5. Exécuter `supabase/seed.sql` pour importer 16 **produits fictifs non publiés**. Le script source `supabase/generate-seed.mjs` permet de le régénérer ; l'import n'écrase pas les références préexistantes.
6. Inviter un premier utilisateur via Supabase Auth / Users, **sans publier son mot de passe**, puis l'autoriser administrateur en insérant son UUID dans `public.atlas_admins` depuis une session privilégiée Supabase. Ne pas implémenter de création d'administrateur publique.

## 4. Déployer l'API

- Fonction : `supabase/functions/atlas-api/index.ts`, nom `atlas-api`.
- **`verify_jwt=false`** parce que les endpoints catalogue/checkout sont publics et la fonction vérifie explicitement les JWT sur les routes `/admin/*`. Ne jamais ôter cette vérification manuelle.
- Supabase injecte normalement `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` côté **Edge**, jamais côté navigateur.
- Dans les paramètres de secrets **du projet Atlas uniquement**, configurer :

| Variable | Usage |
| --- | --- |
| `ATLAS_ALLOWED_ORIGINS` | URL exacte du Vercel Preview + URL finale, séparées par des virgules, sans `*` |
| `ATLAS_TRACKING_SECRET` | chaîne aléatoire secrète >= 32 octets, HMAC du lien suivi |
| `ATLAS_RATE_SECRET` | secret indépendant >= 32 octets, hachage des empreintes anti-abus |
| `ATLAS_RESEND_API_KEY` | optionnel, clé Resend transactionnelle, **jamais dans Git** |
| `ATLAS_EMAIL_FROM` | optionnel, expéditeur de domaine vérifié |
| `ATLAS_NOTIFICATION_TO` | optionnel, adresse commerçant pour notifications |

Configurer un secret de récupération/adaptation à long terme dans un coffre privé, sans l'exposer dans le chat. Changer `ATLAS_TRACKING_SECRET` invalide les anciens liens de suivi ; prévoir cette opération.

## 5. Relier le frontend

Dans `js/config.js`, renseigner **uniquement** l'URL Supabase publique (`https://<ref>.supabase.co`) et une clé publishable `sb_publishable_*`. Cette clé est conçue pour le navigateur ; la clé service-role ne doit jamais être insérée dans le code public.

Le frontend fonctionne sans ces valeurs en mode démonstration. Il refuse une vente fictive. Avec elles, le catalogue est chargé depuis l'API ; une erreur réseau n'entraîne pas l'affichage trompeur d'un stock démo.

Dans Supabase Auth / URL Configuration, enregistrer l'URL de l'admin `/admin.html` comme destination de récupération de mot de passe. Vérifier le domaine et le parcours de récupération.

## 6. Tests de préproduction obligatoires

- Appeler le health endpoint et l'API catalogue, vérifier CORS.
- Accéder à `/admin.html` sans session : aucune donnée privée ; tester login valide et compte non administrateur.
- Tester création, modification, masquage, publication, stock, images, variantes, panier et checkout serveur.
- Vérifier calculs et répartition des prix/quantités en PostgreSQL, deux commandes concurrentes sur le dernier exemplaire, double soumission et échec de notification.
- Tester le token de suivi aléatoire et expiré.
- Vérifier responsive à 360/390/768/1440 px et clavier.
- Réaliser une commande **de test** sans encaisser de paiement, puis la supprimer/archiver selon procédure avant exploitation.
- Ajouter des mentions de confidentialité et conditions de vente vérifiées pour le contexte commercial réel.

Consigner les preuves dans `docs/TEST_REPORT.md`. **Pas de fusion en `main` tant que les principaux scénarios ne passent pas réellement.**

## 7. Retour arrière

Si la nouvelle UI provoque un problème, restaurer le commit précédent du **seul dossier Atlas** sur `main` et redéployer le projet Vercel Atlas. Les tables SQL, commandes et photographies uploadées doivent rester intactes ; ne pas tenter de rétrograder la base en production sans sauvegarde et migration de retour validée. Désactiver provisoirement la fonction de commande (ou retirer l'origine autorisée) en cas d'incident de sécurité.
