/**
 * Atlas Store — laboratoire de test (sans serveur).
 * Toutes les opérations ci-dessous modifient uniquement le localStorage du navigateur.
 * Cette couche ne constitue ni une authentification ni une boutique commerciale.
 */
import { PRODUCTS as SAMPLES, CATEGORIES as SAMPLE_CATEGORIES } from './products.js';
const STORAGE_KEY = 'atlas-store-lab-v1';
let memoryState = null;
let persistenceError = '';
const now = () => new Date().toISOString();
const clone = x => JSON.parse(JSON.stringify(x));
const fail = message => { throw new Error(message); };
const integer = (value, min = 0, max = 100000000) => Number.isSafeInteger(value) && value >= min && value <= max;
const text = (s, max = 200) => String(s ?? '').trim().slice(0, max);
const uuid = () => globalThis.crypto?.randomUUID?.() || `test-${Math.random().toString(36).slice(2)}-${Date.now()}`;
const defaults = () => ({
  version: 1,
  categories: SAMPLE_CATEGORIES.map((c, order) => ({id: c.id, slug:c.id, label:c.label, description:c.description, active:true, order})),
  products: SAMPLES.map(p => ({
    id:p.id,slug:p.id,name:p.name,sub:p.sub||'',tagline:p.tagline||'',description:p.description||'',
    features:p.features||[],keywords:p.keywords||[],category:p.category,price:p.price,badge:p.badge||'',
    featured:!!p.featured,status:'published',isDemo:true,createdAt:now(),
    images:p.images.map((url,i)=>({url,alt:`${i?'Visuel conceptuel':'Photo indicative'} de ${p.name}`,sortOrder:i})),
    variants:p.variants.map(v=>({id:v.id,sku:v.id,name:v.name,color:v.color||'#bbbbbb',stock:v.stock,extraPrice:v.extraPrice||0,active:true}))
  })),
  orders:[],
  settings:{storeName:'Atlas Store — laboratoire', phone:'',whatsapp:'',email:'',notificationEmail:'',city:'',
    pickupDescription:'Retrait fictif pour test sur cet appareil',pickupEnabled:true,deliveryEnabled:true,
    deliveryFee:1500,legalNotice:'Boutique de test pédagogique, aucune vente réelle.',
    privacyNotice:'Utilise exclusivement des informations fictives : les essais sont sauvegardés dans ton navigateur.',
    terms:'Toutes les commandes effectuées dans ce laboratoire sont des essais locaux.'}
});
function validState(x) {
  return x && x.version === 1 && Array.isArray(x.categories) && Array.isArray(x.products) && Array.isArray(x.orders) && x.settings && typeof x.settings === 'object';
}
export function readLab() {
  if (memoryState) return clone(memoryState);
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value) {
      const loaded = JSON.parse(value);
      if(validState(loaded)) {memoryState=loaded;return clone(loaded)}
      persistenceError = 'Les anciennes données locales sont invalides ; un nouveau laboratoire a été initialisé.';
    }
  } catch {persistenceError='Stockage local inaccessible : les modifications pourront disparaître au rechargement.'}
  memoryState = defaults();
  try {localStorage.setItem(STORAGE_KEY,JSON.stringify(memoryState))} catch {persistenceError='Stockage local inaccessible : les modifications pourront disparaître au rechargement.'}
  return clone(memoryState);
}
export function persistenceWarning() {readLab();return persistenceError}
function save(x) {
  try {localStorage.setItem(STORAGE_KEY,JSON.stringify(x));persistenceError=''}
  catch {persistenceError='Enregistrement local impossible : espace insuffisant ou navigateur privé. Les changements risquent de disparaître.';fail(persistenceError)}
  memoryState=x;
  return clone(x);
}
const filterProducts = x => x.products.filter(p => p.status === 'published' && x.categories.some(c => c.slug === p.category && c.active));
export function labCatalog() {
  const x=readLab();return {products:filterProducts(x),categories:x.categories.filter(c=>c.active),settings:x.settings, mode:'local-test'};
}
function quantityKey(i) {return `${i.productId}:${i.variantId}`}
function orderById(x,id) {const order=x.orders.find(o=>o.id===id);if(!order)fail('Commande introuvable');return order}
export function labCheckout(payload) {
  const x=readLab();
  if(!payload || !Array.isArray(payload.items) || payload.items.length<1 || payload.items.length>30)fail('Le panier est invalide.');
  if(!payload.consent)fail('Accepte le traitement local de ces données de test.');
  if(!['pickup','delivery'].includes(payload.fulfillment))fail('Choisis un mode de réception.');
  if(payload.fulfillment==='pickup' && !x.settings.pickupEnabled || payload.fulfillment==='delivery' && !x.settings.deliveryEnabled)fail('Mode de remise indisponible.');
  if(text(payload.name,120).length<2 || text(payload.contact,120).length<6)fail('Le nom et le contact de test sont requis.');
  if(payload.fulfillment==='delivery' && (!text(payload.city) || !text(payload.address)))fail('Ville et adresse requises pour le test de livraison.');
  const key = text(payload.requestKey,80);
  if(!key)fail('Référence de demande manquante.');
  const existing=x.orders.find(o=>o.request_key===key);
  if(existing)return {reference:existing.reference,trackingToken:existing.tracking_token,existing:true,unpaid:true,currency:'XOF',mode:'local-test'};
  const used=new Set();const items=[];let subtotal=0;
  for(const i of payload.items) {
    if(!i || !integer(i.quantity,1,10) || typeof i.productId!=='string' || typeof i.variantId!=='string')fail('Quantité ou variante incorrecte.');
    const product=x.products.find(p=>p.slug===i.productId);
    const variant=product?.variants.find(v=>v.sku===i.variantId && v.active);
    if(!product || product.status!=='published' || !x.categories.some(c=>c.slug===product.category && c.active) || !variant)fail('Un produit du panier n’est plus disponible.');
    if(used.has(quantityKey(i)))fail('L’article figure plusieurs fois dans la demande.');used.add(quantityKey(i));
    if(i.quantity>variant.stock)fail(`Stock test insuffisant pour ${product.name} (${variant.name}).`);
    const unit=product.price+variant.extraPrice;
    if(!integer(unit,0))fail('Prix test incohérent.');
    const total=unit*i.quantity;
    if(!integer(total,0))fail('Montant test trop élevé.');
    subtotal+=total;
    items.push({product_id:product.id,variant_id:variant.id,product_name:product.name,variant_label:variant.name,quantity:i.quantity,unit_price:unit,line_total:total});
  }
  const deliveryFee=payload.fulfillment==='delivery'?Number(x.settings.deliveryFee||0):0;
  if(!integer(subtotal,0,1000000000)||!integer(deliveryFee,0,10000000))fail('Montant de commande de test invalide.');
  const timestamp=now();const id=uuid();
  const reference=`AT-TEST-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${Math.random().toString(16).slice(2,10).toUpperCase()}`;
  const token=uuid()+'-'+uuid();
  const order={id,request_key:key,reference,tracking_token:token,created_at:timestamp,updated_at:timestamp,
    customer_name:text(payload.name,120),customer_contact:text(payload.contact,120),city:text(payload.city,160),address:text(payload.address,400),notes:text(payload.notes,1000),
    fulfillment:payload.fulfillment,subtotal,delivery_fee:deliveryFee,total:subtotal+deliveryFee,currency:'XOF',payment_status:'unpaid',status:'new',admin_note:'',items,
    events:[{from_status:null,to_status:'new',created_at:timestamp,note:'Commande de laboratoire créée'}]};
  x.orders.unshift(order);
  for(const i of payload.items){const product=x.products.find(p=>p.slug===i.productId);const v=product.variants.find(v=>v.sku===i.variantId);v.stock-=i.quantity;}
  save(x);
  return {reference,trackingToken:token,unpaid:true,currency:'XOF',mode:'local-test',existing:false};
}
export function labTracking(reference,token) {
  const x=readLab(),o=x.orders.find(o=>o.reference===reference && o.tracking_token===token);
  if(!o)fail('Suivi de test introuvable sur ce navigateur.');
  return {reference:o.reference,status:o.status,paymentStatus:o.payment_status,fulfillment:o.fulfillment,subtotal:o.subtotal,deliveryFee:o.delivery_fee,total:o.total,
    createdAt:o.created_at,items:clone(o.items),events:clone(o.events),mode:'local-test'};
}
const NEXT={new:['confirmed','cancelled'],confirmed:['preparing','cancelled'],preparing:['ready','shipped','cancelled'],ready:['delivered','cancelled'],shipped:['delivered','cancelled'],delivered:[],cancelled:[]};
export function labAdmin(path, options={}) {
  const x=readLab();const b=options.body||{},method=options.method||'GET';
  if(path==='/session')return {authorized:false,mode:'local-test'};
  if(path==='/catalog')return {products:x.products,categories:x.categories,settings:x.settings};
  if(path==='/orders')return {orders:x.orders};
  if(path==='/metrics')return {totalOrders:x.orders.length,pendingOrders:x.orders.filter(o=>o.status==='new').length,
    deliveredOrders:x.orders.filter(o=>o.status==='delivered').length,totalUnpaid:x.orders.filter(o=>o.payment_status==='unpaid'&&o.status!=='cancelled').reduce((s,o)=>s+o.total,0)};
  if(path==='/product'&&method==='POST'){
    const title=text(b.name,180),slug=text(b.slug,80);
    if(title.length<2||!/^[a-z0-9-]{2,80}$/.test(slug)||!integer(b.basePrice,0)||!x.categories.some(c=>c.slug===b.category))fail('Vérifie le nom, le slug, le prix et la catégorie.');
    if(!['draft','published','archived'].includes(b.status))fail('Statut produit invalide.');
    if(!Array.isArray(b.variants)||!b.variants.length||b.variants.length>30)fail('Ajoute une variante.');
    const skuSet=new Set();
    const variants=b.variants.map(v=>{const sku=text(v.sku,80);if(!/^[A-Za-z0-9_-]{1,80}$/.test(sku)||skuSet.has(sku)||!integer(v.stock,0,1000000)||!integer(v.extraPrice,-10000000,10000000))fail('Vérifie les variantes, stocks et suppléments.');skuSet.add(sku);return {id:sku,sku,name:text(v.name,120)||sku,stock:v.stock,color:text(v.color,20)||'#bbbbbb',extraPrice:v.extraPrice,active:true}});
    const old=b.id?x.products.find(p=>p.id===b.id):null;
    if(b.id&&!old)fail('Produit à modifier introuvable.');
    if(x.products.some(p=>p.slug===slug&&p.id!==(old?.id)))fail('Ce slug existe déjà.');
    if(b.status==='published' && !b.isDemo && (!Array.isArray(b.images)||!b.images.length))fail('Ajoute une photo avant publication.');
    const record={id:old?.id||uuid(),slug,name:title,sub:text(b.subtitle,180),tagline:text(b.tagline,250),description:text(b.description,4000),features:(b.features||[]).map(s=>text(s,150)),keywords:(b.keywords||[]).map(s=>text(s,80)),
      category:b.category,price:b.basePrice,badge:text(b.badge,80),featured:!!b.featured,status:b.status,isDemo:!!b.isDemo,createdAt:old?.createdAt||now(),
      images:(b.images||[]).slice(0,8).map((im,i)=>({url:text(im.url,700000),alt:text(im.alt,160),sortOrder:i})),variants};
    if(old)Object.assign(old,record);else x.products.push(record);
    save(x);return {id:record.id};
  }
  if(path==='/product'&&method==='DELETE'){
    const p=x.products.find(p=>p.id===b.id);if(!p)fail('Produit introuvable.');if(p.status==='published')fail('Archive d’abord ce produit.');
    if(x.orders.some(o=>o.items.some(i=>i.product_id===p.id)))fail('Produit présent dans une commande test : archive-le.');
    x.products=x.products.filter(row=>row.id!==p.id);save(x);return {ok:true};
  }
  if(path==='/category'&&method==='POST'){
    const slug=text(b.slug,64),label=text(b.name,120);
    if(!/^[a-z0-9-]{2,64}$/.test(slug)||!label)fail('Catégorie invalide.');
    if(x.categories.some(c=>c.slug===slug))fail('Catégorie déjà existante.');
    const cat={id:uuid(),slug,label,description:text(b.description,400),active:true,order:x.categories.length};x.categories.push(cat);save(x);return {category:cat};
  }
  if(path==='/category'&&method==='PATCH'){
    const c=x.categories.find(c=>c.id===b.id);if(!c)fail('Catégorie inconnue.');
    if(b.name!==undefined)c.label=text(b.name,120);if(b.description!==undefined)c.description=text(b.description,400);if(typeof b.active==='boolean')c.active=b.active;
    save(x);return {category:c};
  }
  if(path==='/category'&&method==='DELETE'){
    if(x.products.some(p=>p.category===x.categories.find(c=>c.id===b.id)?.slug))fail('Catégorie non vide. Masque-la.');
    x.categories=x.categories.filter(c=>c.id!==b.id);save(x);return {ok:true};
  }
  if(path==='/order-status'&&method==='POST'){
    const o=orderById(x,b.id),target=text(b.status,30);
    if(!NEXT[o.status]?.includes(target))fail('Transition de commande refusée.');
    if(target==='cancelled')for(const item of o.items){const p=x.products.find(p=>p.id===item.product_id);const v=p?.variants.find(v=>v.id===item.variant_id);if(v)v.stock+=item.quantity;}
    o.events.push({from_status:o.status,to_status:target,created_at:now(),note:text(b.note,500)});o.status=target;o.updated_at=now();save(x);return {ok:true};
  }
  if(path==='/order-note'&&method==='PATCH'){
    const o=orderById(x,b.id);o.admin_note=text(b.note,1200);save(x);return {ok:true};
  }
  if(path==='/payment-collected'&&method==='POST'){
    const o=orderById(x,b.id);
    if(o.status==='cancelled'||o.payment_status==='paid'||b.confirmed!==true)fail('Paiement test incompatible.');
    o.payment_status='paid';save(x);return {ok:true,mode:'local-test'};
  }
  if(path==='/settings'&&method==='PATCH'){
    if(!b.pickupEnabled&&!b.deliveryEnabled)fail('Active au moins une option de remise.');
    if(!integer(b.deliveryFee,0,10000000))fail('Frais test invalides.');
    for(const key of ['storeName','phone','whatsapp','email','notificationEmail','city','pickupDescription','legalNotice','privacyNotice','terms'])x.settings[key]=text(b[key],4000);
    x.settings.pickupEnabled=!!b.pickupEnabled;x.settings.deliveryEnabled=!!b.deliveryEnabled;x.settings.deliveryFee=b.deliveryFee;
    save(x);return {ok:true};
  }
  if(path==='/cleanup-images'&&method==='POST')return {deleted:0,mode:'local-test'};
  if(path==='/notification-retry'&&method==='POST')fail('Les emails ne sont pas envoyés dans le laboratoire local.');
  fail('Fonction de laboratoire inconnue.');
}
export function resetLab() {
  const next=defaults();save(next);return next;
}

export function invalidateLabCache(){memoryState=null}
