import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Dbb_Coordinates, Dbb_Offer, Dbb_Order, Dbb_Product } from './dbb-model';

const dbb_url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const dbb_key = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';
export const dbb_client = dbb_url && dbb_key && (process.env.EXPO_OS !== 'web' || typeof window !== 'undefined') ? createClient(dbb_url, dbb_key, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
}) : null;

export type Dbb_Config = { dbb_enabled: boolean; dbb_requested_enabled: boolean; dbb_bank_name: string; dbb_account_holder: string; dbb_iban: string;
  dbb_max_age_hours: number; dbb_courier_base_kurus: number; dbb_per_km_kurus: number; dbb_extra_store_kurus: number;
  dbb_service_base_kurus: number; dbb_service_rate_bps: number; dbb_bag_per_store_kurus: number };
export const dbb_default_config: Dbb_Config = { dbb_enabled: false, dbb_requested_enabled: false, dbb_bank_name: '', dbb_account_holder: '', dbb_iban: '',
  dbb_max_age_hours: 24, dbb_courier_base_kurus: 4990, dbb_per_km_kurus: 800, dbb_extra_store_kurus: 2500,
  dbb_service_base_kurus: 2490, dbb_service_rate_bps: 200, dbb_bag_per_store_kurus: 750 };
const dbb_product_fields='dbb_id,dbb_name,dbb_brand,dbb_size,dbb_category,dbb_barcode,dbb_image_url,dbb_source_url,dbb_source_merchant,dbb_catalog_price_kurus,dbb_catalog_in_stock,dbb_catalog_checked_at';

export async function dbb_load_catalog(): Promise<{ dbb_offers: Dbb_Offer[]; dbb_products: Dbb_Product[]; dbb_config: Dbb_Config; dbb_total_products: number }> {
  if (!dbb_client) return { dbb_offers: [], dbb_products: [], dbb_config: dbb_default_config, dbb_total_products: 0 };
  const [dbb_result, dbb_products_result, dbb_featured_result, dbb_settings, dbb_count_result] = await Promise.all([
    dbb_client.from('dbb_offers').select('dbb_id,dbb_store_id,dbb_product_id,dbb_price_kurus,dbb_in_stock,dbb_verified,dbb_checked_at,dbb_source_url,dbb_availability,dbb_stores!inner(dbb_id,dbb_name,dbb_address,dbb_lat,dbb_lon,dbb_active),dbb_products!inner(dbb_id,dbb_name,dbb_brand,dbb_size,dbb_category,dbb_barcode,dbb_image_url,dbb_source_url,dbb_active)').limit(400),
    dbb_client.from('dbb_products').select(dbb_product_fields).eq('dbb_active',true).order('dbb_last_seen_at',{ascending:false,nullsFirst:false}).limit(180),
    dbb_client.from('dbb_products').select(dbb_product_fields).eq('dbb_active',true).is('dbb_external_key',null).order('dbb_created_at').limit(20),
    dbb_client.from('dbb_config').select('*').eq('dbb_key','ankara').single(),
    dbb_client.from('dbb_products').select('dbb_id',{count:'exact',head:true}).eq('dbb_active',true),
  ]);
  if (dbb_result.error) throw dbb_result.error;
  if (dbb_products_result.error) throw dbb_products_result.error;
  if (dbb_settings.error) throw dbb_settings.error;
  if (dbb_featured_result.error) throw dbb_featured_result.error;
  if (dbb_count_result.error) throw dbb_count_result.error;
  const dbb_max_age = Number(dbb_settings.data.dbb_max_age_hours || 24) * 3600000;
  const dbb_offers = ((dbb_result.data || []) as unknown as Record<string, unknown>[]).filter(dbb_row =>
    dbb_row.dbb_verified === true && dbb_row.dbb_availability !== 'unavailable' &&
    Date.now() - new Date(String(dbb_row.dbb_checked_at)).getTime() <= dbb_max_age &&
    (dbb_row.dbb_stores as {dbb_active:boolean}).dbb_active && (dbb_row.dbb_products as {dbb_active:boolean}).dbb_active
  ).map(dbb_row => ({
    dbb_id: String(dbb_row.dbb_id), dbb_store_id: String(dbb_row.dbb_store_id), dbb_product_id: String(dbb_row.dbb_product_id),
    dbb_price_kurus: Number(dbb_row.dbb_price_kurus), dbb_in_stock: Boolean(dbb_row.dbb_in_stock), dbb_verified: Boolean(dbb_row.dbb_verified),
    dbb_checked_at: String(dbb_row.dbb_checked_at), dbb_source_url: String(dbb_row.dbb_source_url || ''),
    dbb_availability: (dbb_row.dbb_availability || 'confirmed') as Dbb_Offer['dbb_availability'],
    dbb_store: dbb_row.dbb_stores as Dbb_Offer['dbb_store'], dbb_product: dbb_row.dbb_products as Dbb_Offer['dbb_product']
  }));
  const dbb_unique=new Map<string,Dbb_Product>();
  for (const dbb_item of [...(dbb_featured_result.data||[]),...(dbb_products_result.data||[])]) dbb_unique.set(dbb_item.dbb_id,dbb_item as Dbb_Product);
  return { dbb_offers, dbb_products: [...dbb_unique.values()], dbb_config: dbb_settings.data as Dbb_Config,
    dbb_total_products: dbb_count_result.count || 0 };
}

export async function dbb_search_catalog(dbb_query:string,dbb_category='Tümü',dbb_offset=0):Promise<Dbb_Product[]> {
  if (!dbb_client) return [];
  const dbb_words=dbb_query.trim().replace(/[%_\\]/g,'').split(/\s+/).filter(Boolean);
  let dbb_request=dbb_client.from('dbb_products').select(dbb_product_fields).eq('dbb_active',true);
  if (dbb_category!=='Tümü') dbb_request=dbb_request.eq('dbb_category',dbb_category);
  if (dbb_words.length) dbb_request=/^\d{8,14}$/.test(dbb_words[0]) ? dbb_request.eq('dbb_barcode',dbb_words[0]) :
    dbb_request.ilike('dbb_name',`%${dbb_words.join('%')}%`);
  const {data:dbb_data,error:dbb_error}=await dbb_request.order('dbb_last_seen_at',{ascending:false,nullsFirst:false}).range(dbb_offset,dbb_offset+99);
  if (dbb_error) throw dbb_error;
  return dbb_data as Dbb_Product[];
}

export async function dbb_breakfast_catalog():Promise<Dbb_Product[]> {
  if (!dbb_client) return [];
  const {data,error}=await dbb_client.from('dbb_products').select(dbb_product_fields).eq('dbb_active',true)
    .eq('dbb_category','Kahvaltılık')
    .gte('dbb_catalog_checked_at',new Date(Date.now()-24*60*60*1000).toISOString())
    .not('dbb_catalog_price_kurus','is',null)
    .order('dbb_catalog_price_kurus',{ascending:true}).limit(200);
  if (error) throw error;
  return data as Dbb_Product[];
}

export async function dbb_products_for_basket(dbb_ids:string[]):Promise<Dbb_Product[]> {
  if (!dbb_client || !dbb_ids.length) return [];
  const {data:dbb_data,error:dbb_error}=await dbb_client.from('dbb_products').select(dbb_product_fields)
    .in('dbb_id',dbb_ids.slice(0,60)).eq('dbb_active',true);
  if (dbb_error) throw dbb_error;
  return dbb_data as Dbb_Product[];
}

export async function dbb_get_orders(dbb_user_id: string): Promise<Dbb_Order[]> {
  if (!dbb_client) return [];
  const { data: dbb_data, error: dbb_error } = await dbb_client.from('dbb_orders').select('*').eq('dbb_customer_id',dbb_user_id).order('dbb_created_at',{ ascending: false }).limit(20);
  if (dbb_error) throw dbb_error;
  return (dbb_data || []) as Dbb_Order[];
}

export async function dbb_get_courier_orders(dbb_user_id: string): Promise<Dbb_Order[]> {
  if (!dbb_client) return [];
  const { data: dbb_data, error: dbb_error } = await dbb_client.from('dbb_orders').select('*').eq('dbb_courier_id',dbb_user_id).in('dbb_status',['store_trip','shopping','delivery','delivered']).order('dbb_created_at',{ ascending: false }).limit(20);
  if (dbb_error) throw dbb_error;
  return (dbb_data || []) as Dbb_Order[];
}

export type Dbb_Job = { dbb_id:string; dbb_code:string; dbb_created_at:string; dbb_courier_fee_kurus:number; dbb_subtotal_kurus:number;
  dbb_store_count:number; dbb_stops:{dbb_name:string;dbb_address:string;dbb_lat:number;dbb_lon:number}[];
  dbb_items:{dbb_product_name:string;dbb_store_name:string;dbb_quantity:number;dbb_unit_price_kurus:number}[] };
export async function dbb_get_open_jobs(): Promise<Dbb_Job[]> {
  if (!dbb_client) return [];
  const {data:dbb_data,error:dbb_error} = await dbb_client.rpc('dbb_open_jobs');
  if (dbb_error) throw dbb_error;
  return (dbb_data || []) as Dbb_Job[];
}

export async function dbb_create_live_order(dbb_assignments: { dbb_offer: { dbb_id: string }; dbb_quantity: number }[], dbb_address: string, dbb_location: Dbb_Coordinates, dbb_tolerance: number) {
  if (!dbb_client) throw new Error('Supabase yapılandırılmadı');
  const { data: dbb_data, error: dbb_error } = await dbb_client.rpc('dbb_create_order', {
    dbb_p_items: dbb_assignments.map(dbb_item => ({ dbb_offer_id: dbb_item.dbb_offer.dbb_id, dbb_quantity: dbb_item.dbb_quantity })),
    dbb_p_address: dbb_address, dbb_p_lat: dbb_location.dbb_lat, dbb_p_lon: dbb_location.dbb_lon,
    dbb_p_tolerance_kurus: dbb_tolerance
  });
  if (dbb_error) throw dbb_error;
  return dbb_data as { dbb_id: string; dbb_code: string; dbb_total_kurus: number; dbb_status: string };
}

const dbb_mapbox = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';
export function dbb_static_map(dbb_coordinates: Dbb_Coordinates, dbb_zoom = 12) {
  if (!dbb_mapbox) return '';
  const dbb_lon = dbb_coordinates.dbb_lon.toFixed(5); const dbb_lat = dbb_coordinates.dbb_lat.toFixed(5);
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+7b5cff(${dbb_lon},${dbb_lat})/${dbb_lon},${dbb_lat},${dbb_zoom}/700x350@2x?access_token=${dbb_mapbox}`;
}
export async function dbb_geocode(dbb_query: string) {
  if (!dbb_mapbox || dbb_query.trim().length < 5) return [] as { dbb_name: string; dbb_location: Dbb_Coordinates }[];
  const dbb_url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(dbb_query + ', Ankara')}&bbox=32.4,39.7,33.4,40.3&country=tr&language=tr&limit=5&access_token=${dbb_mapbox}`;
  const dbb_response = await fetch(dbb_url);
  if (!dbb_response.ok) throw new Error('Adres araması şu an çalışmıyor');
  const dbb_data = await dbb_response.json();
  return (dbb_data.features || []).map((dbb_feature: { properties: { full_address?: string; name?: string }; geometry: { coordinates: number[] } }) => ({
    dbb_name: dbb_feature.properties.full_address || dbb_feature.properties.name || 'Ankara',
    dbb_location: { dbb_lon: dbb_feature.geometry.coordinates[0], dbb_lat: dbb_feature.geometry.coordinates[1] }
  })).filter((dbb_item: { dbb_location: Dbb_Coordinates }) => dbb_item.dbb_location.dbb_lat >= 39.7 && dbb_item.dbb_location.dbb_lat <= 40.3);
}
export async function dbb_road_eta(dbb_points: Dbb_Coordinates[]) {
  if (!dbb_mapbox || dbb_points.length < 2) return null;
  const dbb_coords = dbb_points.map(dbb_item => `${dbb_item.dbb_lon},${dbb_item.dbb_lat}`).join(';');
  const dbb_response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${dbb_coords}?overview=false&access_token=${dbb_mapbox}`);
  if (!dbb_response.ok) return null;
  const dbb_route = (await dbb_response.json()).routes?.[0];
  return dbb_route ? { dbb_km: dbb_route.distance / 1000, dbb_minutes: Math.ceil(dbb_route.duration / 60) } : null;
}
