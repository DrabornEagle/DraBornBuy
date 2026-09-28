import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import type { Dbb_BasketItem, Dbb_Coordinates, Dbb_Offer, Dbb_Product, Dbb_Quote } from './dbb-model';
import { dbb_lira, dbb_optimize, dbb_build_quote, dbb_distance_km } from './dbb-optimizer';
import { dbb_breakfast_under_budget, dbb_search_text } from './dbb-planner';
import { dbb_client, dbb_create_live_order, dbb_default_config, dbb_geocode, dbb_load_catalog, dbb_road_eta, dbb_static_map, type Dbb_Config } from './dbb-api';
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
const dbb_categories = ['Tümü', 'İçecek', 'Kahvaltılık', 'Temizlik', 'Temel gıda', 'Bakliyat'];
const dbb_center = { dbb_lat: 39.92077, dbb_lon: 32.85411 };

export default function Dbb_App() {
  const dbb_insets = useSafeAreaInsets();
  const [dbb_tab, dbb_set_tab] = useState<Dbb_Tab>('home');
  const [dbb_offers, dbb_set_offers] = useState<Dbb_Offer[]>([]);
  const [dbb_products, dbb_set_products] = useState<Dbb_Product[]>([]);
  const [dbb_catalog_loading, dbb_set_catalog_loading] = useState(true);
  const [dbb_config, dbb_set_config] = useState<Dbb_Config>(dbb_default_config);
  const [dbb_basket, dbb_set_basket] = useState<Dbb_BasketItem[]>([]);
  const [dbb_query, dbb_set_query] = useState('');
  const [dbb_category, dbb_set_category] = useState('Tümü');
  const [dbb_location, dbb_set_location] = useState<Dbb_Coordinates>(dbb_center);
  const [dbb_address, dbb_set_address] = useState('');
  const [dbb_address_confirmed, dbb_set_address_confirmed] = useState(false);
  const [dbb_address_matches, dbb_set_address_matches] = useState<{ dbb_name: string; dbb_location: Dbb_Coordinates }[]>([]);
  const [dbb_quote_mode, dbb_set_quote_mode] = useState<'smart' | 'single'>('smart');
  const [dbb_budget, dbb_set_budget] = useState('');
  const [dbb_saved_name, dbb_set_saved_name] = useState('Aylık Ev Alışverişi');
  const [dbb_saved_lists, dbb_set_saved_lists] = useState<{dbb_id:string;dbb_name:string;dbb_items:Dbb_BasketItem[]}[]>([]);
  const [dbb_tolerance, dbb_set_tolerance] = useState('50');
  const [dbb_user, dbb_set_user] = useState<User | null>(null);
  const [dbb_email, dbb_set_email] = useState('');
  const [dbb_password, dbb_set_password] = useState('');
  const [dbb_pending, dbb_set_pending] = useState(false);
  const [dbb_notice, dbb_set_notice] = useState('');
  const [dbb_scanner, dbb_set_scanner] = useState(false);
  const [dbb_camera_permission, dbb_request_camera] = useCameraPermissions();
  const [dbb_new_order_id, dbb_set_new_order_id] = useState('');
  const [dbb_road_minutes, dbb_set_road_minutes] = useState<number | null>(null);

  const dbb_refresh_catalog = useCallback(async () => {
    try { const dbb_data = await dbb_load_catalog();
      dbb_set_config(dbb_data.dbb_config); dbb_set_offers(dbb_data.dbb_offers); dbb_set_products(dbb_data.dbb_products);
    } catch (dbb_error) { dbb_set_notice(`Katalog bağlantısı: ${(dbb_error as Error).message}`); }
    finally { dbb_set_catalog_loading(false); }
  }, []);
  useEffect(() => {
    let dbb_active = true;
    dbb_refresh_catalog();
    AsyncStorage.getItem('dbb_basket_v2').then(dbb_saved => { if (dbb_active && dbb_saved) {
      try { dbb_set_basket(JSON.parse(dbb_saved)); } catch { /* invalid local basket */ }
    }});
    if (dbb_client) {
      dbb_client.auth.getUser().then(({ data: dbb_data }) => dbb_active && dbb_set_user(dbb_data.user));
      const { data: dbb_auth } = dbb_client.auth.onAuthStateChange((_dbb_event, dbb_session) => dbb_set_user(dbb_session?.user || null));
      return () => { dbb_active = false; dbb_auth.subscription.unsubscribe(); };
    }
    return () => { dbb_active = false; };
  }, [dbb_refresh_catalog]);

  useEffect(() => { AsyncStorage.setItem('dbb_basket_v2', JSON.stringify(dbb_basket)).catch(() => {}); }, [dbb_basket]);
  const dbb_load_lists = async () => {
    if (!dbb_client || !dbb_user) return;
    const { data: dbb_data, error: dbb_error } = await dbb_client.from('dbb_saved_lists').select('dbb_id,dbb_name,dbb_items').eq('dbb_user_id',dbb_user.id).order('dbb_updated_at',{ascending:false});
    if (dbb_error) dbb_set_notice(dbb_error.message); else dbb_set_saved_lists(dbb_data || []);
  };
  useEffect(() => { if (dbb_user) dbb_load_lists(); else dbb_set_saved_lists([]); }, [dbb_user?.id]);
  const dbb_filtered = useMemo(() => dbb_products.filter(dbb_product => {
    const dbb_text = `${dbb_product.dbb_name} ${dbb_product.dbb_brand} ${dbb_product.dbb_size} ${dbb_product.dbb_barcode || ''}`.toLocaleLowerCase('tr-TR').replace(/[.,'’\-_]/g,' ');
    return (dbb_category === 'Tümü' || dbb_product.dbb_category === dbb_category) &&
      (!dbb_query.trim() || dbb_search_text(dbb_query).toLocaleLowerCase('tr-TR').replace(/[.,'’\-_]/g,' ').split(/\s+/).every(dbb_word => dbb_text.includes(dbb_word)));
  }), [dbb_products, dbb_category, dbb_query]);
  const dbb_result = useMemo(() => dbb_optimize(dbb_basket, dbb_offers, dbb_location, dbb_config), [dbb_basket, dbb_offers, dbb_location, dbb_config]);
  const dbb_quote = dbb_quote_mode === 'single' && dbb_result.dbb_single ? dbb_result.dbb_single : dbb_result.dbb_best;
  const dbb_count = dbb_basket.reduce((dbb_sum, dbb_item) => dbb_sum + dbb_item.dbb_quantity, 0);

  useEffect(() => {
    let dbb_active = true;
    if (!dbb_quote) return;
    dbb_road_eta([dbb_location, ...dbb_quote.dbb_route, dbb_location]).then(dbb_eta => {
      if (dbb_active) dbb_set_road_minutes(dbb_eta ? dbb_eta.dbb_minutes + dbb_quote.dbb_route.length * 9 : null);
    }).catch(() => dbb_active && dbb_set_road_minutes(null));
    return () => { dbb_active = false; };
  }, [dbb_quote?.dbb_route.map(dbb_stop => dbb_stop.dbb_id).join(','), dbb_location.dbb_lat, dbb_location.dbb_lon]);

  const dbb_add = (dbb_product_id: string, dbb_delta = 1) => dbb_set_basket(dbb_old => {
    const dbb_existing = dbb_old.find(dbb_item => dbb_item.dbb_product_id === dbb_product_id);
    if (!dbb_existing && dbb_delta > 0) return [...dbb_old, { dbb_product_id, dbb_quantity: 1 }];
    return dbb_old.map(dbb_item => dbb_item.dbb_product_id === dbb_product_id ?
      { ...dbb_item, dbb_quantity: Math.min(20, Math.max(0, dbb_item.dbb_quantity + dbb_delta)) } : dbb_item).filter(dbb_item => dbb_item.dbb_quantity > 0);
  });

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
      dbb_set_new_order_id(dbb_order.dbb_id); dbb_set_basket([]); dbb_set_tab('orders');
      dbb_set_notice(`${dbb_order.dbb_code} oluşturuldu. Ödemeden önce sunucu toplamını kontrol et.`);
    } catch (dbb_error) { dbb_set_notice((dbb_error as Error).message); } finally { dbb_set_pending(false); }
  };
  const dbb_save_list = async () => {
    if (!dbb_user) { dbb_set_notice('Kayıtlı sepet için hesabına giriş yap.'); dbb_set_tab('account'); return; }
    if (!dbb_client || !dbb_basket.length || !dbb_saved_name.trim()) return;
    const {error:dbb_error} = await dbb_client.from('dbb_saved_lists').insert({dbb_user_id:dbb_user.id,dbb_name:dbb_saved_name.trim(),dbb_items:dbb_basket});
    if (dbb_error) dbb_set_notice(dbb_error.message); else { dbb_set_notice('Sepetin kaydedildi. Android ve web hesabında görünür.'); dbb_load_lists(); }
  };
  const dbb_restore_list = (dbb_items: Dbb_BasketItem[]) => {
    const dbb_valid = dbb_items.filter(dbb_item => dbb_offers.some(dbb_offer => dbb_offer.dbb_product_id === dbb_item.dbb_product_id));
    if (!dbb_valid.length) { dbb_set_notice('Bu listedeki ürünler şu anki katalogda bulunmuyor.'); return; }
    dbb_set_basket(dbb_valid); dbb_set_tab('basket'); dbb_set_notice('Fiyatlar ve rota yeniden hesaplandı.');
  };
  const dbb_plan_breakfast = () => {
    const dbb_limit = Math.round(Number(dbb_budget.replace(',','.')) * 100);
    if (!Number.isFinite(dbb_limit) || dbb_limit <= 0) { dbb_set_notice('Önce TL cinsinden bütçe gir.'); return; }
    const dbb_list = dbb_breakfast_under_budget(dbb_products,dbb_offers,dbb_location,dbb_limit,dbb_config);
    if (!dbb_list.length) { dbb_set_notice('Bu bütçeye teslimat dahil doğrulanmış kahvaltılık teklif bulunamadı.'); return; }
    dbb_set_basket(dbb_list); dbb_set_tab('basket'); dbb_set_notice(`${dbb_list.length} kahvaltılık bütçene göre seçildi; istediğin ürünleri değiştirebilirsin.`);
  };

  const dbb_product_card = (dbb_product: Dbb_Product) => {
    const dbb_choices = dbb_offers.filter(dbb_offer => dbb_offer.dbb_product_id === dbb_product.dbb_id).sort((dbb_a, dbb_b) => dbb_a.dbb_price_kurus - dbb_b.dbb_price_kurus);
    const dbb_product_quote = dbb_optimize([{ dbb_product_id: dbb_product.dbb_id, dbb_quantity: 1 }], dbb_choices, dbb_location, dbb_config).dbb_best;
    const dbb_quantity = dbb_basket.find(dbb_item => dbb_item.dbb_product_id === dbb_product.dbb_id)?.dbb_quantity || 0;
    return <Dbb_Card key={dbb_product.dbb_id} dbb_style={{ gap: 13, backgroundColor: '#172346', borderColor:'#4D5F9B' }}>
      <View style={dbb_styles.row}><View style={{ width: 90, height: 90, borderRadius: 19, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow:'hidden' }}>
        {dbb_product.dbb_image_url?<Image source={{uri:dbb_product.dbb_image_url}} style={{width:84,height:84}} resizeMode="contain" />:<Ionicons name="cube-outline" size={38} color={dbb_theme.purple} />}</View>
        <View style={{ flex: 1, gap:6 }}><Text style={dbb_styles.itemTitle}>{dbb_product.dbb_name}</Text><Text style={dbb_styles.muted}>{dbb_product.dbb_brand} · {dbb_product.dbb_size}</Text>
          <Dbb_Pill dbb_label={dbb_choices.length?'ŞUBE FİYATI DOĞRULANDI':'GERÇEK ÜRÜN'} dbb_tone={dbb_choices.length?'mint':'purple'} /></View>
      </View>
      {dbb_choices.map((dbb_offer, dbb_index) => <View key={dbb_offer.dbb_id} style={[dbb_styles.row, { justifyContent: 'space-between' }]}>
        <Text style={{ color: dbb_index === 0 ? dbb_theme.mint : dbb_theme.muted, fontSize: 12, flex: 1 }}>
          {dbb_index === 0 ? '★ ' : ''}{dbb_offer.dbb_store.dbb_name} · {dbb_distance_km(dbb_offer.dbb_store, dbb_location).toFixed(1)} km
        </Text><Text style={{ color: dbb_theme.text, fontSize: 13, fontWeight: '800' }}>{dbb_lira(dbb_offer.dbb_price_kurus)}</Text>
      </View>)}
      <View style={dbb_styles.divider} />
      <View style={[dbb_styles.row, { justifyContent: 'space-between' }]}><View style={{ flex: 1, gap:3 }}>
        {dbb_choices.length?<><Text style={{ color: dbb_theme.mint, fontWeight: '900', fontSize: 11 }}>EN UCUZ ÜRÜN · {dbb_choices[0].dbb_store.dbb_name}</Text>
          <Text style={dbb_styles.muted}>Teslim dahil: {dbb_product_quote?.dbb_route[0]?.dbb_name || '—'} · {dbb_product_quote?dbb_lira(dbb_product_quote.dbb_total):'—'}</Text></>:
          <><Text style={{color:dbb_theme.yellow,fontWeight:'800',fontSize:12}}>Ankara şube fiyatı bekleniyor</Text>
          <Text style={dbb_styles.muted}>Ürün sayfası ve görseli gerçek; stok henüz doğrulanmadı.</Text></>}</View>
        <Pressable onPress={() => dbb_choices.length?dbb_add(dbb_product.dbb_id):dbb_product.dbb_source_url&&Linking.openURL(dbb_product.dbb_source_url)}
          style={{ backgroundColor: dbb_choices.length?dbb_theme.purple:'#344570', padding: 12, borderRadius: 14 }} accessibilityRole="button" accessibilityLabel={`${dbb_product.dbb_name} ${dbb_choices.length?'sepete ekle':'ürün sayfasını aç'}`}>
          <Ionicons name={dbb_choices.length?(dbb_quantity?'add':'bag-add-outline'):'open-outline'} size={20} color="white" /></Pressable>
      </View>
    </Dbb_Card>;
  };

  const dbb_home = <View style={{ gap: 25 }}>
    <Dbb_Hero dbb_onSearch={() => dbb_set_tab('search')} />
    <View style={{ flexDirection: 'row', gap: 9 }}>
      {[['sparkles', 'Akıllı rota', dbb_theme.purple], ['pricetag', 'Şeffaf ücret', dbb_theme.mint], ['location', 'Ankara', dbb_theme.pink]].map(([dbb_icon, dbb_name, dbb_color]) =>
        <View key={dbb_name} style={{ backgroundColor: dbb_theme.panel, flex: 1, borderRadius: 15, padding: 12, gap: 7, borderColor: dbb_theme.line, borderWidth: 1 }}>
          <Ionicons name={dbb_icon as keyof typeof Ionicons.glyphMap} color={dbb_color} size={21} /><Text style={{ color: dbb_theme.text, fontSize: 11, fontWeight: '700' }}>{dbb_name}</Text></View>)}</View>
    <Dbb_Section dbb_title="Raflardan seçtiklerimiz" dbb_caption="Gerçek ürün fotoğrafları · kaynak sayfalarını inceleyebilirsin.">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12,paddingRight:12}}>
        {dbb_products.map((dbb_product,dbb_index)=><Pressable key={dbb_product.dbb_id} onPress={()=>{dbb_set_query(dbb_product.dbb_name);dbb_set_tab('search');}}
          style={{width:140,borderRadius:20,padding:11,gap:8,backgroundColor:['#384080','#6A346B','#1B6580','#62502C'][dbb_index%4],borderWidth:1,borderColor:'#FFFFFF32'}}>
          <View style={{height:106,borderRadius:15,backgroundColor:'white',alignItems:'center',justifyContent:'center'}}>
            {dbb_product.dbb_image_url?<Image source={{uri:dbb_product.dbb_image_url}} style={{width:99,height:99}} resizeMode="contain" />:<Ionicons name="cube-outline" size={39} color={dbb_theme.purple} />}</View>
          <Text numberOfLines={2} style={{color:'white',fontWeight:'800',fontSize:12,minHeight:34}}>{dbb_product.dbb_name}</Text>
          <Text style={{color:'#DFE5FF',fontSize:11}}>{dbb_product.dbb_size}</Text>
        </Pressable>)}
      </ScrollView>
    </Dbb_Section>
    <Dbb_Section dbb_title="Tek sepet. En iyi kombinasyon." dbb_caption="Ürün fiyatı, mağaza sayısı ve teslimat maliyeti bir arada hesaplanır.">
      <LinearGradient colors={['#1B4F75','#384EAB','#6B3DA4']} start={{x:0,y:0}} end={{x:1,y:1}}
        style={{borderRadius:24,padding:20,gap:12,overflow:'hidden'}}>
        <Dbb_Pill dbb_label="AKILLI SEPET" dbb_tone="mint" />
        <Text style={{ color: 'white', fontSize: 22, fontWeight: '900' }}>Aynı sepet için tüm rotayı hesapla.</Text>
        <Text style={{ color:'#E2E9FF',fontSize:13,lineHeight:19 }}>Tek mağaza ile çok mağazalı toplamı, ürün ve kurye ücretleriyle karşılaştır.</Text>
        <Dbb_Button dbb_title="Ürünleri keşfet" dbb_icon="arrow-forward" dbb_kind="mint" dbb_onPress={() => dbb_set_tab('search')} />
      </LinearGradient>
    </Dbb_Section>
    <Dbb_Card dbb_style={{backgroundColor:'#28233E',borderColor:'#8865FF77'}}>
      <Dbb_Pill dbb_label="BÜTÇEYLE PLANLA" dbb_tone="purple" />
      <Text style={dbb_styles.itemTitle}>“500 TL’ye kahvaltılık hazırla”</Text>
      <Text style={dbb_styles.muted}>Doğrulanmış kahvaltılık fiyatları açıldığında teslimat dahil bütçene sığan listeyi oluşturur.</Text>
      <TextInput style={dbb_styles.input} value={dbb_budget} onChangeText={dbb_set_budget} keyboardType="decimal-pad" placeholder="Bütçen · TL" placeholderTextColor="#7580A0" />
      <Dbb_Button dbb_title="Kahvaltılık sepeti oluştur" dbb_icon="sparkles" dbb_onPress={dbb_plan_breakfast} />
    </Dbb_Card>
    {dbb_saved_lists.length > 0 && <Dbb_Section dbb_title="Kayıtlı sepetlerin" dbb_caption="Bugünün teklifleriyle yeniden hesapla.">
      {dbb_saved_lists.slice(0,3).map(dbb_list => <Dbb_Card key={dbb_list.dbb_id} dbb_style={{flexDirection:'row',alignItems:'center'}}>
        <Ionicons name="bookmark" color={dbb_theme.yellow} size={20} /><Text style={[dbb_styles.itemTitle,{flex:1}]}>{dbb_list.dbb_name}</Text>
        <Pressable onPress={() => dbb_restore_list(dbb_list.dbb_items)}><Ionicons name="arrow-forward-circle" color={dbb_theme.mint} size={26} /></Pressable>
      </Dbb_Card>)}</Dbb_Section>}
    <Dbb_Section dbb_title="Gerçek ürünler" dbb_caption={dbb_offers.length?'Ankara şubelerinde güncel doğrulanan fiyatlar görünür.':'Ürünler ve fotoğraflar kaynak sayfalarıyla eşleşiyor. Yerel fiyat ve stoklar doğrulanıyor.'}>
      {dbb_products.slice(0, 4).map(dbb_product_card)}
      {!dbb_products.length&&<Dbb_Card><Text style={dbb_styles.itemTitle}>{dbb_catalog_loading?'Katalog yükleniyor':'Henüz ürün bulunamadı'}</Text>
        <Text style={dbb_styles.muted}>Bağlantıyı veya yönetici ürün kayıtlarını kontrol et.</Text></Dbb_Card>}
      <Dbb_Button dbb_title="Tüm ürünlere bak" dbb_kind="ghost" dbb_icon="grid-outline" dbb_onPress={() => dbb_set_tab('search')} />
    </Dbb_Section>
  </View>;

  const dbb_search_screen = <View style={{ gap: 18 }}>
    <View><Text style={dbb_styles.heading}>Ürünleri keşfet</Text><Text style={dbb_styles.muted}>Marka, boyut veya barkodla ara.</Text></View>
    <View style={[dbb_styles.row, { backgroundColor: dbb_theme.panel, paddingHorizontal: 15, borderRadius: 16, borderWidth: 1, borderColor: dbb_theme.line }]}>
      <Ionicons name="search" size={21} color={dbb_theme.mint} />
      <TextInput value={dbb_query} onChangeText={dbb_set_query} placeholder="Örn. Coca-Cola 2,5 L" placeholderTextColor="#7782A1"
        style={{ flex: 1, color: 'white', paddingVertical: 16, fontSize: 15 }} autoCapitalize="none" />
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
      {dbb_categories.map(dbb_name => <Pressable key={dbb_name} onPress={() => dbb_set_category(dbb_name)} style={{ borderRadius: 20, backgroundColor: dbb_category === dbb_name ? dbb_theme.purple : dbb_theme.panel,
        paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: dbb_category === dbb_name ? dbb_theme.purple : dbb_theme.line }}>
        <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>{dbb_name}</Text></Pressable>)}</ScrollView>
    <Text style={dbb_styles.muted}>{dbb_filtered.length} gerçek ürün · {dbb_offers.length} doğrulanmış Ankara şube teklifi</Text>
    <Dbb_Button dbb_title="Güncel teklifleri yenile" dbb_kind="ghost" dbb_icon="refresh-outline" dbb_onPress={dbb_refresh_catalog} />
    {dbb_filtered.map(dbb_product_card)}
    {!dbb_filtered.length && <Dbb_Card><Text style={dbb_styles.itemTitle}>Eşleşme bulunamadı</Text><Text style={dbb_styles.muted}>Farklı bir ürün adı veya barkod dene.</Text></Dbb_Card>}
  </View>;

  const dbb_fee_row = (dbb_name: string, dbb_value: number, dbb_color = dbb_theme.text) =>
    <View style={[dbb_styles.row, { justifyContent: 'space-between' }]}><Text style={dbb_styles.muted}>{dbb_name}</Text>
      <Text style={{ color: dbb_color, fontWeight: '700', fontSize: 14 }}>{dbb_lira(dbb_value)}</Text></View>;

  const dbb_basket_screen = <View style={{ gap: 18 }}>
    <View><Text style={dbb_styles.heading}>Akıllı sepet</Text><Text style={dbb_styles.muted}>{dbb_count} ürün · Mağaza + kurye + hizmet birlikte hesaplanır</Text></View>
    {!dbb_basket.length ? <Dbb_Card><Text style={{ fontSize: 38 }}>🛍️</Text><Text style={dbb_styles.itemTitle}>Sepetin henüz boş</Text>
      <Text style={dbb_styles.muted}>Ürün ekle; tek mağaza ve akıllı sepet seçeneklerini karşılaştıralım.</Text>
      <Dbb_Button dbb_title="Ürün ara" dbb_onPress={() => dbb_set_tab('search')} /></Dbb_Card> : <>
      {dbb_basket.map(dbb_item => {
        const dbb_product = dbb_products.find(dbb_found => dbb_found.dbb_id === dbb_item.dbb_product_id);
        const dbb_lowest = dbb_offers.filter(dbb_offer => dbb_offer.dbb_product_id === dbb_item.dbb_product_id).sort((dbb_a,dbb_b) => dbb_a.dbb_price_kurus - dbb_b.dbb_price_kurus)[0];
        return <Dbb_Card key={dbb_item.dbb_product_id} dbb_style={{ flexDirection: 'row', alignItems: 'center' }}>
          {dbb_product?.dbb_image_url?<Image source={{uri:dbb_product.dbb_image_url}} style={{width:48,height:48,borderRadius:9,backgroundColor:'white'}} resizeMode="contain" />:<Ionicons name="cube-outline" size={28} color={dbb_theme.yellow} />}
          <View style={{ flex: 1 }}><Text style={dbb_styles.itemTitle}>{dbb_product?.dbb_name}</Text><Text style={dbb_styles.muted}>{dbb_product?.dbb_size} · {dbb_lowest ? `${dbb_lira(dbb_lowest.dbb_price_kurus)}'den` : 'Teklif yok'}</Text></View>
          <Pressable onPress={() => dbb_add(dbb_item.dbb_product_id,-1)}><Ionicons name="remove-circle-outline" size={26} color={dbb_theme.muted} /></Pressable>
          <Text style={{ color: 'white', fontWeight: '800' }}>{dbb_item.dbb_quantity}</Text>
          <Pressable onPress={() => dbb_add(dbb_item.dbb_product_id,1)}><Ionicons name="add-circle" size={26} color={dbb_theme.mint} /></Pressable>
        </Dbb_Card>;
      })}
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
      <Dbb_Button dbb_title="Çıkış yap" dbb_kind="ghost" dbb_onPress={() => dbb_client?.auth.signOut()} /></Dbb_Card>
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
    <LinearGradient colors={['#11163B','#211849','#132E58']} start={{x:0,y:0}} end={{x:1,y:1}} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingTop: 12, paddingBottom: 13 }}>
      <Pressable onPress={() => dbb_set_tab('home')}><View style={dbb_styles.row}><View style={{ backgroundColor: '#8F69FF', borderRadius: 12, padding: 7 }}>
        <Ionicons name="bag-handle" size={19} color="white" /></View><Text style={{ color: 'white', fontSize: 21, fontWeight: '900', letterSpacing: -.8 }}>DraBorn<Text style={{ color: dbb_theme.mint }}>Buy</Text></Text></View></Pressable>
      <Pressable onPress={() => dbb_set_tab('basket')} style={{ borderRadius: 14, backgroundColor: '#1D2543', padding: 10, flexDirection: 'row', gap: 5 }}>
        <Ionicons name="basket-outline" size={21} color={dbb_theme.mint} /><Text style={{ color: 'white', fontWeight: '900' }}>{dbb_count}</Text></Pressable>
    </LinearGradient>
    <ScrollView key={dbb_tab} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 35, gap: 18, maxWidth: 780, width: '100%', alignSelf: 'center' }}>
      {dbb_notice ? <Pressable onPress={() => dbb_set_notice('')} style={{ backgroundColor: '#302643', borderWidth: 1, borderColor: '#A176B7', borderRadius: 13, padding: 13, flexDirection: 'row', gap: 8 }}>
        <Ionicons name="information-circle" color={dbb_theme.yellow} size={18} /><Text style={{ color: '#FCE9FF', flex: 1, lineHeight: 19, fontSize: 12 }}>{dbb_notice}</Text><Ionicons name="close" color="white" size={16} /></Pressable> : null}
      {dbb_pending && <ActivityIndicator color={dbb_theme.mint} />}{dbb_content}
    </ScrollView>
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderColor: '#455685', paddingTop: 9,
      paddingBottom: Math.max(dbb_insets.bottom, 10), backgroundColor: '#151D40' }}>
      {dbb_tabs.map(dbb_nav => <Pressable key={dbb_nav.dbb_key} onPress={() => { dbb_set_scanner(false); dbb_set_tab(dbb_nav.dbb_key); if (dbb_nav.dbb_key==='search') dbb_refresh_catalog(); }}
        style={{ alignItems: 'center', gap: 3, minWidth: 43, padding: 4, borderRadius:13,backgroundColor:dbb_tab===dbb_nav.dbb_key?'#4A3A8966':'transparent' }} accessibilityRole="tab" accessibilityState={{ selected: dbb_tab === dbb_nav.dbb_key }}>
        <Ionicons name={dbb_nav.dbb_icon} size={21} color={dbb_tab === dbb_nav.dbb_key ? dbb_theme.mint : '#838CAA'} />
        <Text style={{ color: dbb_tab === dbb_nav.dbb_key ? dbb_theme.mint : '#838CAA', fontSize: 10, fontWeight: dbb_tab === dbb_nav.dbb_key ? '900' : '600' }}>{dbb_nav.dbb_title}</Text>
      </Pressable>)}
    </View>
  </View>;
}
