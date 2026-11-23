import { PRODUCTS } from './products.js';
export function normalizeSearch(text) {
  return String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replace(/[^a-z0-9]+/g, ' ').trim();
}
export function queryProducts({ search = '', category = 'all', maxPrice = 'all', sort = 'default' } = {}) {
  const terms = normalizeSearch(search).split(' ').filter(Boolean);
  let products = PRODUCTS.filter(product => {
    if (category !== 'all' && product.category !== category) return false;
    if (maxPrice !== 'all' && product.price > Number(maxPrice)) return false;
    const searchable = normalizeSearch([product.name, product.sub, product.category, product.description, ...product.keywords].join(' '));
    return terms.every(term => searchable.includes(term));
  });
  const sorters = {
    'price-asc': (a,b) => a.price - b.price || a.name.localeCompare(b.name,'fr'),
    'price-desc': (a,b) => b.price - a.price || a.name.localeCompare(b.name,'fr'),
    'name': (a,b) => a.name.localeCompare(b.name,'fr'),
  };
  if (sorters[sort]) products = [...products].sort(sorters[sort]);
  return products;
}
