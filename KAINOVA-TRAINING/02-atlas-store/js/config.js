/** Valeurs PUBLIQUES uniquement. À remplir pour le projet Supabase Atlas isolé.
 * Ne jamais placer une clé service_role ou un secret dans ce fichier. */
export const ATLAS_CONFIG = Object.freeze({
  supabaseUrl: 'https://bdcayckhcoejmmphivhp.supabase.co',
  publishableKey: 'sb_publishable_hMRgpBX8EGKzkBGaQHCeQQ_yNjQNGop'
});
export const isLive = Boolean(ATLAS_CONFIG.supabaseUrl && ATLAS_CONFIG.publishableKey);
