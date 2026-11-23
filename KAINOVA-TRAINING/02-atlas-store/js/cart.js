import { MAX_PER_LINE, findProduct, findVariant, variantPrice } from './products.js';
import { loadCart, saveCart } from './storage.js';
let lines = loadCart();
export const getCart = () => lines.map(line => ({ ...line }));
export function getDetailedCart() {
  return lines.map(line => {
    const product = findProduct(line.productId);
    const variant = findVariant(product, line.variantId);
    if (!product || !variant) return null;
    return { ...line, product, variant, unitPrice: variantPrice(product, variant), total: variantPrice(product, variant) * line.quantity };
  }).filter(Boolean);
}
export const cartCount = () => lines.reduce((sum, line) => sum + line.quantity, 0);
export const cartTotal = () => getDetailedCart().reduce((sum, line) => sum + line.total, 0);
function commit() { lines = saveCart(lines); document.dispatchEvent(new CustomEvent('atlas:cart-change')); }
export function addItem(productId, variantId, quantity) {
  const product = findProduct(productId);
  const variant = findVariant(product, variantId);
  if (!product || !variant || variant.stock <= 0) return { ok: false, message: 'Cette variante est indisponible.' };
  if (!Number.isSafeInteger(quantity) || quantity < 1) return { ok: false, message: 'Choisis une quantité valide.' };
  const current = lines.find(l => l.productId === productId && l.variantId === variantId);
  const maximum = Math.min(variant.stock, MAX_PER_LINE);
  const next = (current?.quantity ?? 0) + quantity;
  if (next > maximum) return { ok: false, message: `Maximum ${maximum} unité${maximum > 1 ? 's' : ''} pour cette variante.` };
  if (current) current.quantity = next;
  else lines.push({ productId, variantId, quantity });
  commit();
  return { ok: true, message: `${product.name} ajouté au panier.` };
}
export function setQuantity(productId, variantId, quantity) {
  const line = lines.find(l => l.productId === productId && l.variantId === variantId);
  if (!line) return { ok: false, message: 'Article introuvable.' };
  const variant = findVariant(findProduct(productId), variantId);
  if (!variant || variant.stock < 1) { removeItem(productId,variantId); return { ok:false,message:'Article indisponible retiré.' }; }
  if (!Number.isSafeInteger(quantity) || quantity < 1) return { ok: false, message:'La quantité doit être un entier positif.' };
  const max = Math.min(MAX_PER_LINE, variant.stock);
  if (quantity > max) return { ok: false, message:`Maximum ${max} unité${max > 1 ? 's' : ''} pour cette variante.` };
  line.quantity = quantity;
  commit();
  return { ok: true };
}
export function removeItem(productId, variantId) {
  lines = lines.filter(l => !(l.productId === productId && l.variantId === variantId));
  commit();
}
export function clearCart() { lines = []; commit(); }
export function refreshCartFromStorage(){lines=saveCart(loadCart());document.dispatchEvent(new CustomEvent('atlas:cart-change'))}
