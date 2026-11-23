/* Défense en profondeur : toute donnée du navigateur est traitée comme non fiable. */
import { findProduct, findVariant, MAX_PER_LINE } from './products.js';
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
export function loadCart() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
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
