-- DraBornBuy v0.1: isolated dbb_* objects in the shared public schema.
-- No existing Park, Garage, Odds, Auth trigger, or other application's table is altered.

create table public.dbb_config (
  dbb_key text primary key default 'ankara' check (dbb_key = 'ankara'),
  dbb_city text not null default 'Ankara' check (dbb_city = 'Ankara'),
  dbb_enabled boolean not null default false,
  dbb_bank_name text not null default '',
  dbb_account_holder text not null default '',
  dbb_iban text not null default '',
  dbb_max_age_hours integer not null default 24 check (dbb_max_age_hours between 1 and 72)
);
insert into public.dbb_config (dbb_key) values ('ankara');

create table public.dbb_stores (
  dbb_id uuid primary key default gen_random_uuid(),
  dbb_name text not null check (length(dbb_name) between 2 and 120),
  dbb_address text not null,
  dbb_city text not null default 'Ankara' check (dbb_city = 'Ankara'),
  dbb_lat numeric(10,7) not null check (dbb_lat between 39.7 and 40.3),
  dbb_lon numeric(10,7) not null check (dbb_lon between 32.4 and 33.4),
  dbb_active boolean not null default false,
  dbb_created_at timestamptz not null default now()
);
create table public.dbb_products (
  dbb_id uuid primary key default gen_random_uuid(),
  dbb_name text not null check (length(dbb_name) between 2 and 160),
  dbb_brand text not null default '',
  dbb_size text not null default '',
  dbb_category text not null default 'Market',
  dbb_barcode text unique,
  dbb_active boolean not null default true,
  dbb_created_at timestamptz not null default now()
);
create table public.dbb_offers (
  dbb_id uuid primary key default gen_random_uuid(),
  dbb_store_id uuid not null references public.dbb_stores(dbb_id),
  dbb_product_id uuid not null references public.dbb_products(dbb_id),
  dbb_price_kurus integer not null check (dbb_price_kurus > 0),
  dbb_in_stock boolean not null default false,
  dbb_verified boolean not null default false,
  dbb_source text not null default 'manual' check (dbb_source in ('manual','partner','receipt')),
  dbb_checked_at timestamptz not null default now(),
  unique(dbb_store_id, dbb_product_id)
);
create index dbb_offers_product_idx on public.dbb_offers(dbb_product_id, dbb_checked_at desc);

create table public.dbb_admins (
  dbb_user_id uuid primary key references auth.users(id) on delete cascade,
  dbb_created_at timestamptz not null default now()
);
create table public.dbb_courier_profiles (
  dbb_user_id uuid primary key references auth.users(id) on delete cascade,
  dbb_name text not null check (length(dbb_name) between 3 and 100),
  dbb_phone text not null check (length(dbb_phone) between 10 and 20),
  dbb_vehicle text not null default 'motosiklet',
  dbb_approved boolean not null default false,
  dbb_created_at timestamptz not null default now()
);
create table public.dbb_saved_lists (
  dbb_id uuid primary key default gen_random_uuid(),
  dbb_user_id uuid not null references auth.users(id) on delete cascade,
  dbb_name text not null check (length(dbb_name) between 1 and 70),
  dbb_items jsonb not null default '[]'::jsonb check (jsonb_typeof(dbb_items) = 'array'),
  dbb_updated_at timestamptz not null default now()
);
create index dbb_saved_lists_owner_idx on public.dbb_saved_lists(dbb_user_id);

create sequence public.dbb_order_number_seq start with 42871;
create table public.dbb_orders (
  dbb_id uuid primary key default gen_random_uuid(),
  dbb_code text not null unique default ('DRB' || nextval('public.dbb_order_number_seq')::text),
  dbb_customer_id uuid not null references auth.users(id),
  dbb_courier_id uuid references auth.users(id),
  dbb_status text not null default 'payment_pending' check (dbb_status in
    ('payment_pending','payment_review','searching_courier','store_trip','shopping','delivery','delivered','reconciling','completed','canceled')),
  dbb_address text not null,
  dbb_lat numeric(10,7) not null check (dbb_lat between 39.7 and 40.3),
  dbb_lon numeric(10,7) not null check (dbb_lon between 32.4 and 33.4),
  dbb_route_store_ids uuid[] not null,
  dbb_stop_index integer not null default 0 check (dbb_stop_index >= 0),
  dbb_subtotal_kurus integer not null check (dbb_subtotal_kurus >= 0),
  dbb_courier_fee_kurus integer not null check (dbb_courier_fee_kurus >= 0),
  dbb_service_fee_kurus integer not null check (dbb_service_fee_kurus >= 0),
  dbb_bag_fee_kurus integer not null check (dbb_bag_fee_kurus >= 0),
  dbb_total_kurus integer not null check (dbb_total_kurus >= 0),
  dbb_price_tolerance_kurus integer not null default 0 check (dbb_price_tolerance_kurus between 0 and 50000),
  dbb_created_at timestamptz not null default now(),
  dbb_updated_at timestamptz not null default now()
);
create index dbb_orders_customer_idx on public.dbb_orders(dbb_customer_id, dbb_created_at desc);
create index dbb_orders_available_idx on public.dbb_orders(dbb_status, dbb_created_at desc);

create table public.dbb_order_items (
  dbb_id uuid primary key default gen_random_uuid(),
  dbb_order_id uuid not null references public.dbb_orders(dbb_id) on delete cascade,
  dbb_offer_id uuid not null references public.dbb_offers(dbb_id),
  dbb_store_id uuid not null references public.dbb_stores(dbb_id),
  dbb_product_name text not null,
  dbb_store_name text not null,
  dbb_quantity integer not null check (dbb_quantity between 1 and 20),
  dbb_unit_price_kurus integer not null check (dbb_unit_price_kurus > 0),
  dbb_actual_price_kurus integer check (dbb_actual_price_kurus >= 0),
  dbb_pick_status text not null default 'pending' check (dbb_pick_status in ('pending','found','missing')),
  unique(dbb_order_id, dbb_offer_id)
);
create index dbb_order_items_order_idx on public.dbb_order_items(dbb_order_id);

create table public.dbb_payment_claims (
  dbb_id uuid primary key default gen_random_uuid(),
  dbb_order_id uuid not null references public.dbb_orders(dbb_id),
  dbb_customer_id uuid not null references auth.users(id),
  dbb_object_path text not null unique,
  dbb_sender_reference text not null default '',
  dbb_bank_reference text unique,
  dbb_status text not null default 'pending' check (dbb_status in ('pending','approved','rejected')),
  dbb_review_note text,
  dbb_created_at timestamptz not null default now(),
  dbb_reviewed_at timestamptz
);
create index dbb_payment_claims_order_idx on public.dbb_payment_claims(dbb_order_id);

create table public.dbb_order_events (
  dbb_id uuid primary key default gen_random_uuid(),
  dbb_order_id uuid not null references public.dbb_orders(dbb_id) on delete cascade,
  dbb_status text not null,
  dbb_note text not null default '',
  dbb_created_at timestamptz not null default now()
);
create index dbb_order_events_order_idx on public.dbb_order_events(dbb_order_id, dbb_created_at);

create table public.dbb_messages (
  dbb_id uuid primary key default gen_random_uuid(),
  dbb_order_id uuid not null references public.dbb_orders(dbb_id) on delete cascade,
  dbb_sender_id uuid not null references auth.users(id),
  dbb_body text not null check (length(trim(dbb_body)) between 1 and 500),
  dbb_created_at timestamptz not null default now()
);
create index dbb_messages_order_idx on public.dbb_messages(dbb_order_id, dbb_created_at);

create table public.dbb_order_locations (
  dbb_order_id uuid primary key references public.dbb_orders(dbb_id) on delete cascade,
  dbb_courier_id uuid not null references auth.users(id),
  dbb_lat numeric(10,7) not null,
  dbb_lon numeric(10,7) not null,
  dbb_updated_at timestamptz not null default now()
);

alter table public.dbb_config enable row level security;
alter table public.dbb_stores enable row level security;
alter table public.dbb_products enable row level security;
alter table public.dbb_offers enable row level security;
alter table public.dbb_admins enable row level security;
alter table public.dbb_courier_profiles enable row level security;
alter table public.dbb_saved_lists enable row level security;
alter table public.dbb_orders enable row level security;
alter table public.dbb_order_items enable row level security;
alter table public.dbb_payment_claims enable row level security;
alter table public.dbb_order_events enable row level security;
alter table public.dbb_messages enable row level security;
alter table public.dbb_order_locations enable row level security;

grant select on public.dbb_config, public.dbb_stores, public.dbb_products, public.dbb_offers to anon, authenticated;
grant select on public.dbb_admins, public.dbb_courier_profiles, public.dbb_saved_lists, public.dbb_orders, public.dbb_order_items,
  public.dbb_payment_claims, public.dbb_order_events, public.dbb_messages, public.dbb_order_locations to authenticated;
grant insert on public.dbb_courier_profiles, public.dbb_saved_lists, public.dbb_messages to authenticated;
grant update, delete on public.dbb_saved_lists to authenticated;

create policy dbb_config_read on public.dbb_config for select to anon, authenticated using (true);
create policy dbb_stores_read on public.dbb_stores for select to anon, authenticated using (dbb_active and dbb_city = 'Ankara');
create policy dbb_products_read on public.dbb_products for select to anon, authenticated using (dbb_active);
create policy dbb_offers_read on public.dbb_offers for select to anon, authenticated using (
  dbb_verified and dbb_in_stock and dbb_checked_at >= now() -
    ((select dbb_max_age_hours from public.dbb_config where dbb_key = 'ankara') * interval '1 hour')
  and exists (select 1 from public.dbb_stores dbb_s where dbb_s.dbb_id = dbb_store_id and dbb_s.dbb_active)
  and exists (select 1 from public.dbb_products dbb_p where dbb_p.dbb_id = dbb_product_id and dbb_p.dbb_active)
);
create policy dbb_admins_read_own on public.dbb_admins for select to authenticated using (dbb_user_id = (select auth.uid()));
create policy dbb_courier_read_own on public.dbb_courier_profiles for select to authenticated using (dbb_user_id = (select auth.uid()));
create policy dbb_courier_apply on public.dbb_courier_profiles for insert to authenticated with check
  (dbb_user_id = (select auth.uid()) and dbb_approved = false);
create policy dbb_saved_read on public.dbb_saved_lists for select to authenticated using (dbb_user_id = (select auth.uid()));
create policy dbb_saved_insert on public.dbb_saved_lists for insert to authenticated with check (dbb_user_id = (select auth.uid()));
create policy dbb_saved_update on public.dbb_saved_lists for update to authenticated
  using (dbb_user_id = (select auth.uid())) with check (dbb_user_id = (select auth.uid()));
create policy dbb_saved_delete on public.dbb_saved_lists for delete to authenticated using (dbb_user_id = (select auth.uid()));
create policy dbb_orders_participant on public.dbb_orders for select to authenticated using (
  dbb_customer_id = (select auth.uid()) or dbb_courier_id = (select auth.uid()) or
  (dbb_status = 'searching_courier' and exists
    (select 1 from public.dbb_courier_profiles dbb_cp where dbb_cp.dbb_user_id = (select auth.uid()) and dbb_cp.dbb_approved))
);
create policy dbb_items_participant on public.dbb_order_items for select to authenticated using (
  exists (select 1 from public.dbb_orders dbb_o where dbb_o.dbb_id = dbb_order_id and
    (dbb_o.dbb_customer_id = (select auth.uid()) or dbb_o.dbb_courier_id = (select auth.uid())))
);
create policy dbb_claims_customer on public.dbb_payment_claims for select to authenticated using (dbb_customer_id = (select auth.uid()));
create policy dbb_events_participant on public.dbb_order_events for select to authenticated using (
  exists (select 1 from public.dbb_orders dbb_o where dbb_o.dbb_id = dbb_order_id and
    (dbb_o.dbb_customer_id = (select auth.uid()) or dbb_o.dbb_courier_id = (select auth.uid())))
);
create policy dbb_messages_participant on public.dbb_messages for select to authenticated using (
  exists (select 1 from public.dbb_orders dbb_o where dbb_o.dbb_id = dbb_order_id and
    (dbb_o.dbb_customer_id = (select auth.uid()) or dbb_o.dbb_courier_id = (select auth.uid())))
);
create policy dbb_messages_send on public.dbb_messages for insert to authenticated with check (
  dbb_sender_id = (select auth.uid()) and exists (select 1 from public.dbb_orders dbb_o where dbb_o.dbb_id = dbb_order_id
    and dbb_o.dbb_courier_id is not null and dbb_o.dbb_status not in ('completed','canceled')
    and (dbb_o.dbb_customer_id = (select auth.uid()) or dbb_o.dbb_courier_id = (select auth.uid())))
);
create policy dbb_location_participant on public.dbb_order_locations for select to authenticated using (
  exists (select 1 from public.dbb_orders dbb_o where dbb_o.dbb_id = dbb_order_id and
    (dbb_o.dbb_customer_id = (select auth.uid()) or dbb_o.dbb_courier_id = (select auth.uid())))
);

create function public.dbb_distance_km(dbb_a_lat numeric, dbb_a_lon numeric, dbb_b_lat numeric, dbb_b_lon numeric)
returns numeric language sql immutable set search_path = '' as $$
  select (6371 * 2 * asin(least(1.0, sqrt(
    power(sin(radians((dbb_b_lat - dbb_a_lat)::double precision) / 2), 2) +
    cos(radians(dbb_a_lat::double precision)) * cos(radians(dbb_b_lat::double precision)) *
    power(sin(radians((dbb_b_lon - dbb_a_lon)::double precision) / 2), 2)
  ))))::numeric;
$$;
revoke all on function public.dbb_distance_km(numeric,numeric,numeric,numeric) from public, anon;

create function public.dbb_route_distance(dbb_store_ids uuid[], dbb_home_lat numeric, dbb_home_lon numeric)
returns table(dbb_km numeric, dbb_route_ids uuid[]) language sql stable set search_path = '' as $$
  with recursive dbb_paths(dbb_path, dbb_remaining, dbb_last_lat, dbb_last_lon, dbb_length) as (
    select array[]::uuid[], dbb_store_ids, dbb_home_lat, dbb_home_lon, 0::numeric
    union all
    select dbb_paths.dbb_path || dbb_s.dbb_id,
      array_remove(dbb_paths.dbb_remaining, dbb_s.dbb_id), dbb_s.dbb_lat, dbb_s.dbb_lon,
      dbb_paths.dbb_length + public.dbb_distance_km(dbb_paths.dbb_last_lat, dbb_paths.dbb_last_lon, dbb_s.dbb_lat, dbb_s.dbb_lon)
    from dbb_paths join public.dbb_stores dbb_s on dbb_s.dbb_id = any(dbb_paths.dbb_remaining)
  )
  select dbb_paths.dbb_length + public.dbb_distance_km(dbb_paths.dbb_last_lat, dbb_paths.dbb_last_lon, dbb_home_lat, dbb_home_lon), dbb_paths.dbb_path
  from dbb_paths where cardinality(dbb_paths.dbb_remaining) = 0 order by 1 limit 1;
$$;
revoke all on function public.dbb_route_distance(uuid[],numeric,numeric) from public, anon;

create function public.dbb_create_order(dbb_p_items jsonb, dbb_p_address text, dbb_p_lat numeric, dbb_p_lon numeric, dbb_p_tolerance_kurus integer default 0)
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
  dbb_courier := 4990 + ceil(dbb_distance * 800)::integer + (cardinality(dbb_stores) - 1) * 2500;
  dbb_service := 2490 + round(dbb_subtotal * 0.02)::integer;
  dbb_bag := cardinality(dbb_stores) * 750;
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
revoke all on function public.dbb_create_order(jsonb,text,numeric,numeric,integer) from public, anon;
grant execute on function public.dbb_create_order(jsonb,text,numeric,numeric,integer) to authenticated;

create function public.dbb_submit_payment(dbb_p_order_id uuid, dbb_p_object_path text, dbb_p_sender_reference text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare dbb_user uuid := auth.uid(); dbb_claim_id uuid;
begin
  if not exists (select 1 from public.dbb_orders where dbb_id = dbb_p_order_id and dbb_customer_id = dbb_user and dbb_status = 'payment_pending') then
    raise exception 'Sipariş ödeme beklemiyor'; end if;
  if dbb_p_object_path not like dbb_user::text || '/' || dbb_p_order_id::text || '/%' then raise exception 'Dekont yolu geçersiz'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'dbb_receipts' and name = dbb_p_object_path) then
    raise exception 'Dekont yüklenmemiş'; end if;
  insert into public.dbb_payment_claims(dbb_order_id,dbb_customer_id,dbb_object_path,dbb_sender_reference)
  values(dbb_p_order_id,dbb_user,dbb_p_object_path,left(dbb_p_sender_reference,100)) returning dbb_id into dbb_claim_id;
  update public.dbb_orders set dbb_status='payment_review',dbb_updated_at=now() where dbb_id=dbb_p_order_id;
  insert into public.dbb_order_events(dbb_order_id,dbb_status,dbb_note) values(dbb_p_order_id,'payment_review','Dekont inceleniyor; banka girişi ayrıca kontrol edilecek');
  return dbb_claim_id;
end; $$;
revoke all on function public.dbb_submit_payment(uuid,text,text) from public, anon;
grant execute on function public.dbb_submit_payment(uuid,text,text) to authenticated;

create function public.dbb_review_payment(dbb_p_claim_id uuid, dbb_p_approve boolean, dbb_p_bank_reference text, dbb_p_note text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare dbb_claim public.dbb_payment_claims%rowtype; dbb_next text;
begin
  if not exists (select 1 from public.dbb_admins where dbb_user_id=auth.uid()) then raise exception 'Yetkisiz'; end if;
  select * into dbb_claim from public.dbb_payment_claims where dbb_id=dbb_p_claim_id and dbb_status='pending' for update;
  if not found then raise exception 'Bekleyen dekont bulunamadı'; end if;
  if dbb_p_approve and length(trim(dbb_p_bank_reference)) < 5 then raise exception 'Banka işlem referansı zorunlu'; end if;
  dbb_next := case when dbb_p_approve then 'searching_courier' else 'payment_pending' end;
  update public.dbb_payment_claims set dbb_status=case when dbb_p_approve then 'approved' else 'rejected' end,
    dbb_bank_reference=case when dbb_p_approve then trim(dbb_p_bank_reference) else null end,
    dbb_review_note=left(dbb_p_note,300),dbb_reviewed_at=now() where dbb_id=dbb_p_claim_id;
  update public.dbb_orders set dbb_status=dbb_next,dbb_updated_at=now() where dbb_id=dbb_claim.dbb_order_id and dbb_status='payment_review';
  insert into public.dbb_order_events(dbb_order_id,dbb_status,dbb_note) values(dbb_claim.dbb_order_id,dbb_next,
    case when dbb_p_approve then 'Banka transferi manuel doğrulandı' else 'Ödeme doğrulanamadı: ' || left(dbb_p_note,180) end);
end; $$;
revoke all on function public.dbb_review_payment(uuid,boolean,text,text) from public, anon;
grant execute on function public.dbb_review_payment(uuid,boolean,text,text) to authenticated;

create function public.dbb_accept_order(dbb_p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.dbb_courier_profiles where dbb_user_id=auth.uid() and dbb_approved) then raise exception 'Kurye hesabı onaylanmadı'; end if;
  update public.dbb_orders set dbb_status='store_trip',dbb_courier_id=auth.uid(),dbb_updated_at=now()
    where dbb_id=dbb_p_order_id and dbb_status='searching_courier' and dbb_courier_id is null;
  if not found then raise exception 'Sipariş artık uygun değil'; end if;
  insert into public.dbb_order_events(dbb_order_id,dbb_status,dbb_note) values(dbb_p_order_id,'store_trip','Kurye siparişi kabul etti');
end; $$;
revoke all on function public.dbb_accept_order(uuid) from public, anon;
grant execute on function public.dbb_accept_order(uuid) to authenticated;

create function public.dbb_advance_order(dbb_p_order_id uuid, dbb_p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare dbb_order public.dbb_orders%rowtype; dbb_next_stop integer;
begin
  select * into dbb_order from public.dbb_orders where dbb_id=dbb_p_order_id and dbb_courier_id=auth.uid() for update;
  if not found then raise exception 'Atanmış sipariş yok'; end if;
  if not ((dbb_order.dbb_status='store_trip' and dbb_p_status='shopping') or
          (dbb_order.dbb_status='shopping' and dbb_p_status='store_trip' and dbb_order.dbb_stop_index + 1 < cardinality(dbb_order.dbb_route_store_ids)) or
          (dbb_order.dbb_status='shopping' and dbb_p_status='delivery' and dbb_order.dbb_stop_index + 1 = cardinality(dbb_order.dbb_route_store_ids)) or
          (dbb_order.dbb_status='delivery' and dbb_p_status='delivered')) then raise exception 'Geçersiz durum geçişi'; end if;
  if dbb_order.dbb_status='shopping' and exists
    (select 1 from public.dbb_order_items where dbb_order_id=dbb_p_order_id and
      dbb_store_id=dbb_order.dbb_route_store_ids[dbb_order.dbb_stop_index + 1] and dbb_pick_status='pending') then
    raise exception 'Bu mağazadaki ürünleri işaretleyin'; end if;
  dbb_next_stop := dbb_order.dbb_stop_index + case when dbb_order.dbb_status='shopping' and dbb_p_status='store_trip' then 1 else 0 end;
  update public.dbb_orders set dbb_status=dbb_p_status,dbb_stop_index=dbb_next_stop,dbb_updated_at=now() where dbb_id=dbb_p_order_id;
  insert into public.dbb_order_events(dbb_order_id,dbb_status,dbb_note) values(dbb_p_order_id,dbb_p_status,'Kurye ilerleme kaydetti');
end; $$;
revoke all on function public.dbb_advance_order(uuid,text) from public, anon;
grant execute on function public.dbb_advance_order(uuid,text) to authenticated;

create function public.dbb_mark_item(dbb_p_item_id uuid, dbb_p_status text, dbb_p_actual_price_kurus integer default null)
returns void language plpgsql security definer set search_path = '' as $$
declare dbb_order public.dbb_orders%rowtype; dbb_item public.dbb_order_items%rowtype;
begin
  select * into dbb_item from public.dbb_order_items where dbb_id=dbb_p_item_id for update;
  select * into dbb_order from public.dbb_orders where dbb_id=dbb_item.dbb_order_id and dbb_courier_id=auth.uid()
    and dbb_status='shopping' for update;
  if not found or dbb_item.dbb_store_id <> dbb_order.dbb_route_store_ids[dbb_order.dbb_stop_index + 1] then raise exception 'Bu mağazada ürün işaretlenemez'; end if;
  if dbb_p_status not in ('found','missing') then raise exception 'Geçersiz ürün durumu'; end if;
  if dbb_p_status='found' and (dbb_p_actual_price_kurus is null or dbb_p_actual_price_kurus < 1 or
    dbb_p_actual_price_kurus > dbb_item.dbb_unit_price_kurus + dbb_order.dbb_price_tolerance_kurus) then
    raise exception 'Fiyat limiti aşıldı; müşteri onayı gerekli'; end if;
  update public.dbb_order_items set dbb_pick_status=dbb_p_status,
    dbb_actual_price_kurus=case when dbb_p_status='found' then dbb_p_actual_price_kurus else null end where dbb_id=dbb_p_item_id;
end; $$;
revoke all on function public.dbb_mark_item(uuid,text,integer) from public, anon;
grant execute on function public.dbb_mark_item(uuid,text,integer) to authenticated;

create function public.dbb_publish_location(dbb_p_order_id uuid, dbb_p_lat numeric, dbb_p_lon numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if dbb_p_lat not between 39.7 and 40.3 or dbb_p_lon not between 32.4 and 33.4 then raise exception 'Konum Ankara dışı'; end if;
  if not exists (select 1 from public.dbb_orders where dbb_id=dbb_p_order_id and dbb_courier_id=auth.uid()
    and dbb_status in ('store_trip','shopping','delivery')) then raise exception 'Aktif görev bulunamadı'; end if;
  insert into public.dbb_order_locations(dbb_order_id,dbb_courier_id,dbb_lat,dbb_lon)
  values(dbb_p_order_id,auth.uid(),dbb_p_lat,dbb_p_lon)
  on conflict(dbb_order_id) do update set dbb_lat=excluded.dbb_lat,dbb_lon=excluded.dbb_lon,dbb_updated_at=now();
end; $$;
revoke all on function public.dbb_publish_location(uuid,numeric,numeric) from public, anon;
grant execute on function public.dbb_publish_location(uuid,numeric,numeric) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('dbb_receipts','dbb_receipts',false,5242880,array['image/jpeg','image/png'])
on conflict(id) do nothing;
create policy dbb_receipts_owner_upload on storage.objects for insert to authenticated with check
  (bucket_id='dbb_receipts' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy dbb_receipts_owner_read on storage.objects for select to authenticated using
  (bucket_id='dbb_receipts' and ((storage.foldername(name))[1]=(select auth.uid())::text or
    exists (select 1 from public.dbb_admins where dbb_user_id=(select auth.uid()))));

-- Realtime events are delivered only to participants through their RLS policies.
alter publication supabase_realtime add table public.dbb_orders, public.dbb_order_items,
  public.dbb_order_events, public.dbb_messages, public.dbb_order_locations;
