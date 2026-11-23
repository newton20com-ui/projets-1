# Sécurité — Atlas Store pilote

Ce document est un **modèle de menace**, pas une attestation de conformité. Le backend n'a pas été déployé sur une base Atlas dédiée au moment de sa rédaction.

## Frontières de confiance

1. **Navigateur non fiable** : quantités, prix, commentaires, localStorage, identifiants et URL peuvent être modifiés.
2. **Edge Function** : seule couche autorisée à orchestrer commandes, traitement et contrôles admin. Elle possède la clé service-role côté serveur uniquement.
3. **Base SQL** : les fonctions RPC effectuent les opérations financières et de stock dans une transaction atomique.
4. **Storage** : lecture publique pour les produits, écriture admin via token utilisateur et RLS ; MIME et taille limités.
5. **Notifications** : fournisseur externe conditionnel ; une erreur ne supprime pas la commande.

## Contrôles prévus

| Risque | Mesure mise dans le code | Vérification requise |
| --- | --- | --- |
| Un visiteur modifie le prix/stock | `atlas_place_order` ignore les montants transmis et relit/Verrouille les variantes | Test prix falsifié, faible stock, deux commandes concurrentes |
| Lecture horizontale des commandes | RLS par défaut sans policy anon, Edge filtre admin par UUID, suivi par empreinte et expiration | Tester clients non autorisés, jeton aléatoire et expiré |
| Faux compte admin | Invitation Auth + `atlas_admins` (pas de self service) | Tester compte authentifié non autorisé |
| Double commande | UUID idempotence + hash JSONB + contrainte unique | Répéter requête identique puis modifiée |
| Abus de commande | Hash d'IP avec secret et limite par fenêtre via SQL RPC | Tester limite et nettoyage des lignes anciennes |
| Injection HTML | Toute donnée HTML affichée après `escapeHtml` / `esc`, pas de code utilisateur exécuté | Tester noms, notes, images et chemins malformés |
| Divulgation de secrets | Clé `service_role` côté Edge et `.env.example` vide ; pub key seule côté navigateur | Scanner le dépôt et les bundles déployés |
| Fichier dangereux | Bucket limité aux images et à 5 Mo, nom UUID, politique Storage admin | Tester SVG, HTML, fichier trop gros, utilisateur non admin |
| Mauvaise origine | `ATLAS_ALLOWED_ORIGINS` explicite pour accès navigateur | Tester origine non prévue et préflight |
| Perte de commandes en panne email | Commande commitée en SQL avant notification, journal d'échec | Couper fournisseur email et vérifier commande conservée |
| Fuite CSV | Échappement des cellules déclenchant des formules, accès export admin | Tester contenu `=SUM(...)`, gérer le fichier privé |

## Permissions de données

Les tables du schéma `public` Atlas activent RLS. Les permissions `anon/authenticated` sont retirées, à l'exception de la lecture par l'utilisateur lui-même de la table d'autorisation `atlas_admins` pour le contrôle des uploads Storage. Les fonctions privilégiées `atlas_place_order`, `atlas_limit_requests`, `atlas_save_product`, `atlas_set_order_status` ont leurs droits `EXECUTE` retirés à `PUBLIC`, `anon` et `authenticated`. La fonction Edge se charge des vérifications avant utilisation avec `service_role`.

**Point de vigilance** : une fonction `SECURITY DEFINER` créée dans un schéma exposé exige une revue particulièrement stricte des GRANTs, du `search_path`, du paramétrage des arguments et des logs ; lancer le Security Advisor de Supabase. La signature d'une transaction ne dépend jamais du retour navigateur.

## Risques résiduels / avant commercialisation

- Le même endpoint public de commande peut recevoir des abus distribués ; la limitation par IP hachée n'est qu'une première ligne de défense. Ajouter une solution anti-bot appropriée avant un trafic important.
- `sessionStorage` contient le token admin pendant la session : une faille XSS sur l'origine du site pourrait le voler. Ajouter une politique CSP stricte adaptée après contrôle de tous les scripts et styles et privilégier des sessions courtes.
- Le lien de suivi autorise son porteur ; sa transmission involontaire à un tiers donne accès au statut, sans données client. Ne jamais le journaliser côté serveur et utiliser `Referrer-Policy: no-referrer`.
- Les opérations de catalogue sont sécurisées par la validation admin Edge + RPC SQL. Les actions administrateur sur les paramètres et catégories ne sont pas toutes transactionnelles entre plusieurs tables. Conserver des audits.
- Ne pas enregistrer dans des logs publics les noms, téléphones, adresses ni tokens de suivi ; la politique de conservation des journaux est à définir.
- La conformité aux exigences juridiques locales (vente, confidentialité, données personnelles) n'a pas été validée.
- Les sauvegardes, récupérations de compte, CORS réels, protection CSRF selon architecture et politique d'accès doivent être vérifiés sur l'infrastructure finale.
