// Atlas Store — API Supabase Edge Function. No external runtime dependencies.
// Deploy with verify_jwt=false: public endpoints exist, private endpoints verify the bearer token here.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
// Secrets are derived from Supabase's server-only service credential when not explicitly configured.
// Different domain suffixes prevent token reuse across purposes; never sent to browsers.
const TRACKING_SECRET = Deno.env.get('ATLAS_TRACKING_SECRET') || `${SERVICE_KEY}:atlas-hmac-tracking-v1`;
const RATE_SECRET = Deno.env.get('ATLAS_RATE_SECRET') || `${SERVICE_KEY}:atlas-rate-limit-v1`;
const ALLOWED = (Deno.env.get('ATLAS_ALLOWED_ORIGINS') || 'https://projets-1-02-atlas-store.vercel.app').split(',').map(s => s.trim()).filter(Boolean);
const encoder = new TextEncoder();

function json(data: unknown,status=200,origin='') {
  const headers: Record<string,string> = {
    'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
    'Vary':'Origin'
  };
  if(origin && ALLOWED.includes(origin)) Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,content-type,apikey','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS'});
  return new Response(status===204 ? null : JSON.stringify(data),{status,headers});
}
function fail(status=400,message='Requête non autorisée') {throw {status,message};}
function ensureString(value: unknown,max=200) {return typeof value==='string' ? value.trim().slice(0,max) : '';}
function validUuid(v: unknown) {return typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);}
async function sha256(value: string) {return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function hmac(key: string,message: string){const k=await crypto.subtle.importKey('raw',encoder.encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,encoder.encode(message)));}
function hex(value: Uint8Array){return [...value].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function db(table: string,search='',method='GET',body?:unknown,prefer='return=representation') {
  const res=await fetch(`${SUPABASE_URL}/rest/v1/${table}${search?`?${search}`:''}`,{
    method,headers:{'apikey':SERVICE_KEY,'Authorization':`Bearer ${SERVICE_KEY}`,'Content-Type':'application/json','Prefer':prefer},
    body:body===undefined?undefined:JSON.stringify(body)
  });
  if(!res.ok){
    const details=await res.json().catch(()=>({}));
    const messages:Record<string,string>={
      'Insufficient stock':'Stock insuffisant : mettez votre panier à jour.',
      'Invalid quantity':'Quantité non autorisée.',
      'Product or variant unavailable':'Un article du panier n’est plus disponible.',
      'Delivery address required':'La ville et l’adresse sont obligatoires pour la livraison.',
      'Consent required':'Vous devez accepter le traitement des données nécessaires.',
      'Fulfillment unavailable':'Ce mode de remise n’est pas disponible.',
      'Idempotency key already used':'Ce formulaire a déjà été utilisé pour une autre commande.',
      'Stock conflict':'Le stock vient de changer. Veuillez vérifier votre panier.',
      'Invalid status transition':'Cette transition de statut est interdite.'
    };
    console.error('Atlas database operation failed',table,method,res.status,details?.code||'');
    fail(res.status===409?409:400,messages[details?.message]||'Opération refusée ou données invalides');
  }
  if(res.status===204)return null;
  const t=await res.text();return t?JSON.parse(t):null;
}
const param=(obj:Record<string,string>)=>new URLSearchParams(obj).toString();
async function single(table:string,filter:Record<string,string>){const rows=await db(table,param({...filter,select:'*',limit:'1'}));return rows?.[0]||null;}
async function requireAdmin(req:Request){
  const token=(req.headers.get('authorization')||'').match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token || !SERVICE_KEY)fail(401,'Connexion administrateur requise');
  const res=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{'apikey':SERVICE_KEY,'Authorization':`Bearer ${token}`}});
  if(!res.ok)fail(401,'Session invalide ou expirée');
  const user=await res.json();
  if(!validUuid(user.id))fail(401,'Session invalide');
  const admin=await single('atlas_admins',{'user_id':`eq.${user.id}`});
  if(!admin)fail(403,'Accès administrateur refusé');
  return user.id as string;
}
async function bodyJson(req:Request,limit=35000){
  if(Number(req.headers.get('content-length')||0)>limit)fail(413,'Requête trop volumineuse');
  const raw=await req.text();if(raw.length>limit)fail(413,'Requête trop volumineuse');
  try{return JSON.parse(raw)}catch{fail(400,'JSON invalide')}
}
async function loadCatalog(includeAll=false){
  const [categories,products,variants,images,settings]=await Promise.all([
    db('atlas_categories',`select=id,slug,name,description,active,sort_order&order=sort_order.asc${includeAll?'':'&active=eq.true'}`),
    db('atlas_products',`select=*&order=created_at.desc${includeAll?'':'&status=eq.published&is_demo=eq.false'}`),
    db('atlas_variants','select=*&order=created_at.asc'),
    db('atlas_product_images','select=*&order=sort_order.asc'),
    single('atlas_settings',{'id':'eq.1'})
  ]);
  const list=(products||[]).filter((p:any)=>includeAll||(categories||[]).some((c:any)=>c.id===p.category_id)).map((p:any)=>({
    id:p.id,slug:p.slug,name:p.name,sub:p.subtitle,description:p.description,tagline:p.tagline,features:p.features||[],keywords:p.keywords||[],
    category:(categories||[]).find((c:any)=>c.id===p.category_id)?.slug||'',price:p.base_price,
    badge:p.badge,featured:p.featured,status:p.status,isDemo:p.is_demo,createdAt:p.created_at,
    images:(images||[]).filter((im:any)=>im.product_id===p.id).map((im:any)=>({id:im.id,url:im.url,alt:im.alt,sortOrder:im.sort_order})),
    variants:(variants||[]).filter((v:any)=>v.product_id===p.id).map((v:any)=>({id:v.id,sku:v.sku,name:v.label,color:v.color,stock:v.stock,extraPrice:v.price_delta,active:v.active}))
  }));
  return {products:list,categories:(categories||[]).map((c:any)=>({id:c.id,slug:c.slug,label:c.name,description:c.description,active:c.active,order:c.sort_order})),
    settings:settings?{storeName:settings.store_name,phone:settings.phone,whatsapp:settings.whatsapp,email:settings.email,city:settings.city,
      pickupDescription:settings.pickup_description,pickupEnabled:settings.pickup_enabled,deliveryEnabled:settings.delivery_enabled,
      ...(includeAll ? {notificationEmail:settings.notification_email} : {}),
      deliveryFee:settings.delivery_fee,legalNotice:settings.legal_notice,privacyNotice:settings.privacy_notice,terms:settings.terms}:null};
}
async function createOrder(req:Request){
  if(!TRACKING_SECRET || !RATE_SECRET || !ALLOWED.length)fail(503,'Boutique non configurée pour les commandes');
  const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'';
  if(!ip)fail(429,'Vérification anti-abus temporairement indisponible');
  const key=await sha256(`${RATE_SECRET}:${ip}`);
  const permitted=await db('rpc/atlas_limit_requests','', 'POST',{p_hash:key,p_limit:12});
  if(!permitted)fail(429,'Trop de tentatives. Réessayez plus tard.');
  const body=await bodyJson(req,12000);
  if(!validUuid(body.requestKey)||!Array.isArray(body.items)||body.items.length<1||body.items.length>30)fail(400,'Panier invalide');
  const payload={name:ensureString(body.name,120),contact:ensureString(body.contact,120),city:ensureString(body.city,160),
    address:ensureString(body.address,400),notes:ensureString(body.notes,1000),fulfillment:body.fulfillment,consent:body.consent===true,
    items:body.items.map((l:any)=>({productId:l.productId,variantId:l.variantId,quantity:l.quantity}))};
  if(payload.items.some((i:any)=>!(/^[a-z0-9-]{2,80}$/.test(i.productId)&&/^[a-zA-Z0-9_-]{1,80}$/.test(i.variantId)&&Number.isInteger(i.quantity)&&i.quantity>=1&&i.quantity<=10)))fail(400,'Article ou quantité invalide');
  const tokenBytes=await hmac(TRACKING_SECRET,body.requestKey);
  const token=hex(tokenBytes);
  const hash=await sha256(token);
  const result=await db('rpc/atlas_place_order','', 'POST',{p_payload:payload,p_request_key:body.requestKey,p_token_hash:hash});
  if(!result?.reference)fail(500,'Confirmation indisponible');
  try{if(!result.existing)await notify(result.reference)}catch{console.warn('Atlas notification unavailable; order preserved')}
  return {...result,trackingToken:token,unpaid:true,currency:'XOF'};
}
async function notify(reference:string){
  const order=await single('atlas_orders',{'reference':`eq.${reference}`});if(!order)return;
  const settings=await single('atlas_settings',{'id':'eq.1'});
  const status=await single('atlas_notifications',{'order_id':`eq.${order.id}`});
  if(status?.status==='sent')return;
  const attempts=Math.min((status?.attempts||0)+1,100);
  const apiKey=Deno.env.get('ATLAS_RESEND_API_KEY')||'';
  const from=Deno.env.get('ATLAS_EMAIL_FROM')||'';
  const to=Deno.env.get('ATLAS_NOTIFICATION_TO')||settings?.notification_email||'';
  if(!apiKey||!from||!to){await db('atlas_notifications',param({order_id:`eq.${order.id}`}), 'PATCH',{status:'unconfigured',last_error:'Email not configured',attempts});return;}
  const safeReference=reference.replace(/[^A-Z0-9-]/g,'');
  const res=await fetch('https://api.resend.com/emails', {method:'POST',headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject:`Nouvelle commande ${safeReference}`,text:`Une nouvelle commande ${safeReference} est enregistrée. Ouvrez l'administration Atlas Store pour la traiter. Aucun paiement n'a été encaissé.`})});
  await db('atlas_notifications',param({order_id:`eq.${order.id}`}), 'PATCH',{status:res.ok?'sent':'failed',attempts,last_error:res.ok?'':`HTTP ${res.status}`,sent_at:res.ok?new Date().toISOString():null});
}
async function track(url:URL){
  const reference=ensureString(url.searchParams.get('reference'),40);
  const token=ensureString(url.searchParams.get('token'),100);
  if(!/^AT-\d{8}-[A-F0-9]{9}$/.test(reference)||!/^[a-f0-9]{64}$/.test(token))fail(404,'Suivi introuvable');
  const order=await single('atlas_orders',{'reference':`eq.${reference}`});if(!order)fail(404,'Suivi introuvable');
  const stored=await single('atlas_tracking_tokens',{'order_id':`eq.${order.id}`});
  const h=await sha256(token);
  if(!stored||stored.token_hash!==h||Date.parse(stored.expires_at)<Date.now())fail(404,'Lien de suivi invalide ou expiré');
  const [items,events]=await Promise.all([db('atlas_order_items',param({order_id:`eq.${order.id}`,select:'product_name,variant_label,quantity,unit_price,line_total'})),db('atlas_order_events',param({order_id:`eq.${order.id}`,select:'to_status,created_at',order:'created_at.asc'}))]);
  return {reference:order.reference,status:order.status,paymentStatus:order.payment_status,fulfillment:order.fulfillment,
    subtotal:order.subtotal,deliveryFee:order.delivery_fee,total:order.total,createdAt:order.created_at,items,events};
}
function checkInput(p:any,fields:string[]){if(!p||typeof p!=='object')fail(400,'Données invalides');for(const f of fields){if(!p[f])fail(400,`Champ requis : ${f}`)}}
async function adminRequest(req:Request,path:string,url:URL,actor:string){
  if(path==='/admin/session')return {actor,authorized:true};
  if(path==='/admin/catalog')return await loadCatalog(true);
  if(path==='/admin/orders'){
    const orders=await db('atlas_orders', 'select=*&order=created_at.desc&limit=100');
    const ids=orders.map((o:any)=>o.id);
    if(!ids.length)return {orders:[]};
    const [items,events]=await Promise.all([db('atlas_order_items',`select=*&order_id=in.(${ids.join(',')})`),db('atlas_order_events',`select=*&order_id=in.(${ids.join(',')})&order=created_at.asc`)]);
    return {orders:orders.map((o:any)=>({...o,items:items.filter((i:any)=>i.order_id===o.id),events:events.filter((e:any)=>e.order_id===o.id)}))};
  }
  if(path==='/admin/metrics'){
    const orders=await db('atlas_orders','select=id,status,total,payment_status,created_at');
    return {totalOrders:orders.length,pendingOrders:orders.filter((o:any)=>o.status==='new').length,deliveredOrders:orders.filter((o:any)=>o.status==='delivered').length,
      totalUnpaid:orders.filter((o:any)=>o.payment_status==='unpaid'&&o.status!=='cancelled').reduce((s:number,o:any)=>s+o.total,0)};
  }
  if(req.method==='POST'&&path==='/admin/product'){
    const data=await bodyJson(req,40000);const id=await db('rpc/atlas_save_product','', 'POST',{p_actor:actor,p_data:data});return {id};
  }
  if(req.method==='DELETE'&&path==='/admin/product'){
    const data=await bodyJson(req,1000);if(!validUuid(data.id))fail(400,'Identifiant de produit invalide');
    const p=await single('atlas_products',{'id':`eq.${data.id}`});if(!p)fail(404,'Produit introuvable');
    if(p.status==='published')fail(409,'Archivez le produit publié avant toute suppression');
    const related=await db('atlas_order_items',param({product_id:`eq.${data.id}`,select:'id',limit:'1'}));
    if(related.length)fail(409,'Produit présent dans des commandes historiques : archivez-le plutôt');
    await db('atlas_products',param({id:`eq.${data.id}`}), 'DELETE');
    await audit(actor,'product_delete','product',data.id,{slug:p.slug});return {ok:true};
  }
  if(req.method==='POST'&&path==='/admin/cleanup-images'){
    const listed=await fetch(`${SUPABASE_URL}/storage/v1/object/list/atlas-products`,{method:'POST',headers:{'Content-Type':'application/json',apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`},body:JSON.stringify({prefix:'',limit:1000,offset:0,sortBy:{column:'created_at',order:'asc'}})});
    if(!listed.ok)fail(502,'Impossible de lister les images');
    const files=await listed.json();
    const used=await db('atlas_product_images','select=url');
    const urls=new Set(used.map((x:any)=>x.url));
    let deleted=0;
    for(const file of files){
      if(!/^[a-f0-9-]{36}\.(jpe?g|png|webp|avif)$/i.test(file.name))continue;
      const createdAt=Date.parse(file.created_at||'');if(!Number.isFinite(createdAt)||Date.now()-createdAt<24*3600*1000)continue;
      if(urls.has(`${SUPABASE_URL}/storage/v1/object/public/atlas-products/${file.name}`))continue;
      const res=await fetch(`${SUPABASE_URL}/storage/v1/object/atlas-products/${file.name}`,{method:'DELETE',headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`}});
      if(res.ok)deleted++;
    }
    await audit(actor,'orphan_cleanup','storage','atlas-products',{deleted});return {deleted};
  }
  if(req.method==='POST'&&path==='/admin/payment-collected'){
    const data=await bodyJson(req,1200);
    if(!validUuid(data.id)||data.confirmed!==true)fail(400,'Confirmation explicite requise');
    const order=await single('atlas_orders',{'id':`eq.${data.id}`});
    if(!order||order.status==='cancelled'||order.payment_status==='paid')fail(409,'État de paiement incompatible');
    const updated=await db('atlas_orders',param({id:`eq.${data.id}`,payment_status:'eq.unpaid'}),'PATCH',{payment_status:'paid',updated_at:new Date().toISOString()});if(!updated?.length)fail(409,'Paiement déjà mis à jour');
    await audit(actor,'payment_collected_offline','order',data.id,{amount:order.total});
    return {ok:true};
  }
  if(req.method==='POST'&&path==='/admin/category'){
    const data=await bodyJson(req,8000);checkInput(data,['slug','name']);
    if(!/^[a-z0-9-]{2,64}$/.test(data.slug)||data.name.length>120)fail(400,'Catégorie invalide');
    const result=await db('atlas_categories','', 'POST',{slug:data.slug,name:data.name,description:ensureString(data.description,400),active:data.active!==false,sort_order:Number.isInteger(data.sortOrder)?data.sortOrder:0},'return=representation');
    await audit(actor,'category_create','category',result[0]?.id||'',{});return {category:result[0]};
  }
  if(req.method==='PATCH'&&path==='/admin/category'){
    const data=await bodyJson(req,8000);if(!validUuid(data.id))fail(400,'ID de catégorie invalide');
    const update:any={};if(typeof data.name==='string')update.name=ensureString(data.name,120);
    if(typeof data.description==='string')update.description=ensureString(data.description,400);
    if(typeof data.active==='boolean')update.active=data.active;
    if(Number.isInteger(data.sortOrder))update.sort_order=data.sortOrder;
    if(!Object.keys(update).length)fail(400,'Aucune modification');
    const result=await db('atlas_categories',param({id:`eq.${data.id}`}), 'PATCH',update);await audit(actor,'category_update','category',data.id,update);return {category:result?.[0]};
  }
  if(req.method==='DELETE'&&path==='/admin/category'){
    const data=await bodyJson(req,1000);if(!validUuid(data.id))fail(400,'ID invalide');
    const references=await db('atlas_products',param({category_id:`eq.${data.id}`,select:'id',limit:'1'}));
    if(references.length)fail(409,'Cette catégorie contient des produits ; masquez-la plutôt');
    await db('atlas_categories',param({id:`eq.${data.id}`}), 'DELETE');await audit(actor,'category_delete','category',data.id,{});return {ok:true};
  }
  if(req.method==='POST'&&path==='/admin/order-status'){
    const data=await bodyJson(req,2000);if(!validUuid(data.id)||!data.status)fail(400,'État invalide');
    return await db('rpc/atlas_set_order_status','', 'POST',{p_order:data.id,p_status:data.status,p_actor:actor,p_note:ensureString(data.note,500)});
  }
  if(req.method==='PATCH'&&path==='/admin/order-note'){
    const data=await bodyJson(req,2000);if(!validUuid(data.id))fail(400,'Commande invalide');
    await db('atlas_orders',param({id:`eq.${data.id}`}), 'PATCH',{admin_note:ensureString(data.note,1200),updated_at:new Date().toISOString()});
    await audit(actor,'order_note','order',data.id,{});return {ok:true};
  }
  if(req.method==='POST'&&path==='/admin/notification-retry'){
    const data=await bodyJson(req,1000);if(!/^AT-\d{8}-[A-F0-9]{9}$/.test(data.reference||''))fail(400,'Référence invalide');
    await notify(data.reference);return {ok:true};
  }
  if(req.method==='PATCH'&&path==='/admin/settings'){
    const x=await bodyJson(req,10000);
    const val={store_name:ensureString(x.storeName,120),phone:ensureString(x.phone,40),whatsapp:ensureString(x.whatsapp,40),email:ensureString(x.email,180),
      notification_email:ensureString(x.notificationEmail,180),city:ensureString(x.city,120),pickup_description:ensureString(x.pickupDescription,600),
      pickup_enabled:x.pickupEnabled===true,delivery_enabled:x.deliveryEnabled===true,delivery_fee:Number.isInteger(x.deliveryFee)&&x.deliveryFee>=0&&x.deliveryFee<=10000000?x.deliveryFee:0,
      legal_notice:ensureString(x.legalNotice,4000),privacy_notice:ensureString(x.privacyNotice,4000),terms:ensureString(x.terms,4000),updated_at:new Date().toISOString()};
    if(!val.pickup_enabled&&!val.delivery_enabled)fail(400,'Activez au moins un mode de remise');
    await db('atlas_settings',param({id:'eq.1'}),'PATCH',val);await audit(actor,'settings_update','settings','1',{});return {ok:true};
  }
  if(req.method==='DELETE'&&path==='/admin/image'){
    const data=await bodyJson(req,2000);const file=ensureString(data.path,200);
    if(!/^[a-f0-9-]{36}\.(jpg|jpeg|png|webp|avif)$/i.test(file))fail(400,'Chemin de photo invalide');
    const publicUrl=`${SUPABASE_URL}/storage/v1/object/public/atlas-products/${file}`;
    const references=await db('atlas_product_images',param({url:`eq.${publicUrl}`,select:'id',limit:'1'}));
    if(references.length)fail(409,'Image encore associée à un produit');
    const removed=await fetch(`${SUPABASE_URL}/storage/v1/object/atlas-products/${file}`,{method:'DELETE',headers:{'apikey':SERVICE_KEY,'Authorization':`Bearer ${SERVICE_KEY}`}});
    if(!removed.ok)fail(400,'Suppression impossible');
    await audit(actor,'image_delete','image',file,{});return {ok:true};
  }
  fail(404,'Action inconnue');
}
async function audit(actor:string,action:string,resource_type:string,resource_id:string,detail:unknown){
  await db('atlas_audit','', 'POST',{actor_id:actor,action,resource_type,resource_id,detail},'return=minimal');
}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('origin')||'';
  if(origin&&!ALLOWED.includes(origin))return json({error:'Origine non autorisée'},403,'');
  if(req.method==='OPTIONS')return json({},204,origin);
  try{
    if(!SUPABASE_URL||!SERVICE_KEY)fail(503,'Service non configuré');
    const url=new URL(req.url);const path=url.pathname.replace(/^.*\/atlas-api/,'')||'/';
    let result:any;
    if(req.method==='GET'&&path==='/health')result={status:'ready'};
    else if(req.method==='GET'&&path==='/catalog')result=await loadCatalog(false);
    else if(req.method==='POST'&&path==='/checkout')result=await createOrder(req);
    else if(req.method==='GET'&&path==='/tracking')result=await track(url);
    else if(path.startsWith('/admin/')){const admin=await requireAdmin(req);result=await adminRequest(req,path,url,admin)}
    else fail(404,'Ressource inconnue');
    return json(result,200,origin);
  }catch(e:any){const status=Number.isInteger(e?.status)&&e.status>=400&&e.status<600?e.status:500;
    if(status>=500)console.error('Atlas backend unexpected error',String(e?.message||e).slice(0,200));
    return json({error:status===500?'Une erreur serveur est survenue':String(e?.message||'Action impossible')},status,origin);
  }
});
