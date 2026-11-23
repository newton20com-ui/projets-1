# Architecture — Atlas Store pilote

## Choix

**Conserver le frontend existant**, ajouter une API Supabase Edge Function et une base PostgreSQL distincte. Cela respecte l'objectif pédagogique et évite de refaire une interface déjà approuvée. Pas de Next.js ni de réarchitecture totale. Les pages sont statiques sur Vercel, les commandes sont contrôlées et enregistrées sur le serveur Supabase.

```
Navigateur (index.html, admin.html)
 ├─ catalogue, recherche, filtres et panier local
 ├─ URL publique + publishable key (js/config.js)
 ├─ Supabase Auth (login admin, récupération) — sessionStorage
 ├─ Supabase Storage (upload admin, RLS + contrôle MIME/5 Mo)
 └─ HTTPS → Supabase Edge Function /atlas-api
           ├─ GET /catalog : produits publiés non fictifs + paramètres publics
           ├─ POST /checkout : limitation anti-abus, validation, idempotence
           ├─ GET /tracking : jeton SHA256 + expiration
           └─ /admin/* : vérification JWT Auth + table des administrateurs
                         ↓
                      PostgreSQL
           ├─ produits, variantes, catégories, images, paramètres
           ├─ commandes + lignes avec instantané historique
           ├─ états et événements + audits
           ├─ tokens de suivi hachés + anti-abus
           └─ notifications email (outbox)
                         ↓
                 Resend (OPTIONNEL)
                 Email au commerçant
```

## Choix de confiance

Le navigateur peut proposer un prix et une quantité, mais le serveur ne fait jamais confiance à ses montants. L'API transmet au PostgreSQL uniquement les identifiants de produits/variantes, les quantités et les champs de livraison. Une **fonction SQL unique** verrouille les variantes, vérifie le catalogue et le stock, décrémente, enregistre les lignes et émet une référence. Si elle échoue, sa transaction est annulée.

L'administrateur possède un compte Supabase Auth. Sa possession d'un token ne suffit pas : l'Edge Function vérifie ensuite sa présence dans `atlas_admins`. Toutes les tables privées sont protégées par RLS et sans droit de lecture anonyme. L'Edge Function dispose seule de la clé `service_role`. Les fonctions PostgreSQL privilégiées n'ont pas de droit `EXECUTE` pour `anon`/`authenticated`.

## Stratégie des environnements

- `main` : contient désormais le code V2 et les ajouts pilotes dans **le même dossier Atlas** ; le fonctionnement commercial reste désactivé tant que Supabase Atlas n'est pas configuré.
- `feature/02-atlas-store-pilot` : code et configuration documentée.
- Supabase **Atlas indépendant** : projet nouveau (id et coût à confirmer par le propriétaire).
- Idéalement un second projet test Supabase ; si indisponible, utiliser des références fictives et commandes factices **dans le projet Atlas isolé**, nettoyer avant la mise en ligne commerciale. Ne pas utiliser la base d'une autre application.

## Limites / risques

- L'API Deno est un point central : il faut la déployer et paramétrer CORS.
- Les notifications par Resend ne fonctionnent que si l'expéditeur est vérifié et les clés sécurisées sont disponibles.
- Les données de panier localStorage ne sont pas synchronisées ; les prix peuvent changer entre sélection et commande. Le serveur est autoritaire.
- L'API catalogue récupère plusieurs tables séparément ; une modification admin pendant ces requêtes peut donner une vue temporairement incohérente. Le checkout serveur reste cohérent.
- La version pilote ne couvre pas les retours partiels, factures fiscales, comptabilité ou paiement en ligne.
