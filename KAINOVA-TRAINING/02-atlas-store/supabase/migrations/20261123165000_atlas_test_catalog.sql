-- Atlas Store / catalogue de test activé pour les essais de bout en bout.
-- Cette migration n'active pas de vraies ventes : les noms et descriptions portent
-- explicitement la mention TEST et les conditions précisent l'absence de livraison.
-- Ne s'applique qu'aux articles fictifs encore en brouillon sur une base neuve.
update public.atlas_products
set status='published',
    is_demo=false,
    name=case when name like '[TEST] %' then name else '[TEST] ' || name end,
    description='ARTICLE DE TEST — Référence fictive pour vérifier le catalogue, les stocks et les commandes. Aucune vente, livraison ni paiement réel. ' || description,
    badge='TEST',
    updated_at=now()
where is_demo=true and status='draft';

update public.atlas_settings
set store_name='Atlas Store — Laboratoire',
    pickup_enabled=true,
    pickup_description='Retrait fictif : aucune remise réelle de marchandise.',
    delivery_enabled=true,
    delivery_fee=1500,
    legal_notice='Application pédagogique Kainova Training — commandes de test uniquement. Aucun article réel proposé.',
    privacy_notice='Utilisez des coordonnées fictives pour tester les commandes. Ne saisissez pas de données personnelles réelles dans cette démonstration.',
    terms='Aucun paiement, aucune expédition ni vente commerciale. Les commandes enregistrées sont uniquement des essais techniques.',
    updated_at=now()
where id=1 and store_name='Atlas Store';
