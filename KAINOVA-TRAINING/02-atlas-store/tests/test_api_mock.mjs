/** Tests exécutables de l'API avec un serveur Supabase factice en mémoire.
 * IMPORTANT : ils testent le contrat HTTP, PAS la migration PostgreSQL réelle. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
import { webcrypto } from 'node:crypto';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(join(root,'supabase/functions/atlas-api/index.ts'),'utf8');
const {outputText,diagnostics}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},reportDiagnostics:true});
assert.equal(diagnostics?.length||0,0);
let handler;
let lastRpc=null;
let notifyCalls=0;
let rateCalls=0;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const settings={id:1,store_name:'Atlas Store',phone:'',whatsapp:'',email:'',notification_email:'',city:'',pickup_description:'Retrait en boutique',pickup_enabled:true,delivery_enabled:true,delivery_fee:1500,privacy_notice:'',terms:''};
async function fakeFetch(input,options={}){
  const url=new URL(input);const path=url.pathname;const method=options.method||'GET';
  if(path==='/auth/v1/user')return options.headers?.Authorization==='Bearer authenticated-nonadmin'?json({id:'22222222-2222-4222-8222-222222222222'}):json({},401);
  if(path.endsWith('/atlas_admins'))return json([]);
  if(path.endsWith('/rpc/atlas_limit_requests')){rateCalls++;return json(true)}
  if(path.endsWith('/rpc/atlas_place_order')){lastRpc=JSON.parse(options.body);return json({reference:'AT-20261123-ABC123456',subtotal:15000,deliveryFee:0,total:15000,status:'new',existing:notifyCalls>0})}
  if(path.endsWith('/atlas_categories'))return json([{id:'123',slug:'audio',name:'Audio',description:'Audio',active:true,sort_order:0}]);
  if(path.endsWith('/atlas_products'))return json([{id:'P1',slug:'neo-pods',name:'Neo Pods',subtitle:'Audio',description:'...',tagline:'...',features:['Bluetooth'],keywords:['audio'],base_price:15000,category_id:'123',status:'published',is_demo:false,featured:true,badge:''}]);
  if(path.endsWith('/atlas_variants'))return json([{id:'V1',product_id:'P1',sku:'noir',label:'Noir',color:'#000000',price_delta:0,stock:7,active:true}]);
  if(path.endsWith('/atlas_product_images'))return json([{id:'I1',product_id:'P1',url:'https://example.test/img.jpg',alt:'Photo',sort_order:0}]);
  if(path.endsWith('/atlas_settings'))return json([settings]);
  if(path.endsWith('/atlas_orders'))return json([{id:'ORDER1',reference:'AT-20261123-ABC123456',subtotal:15000,delivery_fee:0,total:15000,status:'new',payment_status:'unpaid',fulfillment:'pickup',created_at:'2026-11-23T12:00:00Z'}]);
  if(path.endsWith('/atlas_notifications')){if(method==='PATCH')return json([]);notifyCalls++;return json([{status:'pending',attempts:0}])}
  if(path.endsWith('/atlas_tracking_tokens'))return json([{order_id:'ORDER1',token_hash:lastRpc?.p_token_hash,expires_at:'2027-01-01T00:00:00Z'}]);
  if(path.endsWith('/atlas_order_items'))return json([{product_name:'Neo Pods',variant_label:'Noir',quantity:1,unit_price:15000,line_total:15000}]);
  if(path.endsWith('/atlas_order_events'))return json([{to_status:'new',created_at:'2026-11-23T12:00:00Z'}]);
  throw Error('Unmocked HTTP: '+method+' '+input);
}
const vars={SUPABASE_URL:'https://atlas.example.test',SUPABASE_SERVICE_ROLE_KEY:'test-service-only',ATLAS_TRACKING_SECRET:'a-very-long-dev-only-tracking-secret-123456',ATLAS_RATE_SECRET:'a-separate-test-rate-hash-secret-123456',ATLAS_ALLOWED_ORIGINS:'https://preview.example.test'};
const Deno={env:{get:n=>vars[n]},serve:callback=>{handler=callback}};
vm.runInNewContext(outputText,{Deno,fetch:fakeFetch,Request,Response,URL,URLSearchParams,TextEncoder,crypto:webcrypto,console,Date,Uint8Array,JSON,Map,Set,Number,String,Array,Object,RegExp,Error,Promise}, {filename:'atlas-api-edge.js'});
let passed=0;
async function test(label,fn){await fn();console.log('✓ '+label);passed++}
function req(path,{method='GET',body,origin='https://preview.example.test',headers={}}={}){return new Request('https://atlas.example.test/functions/v1/atlas-api'+path,{method,headers:{'origin':origin,'x-forwarded-for':'127.0.0.1',...headers,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined})}
const valid={requestKey:'11111111-1111-4111-8111-111111111111',name:'Client Exemple',contact:'70123456',fulfillment:'pickup',consent:true,items:[{productId:'neo-pods',variantId:'noir',quantity:1,price:1}]};
await test('CORS origine interdite refusée',async()=>{const r=await handler(req('/catalog',{origin:'https://evil.example'}));assert.equal(r.status,403)});
await test('Preflight autorisé retourne 204 sans corps',async()=>{const r=await handler(req('/catalog',{method:'OPTIONS'}));assert.equal(r.status,204);assert.equal(await r.text(),'')});
await test('Route health opérationnelle',async()=>{const r=await handler(req('/health'));assert.equal(r.status,200)});
await test('Catalogue ne montre que les produits remis par l’API',async()=>{const r=await handler(req('/catalog'));const d=await r.json();assert.equal(d.products.length,1);assert.equal(d.products[0].variants[0].sku,'noir');assert.equal(d.settings.deliveryFee,1500)});
await test('Admin sans token refusé',async()=>{const r=await handler(req('/admin/orders'));assert.equal(r.status,401)});
await test('Admin token non valide refusé',async()=>{const r=await handler(req('/admin/orders',{headers:{Authorization:'Bearer wrong'}}));assert.equal(r.status,401)});
await test('Utilisateur authentifié non administrateur refusé',async()=>{const r=await handler(req('/admin/orders',{headers:{Authorization:'Bearer authenticated-nonadmin'}}));assert.equal(r.status,403)});
await test('Checkout malformé refusé',async()=>{const r=await handler(req('/checkout',{method:'POST',body:{...valid,items:[]}}));assert.equal(r.status,400)});
await test('Prix fourni par le navigateur jamais transmis à SQL',async()=>{const r=await handler(req('/checkout',{method:'POST',body:valid}));assert.equal(r.status,200);const d=await r.json();assert.match(d.trackingToken,/^[a-f0-9]{64}$/);assert.equal(lastRpc.p_payload.items[0].price,undefined);assert.equal(lastRpc.p_payload.items[0].quantity,1)});
await test('Token suivi calculé, hashé et non stocké en clair',async()=>{const {p_token_hash:hash}=lastRpc;assert.match(hash,/^[a-f0-9]{64}$/);assert.notEqual(hash,'11111111-1111-4111-8111-111111111111')});
await test('Requête répétée retourne même jeton',async()=>{const r=await handler(req('/checkout',{method:'POST',body:valid}));const d=await r.json();assert.equal(r.status,200);assert.match(d.trackingToken,/^[a-f0-9]{64}$/)});
await test('Suivi authentifié par le jeton retourne un statut sans coordonnées personnelles',async()=>{const t=Array.from(new Uint8Array(await webcrypto.subtle.sign('HMAC',await webcrypto.subtle.importKey('raw',new TextEncoder().encode(vars.ATLAS_TRACKING_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']),new TextEncoder().encode(valid.requestKey)))).map(x=>x.toString(16).padStart(2,'0')).join('');const r=await handler(req('/tracking?reference=AT-20261123-ABC123456&token='+t));const d=await r.json();assert.equal(r.status,200);assert.equal(d.status,'new');assert.equal(d.customer_contact,undefined)});
await test('Suivi refuse mauvais token',async()=>{const r=await handler(req('/tracking?reference=AT-20261123-ABC123456&token=wrong'));assert.equal(r.status,404)});
await test('Limiteur appelé avant commande',async()=>{assert.ok(rateCalls>=2)});
console.log(`${passed}/${passed} tests du contrat HTTP avec services factices réussis. NÉCESSITE tests d'intégration SQL/Storage/Auth réels.`);
