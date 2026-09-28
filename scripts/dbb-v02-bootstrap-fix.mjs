import { readFile, writeFile } from 'node:fs/promises';

const dbb_path = 'src/dbb-api.ts';
let dbb_source = await readFile(dbb_path, 'utf8');
const dbb_before = `const dbb_url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const dbb_key = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';
let dbb_mapbox = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';`;
const dbb_after = `const dbb_default_url = 'https://xpdiwyxnnrmyvpcqwuyb.supabase.co';
const dbb_default_key = 'sb_publishable_cu71JQGPiRusMw_YeZzUbg_6r9r13TG';
const dbb_env_url = String(process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const dbb_env_key = String(process.env.EXPO_PUBLIC_SUPABASE_KEY || '').trim();
const dbb_url = dbb_env_url.startsWith('https://') && !dbb_env_url.includes('PASTE_') ? dbb_env_url : dbb_default_url;
const dbb_key = dbb_env_key.startsWith('sb_publishable_') ? dbb_env_key : dbb_default_key;
let dbb_mapbox = String(process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '').trim();
if (!dbb_mapbox.startsWith('pk.')) dbb_mapbox = '';`;

if (dbb_source.includes(dbb_after)) {
  console.log('DraBornBuy v0.2 bootstrap already repaired.');
  process.exit(0);
}
if (!dbb_source.includes(dbb_before)) throw new Error('Expected dbb-api bootstrap block not found.');
dbb_source = dbb_source.replace(dbb_before, dbb_after);
await writeFile(dbb_path, dbb_source, 'utf8');
console.log('DraBornBuy v0.2 Supabase/Mapbox bootstrap repaired.');
