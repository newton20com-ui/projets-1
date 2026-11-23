-- ATLAS STORE / pilote indépendant. A exécuter uniquement sur un projet Supabase réservé à Atlas.
-- Migration additive, ne touche aucune table d'autres applications.
create extension if not exists pgcrypto;

create table if not exists public.atlas_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.atlas_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,64}$'),
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.atlas_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  name text not null check (char_length(name) between 2 and 180),
  subtitle text not null default '',
  description text not null default '',
  tagline text not null default '',
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features)='array'),
  keywords jsonb not null default '[]'::jsonb check (jsonb_typeof(keywords)='array'),
  base_price integer not null check (base_price between 0 and 100000000),
  category_id uuid not null references public.atlas_categories(id),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_demo boolean not null default false,
  featured boolean not null default false,
  badge text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.atlas_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.atlas_products(id) on delete cascade,
  sku text not null check (char_length(sku) between 1 and 80),
  label text not null check (char_length(label) between 1 and 120),
  color text,
  price_delta integer not null default 0,
  stock integer not null default 0 check (stock >= 0 and stock <= 1000000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id,sku)
);

create table if not exists public.atlas_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.atlas_products(id) on delete cascade,
  url text not null check (char_length(url) between 8 and 2000 and (url like 'https://%' or url like 'assets/images/%')),
  alt text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.atlas_settings (
  id integer primary key default 1 check (id=1),
  store_name text not null default 'Atlas Store',
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  notification_email text not null default '',
  city text not null default '',
  pickup_description text not null default '',
  pickup_enabled boolean not null default true,
  delivery_enabled boolean not null default false,
  delivery_fee integer not null default 0 check (delivery_fee between 0 and 10000000),
  legal_notice text not null default '',
  privacy_notice text not null default '',
  terms text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.atlas_settings (id) values (1) on conflict do nothing;

create table if not exists public.atlas_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  request_key uuid not null unique,
  payload_hash text not null,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  customer_contact text not null check (char_length(customer_contact) between 6 and 120),
  city text not null default '',
  address text not null default '',
  notes text not null default '',
  fulfillment text not null check (fulfillment in ('pickup','delivery')),
  subtotal integer not null check (subtotal>=0),
  delivery_fee integer not null check (delivery_fee>=0),
  total integer not null check (total>=0),
  currency text not null default 'XOF' check (currency='XOF'),
  status text not null default 'new' check (status in ('new','confirmed','preparing','ready','shipped','delivered','cancelled')),
  payment_method text not null default 'offline' check (payment_method='offline'),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists atlas_orders_created_at_idx on public.atlas_orders(created_at desc);
create index if not exists atlas_orders_status_idx on public.atlas_orders(status);

create table if not exists public.atlas_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.atlas_orders(id) on delete restrict,
  product_id uuid references public.atlas_products(id) on delete set null,
  variant_id uuid references public.atlas_variants(id) on delete set null,
  product_name text not null,
  product_slug text not null,
  variant_label text not null,
  variant_sku text not null,
  unit_price integer not null check (unit_price>=0),
  quantity integer not null check (quantity between 1 and 10),
  line_total integer not null check (line_total>=0),
  created_at timestamptz not null default now()
);
create index if not exists atlas_order_items_order_idx on public.atlas_order_items(order_id);

create table if not exists public.atlas_order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.atlas_orders(id) on delete restrict,
  from_status text,
  to_status text not null,
  actor_id uuid references auth.users(id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.atlas_tracking_tokens (
  order_id uuid primary key references public.atlas_orders(id) on delete cascade,
  token_hash text not null check (char_length(token_hash)=64),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.atlas_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.atlas_orders(id) on delete cascade,
  kind text not null default 'new_order',
  status text not null default 'pending' check (status in ('pending','sent','failed','unconfigured')),
  attempts integer not null default 0 check (attempts between 0 and 100),
  last_error text not null default '',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_id,kind)
);

create table if not exists public.atlas_rate_limits (
  key_hash text not null,
  window_start timestamptz not null,
  requests integer not null default 1,
  primary key(key_hash,window_start)
);

create table if not exists public.atlas_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Aucune des tables administratives ou privées n'est exposée aux visiteurs.
alter table public.atlas_admins enable row level security;
alter table public.atlas_categories enable row level security;
alter table public.atlas_products enable row level security;
alter table public.atlas_variants enable row level security;
alter table public.atlas_product_images enable row level security;
alter table public.atlas_settings enable row level security;
alter table public.atlas_orders enable row level security;
alter table public.atlas_order_items enable row level security;
alter table public.atlas_order_events enable row level security;
alter table public.atlas_tracking_tokens enable row level security;
alter table public.atlas_notifications enable row level security;
alter table public.atlas_rate_limits enable row level security;
alter table public.atlas_audit enable row level security;

-- Les tables sont interrogées depuis une Edge Function authentifiée côté serveur.
-- En particulier, aucune politique générale pour anon/authenticated n'autorise à voir les commandes.
revoke all on public.atlas_admins, public.atlas_categories, public.atlas_products,
  public.atlas_variants, public.atlas_product_images, public.atlas_settings,
  public.atlas_orders, public.atlas_order_items, public.atlas_order_events,
  public.atlas_tracking_tokens, public.atlas_notifications, public.atlas_rate_limits,
  public.atlas_audit from anon, authenticated;

-- L'authentification utilise auth.users mais pas de self-service d'inscription admin.
-- L'administrateur est ajouté à atlas_admins seulement par le propriétaire Supabase.

-- Bucket public lecture et authentification RLS pour écritures admin depuis le navigateur.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('atlas-products','atlas-products',true,5242880,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "atlas admin upload" on storage.objects for insert to authenticated
with check (bucket_id='atlas-products' and exists(select 1 from public.atlas_admins a where a.user_id=(select auth.uid())));
create policy "atlas admin delete" on storage.objects for delete to authenticated
using (bucket_id='atlas-products' and exists(select 1 from public.atlas_admins a where a.user_id=(select auth.uid())));
create policy "atlas admin list" on storage.objects for select to authenticated
using (bucket_id='atlas-products' and exists(select 1 from public.atlas_admins a where a.user_id=(select auth.uid())));
-- Le PostgREST Storage utilise les permissions du rôle authenticated pour vérifier le sous-requête.
grant select on public.atlas_admins to authenticated;
create policy "atlas admins read self" on public.atlas_admins for select to authenticated
using (user_id=(select auth.uid()));

-- Atomicité : limite par empreinte IP hachée côté serveur, sans IP brute stockée.
create or replace function public.atlas_limit_requests(p_hash text,p_limit integer default 10)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare used integer;
begin
  if p_hash is null or length(p_hash)<>64 or p_limit<1 or p_limit>100 then return false; end if;
  insert into public.atlas_rate_limits(key_hash,window_start,requests)
  values(p_hash,date_trunc('hour',now()),1)
  on conflict(key_hash,window_start) do update set requests=public.atlas_rate_limits.requests+1
  returning requests into used;
  return used<=p_limit;
end $$;

-- Transaction unique avec verrouillage des variantes et prix provenant de la base.
create or replace function public.atlas_place_order(
 p_payload jsonb, p_request_key uuid, p_token_hash text
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  o public.atlas_orders%rowtype;
  obj jsonb;
  v record;
  qty integer;
  sub integer:=0;
  fee integer:=0;
  chosen text;
  ph text;
  ref text;
  affected_rows integer;
  setting public.atlas_settings%rowtype;
  canonical jsonb;
begin
  if p_request_key is null or p_token_hash is null or length(p_token_hash)<>64 then raise exception 'Invalid request'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'Invalid payload'; end if;
  if jsonb_typeof(p_payload->'items')<>'array' or jsonb_array_length(p_payload->'items') not between 1 and 30 then raise exception 'Invalid items'; end if;
  if length(coalesce(p_payload->>'name','')) not between 2 and 120 or length(coalesce(p_payload->>'contact','')) not between 6 and 120 then raise exception 'Invalid contact'; end if;
  if length(coalesce(p_payload->>'notes',''))>1000 or length(coalesce(p_payload->>'city',''))>160 or length(coalesce(p_payload->>'address',''))>400 then raise exception 'Invalid fields'; end if;
  chosen:=p_payload->>'fulfillment';
  select * into setting from public.atlas_settings where id=1;
  if (chosen='pickup' and not setting.pickup_enabled) or (chosen='delivery' and not setting.delivery_enabled) or chosen not in ('pickup','delivery') then raise exception 'Fulfillment unavailable'; end if;
  if chosen='delivery' and (length(coalesce(p_payload->>'city',''))<2 or length(coalesce(p_payload->>'address',''))<4) then raise exception 'Delivery address required'; end if;
  if coalesce(p_payload->>'consent','false')<>'true' then raise exception 'Consent required'; end if;
  ph:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');
  select * into o from public.atlas_orders where request_key=p_request_key;
  if found then
    if o.payload_hash<>ph then raise exception 'Idempotency key already used'; end if;
    return jsonb_build_object('reference',o.reference,'total',o.total,'subtotal',o.subtotal,'deliveryFee',o.delivery_fee,'status',o.status,'existing',true);
  end if;

  -- Pour éviter les deadlocks, les lignes sont traitées dans un ordre stable.
  for obj in select x.value from jsonb_array_elements(p_payload->'items') x order by x.value->>'productId',x.value->>'variantId' loop
    if jsonb_typeof(obj)<>'object' or coalesce(obj->>'quantity','') !~ '^[0-9]{1,2}$' then raise exception 'Invalid quantity'; end if;
    qty := (obj->>'quantity')::integer;
    if qty not between 1 and 10 then raise exception 'Invalid quantity'; end if;
    select pr.id as product_id,pr.slug,pr.name,pr.base_price,vr.id as variant_id,vr.sku,vr.label,vr.price_delta,vr.stock
      into v from public.atlas_products pr
      join public.atlas_variants vr on vr.product_id=pr.id
      where pr.slug=(obj->>'productId') and vr.sku=(obj->>'variantId')
        and pr.status='published' and pr.is_demo=false and vr.active=true
      for update of vr;
    if not found then raise exception 'Product or variant unavailable'; end if;
    if v.stock<qty then raise exception 'Insufficient stock'; end if;
    if v.base_price+v.price_delta<0 then raise exception 'Invalid catalog price'; end if;
    sub := sub+(v.base_price+v.price_delta)*qty;
  end loop;
  if sub<0 or sub>1000000000 then raise exception 'Invalid subtotal'; end if;
  fee:=case when chosen='delivery' then setting.delivery_fee else 0 end;
  ref:='AT-'||to_char(now() at time zone 'UTC','YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,9));
  insert into public.atlas_orders(reference,request_key,payload_hash,customer_name,customer_contact,city,address,notes,fulfillment,subtotal,delivery_fee,total)
  values(ref,p_request_key,ph,trim(p_payload->>'name'),trim(p_payload->>'contact'),coalesce(p_payload->>'city',''),coalesce(p_payload->>'address',''),coalesce(p_payload->>'notes',''),chosen,sub,fee,sub+fee) returning * into o;

  for obj in select x.value from jsonb_array_elements(p_payload->'items') x order by x.value->>'productId',x.value->>'variantId' loop
    qty:=(obj->>'quantity')::integer;
    select pr.id as product_id,pr.slug,pr.name,pr.base_price,vr.id as variant_id,vr.sku,vr.label,vr.price_delta
      into v from public.atlas_products pr join public.atlas_variants vr on vr.product_id=pr.id
      where pr.slug=(obj->>'productId') and vr.sku=(obj->>'variantId');
    update public.atlas_variants set stock=stock-qty,updated_at=now() where id=v.variant_id and stock>=qty;
    get diagnostics affected_rows = row_count;
    if affected_rows<>1 then raise exception 'Stock conflict'; end if;
    insert into public.atlas_order_items(order_id,product_id,variant_id,product_name,product_slug,variant_label,variant_sku,unit_price,quantity,line_total)
    values(o.id,v.product_id,v.variant_id,v.name,v.slug,v.label,v.sku,v.base_price+v.price_delta,qty,(v.base_price+v.price_delta)*qty);
  end loop;
  insert into public.atlas_tracking_tokens(order_id,token_hash,expires_at) values(o.id,p_token_hash,now()+interval '30 days');
  insert into public.atlas_order_events(order_id,to_status,note) values(o.id,'new','Commande enregistrée');
  insert into public.atlas_notifications(order_id,status) values(o.id,'pending');
  return jsonb_build_object('reference',o.reference,'total',o.total,'subtotal',o.subtotal,'deliveryFee',fee,'status','new','existing',false);
end $$;

create or replace function public.atlas_set_order_status(p_order uuid,p_status text,p_actor uuid,p_note text default '')
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare o public.atlas_orders%rowtype; item record; valid boolean:=false;
begin
  if not exists(select 1 from public.atlas_admins where user_id=p_actor) then raise exception 'Not authorized'; end if;
  select * into o from public.atlas_orders where id=p_order for update;
  if not found then raise exception 'Order not found'; end if;
  valid := case o.status
    when 'new' then p_status in ('confirmed','cancelled')
    when 'confirmed' then p_status in ('preparing','cancelled')
    when 'preparing' then p_status in ('ready','shipped','cancelled')
    when 'ready' then p_status in ('delivered','cancelled')
    when 'shipped' then p_status in ('delivered','cancelled')
    else false end;
  if not valid then raise exception 'Invalid status transition'; end if;
  if p_status='cancelled' then
    for item in select variant_id,quantity from public.atlas_order_items where order_id=p_order loop
      if item.variant_id is not null then update public.atlas_variants set stock=stock+item.quantity,updated_at=now() where id=item.variant_id; end if;
    end loop;
  end if;
  update public.atlas_orders set status=p_status,updated_at=now() where id=p_order;
  insert into public.atlas_order_events(order_id,from_status,to_status,actor_id,note) values(p_order,o.status,p_status,p_actor,left(coalesce(p_note,''),500));
  insert into public.atlas_audit(actor_id,action,resource_type,resource_id,detail) values(p_actor,'status_change','order',p_order::text,jsonb_build_object('old',o.status,'new',p_status));
  return jsonb_build_object('reference',o.reference,'status',p_status);
end $$;

-- Les fonctions SECURITY DEFINER sont strictement réservées au serveur service_role.
revoke all on function public.atlas_limit_requests(text,integer) from public,anon,authenticated;
revoke all on function public.atlas_place_order(jsonb,uuid,text) from public,anon,authenticated;
revoke all on function public.atlas_set_order_status(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.atlas_limit_requests(text,integer) to service_role;
grant execute on function public.atlas_place_order(jsonb,uuid,text) to service_role;
grant execute on function public.atlas_set_order_status(uuid,text,uuid,text) to service_role;

-- Le compte propriétaire doit inviter l'admin via Supabase Auth puis l'ajouter à public.atlas_admins.

-- Enregistrement atomique d'un produit et de ses déclinaisons par l'API admin authentifiée.
create or replace function public.atlas_save_product(p_actor uuid,p_data jsonb)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare p_id uuid; c_id uuid; r jsonb; v_id uuid; item_count integer; images_count integer; is_new boolean;
begin
  if not exists(select 1 from public.atlas_admins where user_id=p_actor) then raise exception 'Not authorized'; end if;
  if p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'Invalid data'; end if;
  if coalesce(p_data->>'slug','') !~ '^[a-z0-9-]{2,80}$' then raise exception 'Invalid slug'; end if;
  if length(coalesce(p_data->>'name','')) not between 2 and 180 then raise exception 'Invalid name'; end if;
  if coalesce(p_data->>'basePrice','') !~ '^[0-9]{1,9}$' or (p_data->>'basePrice')::integer>100000000 then raise exception 'Invalid price'; end if;
  if jsonb_typeof(p_data->'variants')<>'array' or jsonb_array_length(p_data->'variants') not between 1 and 30 then raise exception 'Variants required'; end if;
  if jsonb_typeof(p_data->'images')<>'array' or jsonb_array_length(p_data->'images')>12 then raise exception 'Invalid images'; end if;
  if p_data->>'status' not in ('draft','published','archived') then raise exception 'Invalid status'; end if;
  select id into c_id from public.atlas_categories where slug=p_data->>'category';
  if c_id is null then raise exception 'Category missing'; end if;
  if p_data ? 'id' and coalesce(p_data->>'id','')<>'' then
    p_id:=(p_data->>'id')::uuid;
    if not exists(select 1 from public.atlas_products where id=p_id) then raise exception 'Product not found'; end if;
    is_new:=false;
  else
    p_id:=gen_random_uuid();is_new:=true;
  end if;
  insert into public.atlas_products(id,slug,name,subtitle,description,tagline,features,keywords,base_price,category_id,status,is_demo,featured,badge)
  values(p_id,p_data->>'slug',p_data->>'name',left(coalesce(p_data->>'subtitle',''),180),left(coalesce(p_data->>'description',''),4000),left(coalesce(p_data->>'tagline',''),200),
    case when jsonb_typeof(p_data->'features')='array' then p_data->'features' else '[]'::jsonb end,
    case when jsonb_typeof(p_data->'keywords')='array' then p_data->'keywords' else '[]'::jsonb end,
    (p_data->>'basePrice')::integer,c_id,p_data->>'status',coalesce((p_data->>'isDemo')::boolean,false),coalesce((p_data->>'featured')::boolean,false),left(coalesce(p_data->>'badge',''),70))
  on conflict (id) do update set slug=excluded.slug,name=excluded.name,subtitle=excluded.subtitle,description=excluded.description,
    tagline=excluded.tagline,features=excluded.features,keywords=excluded.keywords,base_price=excluded.base_price,
    category_id=excluded.category_id,status=excluded.status,is_demo=excluded.is_demo,featured=excluded.featured,badge=excluded.badge,updated_at=now();
  for r in select value from jsonb_array_elements(p_data->'variants') loop
    if coalesce(r->>'sku','') !~ '^[a-zA-Z0-9_-]{1,80}$' then raise exception 'Invalid SKU'; end if;
    if length(coalesce(r->>'label','')) not between 1 and 120 then raise exception 'Invalid variant label'; end if;
    if coalesce(r->>'stock','') !~ '^[0-9]{1,7}$' or (r->>'stock')::integer>1000000 then raise exception 'Invalid variant stock'; end if;
    if coalesce(r->>'priceDelta','0') !~ '^-?[0-9]{1,8}$' then raise exception 'Invalid supplement'; end if;
    if (p_data->>'basePrice')::integer + coalesce((r->>'priceDelta')::integer,0) < 0 then raise exception 'Negative item price'; end if;
    insert into public.atlas_variants(product_id,sku,label,color,stock,price_delta,active)
      values(p_id,r->>'sku',r->>'label',nullif(r->>'color',''),(r->>'stock')::integer,coalesce((r->>'priceDelta')::integer,0),coalesce((r->>'active')::boolean,true))
      on conflict(product_id,sku) do update set label=excluded.label,color=excluded.color,stock=excluded.stock,
      price_delta=excluded.price_delta,active=excluded.active,updated_at=now();
  end loop;
  update public.atlas_variants set active=false,updated_at=now() where product_id=p_id
    and not exists(select 1 from jsonb_array_elements(p_data->'variants') e where e->>'sku'=atlas_variants.sku);
  delete from public.atlas_product_images where product_id=p_id;
  for r in select value from jsonb_array_elements(p_data->'images') loop
    if length(coalesce(r->>'url','')) not between 8 and 2000 then raise exception 'Invalid image URL'; end if;
    insert into public.atlas_product_images(product_id,url,alt,sort_order)
      values(p_id,r->>'url',left(coalesce(r->>'alt',''),160),coalesce((r->>'sortOrder')::integer,0));
  end loop;
  insert into public.atlas_audit(actor_id,action,resource_type,resource_id,detail)
   values(p_actor,case when is_new then 'created' else 'updated' end,'product',p_id::text,jsonb_build_object('slug',p_data->>'slug'));
  return p_id;
end $$;
revoke all on function public.atlas_save_product(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.atlas_save_product(uuid,jsonb) to service_role;
