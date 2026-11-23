/** Recrée le fichier seed.sql de manière reproductible depuis les données locales du Projet 02.
 * Les 16 modèles restent en brouillon fictif et ne sont JAMAIS vendables. */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PRODUCTS, CATEGORIES } from '../js/products.js';
const base=dirname(fileURLToPath(import.meta.url));
const quote=x=>`'${String(x??'').replaceAll("'","''")}'`;
const j=x=>`${quote(JSON.stringify(x))}::jsonb`;
const stmts=['-- Catalogue Atlas d’origine : 16 modèles DEMO non vendables. Ne pas écraser les modifications commerçant.', 'BEGIN;'];
for(const [i,c] of CATEGORIES.entries())stmts.push(`INSERT INTO public.atlas_categories(slug,name,description,sort_order) VALUES(${quote(c.id)},${quote(c.label)},${quote(c.description)},${i}) ON CONFLICT(slug) DO NOTHING;`);
for(const p of PRODUCTS){
  stmts.push(`INSERT INTO public.atlas_products(slug,name,subtitle,description,tagline,features,keywords,base_price,category_id,status,is_demo,featured,badge) VALUES(${quote(p.id)},${quote(p.name)},${quote(p.sub)},${quote(p.description)},${quote(p.tagline)},${j(p.features)},${j(p.keywords)},${p.price},(SELECT id FROM public.atlas_categories WHERE slug=${quote(p.category)}),'draft',true,${p.featured?'true':'false'},${quote(p.badge)}) ON CONFLICT(slug) DO NOTHING;`);
  for(const v of p.variants)stmts.push(`INSERT INTO public.atlas_variants(product_id,sku,label,color,price_delta,stock,active) SELECT id,${quote(v.id)},${quote(v.name)},${quote(v.color)},${v.extraPrice},${v.stock},true FROM public.atlas_products WHERE slug=${quote(p.id)} ON CONFLICT(product_id,sku) DO NOTHING;`);
  for(const [i,img] of p.images.entries())stmts.push(`INSERT INTO public.atlas_product_images(product_id,url,alt,sort_order) SELECT id,${quote(img)},${quote(i?'Illustration conceptuelle':'Photographie indicative')},${i} FROM public.atlas_products WHERE slug=${quote(p.id)} AND NOT EXISTS (SELECT 1 FROM public.atlas_product_images WHERE product_id=atlas_products.id AND url=${quote(img)});`);
}
stmts.push('COMMIT;');
writeFileSync(join(base,'seed.sql'),stmts.join('\n')+'\n','utf8');
console.log(`${PRODUCTS.length} produits DEMO et ${CATEGORIES.length} catégories exportés`);
