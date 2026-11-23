import { ATLAS_CONFIG, isLive } from './config.js';
export { isLive };
const API_TIMEOUT_MS = 12000;
const URL_BASE = () => `${ATLAS_CONFIG.supabaseUrl.replace(/\/$/,'')}/functions/v1/atlas-api`;
function formError(res, payload) { return new Error(payload?.error || `Erreur réseau ${res.status}`); }
export async function request(path, {method='GET',body,token,signal} = {}) {
  if (!isLive) throw new Error('Atlas Store n’est pas encore connecté à un backend indépendant.');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
  const abort=()=>ctrl.abort();
  signal?.addEventListener('abort',abort,{once:true});
  try {
    const res=await fetch(URL_BASE()+path,{method,headers:{'Content-Type':'application/json','apikey':ATLAS_CONFIG.publishableKey,
      ...(token ? {'Authorization':`Bearer ${token}`} : {})},body:body===undefined?undefined:JSON.stringify(body),signal:ctrl.signal,cache:'no-store'});
    let payload;
    try{payload=await res.json()}catch{throw new Error('Réponse serveur illisible. Réessayez.')}
    if(!res.ok)throw formError(res,payload);
    return payload;
  }catch(error){if(error?.name==='AbortError')throw new Error('La requête a expiré. Vérifiez votre connexion.');throw error}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}
export const catalog = () => request('/catalog');
export const createOrder = payload => request('/checkout',{method:'POST',body:payload});
export const trackOrder = (reference,token) => request(`/tracking?reference=${encodeURIComponent(reference)}&token=${encodeURIComponent(token)}`);

// Authentification Supabase Auth : l'accès admin est encore contrôlé par l'API ET la base.
const KEY='atlas-admin-session-v1';
export function getSession(){try{const x=JSON.parse(sessionStorage.getItem(KEY)||'null');return x?.access_token ? x : null}catch{return null}}
export function clearSession(){try{sessionStorage.removeItem(KEY)}catch{}}
const authUrl = endpoint => `${ATLAS_CONFIG.supabaseUrl.replace(/\/$/,'')}/auth/v1/${endpoint}`;
async function authCall(path,method='POST',data,token){
  if(!isLive)throw new Error('Backend non configuré');
  const resp=await fetch(authUrl(path),{method,headers:{'apikey':ATLAS_CONFIG.publishableKey,'Content-Type':'application/json',
    ...(token?{'Authorization':`Bearer ${token}`}:{})},body:JSON.stringify(data)});
  const result=await resp.json().catch(()=>({}));
  if(!resp.ok)throw new Error(result.msg||result.error_description||result.message||'Connexion refusée');
  return result;
}
async function storeSession(session){try{sessionStorage.setItem(KEY,JSON.stringify(session))}catch{throw new Error('Le stockage de session est bloqué dans ce navigateur.')}return session}
export async function signIn(email,password){return storeSession(await authCall('token?grant_type=password','POST',{email,password}));}
export async function refreshSession(){const s=getSession();if(!s?.refresh_token)throw new Error('Session expirée');return storeSession(await authCall('token?grant_type=refresh_token','POST',{refresh_token:s.refresh_token}));}
export async function adminRequest(path,options={}) {
  let s=getSession();if(!s)throw new Error('Session administrateur requise');
  try{return await request('/admin'+path,{...options,token:s.access_token})}
  catch(err){if(!/session|expir|401|connexion/i.test(err.message))throw err;s=await refreshSession();return request('/admin'+path,{...options,token:s.access_token})}
}
export async function signOut(){const s=getSession();try{if(s)await authCall('logout','POST',{},s.access_token)}finally{clearSession()}}
export async function requestRecovery(email){return authCall(`recover?redirect_to=${encodeURIComponent(location.origin+location.pathname)}`,'POST',{email})}
export async function updatePassword(password,token){return authCall('user','PUT',{password},token)}
export function photoUrl(filename){return `${ATLAS_CONFIG.supabaseUrl.replace(/\/$/,'')}/storage/v1/object/public/atlas-products/${filename}`}
export async function uploadImage(file){
  if(!isLive)throw new Error('Backend non configuré');
  if(!file||file.size>5*1024*1024||!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))throw new Error('Photo JPG, PNG, WebP ou AVIF, maximum 5 Mo.');
  const session=getSession();if(!session)throw new Error('Connectez-vous');
  const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'}[file.type];
  const filename=`${crypto.randomUUID()}.${extension}`;
  const res=await fetch(`${ATLAS_CONFIG.supabaseUrl}/storage/v1/object/atlas-products/${filename}`,{method:'POST',headers:{'apikey':ATLAS_CONFIG.publishableKey,'Authorization':`Bearer ${session.access_token}`,'Content-Type':file.type,'x-upsert':'false'},body:file});
  if(!res.ok)throw new Error('Téléversement refusé : vérifiez le format et les permissions.');
  return {filename,url:photoUrl(filename),alt:file.name.slice(0,100)};
}
