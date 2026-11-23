# Exploitation — Atlas Store pilote

## Routine d'un commerçant

1. Ouvrir `/admin.html`, saisir son email et son mot de passe d'administrateur **déjà invité**.
2. Vérifier les paramètres (coordonnées, retrait et livraison). L'activation de la livraison nécessite un montant de frais configuré et des modalités claires.
3. Créer un produit réel ; définir une catégorie, prix FCFA, variantes/SKU stables, stocks exacts et photo légitime. Le marquer **non fictif**, puis le publier.
4. Depuis la boutique publique, contrôler que les informations correspondent à la réalité et effectuer une commande de test.
5. Consulter l'onglet Commandes, vérifier adresse et moyens de contact, puis suivre `new → confirmed → preparing → ready/shipped → delivered`. Une commande annulée restaure le stock si les variantes existent encore.
6. Le mode de paiement initial est **à la remise**. La colonne `payment_status` est `unpaid` à l'enregistrement ; le commerçant ne doit pas présenter cela comme encaissé.
7. Le suivi client s'effectue avec l'URL secrète reçue lors de la commande. Cette URL expire après 30 jours.

## Gestion des photos

- Formats admis : JPG/PNG/WebP/AVIF, 5 Mo maximum. Recadrer/comprimer les photos avant upload pour économiser bande passante et stockage.
- L'import initial contient des photos d'illustration de produits fictifs. Remplacer par **des photos exactes avec droits d'usage** avant de commercialiser un modèle.
- L'interface peut retirer la référence à une image lors de la modification d'un produit. La suppression physique est une opération contrôlée et **ne doit être faite qu'après avoir vérifié que plus aucun produit n'utilise le fichier**. Nettoyer périodiquement les fichiers orphelins dans le bucket Atlas.

## Notifications

Les commandes existent même lorsque l'email échoue. Vérifier d'abord l'onglet Commandes ; les tentatives sont journalisées en base (`atlas_notifications`). Le bouton « Réessayer » relance une notification si les secrets et l'expéditeur sont configurés. Le lien WhatsApp (s'il est proposé) ouvre une conversation, sans affirmer qu'un message a été envoyé automatiquement.

## Sauvegarde et confidentialité

- Sauvegarder les commandes et le catalogue avec les outils prévus dans le plan Supabase utilisé. Les fonctionnalités de sauvegarde/restauration disponibles dépendent du niveau de service ; vérifier le contrat.
- Tester une restauration dans **un projet de test isolé** avant de supprimer des données réelles.
- Les commandes contiennent nom, contact et parfois adresse : limiter les accès, conserver aussi peu que nécessaire, supprimer/exporter selon une politique juridique adaptée.
- Un CSV de commandes exporté est un fichier personnel local : restreindre son accès, ne pas l'envoyer sur des canaux publics, le supprimer lorsqu'il n'est plus nécessaire.
- Avant ouverture au public, faire vérifier les mentions légales, la conservation des données et les conditions de vente.

## Incidents fréquents

| Symptôme | Vérifier | Action |
| --- | --- | --- |
| Catalogue vide | Produits non publiés, `is_demo`, catégorie masquée | Publier un vrai produit et activer la catégorie |
| Panne réseau | URL/clé publique, domaine autorisé, Edge logs | Restaurer configuration, ne jamais afficher de faux stocks |
| Accès admin refusé | Invitation Auth, présence UUID dans `atlas_admins`, session expirée | Vérifier permissions sans faire d'inscription admin publique |
| Commande refusée | Variante, stock, consentement, livraison configurée, anti-abus | Corriger les données, ne jamais forcer un prix navigateur |
| Email non reçu | Expéditeur Resend vérifié, clés dans Supabase, notifications table | Corriger puis relancer une notification, ne pas recréer la commande |
| Image cassée | URL, bucket, type et taille, politique Storage | Remplacer la photo ou utiliser le repli local |
| Liens suivi refusés | Token expiré ou altéré, secret changé | Contact administratif nécessaire, ne pas exposer l'accès général aux commandes |

## Récupération en cas d'incident

En cas de risque sur les données clients, bloquer le checkout avant investigation, retirer les secrets compromis, inspecter les logs sans exporter les données sensibles, restaurer depuis une sauvegarde **vérifiée**, et contrôler les états de commandes/stock avant reprise. La restauration complète en production n'a pas été testée dans cette conversation.


## Utilisation du laboratoire local

L'administration est accessible sans mot de passe **uniquement parce que la configuration Supabase est absente**. Ouvrir `/admin.html`, puis les onglets Produits, Catégories, Commandes et Paramètres. Tous les changements restent dans le localStorage du navigateur ; les commandes `AT-TEST-...` sont des essais, sans paiement réel ni email. Pour voir une commande créée sur le site public, utiliser **le même appareil et navigateur**, puis Actualiser dans l'administration. Le bouton Réinitialiser efface ce laboratoire local après confirmation. Utiliser exclusivement des identités fictives. Ne pas utiliser le laboratoire comme environnement commerçant.
