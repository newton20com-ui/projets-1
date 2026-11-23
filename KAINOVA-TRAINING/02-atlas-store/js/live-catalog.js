import { PRODUCTS, CATEGORIES } from './products.js';
import { catalog,isLive } from './api.js';
let settings = null;
let error = null;
export function getSettings(){return settings}
export function getCatalogError(){return error}
export async function refreshLiveCatalog(){
  // En laboratoire, le même catalogue local modifiable est partagé entre boutique et administration.
  try{
    const data=await catalog();
    CATEGORIES.splice(0,CATEGORIES.length,...data.categories.filter(c=>c.active).map((c,i)=>({id:c.slug,label:c.label,short:c.label,description:c.description,art:data.products.find(p=>p.category===c.slug)?.slug||'',order:c.order})));
    PRODUCTS.splice(0,PRODUCTS.length,...data.products.map(p=>({
      id:p.slug,name:p.name,sub:p.sub,category:p.category,price:p.price,badge:p.badge,featured:p.featured,
      tagline:p.tagline,description:p.description,features:p.features,keywords:p.keywords,
      images:p.images.map(im=>im.url),variants:p.variants.filter(v=>v.active).map(v=>({id:v.sku,name:v.name,stock:v.stock,color:v.color||'#b4b4b4',extraPrice:v.extraPrice}))
    })));
    settings=data.settings;
    error=null;
    return {isDemo:!isLive,count:PRODUCTS.length};
  }catch(e){error=e.message||'Service indisponible';PRODUCTS.splice(0);CATEGORIES.splice(0);return {error};}
}
