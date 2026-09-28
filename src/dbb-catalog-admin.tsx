import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dbb_client, dbb_default_config, dbb_geocode, type Dbb_Config } from './dbb-api';
import type { Dbb_Product, Dbb_Store } from './dbb-model';
import { Dbb_Button, Dbb_Card, Dbb_Pill, Dbb_Section, dbb_styles, dbb_theme } from './dbb-ui';

type Dbb_Tab = 'settings' | 'stores' | 'products' | 'offers';
type Dbb_StoreDraft = { dbb_id?: string; dbb_name: string; dbb_address: string; dbb_lat: string; dbb_lon: string; dbb_active: boolean };
type Dbb_ProductDraft = { dbb_id?: string; dbb_name: string; dbb_brand: string; dbb_size: string; dbb_category: string; dbb_barcode: string; dbb_image_url: string; dbb_source_url: string; dbb_active: boolean };
type Dbb_OfferDraft = { dbb_id?: string; dbb_store_id: string; dbb_product_id: string; dbb_price: string; dbb_in_stock: boolean; dbb_verified: boolean; dbb_source_url: string; dbb_operator_note: string };
const dbb_empty_store: Dbb_StoreDraft = { dbb_name:'',dbb_address:'',dbb_lat:'',dbb_lon:'',dbb_active:false };
const dbb_empty_product: Dbb_ProductDraft = { dbb_name:'',dbb_brand:'',dbb_size:'',dbb_category:'Market',dbb_barcode:'',dbb_image_url:'',dbb_source_url:'',dbb_active:true };
const dbb_empty_offer: Dbb_OfferDraft = { dbb_store_id:'',dbb_product_id:'',dbb_price:'',dbb_in_stock:false,dbb_verified:false,dbb_source_url:'',dbb_operator_note:'' };
const dbb_is_https = (dbb_value:string) => !dbb_value || /^https:\/\/[a-z0-9.-]+\//i.test(dbb_value);
const dbb_to_kurus = (dbb_value:string) => Math.round(Number(dbb_value.replace(',','.')) * 100);
const dbb_tl = (dbb_value:number) => (dbb_value / 100).toFixed(2).replace('.',',');
const dbb_valid_iban = (dbb_value:string) => {
  if (!/^TR\d{24}$/.test(dbb_value)) return false;
  const dbb_digits = `${dbb_value.slice(4)}2927${dbb_value.slice(2,4)}`;
  let dbb_remainder = 0;
  for (const dbb_digit of dbb_digits) dbb_remainder = (dbb_remainder * 10 + Number(dbb_digit)) % 97;
  return dbb_remainder === 1;
};
const dbb_fee_fields: {dbb_key:keyof Dbb_Config;dbb_label:string;dbb_note:string}[] = [
  {dbb_key:'dbb_courier_base_kurus',dbb_label:'Kurye başlangıç',dbb_note:'TL'},
  {dbb_key:'dbb_per_km_kurus',dbb_label:'Kilometre başına',dbb_note:'TL'},
  {dbb_key:'dbb_extra_store_kurus',dbb_label:'Ek mağaza',dbb_note:'TL'},
  {dbb_key:'dbb_service_base_kurus',dbb_label:'Hizmet başlangıç',dbb_note:'TL'},
  {dbb_key:'dbb_bag_per_store_kurus',dbb_label:'Mağaza başına poşet',dbb_note:'TL'}
];

function Dbb_Field({dbb_label,dbb_value,dbb_change,dbb_hint,dbb_keyboard='default'}:{
  dbb_label:string;dbb_value:string;dbb_change:(dbb_value:string)=>void;dbb_hint?:string;dbb_keyboard?:'default'|'decimal-pad'|'url'|'number-pad'
}) {
  return <View style={{gap:5}}><Text style={{color:dbb_theme.muted,fontSize:12,fontWeight:'700'}}>{dbb_label}</Text>
    <TextInput style={dbb_styles.input} value={dbb_value} onChangeText={dbb_change} placeholder={dbb_hint || dbb_label}
      placeholderTextColor="#8B8BAA" keyboardType={dbb_keyboard} autoCapitalize={dbb_keyboard==='url'?'none':'sentences'} /></View>;
}

function Dbb_Toggle({dbb_label,dbb_value,dbb_change}:{dbb_label:string;dbb_value:boolean;dbb_change:()=>void}) {
  return <Pressable onPress={dbb_change} accessibilityRole="switch" accessibilityState={{checked:dbb_value}}
    style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8}}>
    <Ionicons name={dbb_value?'checkbox':'square-outline'} color={dbb_value?dbb_theme.mint:dbb_theme.muted} size={24} />
    <Text style={{color:dbb_theme.text,flex:1,fontSize:13,fontWeight:'700'}}>{dbb_label}</Text></Pressable>;
}

export function Dbb_CatalogAdmin({dbb_user_id,dbb_notice,dbb_on_change}:{dbb_user_id:string;dbb_notice:(dbb_value:string)=>void;dbb_on_change:()=>void}) {
  const [dbb_tab,dbb_set_tab]=useState<Dbb_Tab>('settings');
  const [dbb_config,dbb_set_config]=useState<Dbb_Config>(dbb_default_config);
  const [dbb_fees,dbb_set_fees]=useState<Record<string,string>>({});
  const [dbb_rate,dbb_set_rate]=useState('2');
  const [dbb_age,dbb_set_age]=useState('24');
  const [dbb_stores,dbb_set_stores]=useState<Dbb_Store[]>([]);
  const [dbb_products,dbb_set_products]=useState<Dbb_Product[]>([]);
  const [dbb_offers,dbb_set_offers]=useState<{dbb_id:string;dbb_store_id:string;dbb_product_id:string;dbb_price_kurus:number;dbb_in_stock:boolean;dbb_verified:boolean;dbb_checked_at:string;dbb_source_url:string;dbb_operator_note:string}[]>([]);
  const [dbb_store,dbb_set_store]=useState<Dbb_StoreDraft>(dbb_empty_store);
  const [dbb_product,dbb_set_product]=useState<Dbb_ProductDraft>(dbb_empty_product);
  const [dbb_offer,dbb_set_offer]=useState<Dbb_OfferDraft>(dbb_empty_offer);
  const [dbb_busy,dbb_set_busy]=useState(false);
  const dbb_refresh=useCallback(async()=>{
    if (!dbb_client) return;
    const [dbb_a,dbb_b,dbb_c,dbb_d]=await Promise.all([
      dbb_client.from('dbb_config').select('*').eq('dbb_key','ankara').single(),
      dbb_client.from('dbb_stores').select('*').order('dbb_created_at',{ascending:false}),
      dbb_client.from('dbb_products').select('*').order('dbb_created_at',{ascending:false}),
      dbb_client.from('dbb_offers').select('dbb_id,dbb_store_id,dbb_product_id,dbb_price_kurus,dbb_in_stock,dbb_verified,dbb_checked_at,dbb_source_url,dbb_operator_note').order('dbb_checked_at',{ascending:false})
    ]);
    const dbb_error=dbb_a.error||dbb_b.error||dbb_c.error||dbb_d.error;
    if (dbb_error) {dbb_notice(dbb_error.message);return;}
    const dbb_current=dbb_a.data as Dbb_Config;
    dbb_set_config(dbb_current);
    dbb_set_fees(Object.fromEntries(dbb_fee_fields.map(dbb_field=>[dbb_field.dbb_key,dbb_tl(dbb_current[dbb_field.dbb_key] as number)])));
    dbb_set_rate(String(dbb_current.dbb_service_rate_bps/100).replace('.',','));dbb_set_age(String(dbb_current.dbb_max_age_hours));
    dbb_set_stores(dbb_b.data||[]);dbb_set_products(dbb_c.data||[]);dbb_set_offers(dbb_d.data||[]);
  },[dbb_notice]);
  useEffect(()=>{dbb_refresh();},[dbb_refresh]);
  const dbb_complete=async(dbb_message:string)=>{dbb_notice(dbb_message);await dbb_refresh();dbb_on_change();};
  const dbb_save_settings=async()=>{
    if (!dbb_client) return;
    const dbb_values=Object.fromEntries(dbb_fee_fields.map(dbb_field=>[dbb_field.dbb_key,dbb_to_kurus(dbb_fees[dbb_field.dbb_key]||'0')]));
    if (Object.values(dbb_values).some(dbb_value=>!Number.isFinite(dbb_value)||dbb_value<0)) {dbb_notice('Ücretleri TL cinsinden kontrol et.');return;}
    const dbb_service_rate_bps=Math.round(Number(dbb_rate.replace(',','.'))*100),dbb_max_age_hours=Number(dbb_age);
    if (!Number.isInteger(dbb_service_rate_bps)||dbb_service_rate_bps<0||dbb_service_rate_bps>3000||
      !Number.isInteger(dbb_max_age_hours)||dbb_max_age_hours<1||dbb_max_age_hours>72) {
      dbb_notice('Hizmet oranı %0–30, teklif geçerliliği 1–72 saat olmalı.');return;
    }
    const dbb_iban=dbb_config.dbb_iban.toUpperCase().replace(/\s/g,'');
    if ((dbb_iban && !dbb_valid_iban(dbb_iban)) || (dbb_config.dbb_enabled && (!dbb_iban||!dbb_config.dbb_bank_name.trim()||!dbb_config.dbb_account_holder.trim()))) {
      dbb_notice('Geçerli TR IBAN, banka adı ve işletme hesap sahibi bilgilerini kontrol et.');return;
    }
    if (dbb_config.dbb_enabled && !dbb_offers.some(dbb_offer=>dbb_offer.dbb_verified&&dbb_offer.dbb_in_stock&&
      dbb_stores.some(dbb_store=>dbb_store.dbb_id===dbb_offer.dbb_store_id&&dbb_store.dbb_active))) {
      dbb_notice('Siparişi açmadan önce aktif Ankara mağazasında fiyatı ve stoğu doğrulanmış teklif gerekli.');return;
    }
    dbb_set_busy(true);
    const {error:dbb_error}=await dbb_client.from('dbb_config').update({...dbb_config,...dbb_values,dbb_iban,dbb_service_rate_bps,dbb_max_age_hours}).eq('dbb_key','ankara');
    dbb_set_busy(false);
    if (dbb_error) dbb_notice(dbb_error.message);else await dbb_complete('Ankara ödeme ve ücret ayarları kaydedildi.');
  };
  const dbb_find_store=async()=>{
    try {const dbb_locations=await dbb_geocode(dbb_store.dbb_address);if (!dbb_locations.length) throw new Error('Adres için Ankara konumu bulunamadı.');
      dbb_set_store({...dbb_store,dbb_lat:String(dbb_locations[0].dbb_location.dbb_lat),dbb_lon:String(dbb_locations[0].dbb_location.dbb_lon)});
      dbb_notice('Konum bulundu; haritada doğrulayıp kaydet.');}catch(dbb_error){dbb_notice((dbb_error as Error).message);}
  };
  const dbb_save_store=async()=>{
    if (!dbb_client) return;
    const dbb_lat=Number(dbb_store.dbb_lat.replace(',','.')),dbb_lon=Number(dbb_store.dbb_lon.replace(',','.'));
    if (!dbb_store.dbb_name.trim()||!dbb_store.dbb_address.trim()||!Number.isFinite(dbb_lat)||!Number.isFinite(dbb_lon)||dbb_lat<39.7||dbb_lat>40.3||dbb_lon<32.4||dbb_lon>33.4) {
      dbb_notice('Mağaza adı, açık Ankara adresi ve doğru koordinatlar gerekli.');return;
    }
    dbb_set_busy(true);
    const dbb_values={dbb_name:dbb_store.dbb_name.trim(),dbb_address:dbb_store.dbb_address.trim(),dbb_lat,dbb_lon,dbb_active:dbb_store.dbb_active};
    const {error:dbb_error}=dbb_store.dbb_id?await dbb_client.from('dbb_stores').update(dbb_values).eq('dbb_id',dbb_store.dbb_id):await dbb_client.from('dbb_stores').insert(dbb_values);
    dbb_set_busy(false);
    if (dbb_error) dbb_notice(dbb_error.message);else {dbb_set_store(dbb_empty_store);await dbb_complete('Mağaza kaydedildi.');}
  };
  const dbb_save_product=async()=>{
    if (!dbb_client) return;
    if (dbb_product.dbb_name.trim().length<2||!dbb_product.dbb_size.trim()||!dbb_product.dbb_category.trim()||
        !dbb_is_https(dbb_product.dbb_image_url)||!dbb_is_https(dbb_product.dbb_source_url)) {
      dbb_notice('Ürün adı, boyut, kategori ve HTTPS görsel/kaynak bağlantılarını kontrol et.');return;
    }
    dbb_set_busy(true);
    const {dbb_id,...dbb_values}=dbb_product;
    const dbb_payload={...dbb_values,dbb_name:dbb_values.dbb_name.trim(),dbb_barcode:dbb_values.dbb_barcode.trim()||null};
    const {error:dbb_error}=dbb_id?await dbb_client.from('dbb_products').update(dbb_payload).eq('dbb_id',dbb_id):await dbb_client.from('dbb_products').insert(dbb_payload);
    dbb_set_busy(false);
    if (dbb_error) dbb_notice(dbb_error.message);else {dbb_set_product(dbb_empty_product);await dbb_complete('Ürün ve fotoğrafı kaydedildi.');}
  };
  const dbb_save_offer=async()=>{
    if (!dbb_client) return;
    const dbb_price_kurus=dbb_to_kurus(dbb_offer.dbb_price);
    if (!dbb_offer.dbb_store_id||!dbb_offer.dbb_product_id||!Number.isFinite(dbb_price_kurus)||dbb_price_kurus<1||
      !dbb_is_https(dbb_offer.dbb_source_url)||
      (dbb_offer.dbb_verified&&(!dbb_offer.dbb_in_stock||(!dbb_offer.dbb_source_url&&!dbb_offer.dbb_operator_note.trim())))) {
      dbb_notice('Mağaza, ürün ve fiyat gerekli. Doğrulama için stok ve kaynak bağlantısı veya kontrol notu gir.');return;
    }
    dbb_set_busy(true);
    const dbb_values={dbb_store_id:dbb_offer.dbb_store_id,dbb_product_id:dbb_offer.dbb_product_id,dbb_price_kurus,
      dbb_in_stock:dbb_offer.dbb_in_stock,dbb_verified:dbb_offer.dbb_verified,dbb_source:'manual',
      dbb_source_url:dbb_offer.dbb_source_url.trim(),dbb_operator_note:dbb_offer.dbb_operator_note.trim(),
      dbb_checked_at:new Date().toISOString(),dbb_checked_by:dbb_user_id};
    const {error:dbb_error}=dbb_offer.dbb_id?await dbb_client.from('dbb_offers').update(dbb_values).eq('dbb_id',dbb_offer.dbb_id):await dbb_client.from('dbb_offers').insert(dbb_values);
    dbb_set_busy(false);
    if (dbb_error) dbb_notice(dbb_error.message);else {dbb_set_offer(dbb_empty_offer);await dbb_complete('Teklif kaydedildi; fiyat ve stok kontrol zamanı yenilendi.');}
  };
  const dbb_edit_store=(dbb_value:Dbb_Store)=>dbb_set_store({dbb_id:dbb_value.dbb_id,dbb_name:dbb_value.dbb_name,dbb_address:dbb_value.dbb_address,
    dbb_lat:String(dbb_value.dbb_lat),dbb_lon:String(dbb_value.dbb_lon),dbb_active:Boolean(dbb_value.dbb_active)});
  const dbb_edit_product=(dbb_value:Dbb_Product & {dbb_active?:boolean})=>dbb_set_product({dbb_id:dbb_value.dbb_id,dbb_name:dbb_value.dbb_name,
    dbb_brand:dbb_value.dbb_brand,dbb_size:dbb_value.dbb_size,dbb_category:dbb_value.dbb_category,dbb_barcode:dbb_value.dbb_barcode||'',
    dbb_image_url:dbb_value.dbb_image_url||'',dbb_source_url:dbb_value.dbb_source_url||'',dbb_active:Boolean(dbb_value.dbb_active)});
  const dbb_edit_offer=(dbb_value:typeof dbb_offers[number])=>dbb_set_offer({dbb_id:dbb_value.dbb_id,dbb_store_id:dbb_value.dbb_store_id,
    dbb_product_id:dbb_value.dbb_product_id,dbb_price:dbb_tl(dbb_value.dbb_price_kurus),dbb_in_stock:dbb_value.dbb_in_stock,
    dbb_verified:dbb_value.dbb_verified,dbb_source_url:dbb_value.dbb_source_url,dbb_operator_note:dbb_value.dbb_operator_note});
  return <Dbb_Section dbb_title="DraBornBuy yönetimi" dbb_caption="Ankara mağazalarını, ürün görsellerini, doğrulanmış fiyatları ve ödeme bilgilerini buradan yönet.">
    <Dbb_Card dbb_style={{backgroundColor:'#1B2043',borderColor:'#8C6CFF88'}}>
      <Dbb_Pill dbb_label="YÖNETİCİ ERİŞİMİ" dbb_tone="mint" />
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{([
        ['settings','Ödeme & ücret'],['stores','Mağazalar'],['products','Ürünler'],['offers','Fiyat & stok']
      ] as [Dbb_Tab,string][]).map(([dbb_key,dbb_label])=><Pressable key={dbb_key} onPress={()=>dbb_set_tab(dbb_key)}
        style={{borderRadius:12,paddingHorizontal:11,paddingVertical:10,backgroundColor:dbb_tab===dbb_key?dbb_theme.purple:'#292F52'}}>
        <Text style={{color:'white',fontSize:12,fontWeight:'800'}}>{dbb_label}</Text></Pressable>)}</View>
      {dbb_tab==='settings'&&<View style={{gap:10}}>
        <Text style={dbb_styles.itemTitle}>Ödeme hesabı</Text>
        <Dbb_Field dbb_label="Banka adı" dbb_value={dbb_config.dbb_bank_name} dbb_change={dbb_value=>dbb_set_config({...dbb_config,dbb_bank_name:dbb_value})} />
        <Dbb_Field dbb_label="Hesap sahibi / işletme" dbb_value={dbb_config.dbb_account_holder} dbb_change={dbb_value=>dbb_set_config({...dbb_config,dbb_account_holder:dbb_value})} />
        <Dbb_Field dbb_label="IBAN" dbb_value={dbb_config.dbb_iban} dbb_change={dbb_value=>dbb_set_config({...dbb_config,dbb_iban:dbb_value})} dbb_hint="TR..." />
        <Text style={dbb_styles.muted}>Dekontun fotoğrafı ödeme kanıtı sayılmaz; banka hareketini operasyon panelinden ayrıca onayla.</Text>
        <Text style={dbb_styles.itemTitle}>Teslimat ve platform ücretleri</Text>
        {dbb_fee_fields.map(dbb_field=><Dbb_Field key={dbb_field.dbb_key} dbb_label={`${dbb_field.dbb_label} · ${dbb_field.dbb_note}`}
          dbb_value={dbb_fees[dbb_field.dbb_key]||''} dbb_change={dbb_value=>dbb_set_fees({...dbb_fees,[dbb_field.dbb_key]:dbb_value})} dbb_keyboard="decimal-pad" />)}
        <Dbb_Field dbb_label="Ürün tutarına hizmet oranı · %" dbb_value={dbb_rate} dbb_change={dbb_set_rate} dbb_keyboard="decimal-pad" />
        <Dbb_Field dbb_label="Teklif geçerliliği · saat (1–72)" dbb_value={dbb_age} dbb_change={dbb_set_age} dbb_keyboard="number-pad" />
        <Dbb_Toggle dbb_label="Ankara'da gerçek siparişi aç" dbb_value={dbb_config.dbb_enabled}
          dbb_change={()=>dbb_set_config({...dbb_config,dbb_enabled:!dbb_config.dbb_enabled})} />
        <Text style={dbb_styles.muted}>IBAN, doğrulanmış yerel teklifler ve hazır kurye operasyonu olmadan siparişi açma.</Text>
        <Dbb_Button dbb_title="Ayarları kaydet" dbb_icon="save-outline" dbb_onPress={dbb_save_settings} dbb_disabled={dbb_busy} />
      </View>}
      {dbb_tab==='stores'&&<View style={{gap:10}}>
        <Text style={dbb_styles.itemTitle}>{dbb_store.dbb_id?'Mağazayı düzenle':'Yeni Ankara mağazası'}</Text>
        <Dbb_Field dbb_label="Şube adı" dbb_value={dbb_store.dbb_name} dbb_change={dbb_value=>dbb_set_store({...dbb_store,dbb_name:dbb_value})} />
        <Dbb_Field dbb_label="Açık adres" dbb_value={dbb_store.dbb_address} dbb_change={dbb_value=>dbb_set_store({...dbb_store,dbb_address:dbb_value})} />
        <Dbb_Button dbb_title="Koordinatı adresten bul" dbb_kind="ghost" dbb_icon="location-outline" dbb_onPress={dbb_find_store} />
        <Dbb_Field dbb_label="Enlem" dbb_value={dbb_store.dbb_lat} dbb_change={dbb_value=>dbb_set_store({...dbb_store,dbb_lat:dbb_value})} dbb_keyboard="decimal-pad" />
        <Dbb_Field dbb_label="Boylam" dbb_value={dbb_store.dbb_lon} dbb_change={dbb_value=>dbb_set_store({...dbb_store,dbb_lon:dbb_value})} dbb_keyboard="decimal-pad" />
        <Dbb_Toggle dbb_label="Mağaza aktif" dbb_value={dbb_store.dbb_active} dbb_change={()=>dbb_set_store({...dbb_store,dbb_active:!dbb_store.dbb_active})} />
        <Dbb_Button dbb_title="Mağazayı kaydet" dbb_onPress={dbb_save_store} dbb_disabled={dbb_busy} />
        {dbb_store.dbb_id&&<Dbb_Button dbb_title="Yeni mağazaya geç" dbb_kind="ghost" dbb_onPress={()=>dbb_set_store(dbb_empty_store)} />}
        {dbb_stores.map(dbb_item=><Pressable key={dbb_item.dbb_id} onPress={()=>dbb_edit_store(dbb_item)} style={{padding:12,borderRadius:14,backgroundColor:'#2A3153'}}>
          <Text style={dbb_styles.itemTitle}>{dbb_item.dbb_name} · {dbb_item.dbb_active?'Aktif':'Pasif'}</Text><Text style={dbb_styles.muted}>{dbb_item.dbb_address}</Text></Pressable>)}
      </View>}
      {dbb_tab==='products'&&<View style={{gap:10}}>
        <Text style={dbb_styles.itemTitle}>{dbb_product.dbb_id?'Ürünü düzenle':'Yeni ürün'}</Text>
        {(['dbb_name','dbb_brand','dbb_size','dbb_category','dbb_barcode','dbb_image_url','dbb_source_url'] as const).map((dbb_key,dbb_index)=><Dbb_Field key={dbb_key}
          dbb_label={['Ürün adı','Marka','Boyut / paket','Kategori','Barkod (isteğe bağlı)','Ürün fotoğrafı HTTPS URL','Üretici veya mağaza ürün sayfası HTTPS URL'][dbb_index]}
          dbb_value={dbb_product[dbb_key]} dbb_change={dbb_value=>dbb_set_product({...dbb_product,[dbb_key]:dbb_value})}
          dbb_keyboard={dbb_key.endsWith('url')?'url':'default'} />)}
        {dbb_product.dbb_image_url?<Image source={{uri:dbb_product.dbb_image_url}} style={{width:110,height:110,borderRadius:16,backgroundColor:'white'}} resizeMode="contain" />:null}
        <Dbb_Toggle dbb_label="Ürün görünür" dbb_value={dbb_product.dbb_active} dbb_change={()=>dbb_set_product({...dbb_product,dbb_active:!dbb_product.dbb_active})} />
        <Dbb_Button dbb_title="Ürünü kaydet" dbb_onPress={dbb_save_product} dbb_disabled={dbb_busy} />
        {dbb_product.dbb_id&&<Dbb_Button dbb_title="Yeni ürüne geç" dbb_kind="ghost" dbb_onPress={()=>dbb_set_product(dbb_empty_product)} />}
        {dbb_products.map(dbb_item=><Pressable key={dbb_item.dbb_id} onPress={()=>dbb_edit_product(dbb_item)} style={{flexDirection:'row',gap:10,alignItems:'center',padding:8,borderRadius:14,backgroundColor:'#2A3153'}}>
          {dbb_item.dbb_image_url?<Image source={{uri:dbb_item.dbb_image_url}} style={{width:44,height:44,borderRadius:9,backgroundColor:'white'}} resizeMode="contain" />:<Ionicons name="cube-outline" size={26} color={dbb_theme.yellow} />}
          <Text style={[dbb_styles.itemTitle,{flex:1,fontSize:13}]}>{dbb_item.dbb_name} · {dbb_item.dbb_size}</Text></Pressable>)}
      </View>}
      {dbb_tab==='offers'&&<View style={{gap:10}}>
        <Text style={dbb_styles.itemTitle}>{dbb_offer.dbb_id?'Şube teklifini düzenle':'Yeni şube teklifi'}</Text>
        <Text style={dbb_styles.muted}>Yalnızca gerçekten kontrol edilen Ankara şubesi fiyatı ve stoğunu doğrula. Kayıt anı teklifin kontrol zamanıdır.</Text>
        <Text style={dbb_styles.itemTitle}>Mağaza seç</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{dbb_stores.map(dbb_item=><Pressable key={dbb_item.dbb_id}
          onPress={()=>dbb_set_offer({...dbb_offer,dbb_store_id:dbb_item.dbb_id})}
          style={{padding:10,borderRadius:10,backgroundColor:dbb_offer.dbb_store_id===dbb_item.dbb_id?dbb_theme.purple:'#2A3153'}}>
          <Text style={{color:'white',fontSize:12}}>{dbb_item.dbb_name}</Text></Pressable>)}</View>
        <Text style={dbb_styles.itemTitle}>Ürün seç</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{dbb_products.map(dbb_item=><Pressable key={dbb_item.dbb_id}
          onPress={()=>dbb_set_offer({...dbb_offer,dbb_product_id:dbb_item.dbb_id})}
          style={{padding:10,borderRadius:10,backgroundColor:dbb_offer.dbb_product_id===dbb_item.dbb_id?dbb_theme.purple:'#2A3153'}}>
          <Text style={{color:'white',fontSize:12}}>{dbb_item.dbb_name} {dbb_item.dbb_size}</Text></Pressable>)}</View>
        <Dbb_Field dbb_label="Şubede gözlenen nihai fiyat · TL" dbb_value={dbb_offer.dbb_price} dbb_change={dbb_value=>dbb_set_offer({...dbb_offer,dbb_price:dbb_value})} dbb_keyboard="decimal-pad" />
        <Dbb_Field dbb_label="Kaynak URL (isteğe bağlı)" dbb_value={dbb_offer.dbb_source_url} dbb_change={dbb_value=>dbb_set_offer({...dbb_offer,dbb_source_url:dbb_value})} dbb_keyboard="url" />
        <Dbb_Field dbb_label="Yerinde kontrol / kampanya koşulları notu" dbb_value={dbb_offer.dbb_operator_note} dbb_change={dbb_value=>dbb_set_offer({...dbb_offer,dbb_operator_note:dbb_value})} />
        <Dbb_Toggle dbb_label="Stok mağazada görüldü" dbb_value={dbb_offer.dbb_in_stock} dbb_change={()=>dbb_set_offer({...dbb_offer,dbb_in_stock:!dbb_offer.dbb_in_stock})} />
        <Dbb_Toggle dbb_label="Fiyat ve stok doğrulandı" dbb_value={dbb_offer.dbb_verified} dbb_change={()=>dbb_set_offer({...dbb_offer,dbb_verified:!dbb_offer.dbb_verified})} />
        <Dbb_Button dbb_title="Teklifi kaydet" dbb_onPress={dbb_save_offer} dbb_disabled={dbb_busy} />
        {dbb_offer.dbb_id&&<Dbb_Button dbb_title="Yeni teklife geç" dbb_kind="ghost" dbb_onPress={()=>dbb_set_offer(dbb_empty_offer)} />}
        {dbb_offers.map(dbb_item=><Pressable key={dbb_item.dbb_id} onPress={()=>dbb_edit_offer(dbb_item)} style={{padding:12,borderRadius:14,backgroundColor:'#2A3153'}}>
          <Text style={dbb_styles.itemTitle}>{dbb_products.find(dbb_p=>dbb_p.dbb_id===dbb_item.dbb_product_id)?.dbb_name} · {dbb_stores.find(dbb_s=>dbb_s.dbb_id===dbb_item.dbb_store_id)?.dbb_name}</Text>
          <Text style={dbb_styles.muted}>{dbb_tl(dbb_item.dbb_price_kurus)} TL · {dbb_item.dbb_verified&&dbb_item.dbb_in_stock?'Doğrulanmış':'Kapalı'} · {new Date(dbb_item.dbb_checked_at).toLocaleString('tr-TR')}</Text></Pressable>)}
      </View>}
      <Dbb_Button dbb_title="Verileri yenile" dbb_kind="ghost" dbb_icon="refresh" dbb_onPress={dbb_refresh} />
    </Dbb_Card>
  </Dbb_Section>;
}
