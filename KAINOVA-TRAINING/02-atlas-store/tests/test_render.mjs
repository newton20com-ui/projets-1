import assert from 'node:assert/strict';
const elements = new Map();
const events = {};
const fakeClasses = {add(){},remove(){},toggle(){}};
function el(id) {
  if (!elements.has(id)) elements.set(id, {id,hidden:true,value:'',textContent:'',innerHTML:'',classList:fakeClasses,attributes:{},listeners:{},addEventListener(type,fn){this.listeners[type]=fn},setAttribute(k,v){this.attributes[k]=v},getAttribute(k){return this.attributes[k]},querySelectorAll(){return []},querySelector(){return null},focus(){},getClientRects(){return [1]}});
  return elements.get(id);
}
const main = el('#main-content');
const docListeners = {};
globalThis.document = {
  querySelector:sel=>el(sel),querySelectorAll:sel=>[],
  body:{classList:fakeClasses},
  addEventListener(type,handler){docListeners[type]=handler},
  dispatchEvent(e){docListeners[e.type]?.(e)}
};
globalThis.CustomEvent = class {constructor(type){this.type=type}};
globalThis.window = {addEventListener(type,fn){events[type]=fn},scrollTo(){}};
globalThis.location={hash:'#/'};
globalThis.localStorage={getItem:()=>null,setItem(){}};
await import('../js/app.js');
const render=(route)=>{location.hash='#'+route;events.hashchange()};
function check(name,condition){assert.ok(condition,name);console.log('✓ '+name)}
check('Accueil généré avec sections',main.innerHTML.includes('Quel est votre univers ?') && main.innerHTML.includes('À garder près de soi.') && main.innerHTML.includes('La tech qui'));
render('/catalogue');check('Catalogue rendu avec 16 fiches', (main.innerHTML.match(/class="product-card"/g)||[]).length === 16);
render('/produit/neo-pods');check('Fiche produit et finitions rendues',main.innerHTML.includes('Neo Pods')&&main.innerHTML.includes('Blanc craie')&&main.innerHTML.includes('Ajouter au panier'));
render('/produit/filaires-usbc');check('Indisponibilité illustrée dans la vue',main.innerHTML.includes('data-add-cart disabled'));
render('/panier');check('Panier vide visible',main.innerHTML.includes('Votre panier attend'));
render('/recapitulatif');check('Récapitulatif laboratoire rendu',main.innerHTML.includes('Laboratoire interactif') && main.innerHTML.includes('sans paiement réel'));
render('/a-propos');check('Page explication rendue',main.innerHTML.includes('Atlas Store est une boutique fictive'));
render('/route-inconnue');check('Erreur 404',main.innerHTML.includes('Cet objet reste introuvable'));
console.log('8/8 rendus testés dans un DOM minimal simulé (non équivalent à un navigateur).');
