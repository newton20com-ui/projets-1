/* Défense en profondeur : toute donnée du navigateur est traitée comme non fiable. */
import { findProduct, findVariant, MAX_PER_LINE } from './products.js';
import { isLive } from './config.js';
const KEY = 'atlas-store-demo-cart-v1';
let canPersist = true;
export const storageAvailable = () => canPersist;

export function normalizeCart(value) {
  if (!Array.isArray(value)) return [];
  const unique = new Map();
  for (const item of value.slice(0, 200)) {
    if (!item || typeof item !== 'object') continue;
    const product = typeof item.productId === 'string' ? findProduct(item.productId) : null;
    const variant = product && typeof item.variantId === 'string' ? findVariant(product, item.variantId) : null;
    if (!product || !variant || variant.stock <= 0 || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) continue;
    const key = `${product.id}:${variant.id}`;
    const previous = unique.get(key)?.quantity ?? 0;
    const quantity = Math.min(previous + item.quantity, variant.stock, MAX_PER_LINE);
    unique.set(key, { productId: product.id, variantId: variant.id, quantity });
  }
  return [...unique.values()];
}
function cleanShapeWithoutCatalog(value){
  if(!Array.isArray(value))return [];
  const out=[];
  for(const row of value.slice(0,200)){
    if(row&&typeof row.productId==='string'&&typeof row.variantId==='string'&&/^[a-z0-9-]{2,80}$/.test(row.productId)&&/^[a-zA-Z0-9_-]{1,80}$/.test(row.variantId)&&Number.isSafeInteger(row.quantity)&&row.quantity>=1&&row.quantity<=MAX_PER_LINE)out.push({productId:row.productId,variantId:row.variantId,quantity:row.quantity});
  }
  return out;
}
export function loadCart() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    // En mode live, les produits du serveur n'ont pas encore été chargés à l'import JS.
    // Ne JAMAIS effacer les références du client avant ce chargement.
    if(isLive)return cleanShapeWithoutCatalog(parsed);
    const clean = normalizeCart(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(clean)) {
      localStorage.setItem(KEY, JSON.stringify(clean));
    }
    return clean;
  } catch {
    canPersist = false;
    return [];
  }
}
export function saveCart(cart) {
  const clean = normalizeCart(cart);
  try {
    localStorage.setItem(KEY, JSON.stringify(clean));
    canPersist = true;
  } catch { canPersist = false; }
  return clean;
}
