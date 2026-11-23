import { PRODUCTS, CATEGORIES, findProduct, findVariant, isAvailable, MAX_PER_LINE, variantPrice } from './products.js';
import { queryProducts } from './catalog.js';
import { addItem, cartCount, cartTotal, clearCart, getDetailedCart, removeItem, setQuantity } from './cart.js';
import { storageAvailable } from './storage.js';
import { isLive,createOrder,trackOrder } from './api.js';
import { refreshLiveCatalog,getSettings,getCatalogError } from './live-catalog.js';
import { refreshCartFromStorage } from './cart.js';
import { invalidateLabCache } from './lab-store.js';

const $ = selector => document.querySelector(selector);
const main = $('#main-content');
const searchInput = $('#global-search');
const drawerLayer = $('#drawer-layer');
const drawer = $('#cart-drawer');
const toastElement = $('#toast');
const money = value => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)} FCFA`;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const arrow = '<svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-arrow"/></svg>';
const plusIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-plus"/></svg>';
const minusIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-minus"/></svg>';
const categoryFor = id => CATEGORIES.find(category => category.id === id)?.label ?? '';
const fallback = 'assets/images/fallback.svg';
let toastTimeout;
let previousFocus = null;
let currentPage = '';
const state = { search: '', category: 'all', maxPrice: 'all', sort: 'default', detailVariant: null, detailQuantity: 1, detailImage: 0 };
const productUrl = product => `#/produit/${encodeURIComponent(product.id)}`;
const whatsAppUrl = text => {const number=String(getSettings()?.whatsapp||'').replace(/\D/g,'');return number.length>=8&&number.length<=15 ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : '';};

function showToast(message) {
  clearTimeout(toastTimeout);
  toastElement.textContent = message;
  toastElement.classList.add('toast--visible');
  toastTimeout = setTimeout(() => toastElement.classList.remove('toast--visible'), 3300);
}
function productPhoto(product, i=0, className='') {
  return `<img class="${className}" src="${escapeHtml(product.images[i] || fallback)}" alt="${i ? 'Vue conceptuelle de ' : 'Photographie illustrative pour '}${escapeHtml(product.name)}" width="840" height="840" loading="lazy" decoding="async">`;
}
function productCard(product, position = 0) {
  const available = isAvailable(product);
  return `<article class="product-card" style="--card-order:${position}">
    <a class="product-card__visual" href="${productUrl(product)}" aria-label="Découvrir ${escapeHtml(product.name)}">
      ${productPhoto(product,0,'product-card__image')}
      ${product.badge ? `<span class="card-pill">${escapeHtml(product.badge)}</span>` : ''}
      ${!available ? '<span class="card-pill card-pill--unavailable">Indisponible</span>' : ''}
      <span class="card-quick" aria-hidden="true">Découvrir ${arrow}</span>
    </a>
    <div class="product-card__info"><div><p class="product-card__sub">${escapeHtml(product.sub)}</p><h3><a href="${productUrl(product)}">${escapeHtml(product.name)}</a></h3></div><p class="product-card__price">${money(product.price)}</p></div>
  </article>`;
}
function sectionHead(kicker,title,href,label) {
  return `<div class="section-head"><div><p class="eyebrow">${kicker}</p><h2>${title}</h2></div>${href ? `<a class="text-link" href="${href}">${label}${arrow}</a>`:''}</div>`;
}
function renderHome() {
  main.innerHTML = `
    <section class="home-hero"><div class="container home-hero__grid">
      <div class="home-hero__copy"><div class="hero-kicker"><span class="hero-kicker__line"></span> L'ESSENTIEL, EN MIEUX <span class="hero-kicker__line"></span></div>
      <h1>La tech qui<br>vous <em>ressemble.</em></h1>
      <p>Des accessoires bien pensés pour vos journées bien remplies. ${isLive ? 'Découvrez les références publiées par la boutique pilote et préparez votre commande.' : 'Explorez notre sélection fictive et composez votre panier, simplement.'}</p>
      <div class="hero-actions"><a class="btn btn--dark" href="#/catalogue">Explorer la boutique ${arrow}</a><a class="btn btn--outline" href="#/catalogue?category=audio">Découvrir l'audio</a></div>
      <div class="hero-counter"><strong>${PRODUCTS.length}</strong><span>${isLive?'références disponibles':'essentiels imaginés'}<br>pour le quotidien</span><span class="hero-counter__spark" aria-hidden="true">✳</span></div></div>
      <div class="hero-composition"><div class="hero-composition__panel"><span class="hero-stamp">ATLAS<br>OBJECTS<br>— 001</span><span class="hero-caption">01 / LA SÉLECTION AUDIO</span><img src="${(PRODUCTS.find(p => p.id==='studio-wave')?.images?.[0] || PRODUCTS[0]?.images?.[0] || fallback)}" alt="Photographie illustrative d’un casque audio" width="840" height="840" decoding="async"><span class="hero-orbit" aria-hidden="true">ATLAS · STORE · EVERYDAY · TECH ·</span></div><div class="hero-composition__bottom"><span>OBJETS UTILES. BELLES IDÉES.</span><span>FAIT POUR EXPLORER ↗</span></div></div>
    </div></section>
    <div class="marquee" aria-hidden="true"><div class="marquee__track"><span>DES OBJETS QUI COMPTENT</span><span>✳</span><span>UN QUOTIDIEN PLUS FLUIDE</span><span>✳</span><span>UN STYLE QUI VOUS SUIT</span><span>✳</span><span>DES OBJETS QUI COMPTENT</span><span>✳</span></div></div>
    <section class="section categories-section container" id="categories">${sectionHead('01 / DÉCOUVRIR', 'Quel est votre univers ?', '#/catalogue', 'Tout le catalogue')}
      <div class="categories-grid">${CATEGORIES.map((category,index) => `<a href="#/catalogue?category=${category.id}" class="category-card category-card--${category.id}"><div class="category-card__top"><span>0${index+1} / 04</span>${arrow}</div><img src="${PRODUCTS.find(p => p.id===category.art)?.images[0] || fallback}" alt="Photographie illustrative : ${escapeHtml(category.label)}" width="840" height="840" loading="lazy"><div class="category-card__bottom"><h3>${escapeHtml(category.short)}</h3><p>${escapeHtml(category.description)}</p></div></a>`).join('')}</div>
    </section>
    <section class="section featured-section container" id="selection">${sectionHead('02 / NOTRE SÉLECTION','À garder près de soi.','#/catalogue',`Voir les ${PRODUCTS.length} produits`)}
      <div class="product-grid featured-grid">${PRODUCTS.filter(product=>product.featured).map(productCard).join('')}</div>
    </section>
    <section class="editorial container" id="notre-approche"><div class="editorial__text"><p class="eyebrow">03 / L'ESPRIT ATLAS</p><h2>Moins de bruit.<br><em>Plus d'essentiel.</em></h2><p>On aime les objets simples à comprendre, agréables à utiliser et faciles à retrouver. ${isLive ? 'La boutique pilote présente uniquement les produits publiés par le commerçant.' : 'Atlas Store est un laboratoire interactif : admin, stocks et commandes de test dans votre navigateur.'}</p><a class="text-link" href="#/a-propos">À propos du projet ${arrow}</a></div><div class="editorial__graphic"><span class="editorial__asterisk" aria-hidden="true">✳</span><span>MADE FOR<br>EVERY DAY<br>OBJECTS.</span><small>ATLAS STUDIO / 2026</small></div></section>
    <section class="section benefit-section container"><p class="eyebrow">04 / EN TOUTE CLARTÉ</p><div class="benefit-grid"><div><span class="benefit-num">01</span><h3>Une sélection claire</h3><p>Des catégories simples et des fiches détaillées pour découvrir facilement les produits.</p></div><div><span class="benefit-num">02</span><h3>Un panier à votre rythme</h3><p>Ajoutez vos favoris et retrouvez votre sélection sur ce navigateur.</p></div><div><span class="benefit-num">03</span><h3>Une démo, sans ambiguïté</h3><p>${isLive ? 'Stocks recontrôlés sur le serveur. Commandes enregistrées et paiement à la remise.' : 'Produits fictifs ; administration et commandes testables localement, sans paiement.'}</p></div></div></section>
    <div class="container"><div class="end-cta"><div><p class="eyebrow">VOTRE PROCHAINE DÉCOUVERTE</p><h2>Prêt à trouver <em>votre essentiel ?</em></h2></div><a class="btn btn--light" href="#/catalogue">Voir tous les produits ${arrow}</a></div></div>`;
}
function categoryControl() {
  const choices = [{id:'all',label:'Tout voir'}, ...CATEGORIES.map(c => ({id:c.id,label:c.short}))];
  return `<div class="filter-categories" role="group" aria-label="Catégorie de produits">${choices.map(c=>`<button type="button" class="filter-chip ${state.category===c.id?'is-active':''}" data-category="${c.id}" aria-pressed="${state.category===c.id}">${escapeHtml(c.label)}</button>`).join('')}</div>`;
}
function option(value, label, actual) { return `<option value="${value}" ${actual===value ? 'selected':''}>${label}</option>`; }
function renderCatalog() {
  const products = queryProducts(state);
  main.innerHTML = `<section class="page-hero page-hero--catalog"><div class="container"><div class="breadcrumbs"><a href="#/">Accueil</a><span>/</span><span>Catalogue</span></div><div class="page-hero__heading"><div><p class="eyebrow">ATLAS / LE CATALOGUE</p><h1>La sélection<span class="text-orange">.</span></h1><p class="page-intro">Les accessoires qu'on aime avoir à portée de main. À explorer, à comparer, à ajouter au panier — pour le plaisir de la démo.</p></div><span class="page-hero__ornament" aria-hidden="true">✳</span></div></div></section>
    <div class="container catalog-layout"><aside class="filters" aria-label="Filtres de produits"><div class="filters__heading"><h2>Affiner</h2><button class="reset-link" type="button" data-reset-filters>Tout effacer</button></div><p class="filter-label">CATÉGORIES</p>${categoryControl()}<div class="filters__price"><label class="filter-label" for="price-filter">PRIX MAXIMUM</label><select id="price-filter" class="select-control"><option value="all" ${state.maxPrice==='all'?'selected':''}>Tous les prix</option>${option('5000','5 000 FCFA',state.maxPrice)}${option('10000','10 000 FCFA',state.maxPrice)}${option('15000','15 000 FCFA',state.maxPrice)}${option('25000','25 000 FCFA',state.maxPrice)}${option('35000','35 000 FCFA',state.maxPrice)}</select></div><div class="filters__note"><span>✳</span><p>${isLive ? 'Le stock affiché est recontrôlé lors de l’enregistrement de la commande.' : 'Stocks de test enregistrés dans votre navigateur et modifiables par l’administration.'}</p></div></aside>
    <section class="catalog-main" aria-label="Résultats du catalogue"><div class="catalog-toolbar"><div class="results-label"><strong id="result-count">${products.length}</strong> ${products.length===1?'produit trouvé':'produits trouvés'}${state.search?` <span class="searched-term">pour « ${escapeHtml(state.search)} »</span>`:''}</div><div class="sort-field"><label for="sort-select">Trier par</label><select id="sort-select" class="select-control select-control--sort">${option('default','Notre sélection',state.sort)}${option('price-asc','Prix : croissant',state.sort)}${option('price-desc','Prix : décroissant',state.sort)}${option('name','Nom : A à Z',state.sort)}</select></div></div>
    ${products.length ? `<div class="product-grid catalog-grid" id="catalog-results">${products.map(productCard).join('')}</div>` : `<div class="empty-state"><span class="empty-state__glyph" aria-hidden="true">⌕</span><h2>Aucun résultat, cette fois.</h2><p>Essayez un autre mot-clé, une autre catégorie ou un budget plus large.</p><button class="btn btn--dark" type="button" data-reset-filters>Réinitialiser les filtres ${arrow}</button></div>`}
    </section></div>`;
}
function quantityStepper(quantity,max,prefix='detail') {
  return `<div class="qty-stepper" role="group" aria-label="Modifier la quantité"><button type="button" data-${prefix}-step="-1" aria-label="Diminuer la quantité" ${quantity<=1?'disabled':''}>${minusIcon}</button><label class="sr-only" for="${prefix}-quantity">Quantité</label><input type="number" min="1" max="${max}" id="${prefix}-quantity" value="${quantity}" inputmode="numeric"><button type="button" data-${prefix}-step="1" aria-label="Augmenter la quantité" ${quantity>=max?'disabled':''}>${plusIcon}</button></div>`;
}
function renderDetail(productId) {
  const product = findProduct(productId);
  if (!product) return renderNotFound();
  let selected = findVariant(product, state.detailVariant);
  if (!selected) { selected = product.variants.find(v => v.stock>0) ?? product.variants[0]; state.detailVariant=selected.id; }
  if (!selected) return renderNotFound();
  const max = Math.min(selected.stock,MAX_PER_LINE);
  if (state.detailQuantity > Math.max(max,1)) state.detailQuantity = Math.max(max,1);
  const available = selected.stock>0;
  const recommended = PRODUCTS.filter(p=>p.category===product.category && p.id!==product.id).slice(0,3);
  main.innerHTML = `<div class="container product-page"><nav class="breadcrumbs" aria-label="Fil d'Ariane"><a href="#/">Accueil</a><span>/</span><a href="#/catalogue">Catalogue</a><span>/</span><span>${escapeHtml(product.name)}</span></nav>
    <div class="product-detail"><div class="product-gallery"><div class="product-gallery__main">${productPhoto(product,state.detailImage,'product-gallery__image')}<span class="product-gallery__label">PHOTO ILLUSTRATIVE / ${String(PRODUCTS.indexOf(product)+1).padStart(2,'0')}</span></div><div class="product-gallery__thumbnails" aria-label="Choisir une vue du produit">${product.images.map((src,index)=>`<button class="gallery-thumb ${index===state.detailImage?'is-active':''}" type="button" data-view-image="${index}" aria-label="${index ? 'Illustration conceptuelle' : 'Photo illustrative'} de ${escapeHtml(product.name)}" aria-pressed="${index===state.detailImage}">${productPhoto(product,index)}</button>`).join('')}</div></div>
    <div class="product-information"><p class="eyebrow">${escapeHtml(categoryFor(product.category))} <span class="separator-dot">/</span> ATLAS OBJECTS</p><h1>${escapeHtml(product.name)}</h1><p class="product-information__sub">${escapeHtml(product.sub)}</p><p class="product-information__price">${money(variantPrice(product,selected))}</p><p class="product-information__description">${escapeHtml(product.description)}</p>
    <div class="stock-line ${available?'':'stock-line--unavailable'}"><span class="stock-dot"></span>${available?`Disponible · ${selected.stock} unité${selected.stock>1?'s':''} ${isLive?'en stock':`fictive${selected.stock>1?'s':''}`}`:'Cette variante est indisponible'}</div>
    <fieldset class="variant-picker"><legend>FINITIONS <span class="variant-picker__chosen">— ${escapeHtml(selected.name)}</span></legend><div class="variant-list">${product.variants.map(v=>`<button type="button" class="variant-option ${selected.id===v.id?'is-selected':''} ${v.stock===0?'is-unavailable':''}" data-variant="${v.id}" aria-pressed="${selected.id===v.id}" aria-label="${escapeHtml(v.name)}${v.stock===0?' (indisponible)':''}" title="${escapeHtml(v.name)}${v.stock===0?' — indisponible':''}"><span class="color-swatch" style="--swatch:${escapeHtml(v.color)}"></span><span>${escapeHtml(v.name)}</span>${v.stock===0?'<span class="variant-cross" aria-hidden="true">×</span>':''}</button>`).join('')}</div></fieldset>
    <div class="purchase-controls"><div><p class="purchase-label">QUANTITÉ</p>${quantityStepper(state.detailQuantity,Math.max(max,1))}</div><button class="btn btn--dark add-cart-btn" type="button" data-add-cart ${available?'':'disabled'}>${available?'Ajouter au panier':'Indisponible'} ${available?arrow:''}</button></div><p class="demo-disclaimer">${isLive ? 'Caractéristiques et disponibilités mises à jour par le commerçant. Prix revalidés lors de la commande.' : 'Modèle illustratif. Commandes de test locales uniquement ; aucun achat réel.'}</p>
    <div class="features-box"><h2>Les détails du produit</h2><ul>${product.features.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul><p>Caractéristiques présentées pour la démonstration, sans garantie commerciale.</p></div></div></div>
    <section class="section related-section">${sectionHead('VOUS AIMEREZ AUSSI','Dans le même univers.','#/catalogue','Voir tout')}<div class="product-grid related-grid">${recommended.map(productCard).join('')}</div></section></div>`;
}
function renderCartItem(line,compact=false) {
  const { product, variant, quantity, unitPrice, total } = line;
  return `<article class="cart-item ${compact?'cart-item--compact':''}"><a href="${productUrl(product)}" class="cart-item__photo" aria-label="Voir ${escapeHtml(product.name)}">${productPhoto(product)}</a><div class="cart-item__body"><p class="cart-item__eyebrow">${escapeHtml(product.sub)}</p><h3><a href="${productUrl(product)}">${escapeHtml(product.name)}</a></h3><p class="cart-item__variant"><span class="color-swatch" style="--swatch:${escapeHtml(variant.color)}"></span>${escapeHtml(variant.name)}</p><p class="cart-item__unit">${money(unitPrice)} / unité</p><div class="cart-item__actions"><div class="qty-stepper qty-stepper--small" role="group" aria-label="Quantité de ${escapeHtml(product.name)}, ${escapeHtml(variant.name)}"><button data-cart-step="-1" data-product="${product.id}" data-variant-id="${variant.id}" aria-label="Diminuer la quantité de ${escapeHtml(product.name)}" type="button" ${quantity<=1?'disabled':''}>${minusIcon}</button><span aria-label="Quantité : ${quantity}">${quantity}</span><button data-cart-step="1" data-product="${product.id}" data-variant-id="${variant.id}" aria-label="Augmenter la quantité de ${escapeHtml(product.name)}" type="button" ${quantity>=Math.min(variant.stock,MAX_PER_LINE)?'disabled':''}>${plusIcon}</button></div><button class="remove-btn" type="button" data-remove="1" data-product="${product.id}" data-variant-id="${variant.id}">Retirer</button></div></div><strong class="cart-item__total">${money(total)}</strong></article>`;
}
function cartEmpty(compact=false) {
  return `<div class="cart-empty"><div class="cart-empty__illustration" aria-hidden="true">⌑</div><h2>Votre panier attend<br>ses premiers objets.</h2><p>Parcourez nos essentiels et composez votre sélection à votre rythme.</p><a class="btn btn--dark" href="#/catalogue" ${compact?'data-close-drawer':''}>Découvrir les produits ${arrow}</a></div>`;
}
function cartSummary(lines,recap=false) {
  return `<div class="cart-summary"><h2>Résumé ${recap?'de votre sélection':'du panier'}</h2><div class="summary-row"><span>Articles (${cartCount()})</span><strong>${money(cartTotal())}</strong></div><div class="summary-row summary-row--total"><span>Sous-total</span><strong>${money(cartTotal())}</strong></div><div class="summary-note">✳ <span>${isLive ? 'Montant indicatif avant validation serveur. Paiement au retrait ou à la livraison.' : 'Mode laboratoire : commandes de test enregistrées localement. Aucun paiement réel.'}</span></div>${!recap ? '<a href="#/checkout" class="btn btn--dark summary-btn">'+(isLive?'Préparer ma commande':'Commander en test')+' →</a>' : ''}${!recap?`<a href="#/recapitulatif" class="btn btn--dark summary-btn">Voir le récapitulatif ${arrow}</a>`:''}<a class="summary-back" href="#/catalogue">Continuer mes achats ${arrow}</a></div>`;
}
function renderCartPage() {
  const lines = getDetailedCart();
  main.innerHTML = `<div class="container inside-page"><nav class="breadcrumbs" aria-label="Fil d'Ariane"><a href="#/">Accueil</a><span>/</span><span>Panier</span></nav><div class="inside-page__head"><div><p class="eyebrow">VOTRE SÉLECTION</p><h1>Mon panier<span class="text-orange">.</span></h1></div><p>${cartCount()} article${cartCount()>1?'s':''} · ${isLive ? 'Boutique pilote' : 'Démonstration'}</p></div>${lines.length?`<div class="cart-layout"><section class="cart-list" aria-label="Articles du panier"><div class="cart-list__head"><strong>MES ARTICLES</strong><button class="reset-link" type="button" data-clear-cart>Vider mon panier</button></div>${lines.map(line=>renderCartItem(line)).join('')}</section>${cartSummary(lines)}</div>`:cartEmpty()}</div>`;
}
function renderRecap() {
  const lines = getDetailedCart();
  main.innerHTML = `<div class="container inside-page"><nav class="breadcrumbs" aria-label="Fil d'Ariane"><a href="#/">Accueil</a><span>/</span><a href="#/panier">Panier</a><span>/</span><span>Récapitulatif</span></nav><div class="inside-page__head"><div><p class="eyebrow">AVANT DE PARTIR</p><h1>Votre récap<span class="text-orange">.</span></h1></div><p>La sélection, en un coup d'œil.</p></div><div class="recap-banner"><span aria-hidden="true">✳</span><p><strong>${isLive ? 'Boutique pilote : commande enregistrée uniquement après confirmation du serveur.' : 'Laboratoire interactif : une commande de test peut être enregistrée sur cet appareil, sans paiement réel.'}</strong><br>${isLive ? 'Aucun paiement n’est encaissé en ligne. Pour enregistrer réellement une commande, poursuivez vers le formulaire de commande.' : 'Le formulaire suivant enregistrera une commande de test dans ce navigateur, consultable depuis l’administration locale.'}</p></div>${lines.length?`<div class="cart-layout"><div class="recap-list"><h2>Vos articles (${cartCount()})</h2>${lines.map(line=>`<div class="recap-item"><div class="recap-item__image">${productPhoto(line.product)}</div><div><h3>${escapeHtml(line.product.name)}</h3><p>${escapeHtml(line.variant.name)} · Quantité : ${line.quantity}</p><p>${money(line.unitPrice)} / unité</p></div><strong>${money(line.total)}</strong></div>`).join('')}</div>${cartSummary(lines,true)}</div><div class="recap-actions"><a class="btn btn--dark" href="#/checkout">${isLive?'Passer à la commande':'Passer une commande de test'} →</a><a class="btn btn--outline" href="#/panier">Modifier mon panier ${arrow}</a><a class="text-link" href="#/catalogue">Continuer à explorer ${arrow}</a></div>`:cartEmpty()}</div>`;
}
function renderCheckout() {
  const lines=getDetailedCart();const settings=getSettings();
  // Le laboratoire autorise une commande de test locale ; le mode commercial reste sécurisé côté serveur.
  if(!lines.length){renderCartPage();return}
  if(!settings?.pickupEnabled&&!settings?.deliveryEnabled){main.innerHTML='<div class="container inside-page"><h1>Commande non disponible</h1><p class="pilot-notice">Le commerçant n’a pas encore configuré de mode de remise.</p></div>';return}
  const methods=[settings.pickupEnabled?`<label class="choice"><input type="radio" name="fulfillment" value="pickup" ${!settings.deliveryEnabled?'checked':''} required><span><strong>Retrait</strong> — ${escapeHtml(settings.pickupDescription||'Modalités à confirmer par le commerçant')}</span></label>`:'',settings.deliveryEnabled?`<label class="choice"><input type="radio" name="fulfillment" value="delivery" ${!settings.pickupEnabled?'checked':''} required><span><strong>Livraison</strong> — ${money(settings.deliveryFee)} de frais configurés</span></label>`:''].join('');
  main.innerHTML=`<div class="container inside-page"><nav class="breadcrumbs"><a href="#/">Accueil</a> / <a href="#/panier">Panier</a> / Finaliser</nav><div class="inside-page__head"><div><p class="eyebrow">COMMANDE PILOTE</p><h1>Vos coordonnées<span class="text-orange">.</span></h1></div></div><p class="pilot-notice">${isLive?'La commande sera enregistrée uniquement si le serveur la confirme.':'La commande de TEST sera enregistrée sur cet appareil uniquement. N’utilise pas de vraies coordonnées personnelles.'} <strong>Aucun paiement n’est encaissé en ligne.</strong> Les prix et quantités sont recalculés à la validation.</p><div class="checkout-layout"><form id="checkout-form" class="checkout-form"><div class="field"><label for="buyer-name">Nom complet *</label><input id="buyer-name" name="name" autocomplete="name" minlength="2" maxlength="120" required></div><div class="field"><label for="buyer-contact">Téléphone ou moyen de contact *</label><input id="buyer-contact" name="contact" autocomplete="tel" minlength="6" maxlength="120" required></div><fieldset><legend>Mode de réception *</legend>${methods}</fieldset><div class="field"><label for="buyer-city">Ville / quartier</label><input id="buyer-city" name="city" maxlength="160" autocomplete="address-level2" placeholder="Obligatoire pour la livraison"></div><div class="field"><label for="buyer-address">Adresse ou point de rencontre</label><input id="buyer-address" name="address" maxlength="400" autocomplete="street-address" placeholder="Obligatoire pour la livraison"></div><div class="field"><label for="buyer-notes">Précisions (facultatif)</label><textarea id="buyer-notes" name="notes" maxlength="1000"></textarea></div><label class="choice"><input type="checkbox" name="consent" required><span>J’accepte que mes coordonnées soient utilisées pour le traitement de cette commande. ${settings.privacyNotice ? escapeHtml(settings.privacyNotice).slice(0,200) : 'Les informations ne sont pas publiques.'}</span></label><div id="checkout-feedback" role="alert" aria-live="polite"></div><button class="btn btn--dark checkout-submit" type="submit">Enregistrer la commande ${arrow}</button><small>Paiement à la livraison ou au retrait, non encore encaissé.</small></form><aside class="checkout-summary"><h2>Récapitulatif</h2>${lines.map(l=>`<div class="checkout-summary__item"><span>${escapeHtml(l.product.name)}<br><small>${escapeHtml(l.variant.name)} × ${l.quantity}</small></span><strong>${money(l.total)}</strong></div>`).join('')}<div class="checkout-summary__total"><span>Sous-total</span><strong>${money(cartTotal())}</strong></div><small>Des frais de livraison peuvent s'ajouter selon l'option choisie.</small></aside></div></div>`;
}
async function renderTracking(reference,token){
  if(!reference||!token){renderNotFound();return}
  main.innerHTML='<div class="container inside-page"><h1>Suivi de votre commande</h1><p role="status">Vérification du lien sécurisé…</p></div>';
  try{
    const d=await trackOrder(reference,token);
    if(currentLocation().path!==`/suivi/${reference}`)return;
    main.innerHTML=`<div class="container inside-page"><p class="eyebrow">SUIVI SÉCURISÉ</p><h1>Commande ${escapeHtml(d.reference)}</h1><p class="pilot-notice pilot-notice--success">Statut actuel : <strong>${escapeHtml(d.status)}</strong>. Paiement : <strong>non encaissé en ligne</strong>.</p><div class="checkout-layout"><section><h2>Vos articles</h2>${d.items.map(item=>`<div class="checkout-summary__item"><span>${escapeHtml(item.product_name)} — ${escapeHtml(item.variant_label)} × ${item.quantity}</span><strong>${money(item.line_total)}</strong></div>`).join('')}<div class="checkout-summary__total">Total : ${money(d.total)}</div></section><aside><h2>Historique</h2><ol class="status-history">${d.events.map(ev=>`<li><strong>${escapeHtml(ev.to_status)}</strong><time datetime="${escapeHtml(ev.created_at)}">${new Date(ev.created_at).toLocaleString('fr-FR')}</time></li>`).join('')}</ol></aside></div><p>${isLive?'Conservez ce lien privé ; il expire après 30 jours.':'Suivi de TEST valable uniquement dans ce navigateur. Ce lien ne donne pas accès à un serveur réel.'}</p></div>`;
  }catch(e){main.innerHTML=`<div class="container inside-page"><h1>Lien de suivi indisponible</h1><p class="pilot-notice pilot-notice--warning">${escapeHtml(e.message)}</p><a href="#/" class="btn btn--dark">Retour à l'accueil</a></div>`}
}
function renderDemoOrLiveRecap(){renderRecap()}
function renderAbout() {
  main.innerHTML = `<div class="container inside-page"><nav class="breadcrumbs"><a href="#/">Accueil</a><span>/</span><span>Notre approche</span></nav><div class="about-hero"><p class="eyebrow">ATLAS / À PROPOS</p><h1>De belles idées.<br><em>Des objets utiles.</em></h1><p>Atlas Store est ${isLive ? 'une boutique pilote développée dans le cadre de Kainova Training, avec catalogue et commandes réels.' : 'une boutique fictive développée dans le cadre du Projet 02 de Kainova Training.'} Elle montre comment un catalogue, des filtres et un panier peuvent fonctionner avec une interface JavaScript, ${isLive?'une API sécurisée et une base PostgreSQL.':'entièrement dans le navigateur.'}</p></div><div class="about-grid"><div><span>01 /</span><h2>Un vrai parcours interactif.</h2><p>Recherche, filtres, variantes et panier : chaque action modifie réellement l'interface à partir de données locales.</p></div><div><span>02 /</span><h2>Commandes de test.</h2><p>Le laboratoire enregistre des commandes fictives sur cet appareil, sans paiement et sans transmission à un serveur.</p></div><div><span>03 /</span><h2>Tout reste ici.</h2><p>Produits modifiés, panier et commandes tests sont enregistrés sur ce navigateur. Rien n'est synchronisé avec d'autres appareils.</p></div></div><div class="about-cta"><h2>Envie de parcourir<br>la sélection ?</h2><a class="btn btn--dark" href="#/catalogue">Visiter la boutique ${arrow}</a></div></div>`;
}
function renderNotFound() {
  main.innerHTML = `<div class="container inside-page"><div class="empty-state empty-state--404"><span class="empty-state__glyph">404</span><h1>Cet objet reste introuvable.</h1><p>Le lien n'existe plus, ou n'a jamais existé.</p><a class="btn btn--dark" href="#/catalogue">Revenir au catalogue ${arrow}</a></div></div>`;
}
function updateCounters() {
  const count = cartCount();
  $('#header-cart-count').textContent = count > 99 ? '99+' : String(count);
  $('#cart-trigger').setAttribute('aria-label', `Ouvrir le panier, ${count} article${count>1?'s':''}`);
  $('#drawer-count').textContent = `(${count})`;
}
function renderDrawer() {
  const lines = getDetailedCart();
  $('#drawer-items').innerHTML = lines.length ? lines.map(line=>renderCartItem(line,true)).join('') : cartEmpty(true);
  $('#drawer-bottom').innerHTML = lines.length ? `<div class="drawer-subtotal"><span>Sous-total · ${cartCount()} article${cartCount()>1?'s':''}</span><strong>${money(cartTotal())}</strong></div><a href="#/panier" class="btn btn--dark drawer-cta">Voir mon panier ${arrow}</a><p class="drawer-warning">${isLive ? 'Prix soumis à vérification lors de la commande.' : 'Panier de test — commande locale possible, aucun paiement réel.'}</p>` : '';
}
function openDrawer() {
  if (!drawerLayer.hidden) return;
  previousFocus = document.activeElement;
  renderDrawer();
  drawerLayer.hidden = false;
  document.body.classList.add('has-drawer');
  $('#drawer-close').focus();
}
function closeDrawer() {
  if (drawerLayer.hidden) return;
  drawerLayer.hidden = true;
  document.body.classList.remove('has-drawer');
  (previousFocus?.isConnected ? previousFocus : $('#cart-trigger'))?.focus();
}
function currentLocation() {
  const raw = location.hash.slice(1) || '/';
  const [path,query=''] = raw.split('?');
  return { path: path.startsWith('/') ? path : '/', params:new URLSearchParams(query) };
}
function route() {
  closeDrawer();
  const {path,params} = currentLocation();
  const nextPage=path.startsWith('/produit/')?'detail':path;
  if (nextPage !== currentPage) {
    if (path === '/catalogue') {
      state.category = 'all'; state.maxPrice='all'; state.sort='default';
    }
    if (nextPage==='detail') { state.detailVariant=null; state.detailQuantity=1; state.detailImage=0; }
  }
  currentPage = nextPage;
  if (path==='/') renderHome();
  else if(path==='/catalogue') {
    const requested = params.get('category');
    if (requested && CATEGORIES.some(c=>c.id===requested)) state.category=requested;
    renderCatalog();
  }
  else if(path.startsWith('/produit/')) renderDetail(decodeURIComponent(path.slice('/produit/'.length)));
  else if(path==='/panier') renderCartPage();
  else if(path==='/recapitulatif') renderRecap();
  else if(path==='/checkout') renderCheckout();
  else if(path.startsWith('/suivi/')) renderTracking(decodeURIComponent(path.slice('/suivi/'.length)),params.get('token'));
  else if(path==='/a-propos') renderAbout();
  else renderNotFound();
  document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('is-active', a.dataset.nav===(path==='/'?'home':path==='/catalogue'?'catalog':path==='/a-propos'?'about':'none')));
  window.scrollTo({top:0,behavior:'auto'});
}
function refreshViews() {
  updateCounters();
  if (!drawerLayer.hidden) renderDrawer();
  if (currentPage==='/panier') renderCartPage();
  if (currentPage==='/recapitulatif') renderRecap();
}
function resetFilters() {
  Object.assign(state,{search:'',category:'all',maxPrice:'all',sort:'default'});
  searchInput.value='';
  renderCatalog();
}
function onDetailStep(delta) {
  const product = findProduct(currentLocation().path.slice('/produit/'.length));
  const variant = findVariant(product,state.detailVariant);
  const limit = Math.min(MAX_PER_LINE,variant?.stock ?? 0);
  state.detailQuantity = Math.max(1,Math.min(Math.max(limit,1),state.detailQuantity+delta));
  const field=$('#detail-quantity'); if(field) field.value=state.detailQuantity;
  const buttons=main.querySelectorAll('[data-detail-step]');
  buttons.forEach(button=>{ button.disabled=Number(button.dataset.detailStep)<0 ? state.detailQuantity<=1 : state.detailQuantity>=limit; });
}

main.addEventListener('submit', async event => {
  const form=event.target;
  if(form.id!=='checkout-form')return;
  event.preventDefault();
  const button=form.querySelector('[type="submit"]');const feedback=form.querySelector('#checkout-feedback');
  if(!form.reportValidity())return;
  const d=new FormData(form);
  const lines=getDetailedCart();
  if(!lines.length){feedback.textContent='Votre panier est vide.';return}
  const fulfillment=d.get('fulfillment');
  if(!fulfillment){feedback.textContent='Choisissez le mode de réception.';return}
  const data={requestKey:crypto.randomUUID(),name:d.get('name'),contact:d.get('contact'),city:d.get('city'),address:d.get('address'),notes:d.get('notes'),fulfillment,consent:d.has('consent'),items:lines.map(l=>({productId:l.productId,variantId:l.variantId,quantity:l.quantity}))};
  // La même clé est conservée en cas d'échec réseau pour éviter les doublons de commande.
  try{const old=JSON.parse(sessionStorage.getItem('atlas-pending-order')||'null');if(old&&JSON.stringify(old.data.items)===JSON.stringify(data.items)&&old.data.fulfillment===data.fulfillment&&old.data.name===data.name&&old.data.contact===data.contact&&old.data.city===data.city&&old.data.address===data.address&&old.data.notes===data.notes)data.requestKey=old.data.requestKey;sessionStorage.setItem('atlas-pending-order',JSON.stringify({data}));}catch{}
  button.disabled=true;feedback.textContent='Enregistrement sécurisé en cours…';
  try{
    const result=await createOrder(data);
    if(!result?.reference||!result?.trackingToken)throw new Error('Réponse serveur incomplète');
    try{sessionStorage.removeItem('atlas-pending-order')}catch{}
    clearCart();
    location.hash=`#/suivi/${encodeURIComponent(result.reference)}?token=${encodeURIComponent(result.trackingToken)}`;
    showToast(isLive ? `Commande ${result.reference} enregistrée par le serveur.` : `Commande TEST ${result.reference} enregistrée sur cet appareil.`);
    await refreshLiveCatalog();refreshCartFromStorage();
  }catch(error){feedback.textContent=error.message||'La commande n’a pas été enregistrée.';button.disabled=false}
});
// Les événements sont délégués à un conteneur stable : les vues peuvent être recréées sans perdre leurs interactions.
main.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-category')) { state.category=button.dataset.category; renderCatalog(); return; }
  if (button.hasAttribute('data-reset-filters')) { resetFilters(); return; }
  if (button.hasAttribute('data-variant')) { state.detailVariant=button.dataset.variant; state.detailQuantity=1; renderDetail(currentLocation().path.split('/').pop()); main.querySelector(`[data-variant="${CSS.escape(button.dataset.variant)}"]`)?.focus(); return; }
  if (button.hasAttribute('data-view-image')) {
    state.detailImage=Number(button.dataset.viewImage);
    const product=findProduct(currentLocation().path.split('/').pop());
    const image=main.querySelector('.product-gallery__image');
    if(image&&product) {image.src=product.images[state.detailImage];image.alt=`${state.detailImage ? 'Vue conceptuelle de' : 'Photographie illustrative pour'} ${product.name}`;}
    main.querySelectorAll('[data-view-image]').forEach(b=>{b.classList.toggle('is-active',b===button);b.setAttribute('aria-pressed',String(b===button));});
    return;
  }
  if (button.hasAttribute('data-detail-step')) {onDetailStep(Number(button.dataset.detailStep));return;}
  if (button.hasAttribute('data-add-cart')) {
    const id=currentLocation().path.split('/').pop();
    const result=addItem(id,state.detailVariant,state.detailQuantity);
    showToast(result.message + (result.ok && !storageAvailable()?' Sauvegarde locale indisponible.':''));
    return;
  }
  if (button.hasAttribute('data-clear-cart')) {
    if (window.confirm('Vider entièrement le panier de démonstration ?')) {clearCart();showToast('Votre panier est maintenant vide.');}
    return;
  }
  handleCartButton(button);
});
function handleCartButton(button) {
  const productId=button.dataset.product; const variantId=button.dataset.variantId;
  if(button.hasAttribute('data-remove')) {removeItem(productId,variantId);showToast('Article retiré du panier.');return;}
  if(button.hasAttribute('data-cart-step')) {
    const line=getDetailedCart().find(l=>l.productId===productId&&l.variantId===variantId);
    if(!line)return;
    const value=line.quantity+Number(button.dataset.cartStep);
    if(value===0) {removeItem(productId,variantId);return;}
    const result=setQuantity(productId,variantId,value);if(!result.ok)showToast(result.message);
  }
}
main.addEventListener('change', event => {
  const target=event.target;
  if(target.id==='price-filter'){state.maxPrice=target.value;renderCatalog();}
  if(target.id==='sort-select'){state.sort=target.value;renderCatalog();}
  if(target.id==='detail-quantity') {
    const raw=target.value.trim();
    const number=Number(raw);
    const product=findProduct(currentLocation().path.split('/').pop());
    const variant=findVariant(product,state.detailVariant);
    const max=Math.min(MAX_PER_LINE,variant?.stock??0);
    if(!/^\d+$/.test(raw)||!Number.isSafeInteger(number)||number<1||number>max){target.value=state.detailQuantity;showToast(`Choisissez une quantité entre 1 et ${max || 1}.`);return;}
    state.detailQuantity=number;
    main.querySelectorAll('[data-detail-step]').forEach(button=>button.disabled=Number(button.dataset.detailStep)<0?number<=1:number>=max);
  }
});
searchInput.addEventListener('input',()=>{
  state.search=searchInput.value;
  if(currentLocation().path==='/catalogue') renderCatalog();
});
$('#header-search').addEventListener('submit',event=>{
  event.preventDefault();state.search=searchInput.value;
  if(currentLocation().path==='/catalogue')renderCatalog();else location.hash='#/catalogue';
});
$('#cart-trigger').addEventListener('click',openDrawer);
$('#drawer-close').addEventListener('click',closeDrawer);
drawerLayer.addEventListener('click',event=>{
  if(event.target.hasAttribute('data-close-drawer'))closeDrawer();
  const button=event.target.closest('button');if(button)handleCartButton(button);
  if(event.target.closest('a[href^="#/"]'))closeDrawer();
});
window.addEventListener('keydown',event=>{
  if(drawerLayer.hidden)return;
  if(event.key==='Escape'){closeDrawer();return;}
  if(event.key!=='Tab')return;
  const focusable=[...drawer.querySelectorAll('a[href],button:not([disabled]),input:not([disabled])')].filter(el=>el.getClientRects().length);
  if(!focusable.length){event.preventDefault();drawer.focus();return;}
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
});
window.addEventListener('hashchange',route);
document.addEventListener('atlas:cart-change',refreshViews);
document.addEventListener('error',event=>{
  const element=event.target;
  if(element instanceof HTMLImageElement && element.dataset.fallbackApplied!=='1'){
    element.dataset.fallbackApplied='1';element.src=fallback;
  }
},true);
$('#footer-year').textContent=String(new Date().getFullYear());
async function bootstrap(){
  {
    main.innerHTML='<div class="container inside-page"><p role="status">Chargement des produits en cours…</p></div>';
    const result=await refreshLiveCatalog();
    if(result.error){main.innerHTML=`<div class="container inside-page"><h1>Catalogue temporairement indisponible</h1><p class="pilot-notice pilot-notice--warning">${escapeHtml(result.error)}. Aucun produit fictif ne sera présenté comme un stock réel.</p><button class="btn btn--dark" type="button" id="reload-catalog">Réessayer</button></div>`;$('#reload-catalog').addEventListener('click',()=>bootstrap());return}
    refreshCartFromStorage();
    const bar=$('.announcement');if(bar)bar.textContent='ATLAS STORE / BOUTIQUE PILOTE · COMMANDES AVEC PAIEMENT À LA REMISE';
    const footer=$('.footer__bottom');if(footer){const labels=footer.querySelectorAll('span');if(labels[labels.length-1])labels[labels.length-1].textContent='Paiement hors ligne uniquement.'}
  }
  if(isLive){
    const wa=whatsAppUrl('Bonjour Atlas Store, je souhaite obtenir des informations sur vos produits.');
    if(wa){const footer=$('.footer__links');if(footer)footer.insertAdjacentHTML('beforeend',`<div><strong>Nous contacter</strong><a href="${wa}" target="_blank" rel="noopener noreferrer">Ouvrir WhatsApp ↗</a><small>Le message n'est pas envoyé automatiquement.</small></div>`)}
  }
  if(!isLive){
    const bar=$('.announcement');if(bar)bar.innerHTML='<span aria-hidden="true">✳</span> ATLAS STORE / LABORATOIRE LOCAL — COMMANDES DE TEST UNIQUEMENT <span aria-hidden="true">✳</span>';
    const footer=$('.footer__bottom');if(footer){const labels=footer.querySelectorAll('span');if(labels[labels.length-1])labels[labels.length-1].textContent='Tests enregistrés sur cet appareil uniquement.'}
  }
  updateCounters();route();
}
window.addEventListener('storage',event=>{if(!isLive&&event.key==='atlas-store-lab-v1'){invalidateLabCache();refreshLiveCatalog().then(()=>{refreshCartFromStorage();route()})}});
bootstrap();
