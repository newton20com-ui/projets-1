# Rapport de tests — Atlas Store (évolution pilote)

**Date de rédaction : 23 novembre 2026.**

Ce document distingue les tests exécutés localement des tests d'intégration non encore vérifiés sur une interface réelle. **Le projet Supabase Atlas dédié est désormais créé ; les migrations, le seed et l'Edge Function ont été déployés.** L'existence de ces services ne prouve pas la réussite de tous les parcours. Aucun scénario « non exécuté » n'est considéré comme validé.

## Vérifications exécutées localement

| Contrôle | Résultat | Preuve / méthode |
| --- | --- | --- |
| Tests du catalogue/panier historiques | 28/28 réussis | `node tests/test_logic.mjs` |
| Tests des 8 vues dans un DOM simulé | 8/8 réussis | `node tests/test_render.mjs` |
| Validations des fichiers et invariants du pilote | 20/20 réussis (statiques) | `node tests/test_upgrade.mjs` |
| Test du contrat API avec services factices | 14/14 réussis (mocks, pas Supabase réel) | `node tests/test_api_mock.mjs` |
| Vérification TypeScript de la fonction Deno | Réussie avec déclarations locales minimales (ne valide pas Deno réel) | `tsc --noEmit --strict --target es2022 --module esnext --lib es2022,dom --skipLibCheck tests/deno-types.d.ts supabase/functions/atlas-api/index.ts` |
| Génération reproductible du seed fictif | Réalisée, 16 produits / 4 catégories | `node supabase/generate-seed.mjs` |
| Analyse statique HTML/JS | Voir sortie actuelle | `node --check js/*.js` (par fichiers) |

**Rendu navigateur à 360, 390, 768, 1440 px : NON EXÉCUTÉ.** L'environnement de test Chromium a bloqué l'URL locale avec `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Il faudra revérifier depuis un aperçu déployé réel.

## Tests d'acceptation nécessitant le backend

| Scénario du cahier des charges | État |
| --- | --- |
| 1. Non-admin refusé sur interface/API | Non exécuté contre Supabase réel |
| 2. Catégorie/produit/image/variantes créés puis publiés | Non exécuté contre Supabase réel |
| 3. Changement prix/stock visible côté public | Non exécuté |
| 4. Archivage sans casser commandes passées | Non exécuté |
| 5. Recherche, filtres et tri sur catalogue SQL | Les requêtes de base et les produits sont présents ; parcours complet navigateur non exécuté |
| 6. Variantes distinctes dans panier | Tests unitaires historiques réussis, pas encore connecté à la base |
| 7. Refus de montant falsifié, quantités invalides, stock insuffisant | Non exécuté contre SQL réel |
| 8. Commande enregistrée avec total serveur exact | Non exécuté |
| 9. Même commande soumise deux fois, sans doublon | Non exécuté |
| 10. Deux clients sur le dernier stock | Non exécuté |
| 11. Administration commandes, statuts et historique | Non exécuté |
| 12. Lien suivi inaccessible avec un token invalide | Non exécuté |
| 13. Notification échoue sans supprimer commande | Non exécuté |
| 14. Paiement hors ligne distingué de montant encaissé | Revues statiques seulement, pas de test SQL |
| 15. Sandbox paiement électronique | Hors périmètre, non activé |
| 16. Mobile, clavier, erreurs réseau, images | Non exécuté dans navigateur réel |
| 17. Migration, build, lint, déploiement reproductibles | Migration écrite mais pas appliquée à Supabase Atlas |

## État de livraison

- Branche isolée de développement : `feature/02-atlas-store-pilot`.
- Projet 01 inchangé.
- Migration PostgreSQL, import des 16 produits fictifs puis migration d'activation [TEST] **appliqués sur Supabase Atlas dédié**. API `atlas-api` déployée en mode JWT vérifié sur les routes administrateur. Les tests utilisateur Auth, commandes et photos ne sont pas encore exécutés de bout en bout.
- Checkout volontairement indisponible si `js/config.js` ne contient pas l'URL et la clé publique d'un projet Atlas dédié.
- Aucun utilisateur ni commande réelle créés.

## Blocages avant validation complète

1. Choisir explicitement l'organisation Supabase pour créer un **nouveau** projet Atlas, accepter tout coût éventuel.
2. Créer le projet séparé, appliquer la migration, vérifier les grants/RLS avec Security Advisor.
3. Configurer les secrets côté Supabase dans son interface sécurisée ; connecter uniquement les valeurs publiques au frontend.
4. Inviter l'administrateur et configurer les URLs de récupération, frais et contacts.
5. Exécuter l'intégralité des tests d'acceptation dans la base de test et une preview Vercel.
6. Faire valider les éléments juridiques, prix et stocks avant d'accueillir des commandes réelles.

**Conclusion : la version de travail est une implémentation candidate, pas une boutique pilote validée.**

## Mise à jour — laboratoire interactif local (23 novembre 2026)

- 23 tests unitaires spécifiques au laboratoire : produits initiaux, création de commande de test, suivi, jeton incorrect, décrément de stock, idempotence, quantités et stocks invalides, commandes visibles en administration, transitions, annulation et restitution de stock, catégories, création/modification/archivage de produit, paramètres, persistance et stockage corrompu — **23/23 réussis**, exécutés avec Node.js et stockage simulé.
- 11 tests de bout en bout **au niveau des modules API locaux** (catalogue → panier → commande → suivi → administration → annulation), avec stockage simulé : **11/11 réussis**.
- 3 vérifications du DOM simulé de l’administration (affichage du tableau de bord, catalogue initial, absence de faux login) : **3/3 réussies**.
- Tests historiques de logique du panier : **28/28 réussis**.
- Rendu DOM simulé des écrans : **8/8 réussis**.
- Contrôles statiques architecture pilote : **20/20 réussis**.
- API simulée avec fake services : **14/14 réussis**.
- Vérifications de syntaxe JavaScript : réalisées sur tous les modules.
- **Non validé** : parcours manuel sur Vercel, responsive via navigateur réel, authentification et transactions serveur Supabase, email et paiement réel.
- Statut : administration et commandes de TEST enregistrées localement ; aucune donnée client réelle ne doit être renseignée.


## Avancement réel de l'intégration (23/11/2026)

- Projet Supabase isolé : `bdcayckhcoejmmphivhp`, statut `ACTIVE_HEALTHY`.
- Migration SQL initiale et seed exécutés ; 16 articles [TEST] activés, 4 catégories, 31 variantes initiales.
- Edge Function `atlas-api` déployée, version 3, domaine Vercel Atlas autorisé côté CORS ; une correction du préflight OPTIONS a été apportée après observation d'erreurs 403 dans les journaux.
- Site connecté via URL et clé **publishable** ; absence de clé service-role dans le frontend.
- Invitation du premier compte administrateur et inscription dans `atlas_admins` **non effectuées**. Les autres comptes n'obtiennent aucune autorisation admin.
- Les paiements en ligne, notifications email transactionnelles et vrais tests d'achats commerciaux **ne sont pas activés**.
- Les tests serveur des commandes concurrentes, du suivi, des images et de l'authentification doivent être exécutés sur le site avec un administrateur autorisé. N'utilisez que des coordonnées fictives pour les commandes [TEST].
