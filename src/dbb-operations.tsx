import React, { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { decode } from 'base64-arraybuffer';
import type { LocationSubscription } from 'expo-location';
import type { Dbb_Message, Dbb_Order, Dbb_OrderItem, Dbb_Store } from './dbb-model';
import { dbb_client, dbb_get_courier_orders, dbb_get_open_jobs, dbb_get_orders, dbb_static_map, type Dbb_Config, type Dbb_Job } from './dbb-api';
import { dbb_demo_stores } from './dbb-demo';
import { dbb_lira } from './dbb-optimizer';
import { Dbb_Button, Dbb_Card, Dbb_Pill, Dbb_Section, dbb_styles, dbb_theme } from './dbb-ui';

const dbb_steps: Record<string, string> = {
  payment_pending: 'Ödeme bekleniyor', payment_review: 'Ödeme kontrol ediliyor', searching_courier: 'Kurye aranıyor',
  store_trip: 'Mağazaya gidiliyor', shopping: 'Alışveriş yapılıyor', delivery: 'Teslimata çıktı', delivered: 'Teslim edildi',
  reconciling: 'Fiş mutabakatı', completed: 'Tamamlandı', canceled: 'İptal edildi'
};
type Dbb_Notify = (dbb_text: string) => void;
const dbb_date = (dbb_value: string) => new Date(dbb_value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });

export function Dbb_Orders({ dbb_user_id, dbb_new_order_id, dbb_config, dbb_notice, dbb_go_account }: {
  dbb_user_id: string | null; dbb_new_order_id: string; dbb_config: Dbb_Config; dbb_notice: Dbb_Notify; dbb_go_account: () => void;
}) {
  const [dbb_orders, dbb_set_orders] = useState<Dbb_Order[]>([]);
  const [dbb_selected, dbb_set_selected] = useState<string | null>(null);
  const [dbb_items, dbb_set_items] = useState<Dbb_OrderItem[]>([]);
  const [dbb_events, dbb_set_events] = useState<{ dbb_id: string; dbb_status: string; dbb_note: string; dbb_created_at: string }[]>([]);
  const [dbb_messages, dbb_set_messages] = useState<Dbb_Message[]>([]);
  const [dbb_shop_receipts, dbb_set_shop_receipts] = useState<{dbb_id:string;dbb_store_id:string;dbb_object_path:string}[]>([]);
  const [dbb_settlement, dbb_set_settlement] = useState<{dbb_actual_total_kurus:number;dbb_difference_kurus:number;dbb_status:string}|null>(null);
  const [dbb_shop_image, dbb_set_shop_image] = useState<Record<string,string>>({});
  const [dbb_message, dbb_set_message] = useState('');
  const [dbb_courier_location, dbb_set_courier_location] = useState<{ dbb_lat: number; dbb_lon: number } | null>(null);
  const [dbb_pending, dbb_set_pending] = useState(false);

  const dbb_refresh = useCallback(async () => {
    if (!dbb_user_id) return;
    try {
      const dbb_data = await dbb_get_orders(dbb_user_id);
      dbb_set_orders(dbb_data);
      dbb_set_selected(dbb_current => dbb_new_order_id || dbb_current || dbb_data[0]?.dbb_id || null);
    } catch (dbb_error) { dbb_notice((dbb_error as Error).message); }
  }, [dbb_user_id, dbb_new_order_id]);
  useEffect(() => { dbb_refresh(); }, [dbb_refresh]);

  const dbb_detail = useCallback(async () => {
    if (!dbb_client || !dbb_selected) return;
    const [dbb_item_result, dbb_event_result, dbb_chat_result, dbb_location_result, dbb_receipt_result, dbb_settlement_result] = await Promise.all([
      dbb_client.from('dbb_order_items').select('*').eq('dbb_order_id',dbb_selected),
      dbb_client.from('dbb_order_events').select('*').eq('dbb_order_id',dbb_selected).order('dbb_created_at',{ascending:true}),
      dbb_client.from('dbb_messages').select('*').eq('dbb_order_id',dbb_selected).order('dbb_created_at',{ascending:true}),
      dbb_client.from('dbb_order_locations').select('dbb_lat,dbb_lon').eq('dbb_order_id',dbb_selected).maybeSingle(),
      dbb_client.from('dbb_shop_receipts').select('dbb_id,dbb_store_id,dbb_object_path').eq('dbb_order_id',dbb_selected),
      dbb_client.from('dbb_settlements').select('dbb_actual_total_kurus,dbb_difference_kurus,dbb_status').eq('dbb_order_id',dbb_selected).maybeSingle()
    ]);
    dbb_set_items(dbb_item_result.data || []); dbb_set_events(dbb_event_result.data || []);
    dbb_set_messages(dbb_chat_result.data || []); dbb_set_courier_location(dbb_location_result.data || null);
    dbb_set_shop_receipts(dbb_receipt_result.data || []); dbb_set_settlement(dbb_settlement_result.data || null);
  }, [dbb_selected]);
  useEffect(() => {
    dbb_detail();
    if (!dbb_client || !dbb_selected) return;
    const dbb_channel = dbb_client.channel(`dbb-customer-${dbb_selected}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'dbb_orders', filter:`dbb_id=eq.${dbb_selected}` }, () => { dbb_refresh(); dbb_detail(); })
      .on('postgres_changes', { event:'*', schema:'public', table:'dbb_order_items', filter:`dbb_order_id=eq.${dbb_selected}` }, dbb_detail)
      .on('postgres_changes', { event:'*', schema:'public', table:'dbb_order_events', filter:`dbb_order_id=eq.${dbb_selected}` }, dbb_detail)
      .on('postgres_changes', { event:'*', schema:'public', table:'dbb_messages', filter:`dbb_order_id=eq.${dbb_selected}` }, dbb_detail)
      .on('postgres_changes', { event:'*', schema:'public', table:'dbb_order_locations', filter:`dbb_order_id=eq.${dbb_selected}` }, dbb_detail)
      .on('postgres_changes', { event:'*', schema:'public', table:'dbb_shop_receipts', filter:`dbb_order_id=eq.${dbb_selected}` }, dbb_detail)
      .on('postgres_changes', { event:'*', schema:'public', table:'dbb_settlements', filter:`dbb_order_id=eq.${dbb_selected}` }, dbb_detail).subscribe();
    return () => { dbb_client?.removeChannel(dbb_channel); };
  }, [dbb_selected, dbb_detail, dbb_refresh]);

  const dbb_order = dbb_orders.find(dbb_item => dbb_item.dbb_id === dbb_selected);
  const dbb_upload_receipt = async () => {
    if (!dbb_client || !dbb_user_id || !dbb_order) return;
    try {
      dbb_set_pending(true);
      const dbb_image = await ImagePicker.launchImageLibraryAsync({ mediaTypes:['images'], quality:.75, base64:true });
      if (dbb_image.canceled || !dbb_image.assets?.[0]?.base64) return;
      const dbb_asset = dbb_image.assets[0];
      if (!['image/jpeg','image/png'].includes(dbb_asset.mimeType || 'image/jpeg')) throw new Error('Lütfen JPG veya PNG dekont seçin.');
      const dbb_mime = dbb_asset.mimeType || 'image/jpeg';
      const dbb_path = `${dbb_user_id}/${dbb_order.dbb_id}/${Date.now()}.${dbb_mime === 'image/png' ? 'png' : 'jpg'}`;
      const { error: dbb_upload_error } = await dbb_client.storage.from('dbb_receipts').upload(dbb_path, decode(dbb_asset.base64!), { contentType: dbb_mime, upsert:false });
      if (dbb_upload_error) throw dbb_upload_error;
      const { error: dbb_claim_error } = await dbb_client.rpc('dbb_submit_payment', { dbb_p_order_id:dbb_order.dbb_id, dbb_p_object_path:dbb_path, dbb_p_sender_reference:dbb_order.dbb_code });
      if (dbb_claim_error) throw dbb_claim_error;
      dbb_notice('Dekont alındı. Gerçek banka hareketi yönetici tarafından kontrol edilecek.'); await dbb_refresh(); await dbb_detail();
    } catch (dbb_error) { dbb_notice((dbb_error as Error).message); } finally { dbb_set_pending(false); }
  };
  const dbb_send = async (dbb_text: string) => {
    if (!dbb_client || !dbb_order || !dbb_user_id || !dbb_text.trim()) return;
    const { error: dbb_error } = await dbb_client.from('dbb_messages').insert({ dbb_order_id:dbb_order.dbb_id, dbb_sender_id:dbb_user_id, dbb_body:dbb_text.trim() });
    if (dbb_error) dbb_notice(dbb_error.message); else { dbb_set_message(''); dbb_detail(); }
  };
  const dbb_view_shop_receipt = async (dbb_receipt_id:string,dbb_path:string) => {
    if (!dbb_client) return;
    const {data:dbb_data,error:dbb_error} = await dbb_client.storage.from('dbb_shop_receipts').createSignedUrl(dbb_path,60);
    if (dbb_error) dbb_notice(dbb_error.message); else dbb_set_shop_image(dbb_old => ({...dbb_old,[dbb_receipt_id]:dbb_data.signedUrl}));
  };

  return <View style={{ gap: 18 }}><Text style={dbb_styles.heading}>Siparişlerim</Text>
    {!dbb_user_id ? <Dbb_Card><Text style={dbb_styles.itemTitle}>Siparişlerini görmek için giriş yap</Text>
      <Dbb_Button dbb_title="Hesabıma git" dbb_onPress={dbb_go_account} /></Dbb_Card> : !dbb_orders.length ?
      <Dbb_Card><Text style={{ fontSize: 35 }}>📦</Text><Text style={dbb_styles.itemTitle}>Henüz sipariş yok</Text>
        <Text style={dbb_styles.muted}>Gerçek mağaza fiyatları açıldığında tüm ilerlemeyi burada canlı izleyeceksin.</Text></Dbb_Card> : <>
      {dbb_orders.length > 1 && dbb_orders.map(dbb_item => <Pressable key={dbb_item.dbb_id} onPress={() => dbb_set_selected(dbb_item.dbb_id)}
        style={{ padding: 13, borderRadius: 13, backgroundColor: dbb_selected === dbb_item.dbb_id ? '#443477' : dbb_theme.panel }}>
        <Text style={{ color:'white', fontWeight:'800' }}>#{dbb_item.dbb_code} · {dbb_steps[dbb_item.dbb_status]}</Text></Pressable>)}
      {dbb_order && <><Dbb_Card dbb_style={{ borderColor: dbb_theme.mint + '66' }}>
        <Dbb_Pill dbb_label={dbb_steps[dbb_order.dbb_status]?.toLocaleUpperCase('tr-TR') || dbb_order.dbb_status} dbb_tone="mint" />
        <Text style={{ color:'white', fontSize:27, fontWeight:'900' }}>#{dbb_order.dbb_code}</Text>
        <Text style={dbb_styles.muted}>{dbb_date(dbb_order.dbb_created_at)} · {dbb_order.dbb_address}</Text>
        <Text style={{ color:dbb_theme.mint, fontSize:26, fontWeight:'900' }}>{dbb_lira(dbb_order.dbb_total_kurus)}</Text>
        <Text style={dbb_styles.muted}>Ürün {dbb_lira(dbb_order.dbb_subtotal_kurus)} · Kurye {dbb_lira(dbb_order.dbb_courier_fee_kurus)} · Hizmet {dbb_lira(dbb_order.dbb_service_fee_kurus)} · Poşet {dbb_lira(dbb_order.dbb_bag_fee_kurus)}</Text>
        <Dbb_Button dbb_title="Durumu yenile" dbb_icon="refresh" dbb_kind="ghost" dbb_onPress={() => { dbb_refresh(); dbb_detail(); }} />
      </Dbb_Card>
      {dbb_order.dbb_status === 'payment_pending' && <Dbb_Card>
        <Text style={dbb_styles.itemTitle}>FAST / Havale</Text>
        <Text style={dbb_styles.muted}>Yalnızca uygulamada görünen gerçek tutarı aktar. Açıklama kodunu aynen yaz.</Text>
        <Text selectable style={{ color:'white', fontSize:15, fontWeight:'800' }}>{dbb_config.dbb_bank_name} · {dbb_config.dbb_account_holder}</Text>
        <Text selectable style={{ color:dbb_theme.mint, fontSize:16, fontWeight:'900' }}>{dbb_config.dbb_iban}</Text>
        <Text selectable style={{ color:dbb_theme.yellow, fontSize:18, fontWeight:'900' }}>Açıklama: {dbb_order.dbb_code}</Text>
        <Dbb_Button dbb_title={dbb_pending ? 'Yükleniyor...' : 'Dekont yükle'} dbb_icon="cloud-upload-outline" dbb_onPress={dbb_upload_receipt} dbb_disabled={dbb_pending} />
        <Text style={dbb_styles.muted}>Dekont fotoğrafı ödeme kanıtı sayılmaz; sipariş banka kaydı manuel doğrulandıktan sonra kuryeye açılır.</Text>
      </Dbb_Card>}
      {dbb_order.dbb_courier_id && <Dbb_Card><Text style={dbb_styles.itemTitle}>Canlı alışveriş takibi</Text>
        {dbb_static_map(dbb_courier_location || { dbb_lat:dbb_order.dbb_lat, dbb_lon:dbb_order.dbb_lon },14) ?
          <Image source={{ uri:dbb_static_map(dbb_courier_location || { dbb_lat:dbb_order.dbb_lat, dbb_lon:dbb_order.dbb_lon },14) }} style={{ height:170, width:'100%', borderRadius:14 }} /> : null}
        <Text style={dbb_styles.muted}>{dbb_courier_location ? 'Kurye konumu (uygulama açıkken paylaşılır)' : 'Kurye konumu henüz paylaşılmadı'} · © Mapbox © OpenStreetMap</Text>
        <Text style={{ color:dbb_theme.mint, fontWeight:'800' }}>{dbb_items.filter(dbb_item => dbb_item.dbb_pick_status !== 'pending').length}/{dbb_items.length} ürün işlendi</Text>
        {dbb_items.map(dbb_item => <Text key={dbb_item.dbb_id} style={dbb_styles.muted}>
          {dbb_item.dbb_pick_status === 'found' ? '✓' : dbb_item.dbb_pick_status === 'missing' ? '×' : '○'} {dbb_item.dbb_product_name} ×{dbb_item.dbb_quantity} · {dbb_item.dbb_store_name}</Text>)}
      </Dbb_Card>}
      <Dbb_Section dbb_title="Sipariş yolculuğu"><Dbb_Card>
        {dbb_events.map(dbb_event => <View key={dbb_event.dbb_id} style={{ flexDirection:'row', gap:10 }}>
          <Ionicons name="checkmark-circle" color={dbb_theme.mint} size={20} /><View style={{ flex:1 }}><Text style={{ color:'white', fontWeight:'700' }}>{dbb_steps[dbb_event.dbb_status] || dbb_event.dbb_status}</Text>
            <Text style={dbb_styles.muted}>{dbb_event.dbb_note} · {dbb_date(dbb_event.dbb_created_at)}</Text></View></View>)}
      </Dbb_Card></Dbb_Section>
      {dbb_order.dbb_courier_id && !['completed','canceled'].includes(dbb_order.dbb_status) && <Dbb_Section dbb_title="Kurye ile sohbet"><Dbb_Card>
        {dbb_messages.length ? dbb_messages.map(dbb_chat => <View key={dbb_chat.dbb_id} style={{ alignSelf:dbb_chat.dbb_sender_id === dbb_user_id ? 'flex-end' : 'flex-start', backgroundColor:dbb_chat.dbb_sender_id === dbb_user_id ? '#543D90' : '#27314C', borderRadius:15, padding:11, maxWidth:'87%' }}>
          <Text style={{ color:'white' }}>{dbb_chat.dbb_body}</Text><Text style={{ color:'#B8B6D0',fontSize:10 }}>{dbb_date(dbb_chat.dbb_created_at)}</Text></View>) : <Text style={dbb_styles.muted}>Mesajlar burada görünür.</Text>}
        <TextInput style={dbb_styles.input} value={dbb_message} onChangeText={dbb_set_message} placeholder="Kuryeye mesaj yaz..." placeholderTextColor="#7580A0" />
        <Dbb_Button dbb_title="Gönder" dbb_onPress={() => dbb_send(dbb_message)} dbb_disabled={!dbb_message.trim()} />
      </Dbb_Card></Dbb_Section>}
      {dbb_shop_receipts.length > 0 && <Dbb_Card><Text style={dbb_styles.itemTitle}>Mağaza fişleri · {dbb_shop_receipts.length}</Text>
        {dbb_shop_receipts.map((dbb_receipt,dbb_index) => <View key={dbb_receipt.dbb_id} style={{gap:7}}>
          <Dbb_Button dbb_title={`${dbb_index+1}. mağaza fişini göster`} dbb_kind="ghost" dbb_onPress={() => dbb_view_shop_receipt(dbb_receipt.dbb_id,dbb_receipt.dbb_object_path)} />
          {dbb_shop_image[dbb_receipt.dbb_id] && <Image source={{uri:dbb_shop_image[dbb_receipt.dbb_id]}} style={{height:220,width:'100%'}} resizeMode="contain" />}</View>)}
      </Dbb_Card>}
      {['delivered','reconciling','completed'].includes(dbb_order.dbb_status) && <Dbb_Card><Text style={dbb_styles.itemTitle}>Fiş mutabakatı</Text>
        {dbb_settlement ? <><Text style={dbb_styles.muted}>Fişlerde işaretlenen ürünlerin toplamıyla hesaplanan gerçek genel tutar: {dbb_lira(dbb_settlement.dbb_actual_total_kurus)}</Text>
          <Text style={{color:dbb_settlement.dbb_difference_kurus<0?dbb_theme.mint:dbb_theme.yellow,fontWeight:'900'}}>
            {dbb_settlement.dbb_difference_kurus<0 ? `İade alacağın: ${dbb_lira(-dbb_settlement.dbb_difference_kurus)}` :
             dbb_settlement.dbb_difference_kurus>0 ? `Ek ödeme farkı: ${dbb_lira(dbb_settlement.dbb_difference_kurus)}` : 'Fiyat farkı yok'}</Text>
          <Text style={dbb_styles.muted}>Durum: {dbb_settlement.dbb_status==='completed'?'Manuel işlem tamamlandı':'Yönetici banka mutabakatını tamamlıyor'}</Text></> :
          <Text style={dbb_styles.muted}>Yönetici fişleri ve gerçek fiyatları kontrol edecek; iade veya ek tutar otomatik çekilmez.</Text>}</Dbb_Card>}
      </>}
    </>}
  </View>;
}

export function Dbb_Courier({ dbb_user_id, dbb_demo, dbb_notice, dbb_go_account }: {
  dbb_user_id: string | null; dbb_demo: boolean; dbb_notice: Dbb_Notify; dbb_go_account: () => void;
}) {
  const [dbb_profile, dbb_set_profile] = useState<{dbb_user_id:string;dbb_approved:boolean;dbb_name:string}|null>(null);
  const [dbb_name, dbb_set_name] = useState(''); const [dbb_phone, dbb_set_phone] = useState('');
  const [dbb_orders, dbb_set_orders] = useState<Dbb_Order[]>([]);
  const [dbb_jobs, dbb_set_jobs] = useState<Dbb_Job[]>([]);
  const [dbb_active, dbb_set_active] = useState<Dbb_Order|null>(null);
  const [dbb_items, dbb_set_items] = useState<Dbb_OrderItem[]>([]);
  const [dbb_stores, dbb_set_stores] = useState<Dbb_Store[]>([]);
  const [dbb_receipts, dbb_set_receipts] = useState<{dbb_id:string;dbb_store_id:string}[]>([]);
  const [dbb_price, dbb_set_price] = useState<Record<string,string>>({});
  const [dbb_location_watch, dbb_set_location_watch] = useState<LocationSubscription|null>(null);
  const [dbb_demo_stage, dbb_set_demo_stage] = useState(0);
  const [dbb_demo_checked, dbb_set_demo_checked] = useState<string[]>([]);
  const [dbb_message, dbb_set_message] = useState('');
  const [dbb_chats, dbb_set_chats] = useState<Dbb_Message[]>([]);

  const dbb_refresh = useCallback(async () => {
    if (!dbb_client || !dbb_user_id) return;
    try {
      const [dbb_profile_result, dbb_data, dbb_available] = await Promise.all([
        dbb_client.from('dbb_courier_profiles').select('*').eq('dbb_user_id',dbb_user_id).maybeSingle(),
        dbb_get_courier_orders(dbb_user_id), dbb_get_open_jobs()
      ]);
      if (dbb_profile_result.error) throw dbb_profile_result.error;
      dbb_set_profile(dbb_profile_result.data);
      dbb_set_orders(dbb_data); dbb_set_jobs(dbb_available);
      dbb_set_active(dbb_current => dbb_data.find(dbb_order => dbb_order.dbb_id === dbb_current?.dbb_id) ||
        dbb_data.find(dbb_order => dbb_order.dbb_courier_id === dbb_user_id && !['delivered','completed'].includes(dbb_order.dbb_status)) || null);
    } catch (dbb_error) { dbb_notice((dbb_error as Error).message); }
  }, [dbb_user_id]);
  useEffect(() => { dbb_refresh(); }, [dbb_refresh]);
  const dbb_load_active = useCallback(async () => {
    if (!dbb_client || !dbb_active) return;
    const [dbb_items_result, dbb_stores_result, dbb_chat_result, dbb_receipts_result] = await Promise.all([
      dbb_client.from('dbb_order_items').select('*').eq('dbb_order_id',dbb_active.dbb_id),
      dbb_client.from('dbb_stores').select('*').in('dbb_id',dbb_active.dbb_route_store_ids),
      dbb_client.from('dbb_messages').select('*').eq('dbb_order_id',dbb_active.dbb_id).order('dbb_created_at',{ascending:true}),
      dbb_client.from('dbb_shop_receipts').select('dbb_id,dbb_store_id').eq('dbb_order_id',dbb_active.dbb_id)
    ]);
    dbb_set_items(dbb_items_result.data || []); dbb_set_stores(dbb_stores_result.data || []); dbb_set_chats(dbb_chat_result.data || []);
    dbb_set_receipts(dbb_receipts_result.data || []);
  }, [dbb_active?.dbb_id]);
  useEffect(() => { dbb_load_active(); }, [dbb_load_active]);
  useEffect(() => {
    if (!dbb_client || !dbb_active) return;
    const dbb_channel = dbb_client.channel(`dbb-courier-${dbb_active.dbb_id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'dbb_orders',filter:`dbb_id=eq.${dbb_active.dbb_id}`},dbb_refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'dbb_order_items',filter:`dbb_order_id=eq.${dbb_active.dbb_id}`},dbb_load_active)
      .on('postgres_changes',{event:'*',schema:'public',table:'dbb_messages',filter:`dbb_order_id=eq.${dbb_active.dbb_id}`},dbb_load_active)
      .on('postgres_changes',{event:'*',schema:'public',table:'dbb_shop_receipts',filter:`dbb_order_id=eq.${dbb_active.dbb_id}`},dbb_load_active).subscribe();
    return () => { dbb_client?.removeChannel(dbb_channel); };
  }, [dbb_active?.dbb_id, dbb_refresh, dbb_load_active]);
  useEffect(() => () => { dbb_location_watch?.remove(); }, [dbb_location_watch]);

  const dbb_apply = async () => {
    if (!dbb_client || !dbb_user_id) return;
    const { error: dbb_error } = await dbb_client.from('dbb_courier_profiles').insert({dbb_user_id,dbb_name:dbb_name.trim(),dbb_phone:dbb_phone.trim()});
    if (dbb_error) dbb_notice(dbb_error.message); else { dbb_notice('Kurye başvurun yönetici onayına gönderildi.'); dbb_refresh(); }
  };
  const dbb_accept = async (dbb_order_id: string) => {
    if (!dbb_client) return;
    const { error: dbb_error } = await dbb_client.rpc('dbb_accept_order',{dbb_p_order_id:dbb_order_id});
    if (dbb_error) dbb_notice(dbb_error.message); else { dbb_notice('Sipariş atandı. İlk mağazaya git.'); dbb_refresh(); }
  };
  const dbb_advance = async (dbb_status: string) => {
    if (!dbb_client || !dbb_active) return;
    const { error: dbb_error } = await dbb_client.rpc('dbb_advance_order',{dbb_p_order_id:dbb_active.dbb_id,dbb_p_status:dbb_status});
    if (dbb_error) dbb_notice(dbb_error.message); else dbb_refresh();
  };
  const dbb_mark = async (dbb_item: Dbb_OrderItem, dbb_status: string) => {
    if (!dbb_client) return;
    const dbb_value = dbb_status === 'found' ? Math.round(Number((dbb_price[dbb_item.dbb_id] || String(dbb_item.dbb_unit_price_kurus / 100)).replace(',','.')) * 100) : null;
    const { error: dbb_error } = await dbb_client.rpc('dbb_mark_item',{dbb_p_item_id:dbb_item.dbb_id,dbb_p_status:dbb_status,dbb_p_actual_price_kurus:dbb_value});
    if (dbb_error) dbb_notice(dbb_error.message); else dbb_load_active();
  };
  const dbb_upload_shop_receipt = async (dbb_camera:boolean) => {
    if (!dbb_client || !dbb_user_id || !dbb_active) return;
    const dbb_store_id = dbb_active.dbb_route_store_ids[dbb_active.dbb_stop_index];
    try {
      const dbb_image = dbb_camera ? await ImagePicker.launchCameraAsync({mediaTypes:['images'],quality:.75,base64:true}) :
        await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:.75,base64:true});
      if (dbb_image.canceled || !dbb_image.assets[0]?.base64) return;
      const dbb_asset = dbb_image.assets[0];
      if (!['image/jpeg','image/png'].includes(dbb_asset.mimeType || 'image/jpeg')) throw new Error('JPG veya PNG fiş gerekli.');
      const dbb_mime = dbb_asset.mimeType || 'image/jpeg';
      const dbb_path = `${dbb_user_id}/${dbb_active.dbb_id}/${dbb_store_id}-${Date.now()}.${dbb_mime==='image/png'?'png':'jpg'}`;
      const {error:dbb_upload_error} = await dbb_client.storage.from('dbb_shop_receipts').upload(dbb_path,decode(dbb_asset.base64!),{contentType:dbb_mime,upsert:false});
      if (dbb_upload_error) throw dbb_upload_error;
      const {error:dbb_claim_error} = await dbb_client.rpc('dbb_submit_shop_receipt',{
        dbb_p_order_id:dbb_active.dbb_id,dbb_p_store_id:dbb_store_id,dbb_p_object_path:dbb_path
      });
      if (dbb_claim_error) throw dbb_claim_error;
      dbb_notice('Fiş mağaza durağına kaydedildi.'); dbb_load_active();
    } catch (dbb_error) { dbb_notice((dbb_error as Error).message); }
  };
  const dbb_share_location = async () => {
    if (!dbb_client || !dbb_active) return;
    if (dbb_location_watch) { dbb_location_watch.remove(); dbb_set_location_watch(null); return; }
    const dbb_permission = await Location.requestForegroundPermissionsAsync();
    if (dbb_permission.status !== 'granted') { dbb_notice('Konum izni verilmedi.'); return; }
    const dbb_subscription = await Location.watchPositionAsync({accuracy:Location.Accuracy.Balanced,timeInterval:15000,distanceInterval:30}, async dbb_point => {
      const { error: dbb_error } = await dbb_client!.rpc('dbb_publish_location',{
        dbb_p_order_id:dbb_active.dbb_id,dbb_p_lat:dbb_point.coords.latitude,dbb_p_lon:dbb_point.coords.longitude
      });
      if (dbb_error) dbb_notice(dbb_error.message);
    });
    dbb_set_location_watch(dbb_subscription);
    dbb_notice('Uygulama açıkken konum müşteriye paylaşılır.');
  };
  const dbb_navigate = (dbb_store?: Dbb_Store) => {
    const dbb_lat = dbb_store?.dbb_lat ?? dbb_active?.dbb_lat; const dbb_lon = dbb_store?.dbb_lon ?? dbb_active?.dbb_lon;
    if (dbb_lat && dbb_lon) Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dbb_lat},${dbb_lon}`);
  };
  const dbb_send = async (dbb_body: string) => {
    if (!dbb_client || !dbb_active || !dbb_user_id) return;
    const { error: dbb_error } = await dbb_client.from('dbb_messages').insert({dbb_order_id:dbb_active.dbb_id,dbb_sender_id:dbb_user_id,dbb_body});
    if (dbb_error) dbb_notice(dbb_error.message); else { dbb_set_message(''); dbb_load_active(); }
  };

  const dbb_demo_screen = <Dbb_Card dbb_style={{ borderColor:dbb_theme.yellow + '66' }}>
    <Dbb_Pill dbb_label="KURYE SİMÜLASYONU · ÖDEME YOK" dbb_tone="yellow" />
    <Text style={{color:'white',fontSize:22,fontWeight:'900'}}>Yeni sipariş · DRB-DEMO</Text>
    <Text style={dbb_styles.muted}>2 mağaza · 5 ürün · Kızılay · Tahmini 42 dk · Örnek kurye kazancı 118 ₺</Text>
    <Text style={{color:dbb_theme.mint,fontWeight:'800'}}>{['Siparişi kabul et','Mağazaya gidiliyor','Alışveriş yapılıyor','Teslimata çıkıldı','Teslim edildi'][dbb_demo_stage]}</Text>
    {dbb_demo_stage >= 1 && dbb_demo_stage <= 2 && dbb_demo_stores.slice(0,2).map((dbb_store,dbb_index) => <View key={dbb_store.dbb_id} style={{gap:6}}>
      <Text style={dbb_styles.itemTitle}>Durak {dbb_index + 1} · {dbb_store.dbb_name}</Text>
      {['Coca-Cola 2,5 L','Nutella 750 g',dbb_index ? 'Ariel 8 kg' : 'Tavuk göğsü 2 kg'].map(dbb_name => <Pressable key={dbb_name} onPress={() => dbb_set_demo_checked(dbb_old => dbb_old.includes(dbb_name) ? dbb_old.filter(dbb_value => dbb_value !== dbb_name) : [...dbb_old,dbb_name])}>
        <Text style={{color:dbb_demo_checked.includes(dbb_name) ? dbb_theme.mint : dbb_theme.muted}}>{dbb_demo_checked.includes(dbb_name) ? '☑' : '□'} {dbb_name}</Text></Pressable>)}
    </View>)}
    <Dbb_Button dbb_title={dbb_demo_stage === 0 ? 'Örnek siparişi kabul et' : dbb_demo_stage === 4 ? 'Tekrar dene' : 'Sonraki aşama'}
      dbb_kind="mint" dbb_onPress={() => dbb_set_demo_stage(dbb_stage => (dbb_stage + 1) % 5)} />
    <Text style={dbb_styles.muted}>Bu ekran gerçek sipariş/kurye görevi oluşturmaz; Expo Go içinde akışı denemek içindir.</Text>
  </Dbb_Card>;

  const dbb_stop = dbb_active ? dbb_stores.find(dbb_store => dbb_store.dbb_id === dbb_active.dbb_route_store_ids[dbb_active.dbb_stop_index]) : undefined;
  return <View style={{gap:18}}><Text style={dbb_styles.heading}>Kurye merkezi</Text>
    {dbb_demo && dbb_demo_screen}
    {!dbb_user_id ? <Dbb_Card><Text style={dbb_styles.itemTitle}>Gerçek görev için giriş yap</Text><Dbb_Button dbb_title="Hesabıma git" dbb_onPress={dbb_go_account} /></Dbb_Card> :
      !dbb_profile ? <Dbb_Card><Text style={dbb_styles.itemTitle}>Kurye başvurusu</Text><Text style={dbb_styles.muted}>Görevler ancak yönetici hesabını onayladıktan sonra açılır.</Text>
        <TextInput style={dbb_styles.input} value={dbb_name} onChangeText={dbb_set_name} placeholder="Ad Soyad" placeholderTextColor="#7580A0" />
        <TextInput style={dbb_styles.input} value={dbb_phone} onChangeText={dbb_set_phone} keyboardType="phone-pad" placeholder="Telefon" placeholderTextColor="#7580A0" />
        <Dbb_Button dbb_title="Başvur" dbb_onPress={dbb_apply} /></Dbb_Card> : !dbb_profile.dbb_approved ?
        <Dbb_Card><Dbb_Pill dbb_label="ONAY BEKLENİYOR" dbb_tone="yellow" /><Text style={dbb_styles.itemTitle}>Merhaba {dbb_profile.dbb_name}</Text><Text style={dbb_styles.muted}>Yönetici onayından sonra ücretli görevler görünür.</Text></Dbb_Card> : <>
        <Dbb_Pill dbb_label="AKTİF KURYE" dbb_tone="mint" />
        <Dbb_Section dbb_title="Yeni görevler"><Dbb_Card>
          {dbb_jobs.length ? dbb_jobs.map(dbb_order =>
              <View key={dbb_order.dbb_id} style={{gap:9}}><Text style={dbb_styles.itemTitle}>{dbb_order.dbb_code} · Kurye ücreti {dbb_lira(dbb_order.dbb_courier_fee_kurus)}</Text>
                <Text style={dbb_styles.muted}>{dbb_order.dbb_store_count} mağaza · Ürün tutarı {dbb_lira(dbb_order.dbb_subtotal_kurus)}</Text>
                {dbb_order.dbb_stops.map((dbb_stop,dbb_index) => <View key={dbb_index} style={{gap:3}}><Text style={{color:dbb_theme.mint,fontWeight:'700'}}>{dbb_index+1}. {dbb_stop.dbb_name} · {dbb_stop.dbb_address}</Text>
                  {dbb_order.dbb_items.filter(dbb_item => dbb_item.dbb_store_name === dbb_stop.dbb_name).map((dbb_item,dbb_item_index) =>
                    <Text key={dbb_item_index} style={dbb_styles.muted}>• {dbb_item.dbb_product_name} ×{dbb_item.dbb_quantity} · {dbb_lira(dbb_item.dbb_unit_price_kurus * dbb_item.dbb_quantity)}</Text>)}</View>)}
                <Dbb_Button dbb_title="Siparişi kabul et" dbb_onPress={() => dbb_accept(dbb_order.dbb_id)} /></View>) :
            <Text style={dbb_styles.muted}>Şu anda ödeme onaylı yeni görev yok.</Text>}
          <Dbb_Button dbb_title="Yenile" dbb_kind="ghost" dbb_onPress={dbb_refresh} /></Dbb_Card></Dbb_Section>
        {dbb_active && <Dbb_Card dbb_style={{borderColor:dbb_theme.mint + '77'}}>
          <Text style={{color:'white',fontSize:22,fontWeight:'900'}}>{dbb_active.dbb_code}</Text>
          <Dbb_Pill dbb_label={dbb_steps[dbb_active.dbb_status]?.toLocaleUpperCase('tr-TR') || dbb_active.dbb_status} dbb_tone="mint" />
          <Text style={dbb_styles.muted}>Durak {dbb_active.dbb_stop_index + 1}/{dbb_active.dbb_route_store_ids.length} · {dbb_stop?.dbb_name || 'Teslimat adresi'}</Text>
          <Text style={{color:dbb_theme.mint,fontWeight:'900'}}>Kurye ücreti: {dbb_lira(dbb_active.dbb_courier_fee_kurus)}</Text>
          {dbb_stop && <Text style={dbb_styles.muted}>{dbb_stop.dbb_address}</Text>}
          <Dbb_Button dbb_title={dbb_location_watch ? 'Konum paylaşımını durdur' : 'Canlı konumu paylaş'} dbb_icon="locate" dbb_kind="ghost" dbb_onPress={dbb_share_location} />
          <Dbb_Button dbb_title="Navigasyonu aç" dbb_icon="navigate" dbb_kind="ghost" dbb_onPress={() => dbb_navigate(dbb_active.dbb_status === 'delivery' ? undefined : dbb_stop)} />
          {dbb_active.dbb_status === 'store_trip' && <Dbb_Button dbb_title="Mağazaya ulaştım" dbb_kind="mint" dbb_onPress={() => dbb_advance('shopping')} />}
          {dbb_active.dbb_status === 'shopping' && <>
            {dbb_items.filter(dbb_item => dbb_item.dbb_store_id === dbb_stop?.dbb_id).map(dbb_item => <View key={dbb_item.dbb_id} style={{backgroundColor:'#1A2337',borderRadius:13,padding:12,gap:7}}>
              <Text style={dbb_styles.itemTitle}>{dbb_item.dbb_pick_status === 'found' ? '✓ ' : dbb_item.dbb_pick_status === 'missing' ? '× ' : ''}{dbb_item.dbb_product_name} ×{dbb_item.dbb_quantity}</Text>
              <Text style={dbb_styles.muted}>Tahmini birim: {dbb_lira(dbb_item.dbb_unit_price_kurus)}</Text>
              <TextInput style={dbb_styles.input} value={dbb_price[dbb_item.dbb_id] ?? String(dbb_item.dbb_unit_price_kurus / 100)} onChangeText={dbb_value => dbb_set_price(dbb_old => ({...dbb_old,[dbb_item.dbb_id]:dbb_value}))} keyboardType="decimal-pad" placeholder="Gerçek birim fiyat TL" placeholderTextColor="#7580A0" />
              <View style={dbb_styles.row}><View style={{flex:1}}><Dbb_Button dbb_title="Bulundu" dbb_kind="mint" dbb_onPress={() => dbb_mark(dbb_item,'found')} /></View>
                <View style={{flex:1}}><Dbb_Button dbb_title="Ürün yok" dbb_kind="ghost" dbb_onPress={() => dbb_mark(dbb_item,'missing')} /></View></View>
            </View>)}
            {dbb_receipts.some(dbb_receipt => dbb_receipt.dbb_store_id === dbb_stop?.dbb_id) ?
              <Text style={{color:dbb_theme.mint,fontWeight:'800'}}>✓ Bu mağazanın fişi yüklendi</Text> :
              <View style={{gap:9}}><Text style={dbb_styles.muted}>Mağazadan ayrılmadan fişi yükle.</Text>
                <Dbb_Button dbb_title="Fişin fotoğrafını çek" dbb_kind="mint" dbb_icon="camera-outline" dbb_onPress={() => dbb_upload_shop_receipt(true)} />
                <Dbb_Button dbb_title="Galeriden fiş seç" dbb_kind="ghost" dbb_icon="images-outline" dbb_onPress={() => dbb_upload_shop_receipt(false)} /></View>}
            <Dbb_Button dbb_title={dbb_active.dbb_stop_index + 1 === dbb_active.dbb_route_store_ids.length ? 'Teslimata çık' : 'Sonraki mağazaya git'}
              dbb_onPress={() => dbb_advance(dbb_active.dbb_stop_index + 1 === dbb_active.dbb_route_store_ids.length ? 'delivery' : 'store_trip')} />
          </>}
          {dbb_active.dbb_status === 'delivery' && <Dbb_Button dbb_title="Teslim edildi" dbb_kind="mint" dbb_onPress={() => dbb_advance('delivered')} />}
          <Text style={dbb_styles.muted}>Fiyat sınırı aşılırsa ürün kaydı engellenir; müşteri onayı ve yeni mutabakat için operasyon ekibine haber ver.</Text>
          <Dbb_Section dbb_title="Müşteri ile mesajlaş"><View style={{gap:10}}>
            {dbb_chats.map(dbb_chat => <Text key={dbb_chat.dbb_id} style={{color:dbb_chat.dbb_sender_id === dbb_user_id ? dbb_theme.mint : 'white'}}>{dbb_chat.dbb_sender_id === dbb_user_id ? 'Ben' : 'Müşteri'}: {dbb_chat.dbb_body}</Text>)}
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{['Ürün stokta yok.','Alternatif gönderebilir miyim?','Kasadayım.','5 dakika içinde oradayım.'].map(dbb_text =>
              <Pressable key={dbb_text} onPress={() => dbb_send(dbb_text)} style={{padding:8,backgroundColor:'#263550',borderRadius:10}}><Text style={{color:'white',fontSize:12}}>{dbb_text}</Text></Pressable>)}</View>
            <TextInput style={dbb_styles.input} value={dbb_message} onChangeText={dbb_set_message} placeholder="Mesaj..." placeholderTextColor="#7580A0" />
            <Dbb_Button dbb_title="Gönder" dbb_onPress={() => dbb_send(dbb_message.trim())} dbb_disabled={!dbb_message.trim()} />
          </View></Dbb_Section>
        </Dbb_Card>}
      </>}
  </View>;
}

export function Dbb_Admin({ dbb_user_id, dbb_notice }: { dbb_user_id: string; dbb_notice: Dbb_Notify }) {
  const [dbb_admin, dbb_set_admin] = useState(false);
  const [dbb_claims, dbb_set_claims] = useState<{dbb_id:string;dbb_order_id:string;dbb_object_path:string;dbb_created_at:string;dbb_orders:{dbb_code:string;dbb_total_kurus:number}}[]>([]);
  const [dbb_couriers, dbb_set_couriers] = useState<{dbb_user_id:string;dbb_name:string;dbb_phone:string}[]>([]);
  const [dbb_review_orders, dbb_set_review_orders] = useState<Dbb_Order[]>([]);
  const [dbb_review_items, dbb_set_review_items] = useState<Dbb_OrderItem[]>([]);
  const [dbb_review_receipts, dbb_set_review_receipts] = useState<{dbb_id:string;dbb_order_id:string;dbb_object_path:string}[]>([]);
  const [dbb_review_settlements, dbb_set_review_settlements] = useState<{dbb_order_id:string;dbb_actual_total_kurus:number;dbb_difference_kurus:number}[]>([]);
  const [dbb_bank_refs, dbb_set_bank_refs] = useState<Record<string,string>>({});
  const [dbb_bank_checked, dbb_set_bank_checked] = useState<Record<string,boolean>>({});
  const [dbb_receipt_urls, dbb_set_receipt_urls] = useState<Record<string,string>>({});
  useEffect(() => { dbb_client?.from('dbb_admins').select('dbb_user_id').eq('dbb_user_id',dbb_user_id).maybeSingle().then(({data:dbb_data}) => dbb_set_admin(Boolean(dbb_data))); }, [dbb_user_id]);
  const dbb_refresh = useCallback(async () => {
    if (!dbb_client || !dbb_admin) return;
    const [dbb_claim_result, dbb_courier_result, dbb_order_result] = await Promise.all([
      dbb_client.from('dbb_payment_claims').select('dbb_id,dbb_order_id,dbb_object_path,dbb_created_at,dbb_orders(dbb_code,dbb_total_kurus)').eq('dbb_status','pending'),
      dbb_client.from('dbb_courier_profiles').select('dbb_user_id,dbb_name,dbb_phone').eq('dbb_approved',false),
      dbb_client.from('dbb_orders').select('*').in('dbb_status',['delivered','reconciling']).order('dbb_created_at',{ascending:false})
    ]);
    if (dbb_claim_result.error) dbb_notice(dbb_claim_result.error.message);
    else dbb_set_claims(dbb_claim_result.data as unknown as typeof dbb_claims);
    if (!dbb_courier_result.error) dbb_set_couriers(dbb_courier_result.data || []);
    if (dbb_order_result.error) { dbb_notice(dbb_order_result.error.message); return; }
    dbb_set_review_orders(dbb_order_result.data || []);
    const dbb_ids = (dbb_order_result.data || []).map(dbb_order => dbb_order.dbb_id);
    if (dbb_ids.length) {
      const [dbb_items_result,dbb_receipts_result,dbb_settlements_result] = await Promise.all([
        dbb_client.from('dbb_order_items').select('*').in('dbb_order_id',dbb_ids),
        dbb_client.from('dbb_shop_receipts').select('dbb_id,dbb_order_id,dbb_object_path').in('dbb_order_id',dbb_ids),
        dbb_client.from('dbb_settlements').select('dbb_order_id,dbb_actual_total_kurus,dbb_difference_kurus').in('dbb_order_id',dbb_ids)
      ]);
      dbb_set_review_items(dbb_items_result.data || []); dbb_set_review_receipts(dbb_receipts_result.data || []);
      dbb_set_review_settlements(dbb_settlements_result.data || []);
    } else { dbb_set_review_items([]); dbb_set_review_receipts([]); dbb_set_review_settlements([]); }
  }, [dbb_admin]);
  useEffect(() => { dbb_refresh(); }, [dbb_refresh]);
  const dbb_review = async (dbb_claim_id: string, dbb_approve: boolean) => {
    if (!dbb_client) return;
    if (dbb_approve && !dbb_bank_checked[dbb_claim_id]) { dbb_notice('Önce bankada tutarı, alıcıyı ve işlemi manuel doğrula.'); return; }
    const {error:dbb_error} = await dbb_client.rpc('dbb_review_payment',{
      dbb_p_claim_id:dbb_claim_id,dbb_p_approve:dbb_approve,
      dbb_p_bank_reference:dbb_bank_refs[dbb_claim_id] || '', dbb_p_note:dbb_approve ? 'Banka hareketi manuel kontrol edildi' : 'Transfer doğrulanamadı'
    });
    if (dbb_error) dbb_notice(dbb_error.message); else { dbb_notice(dbb_approve ? 'Ödeme banka referansıyla onaylandı.' : 'Dekont reddedildi.'); dbb_refresh(); }
  };
  const dbb_show_receipt = async (dbb_claim_id:string, dbb_path:string, dbb_bucket:'dbb_receipts'|'dbb_shop_receipts'='dbb_receipts') => {
    if (!dbb_client) return;
    const {data:dbb_data,error:dbb_error} = await dbb_client.storage.from(dbb_bucket).createSignedUrl(dbb_path,60);
    if (dbb_error) dbb_notice(dbb_error.message); else dbb_set_receipt_urls(dbb_old => ({...dbb_old,[dbb_claim_id]:dbb_data.signedUrl}));
  };
  const dbb_approve_courier = async (dbb_courier_id:string) => {
    const {error:dbb_error} = await dbb_client!.from('dbb_courier_profiles').update({dbb_approved:true}).eq('dbb_user_id',dbb_courier_id);
    if (dbb_error) dbb_notice(dbb_error.message); else { dbb_notice('Kurye hesabı onaylandı.'); dbb_refresh(); }
  };
  const dbb_reconcile = async (dbb_order_id:string) => {
    const {data:dbb_data,error:dbb_error} = await dbb_client!.rpc('dbb_reconcile_order',{dbb_p_order_id:dbb_order_id});
    if (dbb_error) dbb_notice(dbb_error.message); else {dbb_notice(`Mutabakat hesaplandı: ${dbb_lira(dbb_data.dbb_difference_kurus)} fark.`);dbb_refresh();}
  };
  const dbb_finalize = async (dbb_order_id:string,dbb_difference:number) => {
    if (dbb_difference !== 0 && !dbb_bank_checked[dbb_order_id]) {dbb_notice('İade veya ek ödemenin banka kaydını önce manuel doğrula.');return;}
    const {error:dbb_error} = await dbb_client!.rpc('dbb_finalize_order',{
      dbb_p_order_id:dbb_order_id,dbb_p_reference:dbb_bank_refs[dbb_order_id] || '',dbb_p_note:'Banka mutabakatı operasyon tarafından kontrol edildi'
    });
    if (dbb_error) dbb_notice(dbb_error.message); else {dbb_notice('Sipariş mutabakatı tamamlandı.');dbb_refresh();}
  };
  if (!dbb_admin) return null;
  return <Dbb_Section dbb_title="Operasyon paneli" dbb_caption="Ödeme kararı yalnızca gerçek banka hareketi kontrolünden sonra verilir.">
    <Dbb_Card><Dbb_Pill dbb_label="YÖNETİCİ" dbb_tone="pink" /><Text style={dbb_styles.itemTitle}>{dbb_claims.length} dekont · {dbb_couriers.length} kurye başvurusu · {dbb_review_orders.length} mutabakat</Text>
      <Dbb_Button dbb_title="Listeyi yenile" dbb_kind="ghost" dbb_onPress={dbb_refresh} />
      {dbb_claims.map(dbb_claim => <View key={dbb_claim.dbb_id} style={{gap:9,borderTopWidth:1,borderColor:dbb_theme.line,paddingTop:12}}>
        <Text style={dbb_styles.itemTitle}>#{dbb_claim.dbb_orders?.dbb_code} · {dbb_lira(dbb_claim.dbb_orders?.dbb_total_kurus || 0)}</Text>
        <Text style={dbb_styles.muted}>{dbb_date(dbb_claim.dbb_created_at)}</Text>
        <Dbb_Button dbb_title="Dekontu 60 saniye görüntüle" dbb_kind="ghost" dbb_onPress={() => dbb_show_receipt(dbb_claim.dbb_id,dbb_claim.dbb_object_path)} />
        {dbb_receipt_urls[dbb_claim.dbb_id] && <Image source={{uri:dbb_receipt_urls[dbb_claim.dbb_id]}} style={{width:'100%',height:240}} resizeMode="contain" />}
        <TextInput style={dbb_styles.input} value={dbb_bank_refs[dbb_claim.dbb_id] || ''} onChangeText={dbb_value => dbb_set_bank_refs(dbb_old => ({...dbb_old,[dbb_claim.dbb_id]:dbb_value}))} placeholder="Bankadaki benzersiz işlem referansı" placeholderTextColor="#7580A0" />
        <Pressable onPress={() => dbb_set_bank_checked(dbb_old => ({...dbb_old,[dbb_claim.dbb_id]:!dbb_old[dbb_claim.dbb_id]}))}>
          <Text style={{color:dbb_theme.mint}}>{dbb_bank_checked[dbb_claim.dbb_id] ? '☑' : '□'} Gerçek banka kaydında alıcı, tutar ve referansı kontrol ettim</Text></Pressable>
        <View style={dbb_styles.row}><View style={{flex:1}}><Dbb_Button dbb_title="Onayla" dbb_kind="mint" dbb_onPress={() => dbb_review(dbb_claim.dbb_id,true)} /></View>
          <View style={{flex:1}}><Dbb_Button dbb_title="Reddet" dbb_kind="danger" dbb_onPress={() => dbb_review(dbb_claim.dbb_id,false)} /></View></View>
      </View>)}
      {dbb_couriers.map(dbb_courier => <View key={dbb_courier.dbb_user_id} style={{gap:8,borderTopWidth:1,borderColor:dbb_theme.line,paddingTop:12}}>
        <Text style={dbb_styles.itemTitle}>Kurye: {dbb_courier.dbb_name}</Text><Text style={dbb_styles.muted}>{dbb_courier.dbb_phone}</Text>
        <Dbb_Button dbb_title="Kurye hesabını onayla" dbb_kind="ghost" dbb_onPress={() => dbb_approve_courier(dbb_courier.dbb_user_id)} />
      </View>)}
      {dbb_review_orders.map(dbb_order => {
        const dbb_settlement = dbb_review_settlements.find(dbb_row => dbb_row.dbb_order_id===dbb_order.dbb_id);
        return <View key={dbb_order.dbb_id} style={{gap:9,borderTopWidth:1,borderColor:dbb_theme.line,paddingTop:12}}>
          <Text style={dbb_styles.itemTitle}>{dbb_order.dbb_code} · {dbb_steps[dbb_order.dbb_status]}</Text>
          <Text style={dbb_styles.muted}>Ödenen: {dbb_lira(dbb_order.dbb_total_kurus)}</Text>
          {dbb_review_items.filter(dbb_item => dbb_item.dbb_order_id===dbb_order.dbb_id).map(dbb_item =>
            <Text key={dbb_item.dbb_id} style={dbb_styles.muted}>{dbb_item.dbb_pick_status==='found'?'✓':'×'} {dbb_item.dbb_product_name} ×{dbb_item.dbb_quantity} · Gerçek birim {dbb_item.dbb_actual_price_kurus===null?'—':dbb_lira(dbb_item.dbb_actual_price_kurus)}</Text>)}
          {dbb_review_receipts.filter(dbb_receipt => dbb_receipt.dbb_order_id===dbb_order.dbb_id).map(dbb_receipt =>
            <View key={dbb_receipt.dbb_id} style={{gap:5}}><Dbb_Button dbb_title="Mağaza fişini göster" dbb_kind="ghost" dbb_onPress={() => dbb_show_receipt(dbb_receipt.dbb_id,dbb_receipt.dbb_object_path,'dbb_shop_receipts')} />
              {dbb_receipt_urls[dbb_receipt.dbb_id] && <Image source={{uri:dbb_receipt_urls[dbb_receipt.dbb_id]}} style={{width:'100%',height:220}} resizeMode="contain" />}</View>)}
          {dbb_order.dbb_status==='delivered' && <Dbb_Button dbb_title="Fişleri kontrol ettim · farkı hesapla" dbb_kind="mint" dbb_onPress={() => dbb_reconcile(dbb_order.dbb_id)} />}
          {dbb_order.dbb_status==='reconciling' && dbb_settlement && <>
            <Text style={{color:dbb_theme.yellow,fontWeight:'900'}}>Gerçek toplam: {dbb_lira(dbb_settlement.dbb_actual_total_kurus)} · Fark: {dbb_lira(dbb_settlement.dbb_difference_kurus)}</Text>
            {dbb_settlement.dbb_difference_kurus!==0 && <><Text style={dbb_styles.muted}>{dbb_settlement.dbb_difference_kurus<0?'Müşteriye iade':'Müşteriden ek ödeme'} banka işlem referansı</Text>
              <TextInput style={dbb_styles.input} value={dbb_bank_refs[dbb_order.dbb_id] || ''} onChangeText={dbb_value => dbb_set_bank_refs(dbb_old => ({...dbb_old,[dbb_order.dbb_id]:dbb_value}))} placeholder="Benzersiz banka referansı" placeholderTextColor="#7580A0" />
              <Pressable onPress={() => dbb_set_bank_checked(dbb_old => ({...dbb_old,[dbb_order.dbb_id]:!dbb_old[dbb_order.dbb_id]}))}>
                <Text style={{color:dbb_theme.mint}}>{dbb_bank_checked[dbb_order.dbb_id]?'☑':'□'} İade/ek ödeme banka işlemini kontrol ettim</Text></Pressable></>}
            <Dbb_Button dbb_title="Mutabakatı tamamla" dbb_kind="mint" dbb_onPress={() => dbb_finalize(dbb_order.dbb_id,dbb_settlement.dbb_difference_kurus)} />
          </>}
        </View>;
      })}
    </Dbb_Card>
  </Dbb_Section>;
}
