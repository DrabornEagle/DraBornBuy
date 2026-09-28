import { readFile, writeFile } from 'node:fs/promises';

const dbb_api_path = 'src/dbb-api.ts';
let dbb_api_source = await readFile(dbb_api_path, 'utf8');
const dbb_api_before = `const dbb_url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const dbb_key = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';
let dbb_mapbox = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';`;
const dbb_api_after = `const dbb_default_url = 'https://xpdiwyxnnrmyvpcqwuyb.supabase.co';
const dbb_default_key = 'sb_publishable_cu71JQGPiRusMw_YeZzUbg_6r9r13TG';
const dbb_env_url = String(process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const dbb_env_key = String(process.env.EXPO_PUBLIC_SUPABASE_KEY || '').trim();
const dbb_url = dbb_env_url.startsWith('https://') && !dbb_env_url.includes('PASTE_') ? dbb_env_url : dbb_default_url;
const dbb_key = dbb_env_key.startsWith('sb_publishable_') ? dbb_env_key : dbb_default_key;
let dbb_mapbox = String(process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '').trim();
if (!dbb_mapbox.startsWith('pk.')) dbb_mapbox = '';`;
let dbb_changed = 0;
if (!dbb_api_source.includes(dbb_api_after)) {
  if (!dbb_api_source.includes(dbb_api_before)) throw new Error('Expected dbb-api bootstrap block not found.');
  dbb_api_source = dbb_api_source.replace(dbb_api_before, dbb_api_after);
  await writeFile(dbb_api_path, dbb_api_source, 'utf8');
  dbb_changed++;
}

const dbb_app_path = 'src/dbb-app.tsx';
let dbb_app_source = await readFile(dbb_app_path, 'utf8');
const dbb_basket_before = `return dbb_value.filter(dbb_item=>dbb_item&&typeof dbb_item.dbb_product_id==='string'&&
    Number.isInteger(dbb_item.dbb_quantity)&&dbb_item.dbb_quantity>0).slice(0,60)`;
const dbb_basket_after = `return dbb_value.filter(dbb_item=>dbb_item&&typeof dbb_item.dbb_product_id==='string'&&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(dbb_item.dbb_product_id)&&
    Number.isInteger(dbb_item.dbb_quantity)&&dbb_item.dbb_quantity>0).slice(0,60)`;
if (!dbb_app_source.includes(dbb_basket_after)) {
  if (!dbb_app_source.includes(dbb_basket_before)) throw new Error('Expected basket sanitizer block not found.');
  dbb_app_source = dbb_app_source.replace(dbb_basket_before, dbb_basket_after);
  await writeFile(dbb_app_path, dbb_app_source, 'utf8');
  dbb_changed++;
}

console.log(`DraBornBuy v0.2 bootstrap/state repairs applied: ${dbb_changed}`);
