# Modèle de données — Atlas Store

Migration principale : `supabase/migrations/20261123133000_atlas_pilot.sql`.

## Catalogue

- `atlas_categories` : UUID, slug unique, nom, description, active, ordre.
- `atlas_products` : UUID, slug unique, titre, description, caractéristiques et mots clés JSON, prix de base **entier FCFA**, catégorie FK, état `draft/published/archived`, indicateur `is_demo` et vedette.
- `atlas_variants` : UUID stable, product_id FK, SKU unique par produit, label, couleur, supplément entier FCFA, stock >= 0, active. Une même variante ne peut pas exister deux fois pour un produit.
- `atlas_product_images` : UUID, produit, URL, texte alternatif, ordre de présentation.
- `atlas_settings` : ligne singleton id=1, contacts, coordonnées, livraison, retrait, frais et textes juridiques.
- `atlas_admins` : liste de contrôle des UUID `auth.users` autorisés.

## Commandes

- `atlas_orders` : UUID, référence unique, clé d'idempotence UUID unique, empreinte du contenu, nom/contact, coordonnées de remise, sous-total, frais, total, devise XOF, statut, mode de paiement offline et état de paiement `unpaid/paid`.
- `atlas_order_items` : lignes avec **instantané** des noms, slugs, variantes, quantité et prix unitaires. Les FK produit/variante peuvent devenir NULL sans détruire l'historique.
- `atlas_order_events` : changements de statut, date, acteur et remarque.
- `atlas_tracking_tokens` : empreinte SHA256 du jeton, expiration à 30 jours, jamais le jeton clair.
- `atlas_notifications` : statut/essais/erreur des emails, indépendamment de la commande.
- `atlas_rate_limits` : empreinte hachée côté serveur d'une source de requête, nombre par fenêtre horaire.
- `atlas_audit` : actions d'administration critiques avec horodatage.

## Transitions autorisées

`new → confirmed → preparing → ready/shipped → delivered` ; annulation possible depuis `new`, `confirmed`, `preparing`, `ready`, `shipped`. `delivered` et `cancelled` sont terminaux. L'annulation remet les quantités réservées aux variantes **une seule fois**, dans la même transaction que le changement d'état. Les produits archivés n'effacent pas les lignes de commandes.

## Concurrence et idempotence

- `atlas_place_order` verrouille les variantes (`FOR UPDATE`), vérifie disponibilité et statut non fictif, puis décrémente en base.
- `request_key` UUID unique : une requête répétée avec le **même contenu** renvoie la même référence ; si le contenu change pour la même clé, elle est refusée. Le jeton suivi est dérivé par HMAC côté serveur pour rester stable lors d'une nouvelle tentative.
- Un conflit concurrent sur le même identifiant peut aboutir à une erreur d'unicité sur le premier essai ; la nouvelle tentative permettra de récupérer la commande déjà enregistrée.
- Prix uniquement depuis les colonnes numériques en base. Les frais sont lus depuis `atlas_settings`.

## Règles de visibilité

Aucun `SELECT` anonyme sur les tables contenant des données client. Le serveur ne livre publiquement que les produits publiés, `is_demo=false` et les réglages non sensibles. L'URL de suivi privée permet de consulter un résumé sans exposer nom, téléphone ni adresse.
