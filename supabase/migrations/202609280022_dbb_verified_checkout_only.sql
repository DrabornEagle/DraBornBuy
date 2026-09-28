-- A public catalog page is not evidence of stock at an Ankara branch.
-- Keep catalog observations on dbb_products for discovery, and reserve dbb_offers
-- for branch prices with confirmed availability.
create or replace function public.dbb_refresh_catalog_procurement_offers()
returns integer language plpgsql security definer set search_path='' as $$
begin
  return 0;
end; $$;

select cron.unschedule('dbb_procurement_offer_every_1m');

update public.dbb_offers
set dbb_in_stock=false, dbb_verified=false, dbb_availability='unavailable',
    dbb_operator_note='Çevrimiçi katalog fiyatı şube stoğu ve kasadaki fiyatı doğrulamaz.'
where dbb_source='catalog';

drop policy if exists dbb_offers_read on public.dbb_offers;
create policy dbb_offers_read on public.dbb_offers for select to anon,authenticated using (
  dbb_verified and dbb_in_stock and dbb_availability='confirmed'
  and dbb_source in ('manual','partner','receipt')
  and dbb_checked_at >= now() - ((select dbb_max_age_hours from public.dbb_config where dbb_key='ankara') * interval '1 hour')
  and exists(select 1 from public.dbb_stores dbb_s where dbb_s.dbb_id=dbb_store_id and dbb_s.dbb_active)
  and exists(select 1 from public.dbb_products dbb_p where dbb_p.dbb_id=dbb_product_id and dbb_p.dbb_active)
);

select cron.unschedule('dbb_readiness_every_5m');
select cron.schedule('dbb_readiness_every_5m','*/5 * * * *',
  $dbb$
    update public.dbb_config dbb_c set dbb_enabled =
      dbb_c.dbb_requested_enabled
      and length(trim(dbb_c.dbb_bank_name)) >= 2
      and length(trim(dbb_c.dbb_account_holder)) >= 3
      and length(trim(dbb_c.dbb_iban)) = 26
      and exists (
        select 1 from public.dbb_offers dbb_o
        join public.dbb_stores dbb_s on dbb_s.dbb_id=dbb_o.dbb_store_id
        join public.dbb_products dbb_p on dbb_p.dbb_id=dbb_o.dbb_product_id
        where dbb_o.dbb_verified and dbb_o.dbb_in_stock
          and dbb_o.dbb_availability='confirmed'
          and dbb_o.dbb_source in ('manual','partner','receipt')
          and dbb_s.dbb_active and dbb_p.dbb_active
          and dbb_o.dbb_checked_at >= now() - dbb_c.dbb_max_age_hours * interval '1 hour'
      )
      and exists (select 1 from public.dbb_courier_profiles where dbb_approved)
    where dbb_c.dbb_key='ankara';
  $dbb$
);

update public.dbb_config set dbb_enabled=false where dbb_key='ankara';

-- A client or admin toggle cannot turn an unconfirmed catalog observation into a payable order.
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
  where dbb_o.dbb_verified and dbb_o.dbb_in_stock and dbb_o.dbb_availability='confirmed'
    and dbb_o.dbb_source in ('manual','partner','receipt') and dbb_o.dbb_checked_at >= now() - (dbb_config.dbb_max_age_hours * interval '1 hour');
  if (select count(*) from jsonb_array_elements(dbb_p_items)) <>
    (select count(*) from jsonb_array_elements(dbb_p_items) dbb_e join public.dbb_offers dbb_o
      on dbb_o.dbb_id = (dbb_e->>'dbb_offer_id')::uuid where dbb_o.dbb_verified and dbb_o.dbb_in_stock and dbb_o.dbb_availability='confirmed'
    and dbb_o.dbb_source in ('manual','partner','receipt')
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
