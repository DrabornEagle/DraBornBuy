-- DraBornBuy catalog and pricing administration. Only dbb_* objects are changed.
alter table public.dbb_products
  add column dbb_image_url text not null default '',
  add column dbb_source_url text not null default '';
alter table public.dbb_offers
  add column dbb_source_url text not null default '',
  add column dbb_operator_note text not null default '',
  add column dbb_checked_by uuid references auth.users(id);
alter table public.dbb_config
  add column dbb_courier_base_kurus integer not null default 4990 check (dbb_courier_base_kurus between 0 and 100000),
  add column dbb_per_km_kurus integer not null default 800 check (dbb_per_km_kurus between 0 and 100000),
  add column dbb_extra_store_kurus integer not null default 2500 check (dbb_extra_store_kurus between 0 and 100000),
  add column dbb_service_base_kurus integer not null default 2490 check (dbb_service_base_kurus between 0 and 100000),
  add column dbb_service_rate_bps integer not null default 200 check (dbb_service_rate_bps between 0 and 3000),
  add column dbb_bag_per_store_kurus integer not null default 750 check (dbb_bag_per_store_kurus between 0 and 100000),
  add constraint dbb_payment_ready check (
    not dbb_enabled or (
      length(trim(dbb_bank_name)) >= 2 and length(trim(dbb_account_holder)) >= 3
      and regexp_replace(upper(dbb_iban), '[[:space:]]', '', 'g') ~ '^TR[0-9]{24}$'
    )
  );

-- Product names and packshots linked to the retailer's own public product pages.
-- There are deliberately no offers or store-specific stock claims in this seed.
insert into public.dbb_products
  (dbb_name,dbb_brand,dbb_size,dbb_category,dbb_image_url,dbb_source_url)
values
  ('Coca-Cola','Coca-Cola','2,5 L','İçecek',
   'https://images.csfour.com/mnresize/600/600/productimage/30039137/30039137_0_MC/8796532506674_1676984272002.jpg',
   'https://www.carrefoursa.com/coca-cola-2-5-l-p-30039137'),
  ('Nutella Kakaolu Fındık Kreması','Nutella','750 g','Kahvaltılık',
   'https://images.csfour.com/mnresize/600/600/productimage/30047778/30047778_0_MC/8796594700338_1757406971759.jpg',
   'https://www.carrefoursa.com/nutella-kakaolu-findik-kremasi-750-g-p-30047778'),
  ('Ariel Dağ Esintisi Renklilere Özel Deterjan','Ariel','7 kg · 46 yıkama','Temizlik',
   'https://images.csfour.com/mnresize/600/600/productimage/30346840/30346840_2_MC/8835777626162_1773953761829.jpg',
   'https://www.carrefoursa.com/ariel-dag-esintisi-renklilere-ozel-camasir-deterjani-7-kg-46-yikama-p-30346840'),
  ('Finish Quantum Özel Seri Bulaşık Makinesi Tableti','Finish','50 kapsül','Temizlik',
   'https://images.csfour.com/mnresize/600/600/productimage/30413399/30413399_2_MC/8846591426610_1734521370688.jpg',
   'https://www.carrefoursa.com/finish-quantum-ozel-seri-50-kapsul-bulasik-makinesi-deterjani-tableti-p-30413399'),
  ('Yudum Ayçiçek Yağı','Yudum','5 L','Temel gıda',
   'https://images.csfour.com/mnresize/600/600/productimage/30088639/30088639_0_MC/8796878274610_1738922579728.jpg',
   'https://www.carrefoursa.com/yudum-aycicek-yagi-5-l-p-30088639'),
  ('İçim Sade Süt','İçim','1 L','Kahvaltılık',
   'https://images.csfour.com/mnresize/600/600/productimage/30096708/30096708_0_MC/8796974415922_1625744888327.jpg',
   'https://www.carrefoursa.com/icim-sade-sut-1-l-p-30096708'),
  ('Carrefour Osmancık Pirinç','Carrefour','1 kg','Bakliyat',
   'https://images.csfour.com/mnresize/600/600/productimage/30165983/30165983_0_MC/8807398801458_1631620247834.jpg',
   'https://www.carrefoursa.com/carrefour-osmancik-pirinc-1-kg-p-30165983'),
  ('Carrefour Yumurta M Boy','Carrefour','30 adet','Kahvaltılık',
   'https://images.csfour.com/mnresize/600/600/productimage/30239970/30239970_0_MC/8812646334514_1645597221938.jpg',
   'https://www.carrefoursa.com/carrefour-yumurta-30-lu-m-boy-p-30239970');

grant update on public.dbb_config to authenticated;
grant insert,update on public.dbb_stores,public.dbb_products,public.dbb_offers to authenticated;

create policy dbb_config_admin_update on public.dbb_config for update to authenticated
  using (exists (select 1 from public.dbb_admins where dbb_user_id = (select auth.uid())))
  with check (exists (select 1 from public.dbb_admins where dbb_user_id = (select auth.uid())));
create policy dbb_stores_admin_read on public.dbb_stores for select to authenticated
  using (exists (select 1 from public.dbb_admins where dbb_user_id = (select auth.uid())));
create policy dbb_stores_admin_insert on public.dbb_stores for insert to authenticated
  with check (exists (select 1 from public.dbb_admins where dbb_user_id = (select auth.uid())));
create policy dbb_stores_admin_update on public.dbb_stores for update to authenticated
  using (exists (select 1 from public.dbb_admins where dbb_user_id = (select auth.uid())))
  with check (exists (select 1 from public.dbb_admins where dbb_user_id = (select auth.uid())));
create policy dbb_products_admin_read on public.dbb_products for select to authenticated
  using (exists (select 1 from public.dbb_admins where dbb_user_id = (select auth.uid())));
create policy dbb_products_admin_insert on public.dbb_products for insert to authenticated
  with check (exists (select 1 from public.dbb_admins where dbb_user_id = (select auth.uid())));
create policy dbb_products_admin_update on public.dbb_products for update to authenticated
  using (exists (select 1 from public.dbb_admins where dbb_user_id = (select auth.uid())))
  with check (exists (select 1 from public.dbb_admins where dbb_user_id = (select auth.uid())));
create policy dbb_offers_admin_read on public.dbb_offers for select to authenticated
  using (exists (select 1 from public.dbb_admins where dbb_user_id = (select auth.uid())));
create policy dbb_offers_admin_insert on public.dbb_offers for insert to authenticated
  with check (exists (select 1 from public.dbb_admins where dbb_user_id = (select auth.uid())));
create policy dbb_offers_admin_update on public.dbb_offers for update to authenticated
  using (exists (select 1 from public.dbb_admins where dbb_user_id = (select auth.uid())));

-- The server remains the source of truth for totals after fee settings change.
create or replace function public.dbb_create_order(dbb_p_items jsonb, dbb_p_address text, dbb_p_lat numeric, dbb_p_lon numeric, dbb_p_tolerance_kurus integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  dbb_user uuid := auth.uid(); dbb_config public.dbb_config%rowtype;
  dbb_subtotal integer; dbb_stores uuid[]; dbb_route uuid[]; dbb_distance numeric;
  dbb_courier integer; dbb_service integer; dbb_bag integer; dbb_order public.dbb_orders%rowtype;
begin
  if dbb_user is null then raise exception 'Oturum açmalısınız'; end if;
  select * into dbb_config from public.dbb_config where dbb_key = 'ankara';
  if not dbb_config.dbb_enabled or dbb_config.dbb_iban = '' then raise exception 'Gerçek siparişler henüz açılmadı'; end if;
  if dbb_p_lat not between 39.7 and 40.3 or dbb_p_lon not between 32.4 and 33.4 then raise exception 'Teslimat Ankara içinde olmalı'; end if;
  if length(trim(dbb_p_address)) < 10 or length(dbb_p_address) > 300 then raise exception 'Teslimat adresini kontrol edin'; end if;
  if dbb_p_tolerance_kurus not between 0 and 50000 then raise exception 'Fiyat farkı limiti geçersiz'; end if;
  if jsonb_typeof(dbb_p_items) <> 'array' or jsonb_array_length(dbb_p_items) not between 1 and 40 then raise exception 'Sepet geçersiz'; end if;
  if exists (select 1 from jsonb_array_elements(dbb_p_items) dbb_e where
    (dbb_e->>'dbb_offer_id') is null or (dbb_e->>'dbb_quantity') !~ '^[0-9]{1,2}$') then raise exception 'Ürün biçimi geçersiz'; end if;
  if exists (select 1 from jsonb_array_elements(dbb_p_items) dbb_e group by dbb_e->>'dbb_offer_id' having count(*) > 1) then
    raise exception 'Tekrarlanan teklif var'; end if;
  if exists (select 1 from jsonb_array_elements(dbb_p_items) dbb_e where (dbb_e->>'dbb_quantity')::integer not between 1 and 20) then
    raise exception 'Miktar geçersiz'; end if;
  if exists (select 1 from jsonb_array_elements(dbb_p_items) dbb_e where (dbb_e->>'dbb_offer_id') !~* '^[0-9a-f-]{36}$') then
    raise exception 'Teklif kimliği geçersiz'; end if;
  select coalesce(sum(dbb_o.dbb_price_kurus * (dbb_e->>'dbb_quantity')::integer),0)::integer,
    array_agg(distinct dbb_o.dbb_store_id)
  into dbb_subtotal, dbb_stores
  from jsonb_array_elements(dbb_p_items) dbb_e
  join public.dbb_offers dbb_o on dbb_o.dbb_id = (dbb_e->>'dbb_offer_id')::uuid
  join public.dbb_stores dbb_s on dbb_s.dbb_id = dbb_o.dbb_store_id and dbb_s.dbb_active and dbb_s.dbb_city = 'Ankara'
  join public.dbb_products dbb_p on dbb_p.dbb_id = dbb_o.dbb_product_id and dbb_p.dbb_active
  where dbb_o.dbb_verified and dbb_o.dbb_in_stock and dbb_o.dbb_checked_at >= now() - (dbb_config.dbb_max_age_hours * interval '1 hour');
  if (select count(*) from jsonb_array_elements(dbb_p_items)) <>
    (select count(*) from jsonb_array_elements(dbb_p_items) dbb_e join public.dbb_offers dbb_o
      on dbb_o.dbb_id = (dbb_e->>'dbb_offer_id')::uuid where dbb_o.dbb_verified and dbb_o.dbb_in_stock
      and dbb_o.dbb_checked_at >= now() - (dbb_config.dbb_max_age_hours * interval '1 hour')
      and exists (select 1 from public.dbb_stores dbb_s where dbb_s.dbb_id = dbb_o.dbb_store_id and dbb_s.dbb_active and dbb_s.dbb_city = 'Ankara')
      and exists (select 1 from public.dbb_products dbb_p where dbb_p.dbb_id = dbb_o.dbb_product_id and dbb_p.dbb_active)) then
    raise exception 'Bir teklif artık doğrulanmış veya stokta değil';
  end if;
  if cardinality(dbb_stores) > 4 then raise exception 'Bir siparişte en fazla 4 mağaza seçin'; end if;
  select dbb_km, dbb_route_ids into dbb_distance, dbb_route from public.dbb_route_distance(dbb_stores, dbb_p_lat, dbb_p_lon);
  dbb_courier := dbb_config.dbb_courier_base_kurus + ceil(dbb_distance * dbb_config.dbb_per_km_kurus)::integer
    + (cardinality(dbb_stores) - 1) * dbb_config.dbb_extra_store_kurus;
  dbb_service := dbb_config.dbb_service_base_kurus + round(dbb_subtotal * dbb_config.dbb_service_rate_bps / 10000.0)::integer;
  dbb_bag := cardinality(dbb_stores) * dbb_config.dbb_bag_per_store_kurus;
  insert into public.dbb_orders(dbb_customer_id,dbb_address,dbb_lat,dbb_lon,dbb_route_store_ids,dbb_subtotal_kurus,
    dbb_courier_fee_kurus,dbb_service_fee_kurus,dbb_bag_fee_kurus,dbb_total_kurus,dbb_price_tolerance_kurus)
  values (dbb_user,trim(dbb_p_address),dbb_p_lat,dbb_p_lon,dbb_route,dbb_subtotal,dbb_courier,dbb_service,dbb_bag,
    dbb_subtotal + dbb_courier + dbb_service + dbb_bag,dbb_p_tolerance_kurus) returning * into dbb_order;
  insert into public.dbb_order_items(dbb_order_id,dbb_offer_id,dbb_store_id,dbb_product_name,dbb_store_name,dbb_quantity,dbb_unit_price_kurus)
  select dbb_order.dbb_id, dbb_o.dbb_id, dbb_s.dbb_id, dbb_p.dbb_name || ' ' || dbb_p.dbb_size, dbb_s.dbb_name,
    (dbb_e->>'dbb_quantity')::integer, dbb_o.dbb_price_kurus
  from jsonb_array_elements(dbb_p_items) dbb_e
  join public.dbb_offers dbb_o on dbb_o.dbb_id = (dbb_e->>'dbb_offer_id')::uuid
  join public.dbb_stores dbb_s on dbb_s.dbb_id = dbb_o.dbb_store_id
  join public.dbb_products dbb_p on dbb_p.dbb_id = dbb_o.dbb_product_id;
  insert into public.dbb_order_events(dbb_order_id,dbb_status,dbb_note) values (dbb_order.dbb_id,'payment_pending','Banka transferi bekleniyor');
  return jsonb_build_object('dbb_id',dbb_order.dbb_id,'dbb_code',dbb_order.dbb_code,
    'dbb_total_kurus',dbb_order.dbb_total_kurus,'dbb_status',dbb_order.dbb_status);
end; $$;
