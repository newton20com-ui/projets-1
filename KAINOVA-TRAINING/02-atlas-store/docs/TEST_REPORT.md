# Rapport de tests — Atlas Store (évolution pilote)

**Date de rédaction : 23 novembre 2026.**

Ce document distingue explicitement les tests exécutés sur les fichiers locaux des scénarios nécessitant une base et un déploiement qui ne sont **pas encore configurés**. Aucun scénario marqué « non exécuté » n'est considéré comme validé.

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
| 5. Recherche, filtres et tri sur catalogue SQL | Non exécuté (les tests historiques couvrent les données locales) |
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

- Code du pilote intégré sur `main` dans le dossier `KAINOVA-TRAINING/02-atlas-store/` ; l'API et le backend ne sont pas activés.
- Projet 01 inchangé.
- Migration PostgreSQL, programme d'import et API créés **mais non déployés** sur un Supabase Atlas.
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
