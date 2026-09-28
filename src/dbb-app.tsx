import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import type { Dbb_BasketItem, Dbb_Coordinates, Dbb_Offer, Dbb_Product, Dbb_Quote } from './dbb-model';
import { dbb_lira, dbb_optimize, dbb_build_quote, dbb_distance_km } from './dbb-optimizer';
import { dbb_breakfast_under_budget, dbb_search_text } from './dbb-planner';
import { dbb_breakfast_catalog, dbb_client, dbb_create_live_order, dbb_default_config, dbb_geocode, dbb_load_catalog, dbb_search_catalog, dbb_products_for_basket, dbb_road_eta, dbb_static_map, type Dbb_Config } from './dbb-api';
import { Dbb_Button, Dbb_Card, Dbb_Hero, Dbb_Pill, Dbb_Section, dbb_styles, dbb_theme } from './dbb-ui';
import { Dbb_Orders, Dbb_Courier, Dbb_Admin } from './dbb-operations';

type Dbb_Tab = 'home' | 'search' | 'basket' | 'orders' | 'courier' | 'account';
const dbb_tabs: { dbb_key: Dbb_Tab; dbb_title: string; dbb_icon: keyof typeof Ionicons.glyphMap }[] = [
  { dbb_key: 'home', dbb_title: 'Keşfet', dbb_icon: 'sparkles-outline' },
  { dbb_key: 'search', dbb_title: 'Ara', dbb_icon: 'search-outline' },
  { dbb_key: 'basket', dbb_title: 'Sepet', dbb_icon: 'basket-outline' },
  { dbb_key: 'orders', dbb_title: 'Sipariş', dbb_icon: 'receipt-outline' },
  { dbb_key: 'courier', dbb_title: 'Kurye', dbb_icon: 'bicycle-outline' },
  { dbb_key: 'account', dbb_title: 'Hesap', dbb_icon: 'person-outline' }
];
const dbb_center = { dbb_lat: 39.92077, dbb_lon: 32.85411 };
function dbb_safe_basket(dbb_value:unknown):Dbb_BasketItem[] {
  if (!Array.isArray(dbb_value)) return [];
  return dbb_value.filter(dbb_item=>dbb_item&&typeof dbb_item.dbb_product_id==='string'&&
    Number.isInteger(dbb_item.dbb_quantity)&&dbb_item.dbb_quantity>0).slice(0,60)
    .map(dbb_item=>({dbb_product_id:dbb_item.dbb_product_id,dbb_quantity:Math.min(20,dbb_item.dbb_quantity)}));
}
function dbb_online_price(dbb_product:Dbb_Product | undefined):number | null {
  if (!dbb_product?.dbb_catalog_in_stock || !dbb_product.dbb_catalog_price_kurus ||
      !dbb_product.dbb_catalog_checked_at) return null;
  const dbb_age=Date.now()-new Date(dbb_product.dbb_catalog_checked_at).getTime();
  return dbb_age>=0 && dbb_age<24*60*60*1000 ? dbb_product.dbb_catalog_price_kurus : null;
}
const dbb_shelf_colors: Record<string,{background:string;border:string;accent:string;soft:string}> = {
  'Kahvaltılık': {background:'#FFF7E8',border:'#F7DB9D',accent:'#A15A11',soft:'#FFE8B5'},
  'İçecek': {background:'#EAF6FF',border:'#BBDDF5',accent:'#185E91',soft:'#D2EBFC'},
  'Temizlik': {background:'#F3EEFF',border:'#DCC9FF',accent:'#6846A6',soft:'#E6DAFF'},
  'Et ve tavuk': {background:'#FFF0EC',border:'#F4C7BD',accent:'#AD4C36',soft:'#FADAD2'},
  'Kişisel bakım': {background:'#FFF0F5',border:'#F6CEDC',accent:'#9D4364',soft:'#F9DDE8'},
  'Temel gıda': {background:'#EFF8E9',border:'#C9E2B8',accent:'#477C31',soft:'#DDF0D2'},
  'Market': {background:'#F7F9F0',border:'#DAE5CA',accent:'#53712D',soft:'#E7F0D9'}
};

export default function Dbb_App() {
  const dbb_insets = useSafeAreaInsets();
  const [dbb_tab, dbb_set_tab] = useState<Dbb_Tab>('home');
  const [dbb_offers, dbb_set_offers] = useState<Dbb_Offer[]>([]);
  const [dbb_products, dbb_set_products] = useState<Dbb_Product[]>([]);
  const [dbb_remote_products, dbb_set_remote_products] = useState<Dbb_Product[] | null>(null);
  const [dbb_remote_has_more, dbb_set_remote_has_more] = useState(false);
  const [dbb_fetching_more, dbb_set_fetching_more] = useState(false);
  const [dbb_browse_offset, dbb_set_browse_offset] = useState(180);
  const [dbb_total_products, dbb_set_total_products] = useState(0);
  const [dbb_searching, dbb_set_searching] = useState(false);
  const [dbb_visible_count, dbb_set_visible_count] = useState(24);
  const [dbb_catalog_loading, dbb_set_catalog_loading] = useState(true);
  const [dbb_config, dbb_set_config] = useState<Dbb_Config>(dbb_default_config);
  const [dbb_basket, dbb_set_basket] = useState<Dbb_BasketItem[]>([]);
  const [dbb_basket_hydrated,dbb_set_basket_hydrated]=useState(false);
  const [dbb_cloud_ready,dbb_set_cloud_ready]=useState<string|null>(null);
  const dbb_local_stamp=useRef(0);
  const dbb_local_owner=useRef<string|null>(null);
  const [dbb_query, dbb_set_query] = useState('');
  const [dbb_category, dbb_set_category] = useState('Tümü');
  const [dbb_location, dbb_set_location] = useState<Dbb_Coordinates>(dbb_center);
  const [dbb_address, dbb_set_address] = useState('');
  const [dbb_address_confirmed, dbb_set_address_confirmed] = useState(false);
  const [dbb_address_matches, dbb_set_address_matches] = useState<{ dbb_name: string; dbb_location: Dbb_Coordinates }[]>([]);
  const [dbb_quote_mode, dbb_set_quote_mode] = useState<'smart' | 'single'>('smart');
  const [dbb_budget, dbb_set_budget] = useState('');
  const [dbb_breakfast_feedback, dbb_set_breakfast_feedback] = useState('');
  const [dbb_saved_name, dbb_set_saved_name] = useState('Aylık Ev Alışverişi');
  const [dbb_saved_lists, dbb_set_saved_lists] = useState<{dbb_id:string;dbb_name:string;dbb_items:Dbb_BasketItem[]}[]>([]);
  const [dbb_tolerance, dbb_set_tolerance] = useState('50');
  const [dbb_user, dbb_set_user] = useState<User | null>(null);
  const [dbb_email, dbb_set_email] = useState('');
  const [dbb_password, dbb_set_password] = useState('');
  const [dbb_pending, dbb_set_pending] = useState(false);
  const [dbb_notice, dbb_set_notice] = useState('');
  const [dbb_cart_toast, dbb_set_cart_toast] = useState('');
  const [dbb_scanner, dbb_set_scanner] = useState(false);
  const [dbb_camera_permission, dbb_request_camera] = useCameraPermissions();
  const [dbb_new_order_id, dbb_set_new_order_id] = useState('');
  const [dbb_road_minutes, dbb_set_road_minutes] = useState<number | null>(null);
  const dbb_missing_attempted=useRef<Set<string>>(new Set());

  const dbb_refresh_catalog = useCallback(async () => {
    try { const dbb_data = await dbb_load_catalog();
      dbb_set_config(dbb_data.dbb_config); dbb_set_offers(dbb_data.dbb_offers); dbb_set_products(dbb_data.dbb_products);
      dbb_set_total_products(dbb_data.dbb_total_products);
      dbb_set_browse_offset(180);
    } catch (dbb_error) { dbb_set_notice(`Katalog bağlantısı: ${(dbb_error as Error).message}`); }
    finally { dbb_set_catalog_loading(false); }
  }, []);
  useEffect(() => {
    let dbb_active = true;
    dbb_refresh_catalog();
    Promise.all([AsyncStorage.getItem('dbb_basket_v3'),AsyncStorage.getItem('dbb_basket_v2')]).then(([dbb_saved,dbb_old])=>{
      if (!dbb_active) return;
      try {
        if (dbb_saved) {const dbb_snapshot=JSON.parse(dbb_saved);
          dbb_local_stamp.current=Number(dbb_snapshot.updated_at)||0;
          dbb_local_owner.current=typeof dbb_snapshot.user_id==='string'?dbb_snapshot.user_id:null;
          dbb_set_basket(dbb_safe_basket(dbb_snapshot.items));
        } else if (dbb_old) {dbb_local_stamp.current=Date.now();dbb_set_basket(dbb_safe_basket(JSON.parse(dbb_old)));}
      } catch { /* invalid local basket */ }
      dbb_set_basket_hydrated(true);
    }).catch(()=>dbb_active&&dbb_set_basket_hydrated(true));
    if (dbb_client) {
      dbb_client.auth.getUser().then(({ data: dbb_data }) => dbb_active && dbb_set_user(dbb_data.user));
      const { data: dbb_auth } = dbb_client.auth.onAuthStateChange((_dbb_event, dbb_session) => dbb_set_user(dbb_session?.user || null));
      return () => { dbb_active = false; dbb_auth.subscription.unsubscribe(); };
    }
    return () => { dbb_active = false; };
  }, [dbb_refresh_catalog]);

  useEffect(()=>{
    if (!dbb_basket_hydrated) return;
    if (!dbb_local_stamp.current) dbb_local_stamp.current=Date.now();
    AsyncStorage.setItem('dbb_basket_v3',JSON.stringify({items:dbb_basket,updated_at:dbb_local_stamp.current,user_id:dbb_local_owner.current})).catch(()=>{});
    const dbb_sync_client=dbb_client;
    if (!dbb_sync_client || !dbb_user || dbb_cloud_ready!==dbb_user.id) return;
    const dbb_timer=setTimeout(async()=>{
      const {error}=await dbb_sync_client.from('dbb_baskets').upsert({dbb_user_id:dbb_user.id,dbb_items:dbb_basket},{onConflict:'dbb_user_id'});
      if (error) dbb_set_notice(`Sepet eşitleme: ${error.message}`);
    },500);
    return ()=>clearTimeout(dbb_timer);
  },[dbb_basket,dbb_basket_hydrated,dbb_cloud_ready,dbb_user?.id]);
  useEffect(()=>{
    if (!dbb_basket_hydrated) return;
    dbb_set_cloud_ready(null);
    if (!dbb_client || !dbb_user) return;
    let dbb_active=true;
    const dbb_current_user=dbb_user.id;
    const dbb_request_stamp=dbb_local_stamp.current;
    dbb_client.from('dbb_baskets').select('dbb_items,dbb_updated_at').eq('dbb_user_id',dbb_current_user).maybeSingle()
      .then(({data,error})=>{
        if (!dbb_active) return;
        if (error) {dbb_set_notice(`Sepet eşitleme: ${error.message}`);return;}
        if (dbb_local_stamp.current>dbb_request_stamp) {dbb_local_owner.current=dbb_current_user;dbb_set_cloud_ready(dbb_current_user);return;}
        const dbb_remote=dbb_safe_basket(data?.dbb_items);
        const dbb_cloud_stamp=data?.dbb_updated_at?new Date(data.dbb_updated_at).getTime():0;
        if (dbb_local_owner.current===null && dbb_basket.length && dbb_remote.length) {
          const dbb_merged=new Map(dbb_remote.map(dbb_item=>[dbb_item.dbb_product_id,dbb_item]));
          dbb_basket.forEach(dbb_item=>{const dbb_prior=dbb_merged.get(dbb_item.dbb_product_id);
            dbb_merged.set(dbb_item.dbb_product_id,{...dbb_item,dbb_quantity:Math.max(dbb_prior?.dbb_quantity||0,dbb_item.dbb_quantity)});});
          dbb_set_basket([...dbb_merged.values()].slice(0,60));dbb_local_stamp.current=Date.now();
        } else if ((dbb_local_owner.current===null && dbb_remote.length>0) ||
          (dbb_local_owner.current!==null && dbb_local_owner.current!==dbb_current_user) ||
          dbb_cloud_stamp>dbb_local_stamp.current) {
          dbb_set_basket(dbb_remote);dbb_local_stamp.current=dbb_cloud_stamp||Date.now();
        }
        dbb_local_owner.current=dbb_current_user;
        dbb_set_cloud_ready(dbb_current_user);
      });
    return ()=>{dbb_active=false;};
  },[dbb_user?.id,dbb_basket_hydrated]);
  useEffect(()=>{
    if (dbb_tab!=='basket'||!dbb_client||!dbb_user||dbb_cloud_ready!==dbb_user.id) return;
    let dbb_active=true;
    dbb_client.from('dbb_baskets').select('dbb_items,dbb_updated_at').eq('dbb_user_id',dbb_user.id).maybeSingle()
      .then(({data,error})=>{
        if (!dbb_active||error||!data) return;
        const dbb_stamp=new Date(data.dbb_updated_at).getTime();
        if (dbb_stamp<=dbb_local_stamp.current+1000) return;
        const dbb_remote=dbb_safe_basket(data.dbb_items);
        dbb_local_stamp.current=dbb_stamp;
        dbb_set_basket(dbb_remote);
      });
    return ()=>{dbb_active=false;};
  },[dbb_tab,dbb_cloud_ready,dbb_user?.id]);
  useEffect(()=>{
    if (dbb_catalog_loading || !dbb_client) return;
    const dbb_missing=dbb_basket.map(dbb_item=>dbb_item.dbb_product_id)
      .filter(dbb_id=>!dbb_products.some(dbb_product=>dbb_product.dbb_id===dbb_id)&&!dbb_missing_attempted.current.has(dbb_id));
    if (!dbb_missing.length) return;
    dbb_missing.forEach(dbb_id=>dbb_missing_attempted.current.add(dbb_id));
    dbb_products_for_basket(dbb_missing).then(dbb_found=>dbb_set_products(dbb_old=>
      [...dbb_old,...dbb_found.filter(dbb_item=>!dbb_old.some(dbb_existing=>dbb_existing.dbb_id===dbb_item.dbb_id))]))
      .catch(dbb_error=>dbb_set_notice(dbb_error.message));
  },[dbb_basket,dbb_products,dbb_catalog_loading]);
  useEffect(() => {if (!dbb_notice) return; const dbb_timer=setTimeout(()=>dbb_set_notice(''),9000);return ()=>clearTimeout(dbb_timer);},[dbb_notice]);
  useEffect(() => {if (!dbb_cart_toast) return; const dbb_timer=setTimeout(()=>dbb_set_cart_toast(''),3500);return ()=>clearTimeout(dbb_timer);},[dbb_cart_toast]);
  const dbb_load_lists = async () => {
    if (!dbb_client || !dbb_user) return;
    const { data: dbb_data, error: dbb_error } = await dbb_client.from('dbb_saved_lists').select('dbb_id,dbb_name,dbb_items').eq('dbb_user_id',dbb_user.id).order('dbb_updated_at',{ascending:false});
    if (dbb_error) dbb_set_notice(dbb_error.message); else dbb_set_saved_lists(dbb_data || []);
  };
  useEffect(() => { if (dbb_user) dbb_load_lists(); else dbb_set_saved_lists([]); }, [dbb_user?.id]);
  useEffect(() => {
    dbb_set_visible_count(24);
    if (dbb_tab !== 'search' || (!dbb_query.trim() && dbb_category==='Tümü')) {dbb_set_remote_products(null);dbb_set_remote_has_more(false);dbb_set_searching(false);return;}
    if (dbb_query.trim().length === 1) {dbb_set_remote_products([]);dbb_set_remote_has_more(false);return;}
    let dbb_alive=true;
    const dbb_timer=setTimeout(async()=>{
      dbb_set_searching(true);
      try {const dbb_data=await dbb_search_catalog(dbb_search_text(dbb_query),dbb_category);
        if (dbb_alive) {dbb_set_remote_products(dbb_data);dbb_set_remote_has_more(dbb_data.length===100);}
      } catch(dbb_error) {if (dbb_alive) dbb_set_notice((dbb_error as Error).message);}
      finally {if (dbb_alive) dbb_set_searching(false);}
    },300);
    return ()=>{dbb_alive=false;clearTimeout(dbb_timer);};
  },[dbb_tab,dbb_query,dbb_category]);
  const dbb_more_products=async()=>{
    if (dbb_fetching_more) return;
    if (dbb_filtered.length>dbb_visible_count) {dbb_set_visible_count(dbb_value=>dbb_value+24);return;}
    dbb_set_fetching_more(true);
    try {
      const dbb_page=await dbb_search_catalog(dbb_search_text(dbb_query),dbb_category,
        dbb_remote_products ? dbb_remote_products.length : dbb_browse_offset);
      if (dbb_remote_products) {
        dbb_set_remote_products(dbb_old=>[...(dbb_old||[]),...dbb_page]);
        dbb_set_remote_has_more(dbb_page.length===100);
      } else {
        dbb_set_browse_offset(dbb_value=>dbb_value+dbb_page.length);
        dbb_set_products(dbb_old=>{const dbb_by_id=new Map(dbb_old.map(dbb_item=>[dbb_item.dbb_id,dbb_item]));
          dbb_page.forEach(dbb_item=>dbb_by_id.set(dbb_item.dbb_id,dbb_item));return [...dbb_by_id.values()];});
      }
      dbb_set_visible_count(dbb_value=>dbb_value+24);
    } catch(dbb_error) {dbb_set_notice((dbb_error as Error).message);}
    finally {dbb_set_fetching_more(false);}
  };
  const dbb_filtered = useMemo(() => (dbb_remote_products || dbb_products).filter(dbb_product => {
    const dbb_text = `${dbb_product.dbb_name} ${dbb_product.dbb_brand} ${dbb_product.dbb_size} ${dbb_product.dbb_barcode || ''}`.toLocaleLowerCase('tr-TR').replace(/[.,'’\-_]/g,' ');
    return (dbb_category === 'Tümü' || dbb_product.dbb_category === dbb_category) &&
      (!dbb_query.trim() || dbb_search_text(dbb_query).toLocaleLowerCase('tr-TR').replace(/[.,'’\-_]/g,' ').split(/\s+/).every(dbb_word => dbb_text.includes(dbb_word)));
  }), [dbb_remote_products,dbb_products, dbb_category, dbb_query]);
  const dbb_categories = useMemo(() => ['Tümü','Kahvaltılık','İçecek','Temizlik','Temel gıda','Et ve tavuk','Kişisel bakım','Market',...new Set(dbb_products.map(dbb_item=>dbb_item.dbb_category))].filter((dbb_value,dbb_index,dbb_array)=>dbb_array.indexOf(dbb_value)===dbb_index), [dbb_products]);
  const dbb_result = useMemo(() => dbb_optimize(dbb_basket, dbb_offers, dbb_location, dbb_config), [dbb_basket, dbb_offers, dbb_location, dbb_config]);
  const dbb_quote = dbb_quote_mode === 'single' && dbb_result.dbb_single ? dbb_result.dbb_single : dbb_result.dbb_best;
  const dbb_count = dbb_basket.reduce((dbb_sum, dbb_item) => dbb_sum + dbb_item.dbb_quantity, 0);
  const dbb_reference_total=useMemo(()=>{
    if (!dbb_basket.length) return null;
    let dbb_total=0;
    for (const dbb_item of dbb_basket) {
      const dbb_product=dbb_products.find(dbb_found=>dbb_found.dbb_id===dbb_item.dbb_product_id);
      const dbb_price=dbb_online_price(dbb_product);
      if (!dbb_price) return null;
      dbb_total+=dbb_price*dbb_item.dbb_quantity;
    }
    return dbb_total;
  },[dbb_basket,dbb_products]);

  useEffect(() => {
    let dbb_active = true;
    if (!dbb_quote) return;
    dbb_road_eta([dbb_location, ...dbb_quote.dbb_route, dbb_location]).then(dbb_eta => {
      if (dbb_active) dbb_set_road_minutes(dbb_eta ? dbb_eta.dbb_minutes + dbb_quote.dbb_route.length * 9 : null);
    }).catch(() => dbb_active && dbb_set_road_minutes(null));
    return () => { dbb_active = false; };
  }, [dbb_quote?.dbb_route.map(dbb_stop => dbb_stop.dbb_id).join(','), dbb_location.dbb_lat, dbb_location.dbb_lon]);

  const dbb_change_basket=(dbb_value:React.SetStateAction<Dbb_BasketItem[]>)=>{
    dbb_local_stamp.current=Date.now();dbb_set_basket(dbb_value);
  };
  const dbb_add = (dbb_product_id: string, dbb_delta = 1) => dbb_change_basket(dbb_old => {
    const dbb_existing = dbb_old.find(dbb_item => dbb_item.dbb_product_id === dbb_product_id);
    if (!dbb_existing && dbb_delta > 0) return [...dbb_old, { dbb_product_id, dbb_quantity: 1 }];
    return dbb_old.map(dbb_item => dbb_item.dbb_product_id === dbb_product_id ?
      { ...dbb_item, dbb_quantity: Math.min(20, Math.max(0, dbb_item.dbb_quantity + dbb_delta)) } : dbb_item).filter(dbb_item => dbb_item.dbb_quantity > 0);
  });
  const dbb_add_product = (dbb_product: Dbb_Product) => {
    dbb_set_products(dbb_old=>dbb_old.some(dbb_item=>dbb_item.dbb_id===dbb_product.dbb_id)?dbb_old:[...dbb_old,dbb_product]);
    dbb_add(dbb_product.dbb_id);
    dbb_set_cart_toast(`${dbb_product.dbb_name} sepete eklendi`);
  };

  const dbb_find_address = async () => {
    try { dbb_set_pending(true); dbb_set_address_matches(await dbb_geocode(dbb_address)); }
    catch (dbb_error) { dbb_set_notice((dbb_error as Error).message); } finally { dbb_set_pending(false); }
  };
  const dbb_use_gps = async () => {
    try {
      const dbb_permission = await Location.requestForegroundPermissionsAsync();
      if (dbb_permission.status !== 'granted') { dbb_set_notice('Konum izni gerekli. İstersen adres aramasıyla devam et.'); return; }
      const dbb_position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const dbb_point = { dbb_lat: dbb_position.coords.latitude, dbb_lon: dbb_position.coords.longitude };
      if (dbb_point.dbb_lat < 39.7 || dbb_point.dbb_lat > 40.3 || dbb_point.dbb_lon < 32.4 || dbb_point.dbb_lon > 33.4)
        { dbb_set_notice('DraBornBuy şu anda yalnızca Ankara içinde çalışıyor.'); return; }
      dbb_set_location(dbb_point); dbb_set_address_confirmed(true); dbb_set_notice('Konum seçildi. Teslimat için açık adresini de yaz.');
    } catch { dbb_set_notice('Konum alınamadı; adres aramasıyla devam et.'); }
  };
  const dbb_authenticate = async (dbb_action: 'signIn' | 'signUp') => {
    if (!dbb_client) { dbb_set_notice('Bağlantı ayarları eksik.'); return; }
    try {
      dbb_set_pending(true);
      const { data: dbb_data, error: dbb_error } = dbb_action === 'signIn' ?
        await dbb_client.auth.signInWithPassword({ email: dbb_email.trim(), password: dbb_password }) :
        await dbb_client.auth.signUp({ email: dbb_email.trim(), password: dbb_password });
      if (dbb_error) throw dbb_error;
      if (!dbb_data.session) dbb_set_notice('Kayıt alındı; e-posta doğrulama bağlantısını aç.');
      else { dbb_set_password(''); dbb_set_notice('Oturum açıldı.'); }
    } catch (dbb_error) { dbb_set_notice((dbb_error as Error).message); } finally { dbb_set_pending(false); }
  };
  const dbb_checkout = async () => {
    if (!dbb_quote) return;
    if (!dbb_config.dbb_enabled) { dbb_set_notice('Gerçek siparişler henüz açılmadı; Ankara şubesi ve ödeme hesabı doğrulanmalı.'); return; }
    if (!dbb_user) { dbb_set_notice('Sipariş için önce hesabına giriş yap.'); dbb_set_tab('account'); return; }
    if (!dbb_address_confirmed || dbb_address.trim().length < 10) { dbb_set_notice('Haritadan Ankara adresini seçip açık adresi yaz.'); return; }
    if (dbb_budget && dbb_quote.dbb_total > Number(dbb_budget.replace(',', '.')) * 100) { dbb_set_notice('Seçilen sepet bütçe sınırını aşıyor.'); return; }
    try {
      dbb_set_pending(true);
      const dbb_order = await dbb_create_live_order(dbb_quote.dbb_assignments, dbb_address, dbb_location,
        Math.round(Number(dbb_tolerance.replace(',', '.')) * 100) || 0);
      dbb_set_new_order_id(dbb_order.dbb_id); dbb_change_basket([]); dbb_set_tab('orders');
      dbb_set_notice(`${dbb_order.dbb_code} oluşturuldu. Ödemeden önce sunucu toplamını kontrol et.`);
    } catch (dbb_error) { dbb_set_notice((dbb_error as Error).message); } finally { dbb_set_pending(false); }
  };
  const dbb_save_list = async () => {
    if (!dbb_user) { dbb_set_notice('Kayıtlı sepet için hesabına giriş yap.'); dbb_set_tab('account'); return; }
    if (!dbb_client || !dbb_basket.length || !dbb_saved_name.trim()) return;
    const {error:dbb_error} = await dbb_client.from('dbb_saved_lists').insert({dbb_user_id:dbb_user.id,dbb_name:dbb_saved_name.trim(),dbb_items:dbb_basket});
    if (dbb_error) dbb_set_notice(dbb_error.message); else { dbb_set_notice('Sepetin kaydedildi. Android ve web hesabında görünür.'); dbb_load_lists(); }
  };
  const dbb_restore_list = async (dbb_items: Dbb_BasketItem[]) => {
    let dbb_found:Dbb_Product[]=[];
    try {dbb_found=await dbb_products_for_basket(dbb_items.map(dbb_item=>dbb_item.dbb_product_id));}
    catch(dbb_error) {dbb_set_notice((dbb_error as Error).message);return;}
    const dbb_valid = dbb_items.filter(dbb_item => dbb_found.some(dbb_product => dbb_product.dbb_id === dbb_item.dbb_product_id));
    if (!dbb_valid.length) { dbb_set_notice('Bu listedeki ürünler şu anki katalogda bulunmuyor.'); return; }
    dbb_set_products(dbb_old=>[...dbb_old,...dbb_found.filter(dbb_product=>!dbb_old.some(dbb_item=>dbb_item.dbb_id===dbb_product.dbb_id))]);
    dbb_change_basket(dbb_valid); dbb_set_tab('basket'); dbb_set_notice('Sepetin yüklendi. Uygun şube fiyatı varsa rota yeniden hesaplanır.');
  };
  const dbb_plan_breakfast = async () => {
    const dbb_limit = Math.round(Number(dbb_budget.replace(',','.')) * 100);
    if (!Number.isFinite(dbb_limit) || dbb_limit <= 0) { dbb_set_breakfast_feedback('Önce TL cinsinden bir bütçe gir.'); return; }
    const dbb_list = dbb_breakfast_under_budget(dbb_products,dbb_offers,dbb_location,dbb_limit,dbb_config);
    if (!dbb_list.length && !dbb_offers.length) {
      try {
        dbb_set_pending(true);
        const dbb_catalog=await dbb_breakfast_catalog();
        const dbb_kinds=[
          {name:'yumurta',test:/yumurta/}, {name:'peynir',test:/peynir/},
          {name:'zeytin',test:/(?:^|\s)zeytin(?:\s|$)/}, {name:'ekmek',test:/ekmek|simit/},
          {name:'süt',test:/(?:^|\s)s[uü]t(?:\s|$)/}, {name:'çay',test:/(?:^|\s)çay(?:\s|$)/}
        ];
        const dbb_selected:Dbb_Product[]=[];
        let dbb_running=0;
        for (const dbb_kind of dbb_kinds) {
          const dbb_product=dbb_catalog.find(dbb_item=>{
            const dbb_price=dbb_online_price(dbb_item);
            return dbb_price!==null && dbb_kind.test.test(dbb_item.dbb_name.toLocaleLowerCase('tr-TR')) &&
              dbb_running+dbb_price<=dbb_limit;
          });
          if (!dbb_product) continue;
          dbb_selected.push(dbb_product);dbb_running+=dbb_online_price(dbb_product)!;
        }
        if (dbb_selected.length) {
          dbb_set_products(dbb_old=>[...dbb_old,...dbb_selected.filter(dbb_product=>!dbb_old.some(dbb_item=>dbb_item.dbb_id===dbb_product.dbb_id))]);
          dbb_change_basket(dbb_selected.map(dbb_product=>({dbb_product_id:dbb_product.dbb_id,dbb_quantity:1})));
          dbb_set_tab('basket');
          dbb_set_notice(`Kahvaltılık taslak hazır: ${dbb_selected.length} ürün · çevrimiçi ürün toplamı ${dbb_lira(dbb_running)}. Stok, kurye ve şube fiyatı doğrulanmadığından ${dbb_budget} TL teslimat bütçesi garanti edilemez.`);
          return;
        }
      } catch(dbb_error) {dbb_set_breakfast_feedback((dbb_error as Error).message);return;}
      finally {dbb_set_pending(false);}
    }
    if (!dbb_list.length) {
      dbb_set_breakfast_feedback('Bu bütçe için güncel stoklu kahvaltılık bulunamadı. Kaynak güncellendiğinde tekrar dene.');return;
    }
    dbb_set_breakfast_feedback(''); dbb_change_basket(dbb_list); dbb_set_tab('basket'); dbb_set_notice(`${dbb_list.length} kahvaltılık bütçene göre seçildi; istediğin ürünleri değiştirebilirsin.`);
  };

  const dbb_product_card = (dbb_product: Dbb_Product) => {
    const dbb_choices = dbb_offers.filter(dbb_offer => dbb_offer.dbb_product_id === dbb_product.dbb_id).sort((dbb_a, dbb_b) => dbb_a.dbb_price_kurus - dbb_b.dbb_price_kurus);
    const dbb_product_quote = dbb_optimize([{ dbb_product_id: dbb_product.dbb_id, dbb_quantity: 1 }], dbb_choices, dbb_location, dbb_config).dbb_best;
    const dbb_quantity = dbb_basket.find(dbb_item => dbb_item.dbb_product_id === dbb_product.dbb_id)?.dbb_quantity || 0;
    const dbb_online=dbb_online_price(dbb_product);
    const dbb_palette=dbb_shelf_colors[dbb_product.dbb_category]||dbb_shelf_colors.Market;
    return <Dbb_Card key={dbb_product.dbb_id} dbb_style={{ gap: 12, backgroundColor:dbb_palette.background,borderColor:dbb_palette.border,padding:14 }}>
      <View style={{flexDirection:'row',gap:13,alignItems:'center'}}>
        <View style={{ width: 100, height: 104, borderRadius: 19, backgroundColor: dbb_palette.soft, alignItems: 'center', justifyContent: 'center', overflow:'hidden',borderWidth:1,borderColor:dbb_palette.border }}>
          {dbb_product.dbb_image_url?<Image source={{uri:dbb_product.dbb_image_url}} style={{width:94,height:98}} resizeMode="contain" />:<Ionicons name="cube-outline" size={38} color={dbb_palette.accent} />}</View>
        <View style={{ flex: 1, gap:5 }}>
          <View style={{backgroundColor:dbb_palette.soft,borderRadius:8,paddingHorizontal:8,paddingVertical:4,alignSelf:'flex-start'}}><Text style={{color:dbb_palette.accent,fontSize:10,fontWeight:'900'}}>{dbb_product.dbb_category.toLocaleUpperCase('tr-TR')}</Text></View>
          <Text style={{color:'#15332E',fontWeight:'900',fontSize:16,lineHeight:21}} numberOfLines={3}>{dbb_product.dbb_name}</Text>
          <Text style={{color:'#60736B',fontSize:12}}>{dbb_product.dbb_brand || dbb_product.dbb_source_merchant || 'Market'}{dbb_product.dbb_size ? ` · ${dbb_product.dbb_size}`:''}</Text>
        </View>
      </View>
      {dbb_choices.map((dbb_offer, dbb_index) => <View key={dbb_offer.dbb_id} style={[dbb_styles.row, { justifyContent: 'space-between' }]}>
        <Text style={{ color:dbb_palette.accent,fontSize:12,flex:1,fontWeight:dbb_index===0?'800':'500' }}>
          {dbb_offer.dbb_store.dbb_name} · {dbb_distance_km(dbb_offer.dbb_store, dbb_location).toFixed(1)} km
        </Text><Text style={{ color:'#15332E',fontSize:13,fontWeight:'900' }}>{dbb_lira(dbb_offer.dbb_price_kurus)}</Text>
      </View>)}
      <View style={{height:1,backgroundColor:dbb_palette.border}} />
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}}>
        <View style={{flex:1,gap:2}}>
          <Text style={{color:'#5B7067',fontWeight:'700',fontSize:11}}>{dbb_choices.length?'EN UYGUN ŞUBE FİYATI':dbb_online?'ÇEVRİMİÇİ KAYNAK FİYATI':'ÇEVRİMİÇİ DURUM'}</Text>
          <Text style={{color:'#123D31',fontWeight:'900',fontSize:23,fontVariant:['tabular-nums']}}>{dbb_choices.length?dbb_lira(dbb_choices[0].dbb_price_kurus):dbb_online?dbb_lira(dbb_online):dbb_product.dbb_catalog_in_stock===false?'Çevrimiçi stok yok':'Fiyat izleniyor'}</Text>
          {dbb_choices.length?<Text style={{color:'#60736B',fontSize:11}}>Teslim dahil {dbb_product_quote?dbb_lira(dbb_product_quote.dbb_total):'—'}</Text>:
            <Text style={{color:'#60736B',fontSize:11}}>{dbb_product.dbb_source_merchant || 'Ürün kaynağı'} · {dbb_product.dbb_catalog_checked_at?new Date(dbb_product.dbb_catalog_checked_at).toLocaleDateString('tr-TR'):'katalog kaydı'}</Text>}
        </View>
        <Pressable onPress={() => dbb_add_product(dbb_product)} style={{backgroundColor:'#136C53',paddingHorizontal:13,paddingVertical:13,borderRadius:15,flexDirection:'row',alignItems:'center',gap:5,minHeight:47}}
          accessibilityRole="button" accessibilityLabel={`${dbb_product.dbb_name} sepete ekle, şu anda ${dbb_quantity} adet`}>
          <Ionicons name={dbb_quantity?'checkmark-circle':'add-circle'} size={20} color="white" />
          <Text style={{color:'white',fontSize:12,fontWeight:'900'}}>{dbb_quantity?`${dbb_quantity} sepette`:'Ekle'}</Text>
        </Pressable>
      </View>
      {!dbb_choices.length && !!dbb_product.dbb_source_url && <Pressable onPress={()=>Linking.openURL(dbb_product.dbb_source_url!)} accessibilityRole="link"><Text style={{color:dbb_palette.accent,fontSize:11,fontWeight:'800'}}>Kaynağı gör ↗</Text></Pressable>}
    </Dbb_Card>;
  };

  const dbb_home = <View style={{ gap: 25 }}>
    <Dbb_Hero dbb_onSearch={() => dbb_set_tab('search')} />
    <View style={{flexDirection:'row',gap:9}}>
      {[
        {name:'Kahvaltılık',icon:'sunny-outline',color:'#EA9C2B',background:'#FFF0CF',category:'Kahvaltılık'},
        {name:'İçecek',icon:'cafe-outline',color:'#2479BD',background:'#DDF1FF',category:'İçecek'},
        {name:'Temizlik',icon:'sparkles-outline',color:'#9A59B8',background:'#F5E8FF',category:'Temizlik'}
      ].map(dbb_tile=><Pressable key={dbb_tile.name} onPress={()=>{dbb_set_category(dbb_tile.category);dbb_set_tab('search');}}
        style={{flex:1,backgroundColor:dbb_tile.background,borderColor:dbb_tile.color+'55',borderWidth:1,borderRadius:19,padding:13,gap:10,minHeight:91,justifyContent:'space-between'}} accessibilityRole="button">
        <Ionicons name={dbb_tile.icon as keyof typeof Ionicons.glyphMap} size={24} color={dbb_tile.color}/>
        <Text style={{color:'#233E35',fontSize:11,fontWeight:'900'}}>{dbb_tile.name}</Text></Pressable>)}
    </View>
    <Dbb_Section dbb_title="Market rafı" dbb_caption={`${dbb_total_products} ürün katalogda · İstediğini aramaya başla.`}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12,paddingRight:12}}>
        {dbb_products.slice(0,18).map((dbb_product,dbb_index)=><Pressable key={dbb_product.dbb_id} onPress={()=>{dbb_set_query(dbb_product.dbb_name);dbb_set_tab('search');}}
          style={{width:154,borderRadius:21,padding:11,gap:9,backgroundColor:['#FFE9C8','#DFF4E8','#E7EBFF','#FFE3DE'][dbb_index%4],borderWidth:1,borderColor:'#FFFFFF'}}>
          <View style={{height:115,borderRadius:17,backgroundColor:['#FFF0D8','#CFF0DE','#DDE6FF','#FFDDD5'][dbb_index%4],alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
            {dbb_product.dbb_image_url?<Image source={{uri:dbb_product.dbb_image_url}} style={{width:105,height:105}} resizeMode="contain" />:<Ionicons name="cube-outline" size={39} color={dbb_theme.purple} />}</View>
          <Text numberOfLines={2} style={{color:'#17382E',fontWeight:'900',fontSize:12,minHeight:35}}>{dbb_product.dbb_name}</Text>
          <Text style={{color:'#48665C',fontSize:11,fontWeight:'700'}}>{dbb_online_price(dbb_product)?dbb_lira(dbb_online_price(dbb_product)!):dbb_product.dbb_size || dbb_product.dbb_brand}</Text>
        </Pressable>)}
      </ScrollView>
    </Dbb_Section>
    <Dbb_Section dbb_title="Alışverişini planla" dbb_caption="Sepetin ve kaynak fiyatları tek ekranda.">
      <View style={{borderRadius:22,padding:19,gap:11,backgroundColor:'#3B5D87',borderWidth:1,borderColor:'#85B6DF'}}>
        <Ionicons name="basket" color={dbb_theme.yellow} size={26}/>
        <Text style={{color:'white',fontSize:21,fontWeight:'900'}}>Sepetini kolayca oluştur.</Text>
        <Text style={{color:'#DCEFFF',fontSize:13,lineHeight:19}}>Aradığın ürünü ekle, kaydet ve güncel kaynaklarını gör.</Text>
        <Dbb_Button dbb_title="Ürün ara" dbb_icon="arrow-forward" dbb_kind="mint" dbb_onPress={() => dbb_set_tab('search')} />
      </View>
    </Dbb_Section>
    <Dbb_Card>
      <Dbb_Pill dbb_label="BÜTÇEYLE PLANLA" dbb_tone="yellow" />
      <Text style={dbb_styles.itemTitle}>“500 TL’ye kahvaltılık hazırla”</Text>
      <Text style={dbb_styles.muted}>Bütçeni gir. Uygun şube teklifleri bulunduğunda teslimat dahil seçenekleri hesaplarız.</Text>
      <TextInput style={dbb_styles.input} value={dbb_budget} onChangeText={dbb_value=>{dbb_set_budget(dbb_value);dbb_set_breakfast_feedback('');}} keyboardType="decimal-pad" placeholder="Bütçen · TL" placeholderTextColor="#A1B59D" />
      <Dbb_Button dbb_title="Kahvaltılık sepeti oluştur" dbb_icon="basket-outline" dbb_onPress={dbb_plan_breakfast} />
      {dbb_breakfast_feedback?<View accessibilityRole="alert" style={{padding:12,backgroundColor:'#31533C',borderRadius:12,borderWidth:1,borderColor:dbb_theme.yellow}}><Text selectable style={{color:dbb_theme.text,lineHeight:20}}>{dbb_breakfast_feedback}</Text></View>:null}
    </Dbb_Card>
    {dbb_saved_lists.length > 0 && <Dbb_Section dbb_title="Kayıtlı sepetlerin" dbb_caption="Bugünün teklifleriyle yeniden hesapla.">
      {dbb_saved_lists.slice(0,3).map(dbb_list => <Dbb_Card key={dbb_list.dbb_id} dbb_style={{flexDirection:'row',alignItems:'center'}}>
        <Ionicons name="bookmark" color={dbb_theme.yellow} size={20} /><Text style={[dbb_styles.itemTitle,{flex:1}]}>{dbb_list.dbb_name}</Text>
        <Pressable onPress={() => dbb_restore_list(dbb_list.dbb_items)}><Ionicons name="arrow-forward-circle" color={dbb_theme.mint} size={26} /></Pressable>
      </Dbb_Card>)}</Dbb_Section>}
    <Dbb_Section dbb_title="Keşfetmeye devam et" dbb_caption={dbb_offers.length?'Ankara şubelerinde güncel doğrulanan fiyatlar görünür.':'Kaynak sayfası bulunan ürünler; çevrimiçi fiyatları şube fiyatından farklı olabilir.'}>
      {dbb_products.slice(0, 4).map(dbb_product_card)}
      {!dbb_products.length&&<Dbb_Card><Text style={dbb_styles.itemTitle}>{dbb_catalog_loading?'Katalog yükleniyor':'Henüz ürün bulunamadı'}</Text>
        <Text style={dbb_styles.muted}>Bağlantıyı veya yönetici ürün kayıtlarını kontrol et.</Text></Dbb_Card>}
      <Dbb_Button dbb_title="Tüm ürünlere bak" dbb_kind="ghost" dbb_icon="grid-outline" dbb_onPress={() => dbb_set_tab('search')} />
    </Dbb_Section>
  </View>;

  const dbb_search_screen = <View style={{ gap: 18 }}>
    <View style={{gap:5}}><Text style={dbb_styles.heading}>Market rafları</Text><Text style={dbb_styles.muted}>Marka, boyut veya barkodla ürününü bul.</Text></View>
    <View style={[dbb_styles.row, { backgroundColor: '#F8FFF8', paddingHorizontal: 15, borderRadius: 17, borderWidth: 2, borderColor: '#95DEB4' }]}>
      <Ionicons name="search" size={21} color="#187E5C" />
      <TextInput value={dbb_query} onChangeText={dbb_set_query} placeholder="Örn. Coca-Cola 2,5 L" placeholderTextColor="#779186"
        style={{ flex: 1, color: '#17382E', paddingVertical: 16, fontSize: 15 }} autoCapitalize="none" />
      {dbb_query ? <Pressable onPress={() => dbb_set_query('')}><Ionicons name="close-circle" color={dbb_theme.muted} size={20} /></Pressable> : null}
    </View>
    <View style={dbb_styles.row}><View style={{ flex: 1 }}><Dbb_Button dbb_title="Barkod tara" dbb_icon="barcode-outline" dbb_kind="ghost" dbb_onPress={async () => {
      const dbb_permission = dbb_camera_permission?.granted ? dbb_camera_permission : await dbb_request_camera();
      if (dbb_permission.granted) dbb_set_scanner(true); else dbb_set_notice('Barkod için kamera izni gerekiyor.');
    }} /></View><View style={{ flex: 1 }}><Dbb_Button dbb_title="Ürün linki" dbb_icon="link-outline" dbb_kind="ghost" dbb_onPress={() => dbb_set_notice('Mağaza linkini yukarıya yapıştır; linkin ürün adındaki kelimeleri katalogla eşleştirilir.')} /></View></View>
    {dbb_scanner && <Dbb_Card><Text style={dbb_styles.itemTitle}>Barkodu kameraya göster</Text>
      <CameraView style={{ height: 260, borderRadius: 18, overflow: 'hidden' }} barcodeScannerSettings={{ barcodeTypes: ['ean13','ean8','upc_a'] }}
        onBarcodeScanned={({ data: dbb_code }) => { dbb_set_query(dbb_code); dbb_set_scanner(false); }} />
      <Dbb_Button dbb_title="Kapat" dbb_kind="ghost" dbb_onPress={() => dbb_set_scanner(false)} /></Dbb_Card>}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9 }}>
      {dbb_categories.map(dbb_name => {const dbb_palette=dbb_shelf_colors[dbb_name]||dbb_shelf_colors.Market;return <Pressable key={dbb_name} onPress={() => dbb_set_category(dbb_name)} style={{ borderRadius: 20, backgroundColor: dbb_category === dbb_name ? '#FBCB73' : dbb_palette.background,
        paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: dbb_category === dbb_name ? '#F5B04A' : dbb_palette.border }}>
        <Text style={{ color: '#234036', fontSize: 12, fontWeight: '900' }}>{dbb_name}</Text></Pressable>;})}</ScrollView>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Text style={[dbb_styles.muted,{flex:1}]}>{dbb_searching?'Ürünler aranıyor…':dbb_query||dbb_category!=='Tümü'?`${dbb_filtered.length}${dbb_remote_has_more?'+':''} ürün`:`${dbb_total_products} katalog ürünü`}</Text>
      <Pressable onPress={dbb_refresh_catalog} accessibilityRole="button" accessibilityLabel="Kataloğu yenile" style={{padding:8,borderRadius:20,backgroundColor:'#215745'}}><Ionicons name="refresh" color="white" size={17}/></Pressable></View>
    {!dbb_offers.length && <View style={{padding:11,borderRadius:14,backgroundColor:'#23434C',flexDirection:'row',alignItems:'center',gap:9}}><Ionicons name="information-circle-outline" size={18} color={dbb_theme.yellow}/><Text style={{flex:1,color:'#E0EEE9',fontSize:11,lineHeight:16}}>Gösterilen fiyatlar çevrimiçi kaynak fiyatlarıdır. Teslimat için şube stoğu gerekir.</Text></View>}
    {dbb_filtered.slice(0,dbb_visible_count).map(dbb_product_card)}
    {(dbb_filtered.length>dbb_visible_count || (dbb_remote_products ? dbb_remote_has_more : dbb_browse_offset<dbb_total_products)) &&
      <Dbb_Button dbb_title={dbb_fetching_more?'Yükleniyor…':'Daha fazla ürün göster'} dbb_kind="ghost" dbb_icon="chevron-down" dbb_disabled={dbb_fetching_more} dbb_onPress={dbb_more_products} />}
    {!dbb_filtered.length && !dbb_searching && <Dbb_Card><Text style={dbb_styles.itemTitle}>Eşleşme bulunamadı</Text><Text style={dbb_styles.muted}>Farklı bir ürün adı veya barkod dene.</Text></Dbb_Card>}
  </View>;

  const dbb_fee_row = (dbb_name: string, dbb_value: number, dbb_color = dbb_theme.text) =>
    <View style={[dbb_styles.row, { justifyContent: 'space-between' }]}><Text style={dbb_styles.muted}>{dbb_name}</Text>
      <Text style={{ color: dbb_color, fontWeight: '700', fontSize: 14 }}>{dbb_lira(dbb_value)}</Text></View>;

  const dbb_basket_screen = <View style={{ gap: 18 }}>
    <View><Text style={dbb_styles.heading}>Sepetim</Text><Text style={dbb_styles.muted}>{dbb_count} ürün · {dbb_user?'Android ve web hesabında eşitlenir':'Hesabına giriş yapınca cihazlarında eşitlenir'}</Text></View>
    {!dbb_basket.length ? <Dbb_Card><Text style={{ fontSize: 38 }}>🛍️</Text><Text style={dbb_styles.itemTitle}>Sepetin henüz boş</Text>
      <Text style={dbb_styles.muted}>Aradığın ürünleri seçerek alışveriş listeni oluştur.</Text>
      <Dbb_Button dbb_title="Ürün ara" dbb_onPress={() => dbb_set_tab('search')} /></Dbb_Card> : <>
      <View style={{borderRadius:22,backgroundColor:'#FFF6E0',borderWidth:1,borderColor:'#F4D486',padding:18,gap:8}}>
        <Text style={{color:'#866127',fontSize:11,fontWeight:'900'}}>ALIŞVERİŞ LİSTEN</Text>
        <Text style={{color:'#183B2F',fontSize:29,fontWeight:'900'}}>{dbb_reference_total===null?'Toplam hesaplanamıyor':dbb_lira(dbb_reference_total)}</Text>
        <Text style={{color:'#675E48',fontSize:12,lineHeight:18}}>{dbb_reference_total===null?'Bazı ürünlerin güncel çevrimiçi fiyatı veya stoğu yok.':'Çevrimiçi kaynaklardaki ürün toplamı · teslimat ve hizmet hariç.'}</Text>
        <View style={{flexDirection:'row',gap:8,alignItems:'center'}}><Ionicons name="checkmark-circle" color="#198563" size={17}/><Text style={{color:'#345F4B',fontWeight:'800',fontSize:12}}>{dbb_count} ürün sepetinde</Text></View>
      </View>
      {dbb_basket.map(dbb_item => {
        const dbb_product = dbb_products.find(dbb_found => dbb_found.dbb_id === dbb_item.dbb_product_id);
        const dbb_lowest = dbb_offers.filter(dbb_offer => dbb_offer.dbb_product_id === dbb_item.dbb_product_id).sort((dbb_a,dbb_b) => dbb_a.dbb_price_kurus - dbb_b.dbb_price_kurus)[0];
        const dbb_online=dbb_online_price(dbb_product);
        return <Dbb_Card key={dbb_item.dbb_product_id} dbb_style={{ flexDirection: 'row', alignItems: 'center',backgroundColor:'#F6FAF0',borderColor:'#D7E8CE',padding:13 }}>
          {dbb_product?.dbb_image_url?<Image source={{uri:dbb_product.dbb_image_url}} style={{width:53,height:53,borderRadius:10,backgroundColor:'#E5F4DC'}} resizeMode="contain" />:<Ionicons name="cube-outline" size={28} color="#338768" />}
          <View style={{ flex: 1,gap:2 }}><Text style={{color:'#19382F',fontSize:13,fontWeight:'900'}} numberOfLines={2}>{dbb_product?.dbb_name||'Ürün yükleniyor'}</Text><Text style={{color:'#637C70',fontSize:11}}>{dbb_product?.dbb_size} · {dbb_lowest?dbb_lira(dbb_lowest.dbb_price_kurus):dbb_online?dbb_lira(dbb_online):'Güncel fiyat yok'}</Text></View>
          <Pressable onPress={() => dbb_add(dbb_item.dbb_product_id,-1)} accessibilityRole="button" accessibilityLabel={`${dbb_product?.dbb_name||'Ürün'} azalt`}><Ionicons name="remove-circle" size={27} color="#81A695" /></Pressable>
          <Text style={{ color: '#19382F', fontWeight: '900',fontVariant:['tabular-nums'] }}>{dbb_item.dbb_quantity}</Text>
          <Pressable onPress={() => dbb_add(dbb_item.dbb_product_id,1)} accessibilityRole="button" accessibilityLabel={`${dbb_product?.dbb_name||'Ürün'} artır`}><Ionicons name="add-circle" size={27} color="#158764" /></Pressable>
        </Dbb_Card>;
      })}
      {!dbb_result.dbb_best && <View style={{borderRadius:18,backgroundColor:'#25424A',padding:15,flexDirection:'row',gap:10,alignItems:'flex-start'}}>
        <Ionicons name="information-circle" color={dbb_theme.yellow} size={20}/><View style={{flex:1,gap:4}}><Text style={{color:'white',fontWeight:'900',fontSize:13}}>Teslimat hesabı şu anda sunulamıyor</Text>
        <Text style={{color:'#CFE0DC',fontSize:11,lineHeight:17}}>Bu ürünler için doğrulanmış Ankara mağaza stoğu bulunmuyor. Listeyi kaydedebilir, ürün eklemeye devam edebilirsin. Görünen fiyat ödeme tutarı değildir.</Text></View>
      </View>}
      <Dbb_Button dbb_title="Ürün eklemeye devam et" dbb_icon="add-circle-outline" dbb_kind="ghost" dbb_onPress={()=>dbb_set_tab('search')} />
      <Dbb_Card><Text style={dbb_styles.itemTitle}>Bu sepeti kaydet</Text>
        <TextInput style={dbb_styles.input} value={dbb_saved_name} onChangeText={dbb_set_saved_name} placeholder="Örn. Haftalık Market" placeholderTextColor="#7580A0" />
        <Dbb_Button dbb_title="Kayıtlı listelerime ekle" dbb_kind="ghost" dbb_icon="bookmark-outline" dbb_onPress={dbb_save_list} /></Dbb_Card>
      <Dbb_Card><Text style={dbb_styles.itemTitle}>Bütçe sınırı · isteğe bağlı</Text>
        <TextInput keyboardType="decimal-pad" style={dbb_styles.input} value={dbb_budget} onChangeText={dbb_set_budget} placeholder="Örn. 500 TL" placeholderTextColor="#7580A0" />
        {dbb_quote && dbb_budget ? <Text style={{ color: dbb_quote.dbb_total > Number(dbb_budget.replace(',','.')) * 100 ? dbb_theme.pink : dbb_theme.mint, fontSize: 12 }}>
          {dbb_quote.dbb_total > Number(dbb_budget.replace(',','.')) * 100 ? 'Bu sepet bütçeyi aşıyor.' : 'Sepet bütçeye uyuyor.'}</Text> : null}</Dbb_Card>
      {dbb_result.dbb_best && <>
        <View style={dbb_styles.row}><View style={{ flex: 1 }}><Dbb_Button dbb_title="Akıllı sepet" dbb_kind={dbb_quote_mode === 'smart' ? 'mint' : 'ghost'} dbb_onPress={() => dbb_set_quote_mode('smart')} /></View>
          <View style={{ flex: 1 }}><Dbb_Button dbb_title="Tek mağaza" dbb_kind={dbb_quote_mode === 'single' ? 'mint' : 'ghost'} dbb_onPress={() => dbb_set_quote_mode('single')} dbb_disabled={!dbb_result.dbb_single} /></View></View>
        {dbb_quote && <Dbb_Card dbb_style={{ borderColor: dbb_theme.mint + '77', backgroundColor: '#112633' }}>
          <Dbb_Pill dbb_label={dbb_quote_mode === 'smart' ? 'TOPLAMDA EN AVANTAJLI' : 'TEK MAĞAZA'} dbb_tone="mint" />
          <Text style={{ color: 'white', fontWeight: '900', fontSize: 36 }}>{dbb_lira(dbb_quote.dbb_total)}</Text>
          <Text style={dbb_styles.muted}>{dbb_quote.dbb_route.length} mağaza · {dbb_road_minutes || dbb_quote.dbb_minutes} dk tahmini
            {dbb_road_minutes ? ' (Mapbox yol süresi)' : ' (yaklaşık)'} · {dbb_quote.dbb_exact ? 'tüm kombinasyonlar' : 'hesaplanan seçenekler'}</Text>
          {dbb_result.dbb_single && dbb_result.dbb_single.dbb_total > dbb_result.dbb_best.dbb_total && dbb_quote_mode === 'smart' &&
            <Text style={{ color: dbb_theme.yellow, fontWeight: '800' }}>Tek mağazaya göre {dbb_lira(dbb_result.dbb_single.dbb_total - dbb_result.dbb_best.dbb_total)} daha uygun</Text>}
          <View style={dbb_styles.divider} />
          {dbb_quote.dbb_route.map((dbb_stop, dbb_index) => <View key={dbb_stop.dbb_id} style={{ gap: 5 }}>
            <Text style={{ color: dbb_theme.mint, fontWeight: '800' }}>0{dbb_index + 1} · {dbb_stop.dbb_name}</Text>
            {dbb_quote.dbb_assignments.filter(dbb_item => dbb_item.dbb_offer.dbb_store_id === dbb_stop.dbb_id).map(dbb_item =>
              <Text key={dbb_item.dbb_product_id} style={dbb_styles.muted}>• {dbb_item.dbb_offer.dbb_product.dbb_name} ×{dbb_item.dbb_quantity} · {dbb_lira(dbb_item.dbb_offer.dbb_price_kurus * dbb_item.dbb_quantity)}</Text>)}</View>)}
          <View style={dbb_styles.divider} />
          {dbb_fee_row('Ürünler',dbb_quote.dbb_subtotal)}{dbb_fee_row('Kurye + rota',dbb_quote.dbb_courier_fee)}
          {dbb_fee_row('Platform hizmeti',dbb_quote.dbb_service_fee)}{dbb_fee_row('Tahmini poşet',dbb_quote.dbb_bag_fee)}
        </Dbb_Card>}
        <Dbb_Card><Text style={dbb_styles.itemTitle}>Teslimat adresi · Ankara</Text>
          <TextInput style={[dbb_styles.input, { minHeight: 50 }]} value={dbb_address} onChangeText={dbb_value => { dbb_set_address(dbb_value); dbb_set_address_confirmed(false); }}
            placeholder="Mahalle, sokak, bina, daire..." placeholderTextColor="#7580A0" multiline />
          <View style={dbb_styles.row}><View style={{ flex: 1 }}><Dbb_Button dbb_title="Adresi haritada bul" dbb_icon="search" dbb_kind="ghost" dbb_onPress={dbb_find_address} /></View>
            <Pressable onPress={dbb_use_gps} style={{ backgroundColor: '#273253', borderRadius: 12, padding: 13 }}><Ionicons name="locate" color={dbb_theme.mint} size={22} /></Pressable></View>
          {dbb_address_matches.map(dbb_match => <Pressable key={dbb_match.dbb_name} onPress={() => {
            dbb_set_address(dbb_match.dbb_name); dbb_set_location(dbb_match.dbb_location); dbb_set_address_confirmed(true); dbb_set_address_matches([]); Keyboard.dismiss();
          }} style={{ padding: 12, backgroundColor: '#232D46', borderRadius: 10 }}><Text style={{ color: 'white' }}>{dbb_match.dbb_name}</Text></Pressable>)}
          {dbb_address_confirmed && <Text style={{ color: dbb_theme.mint, fontWeight: '700' }}>✓ Ankara teslimat noktası seçildi</Text>}
          {dbb_static_map(dbb_location) ? <Image source={{ uri: dbb_static_map(dbb_location) }} style={{ width: '100%', height: 158, borderRadius: 16 }} resizeMode="cover" /> : null}
          <Text style={dbb_styles.muted}>Harita © Mapbox © OpenStreetMap. İlk fiyat hesabı yaklaşık kuş uçuşu rota kullanır; yol süresi ayrıca hesaplanır.</Text>
        </Dbb_Card>
        <Dbb_Card><Text style={dbb_styles.itemTitle}>Fiyat farkı izni</Text><Text style={dbb_styles.muted}>Kasadaki birim fiyatın tahminin ne kadar üstünde olmasını kabul edersin? Limit aşılırsa kurye ürün için onay bekler.</Text>
          <TextInput style={dbb_styles.input} keyboardType="decimal-pad" value={dbb_tolerance} onChangeText={dbb_set_tolerance} placeholder="50 TL" placeholderTextColor="#7580A0" /></Dbb_Card>
        <Dbb_Button dbb_title={!dbb_config.dbb_enabled ? 'Siparişler henüz açılmadı' : 'Siparişi oluştur'} dbb_icon="arrow-forward" dbb_kind="mint" dbb_onPress={dbb_checkout} dbb_disabled={dbb_pending || !dbb_config.dbb_enabled} />
        {!dbb_config.dbb_enabled && <Text style={dbb_styles.muted}>Ankara şube fiyatları, stok ve ödeme hesabı yönetici tarafından doğrulandıktan sonra sipariş açılır.</Text>}
      </>}
    </>}
  </View>;

  const dbb_account = <View style={{ gap: 18 }}><Text style={dbb_styles.heading}>Hesabım</Text>
    {dbb_user ? <><Dbb_Card><Dbb_Pill dbb_label="OTURUM AÇIK" dbb_tone="mint" /><Text style={dbb_styles.itemTitle}>{dbb_user.email}</Text>
      <Dbb_Button dbb_title="Çıkış yap" dbb_kind="ghost" dbb_onPress={async()=>{const {error}=await dbb_client!.auth.signOut();
        if (error) dbb_set_notice(error.message);else {dbb_local_owner.current=null;dbb_set_cloud_ready(null);dbb_change_basket([]);}}} /></Dbb_Card>
      <Dbb_Admin dbb_user_id={dbb_user.id} dbb_notice={dbb_set_notice} dbb_on_catalog_change={dbb_refresh_catalog} /></> : <Dbb_Card>
      <Text style={dbb_styles.itemTitle}>Siparişlerini her cihazda takip et</Text><Text style={dbb_styles.muted}>Aynı hesabın Android ve web üzerinde çalışır.</Text>
      <TextInput style={dbb_styles.input} value={dbb_email} onChangeText={dbb_set_email} keyboardType="email-address" autoCapitalize="none" placeholder="E-posta" placeholderTextColor="#7580A0" />
      <TextInput style={dbb_styles.input} value={dbb_password} onChangeText={dbb_set_password} secureTextEntry placeholder="Şifre (en az 6 karakter)" placeholderTextColor="#7580A0" />
      <Dbb_Button dbb_title="Giriş yap" dbb_onPress={() => dbb_authenticate('signIn')} dbb_disabled={dbb_pending} />
      <Dbb_Button dbb_title="Yeni hesap oluştur" dbb_kind="ghost" dbb_onPress={() => dbb_authenticate('signUp')} dbb_disabled={dbb_pending} /></Dbb_Card>}
    <Dbb_Card><Text style={dbb_styles.itemTitle}>DraBornBuy · Ankara</Text><Text style={dbb_styles.muted}>Ürün bilgileri gerçek kaynaklara bağlıdır. Siparişler doğrulanmış şube fiyatı ve ödeme bilgileriyle açılır.</Text></Dbb_Card>
  </View>;

  const dbb_content = dbb_tab === 'home' ? dbb_home : dbb_tab === 'search' ? dbb_search_screen : dbb_tab === 'basket' ? dbb_basket_screen :
    dbb_tab === 'orders' ? <Dbb_Orders dbb_user_id={dbb_user?.id || null} dbb_new_order_id={dbb_new_order_id} dbb_config={dbb_config} dbb_notice={dbb_set_notice} dbb_go_account={() => dbb_set_tab('account')} /> :
    dbb_tab === 'courier' ? <Dbb_Courier dbb_user_id={dbb_user?.id || null} dbb_notice={dbb_set_notice} dbb_go_account={() => dbb_set_tab('account')} /> : dbb_account;

  return <View style={{ flex: 1, backgroundColor: dbb_theme.bg, paddingTop: dbb_insets.top }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 11, paddingBottom: 12, backgroundColor:'#0E4B3F',borderBottomWidth:1,borderColor:'#3D8065' }}>
      <Pressable onPress={() => dbb_set_tab('home')} accessibilityRole="button" accessibilityLabel="DraBornBuy ana sayfa"><View style={dbb_styles.row}><View style={{ backgroundColor: '#F4B95A', borderRadius: 12, padding: 8 }}>
        <Ionicons name="basket" size={21} color="#174237" /></View><View><Text style={{ color: 'white', fontSize: 21, fontWeight: '900', letterSpacing: -.8 }}>DraBorn<Text style={{ color: dbb_theme.yellow }}>Buy</Text></Text><Text style={{color:'#B9ECCE',fontSize:9,fontWeight:'800',letterSpacing:1}}>ANKARA MARKET</Text></View></View></Pressable>
      <Pressable onPress={() => dbb_set_tab('basket')} accessibilityRole="button" accessibilityLabel={`Sepetim, ${dbb_count} ürün`} style={{ borderRadius: 15, backgroundColor: '#E7F8D5', paddingHorizontal: 11,paddingVertical:8, flexDirection: 'row',alignItems:'center', gap: 6 }}>
        <Ionicons name="basket" size={22} color="#176447" /><Text style={{ color: '#174237', fontWeight: '900',fontSize:15,fontVariant:['tabular-nums'] }}>{dbb_count}</Text></Pressable>
    </View>
    <ScrollView key={dbb_tab} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 35, gap: 18, maxWidth: 780, width: '100%', alignSelf: 'center' }}>
      {dbb_notice ? <Pressable onPress={() => dbb_set_notice('')} style={{ backgroundColor: '#224D49', borderWidth: 1, borderColor: '#68AB82', borderRadius: 13, padding: 13, flexDirection: 'row', gap: 8 }}>
        <Ionicons name="information-circle" color={dbb_theme.yellow} size={18} /><Text style={{ color: dbb_theme.text, flex: 1, lineHeight: 19, fontSize: 12 }}>{dbb_notice}</Text><Ionicons name="close" color="white" size={16} /></Pressable> : null}
      {dbb_pending && <ActivityIndicator color={dbb_theme.mint} />}{dbb_content}
    </ScrollView>
    {dbb_count>0 && (dbb_tab==='home'||dbb_tab==='search') && <Pressable onPress={()=>{dbb_set_cart_toast('');dbb_set_tab('basket');}}
      accessibilityRole="button" accessibilityLabel={`Sepeti görüntüle, ${dbb_count} ürün`} style={{marginHorizontal:16,marginBottom:8,borderRadius:18,backgroundColor:'#FBCB72',paddingHorizontal:16,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:11,borderWidth:1,borderColor:'#FFE6AF'}}>
      <View style={{backgroundColor:'#145D47',width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center'}}><Ionicons name="basket" size={20} color="white"/></View>
      <View style={{flex:1}}>{dbb_cart_toast?<Text numberOfLines={1} style={{color:'#26543C',fontSize:11,fontWeight:'800'}}>{dbb_cart_toast}</Text>:null}
        <Text style={{color:'#183C31',fontSize:14,fontWeight:'900'}}>Sepetim · {dbb_count} ürün</Text></View>
      <Text style={{color:'#22533B',fontWeight:'900',fontSize:12}}>GÖRÜNTÜLE ›</Text>
    </Pressable>}
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderColor: dbb_theme.line, paddingTop: 9,
      paddingBottom: Math.max(dbb_insets.bottom, 10), backgroundColor: '#12392F' }}>
      {dbb_tabs.map(dbb_nav => <Pressable key={dbb_nav.dbb_key} onPress={() => { dbb_set_scanner(false); dbb_set_tab(dbb_nav.dbb_key); if (dbb_nav.dbb_key==='search') dbb_refresh_catalog(); }}
        style={{ alignItems: 'center', gap: 3, minWidth: 43, padding: 4, borderRadius:13,backgroundColor:dbb_tab===dbb_nav.dbb_key?'#276B4D':'transparent' }} accessibilityRole="tab" accessibilityState={{ selected: dbb_tab === dbb_nav.dbb_key }}>
        <View style={{position:'relative'}}><Ionicons name={dbb_nav.dbb_icon} size={21} color={dbb_tab === dbb_nav.dbb_key ? dbb_theme.yellow : '#A4C9B3'} />
          {dbb_nav.dbb_key==='basket'&&dbb_count>0?<View style={{position:'absolute',right:-12,top:-7,minWidth:17,height:17,borderRadius:9,backgroundColor:'#FF8066',alignItems:'center',justifyContent:'center',paddingHorizontal:3}}><Text style={{color:'white',fontSize:10,fontWeight:'900'}}>{dbb_count>99?'99+':dbb_count}</Text></View>:null}</View>
        <Text style={{ color: dbb_tab === dbb_nav.dbb_key ? dbb_theme.yellow : '#A4C9B3', fontSize: 10, fontWeight: dbb_tab === dbb_nav.dbb_key ? '900' : '600' }}>{dbb_nav.dbb_title}</Text>
      </Pressable>)}
    </View>
  </View>;
}
