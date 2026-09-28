-- Courier receipts and manual post-delivery reconciliation, isolated to dbb_*.
create table public.dbb_shop_receipts (
  dbb_id uuid primary key default gen_random_uuid(),
  dbb_order_id uuid not null references public.dbb_orders(dbb_id) on delete cascade,
  dbb_store_id uuid not null references public.dbb_stores(dbb_id),
  dbb_courier_id uuid not null references auth.users(id),
  dbb_object_path text not null unique,
  dbb_created_at timestamptz not null default now(),
  unique(dbb_order_id,dbb_store_id)
);
create index dbb_shop_receipts_order_idx on public.dbb_shop_receipts(dbb_order_id);
create table public.dbb_settlements (
  dbb_order_id uuid primary key references public.dbb_orders(dbb_id) on delete cascade,
  dbb_actual_items_kurus integer not null check(dbb_actual_items_kurus>=0),
  dbb_actual_total_kurus integer not null check(dbb_actual_total_kurus>=0),
  dbb_difference_kurus integer not null,
  dbb_status text not null default 'pending' check(dbb_status in ('pending','completed')),
  dbb_reference text unique,
  dbb_note text not null default '',
  dbb_created_at timestamptz not null default now(),
  dbb_completed_at timestamptz
);
alter table public.dbb_shop_receipts enable row level security;
alter table public.dbb_settlements enable row level security;
revoke all on public.dbb_shop_receipts,public.dbb_settlements from public,anon,authenticated;
grant select on public.dbb_shop_receipts,public.dbb_settlements to authenticated;
create policy dbb_shop_receipts_participants on public.dbb_shop_receipts for select to authenticated using
  (exists (select 1 from public.dbb_orders dbb_o where dbb_o.dbb_id=dbb_order_id and
    (dbb_o.dbb_customer_id=(select auth.uid()) or dbb_o.dbb_courier_id=(select auth.uid()) or
     exists (select 1 from public.dbb_admins where dbb_user_id=(select auth.uid())))));
create policy dbb_settlements_participants on public.dbb_settlements for select to authenticated using
  (exists (select 1 from public.dbb_orders dbb_o where dbb_o.dbb_id=dbb_order_id and
    (dbb_o.dbb_customer_id=(select auth.uid()) or dbb_o.dbb_courier_id=(select auth.uid()) or
     exists (select 1 from public.dbb_admins where dbb_user_id=(select auth.uid())))));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('dbb_shop_receipts','dbb_shop_receipts',false,5242880,array['image/jpeg','image/png'])
on conflict(id) do nothing;
create policy dbb_shop_receipts_upload on storage.objects for insert to authenticated with check
  (bucket_id='dbb_shop_receipts' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy dbb_shop_receipts_read on storage.objects for select to authenticated using
  (bucket_id='dbb_shop_receipts' and
    ((storage.foldername(name))[1]=(select auth.uid())::text or
     exists (select 1 from public.dbb_admins where dbb_user_id=(select auth.uid())) or
     exists (select 1 from public.dbb_shop_receipts dbb_r join public.dbb_orders dbb_o on dbb_o.dbb_id=dbb_r.dbb_order_id
       where dbb_r.dbb_object_path=name and dbb_o.dbb_customer_id=(select auth.uid()))));

create function public.dbb_submit_shop_receipt(dbb_p_order_id uuid,dbb_p_store_id uuid,dbb_p_object_path text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare dbb_order public.dbb_orders%rowtype; dbb_receipt_id uuid;
begin
  select * into dbb_order from public.dbb_orders where dbb_id=dbb_p_order_id and dbb_courier_id=auth.uid() and dbb_status='shopping';
  if not found or dbb_order.dbb_route_store_ids[dbb_order.dbb_stop_index+1] <> dbb_p_store_id then
    raise exception 'Fiş bu mağaza durağına ait değil'; end if;
  if dbb_p_object_path not like auth.uid()::text || '/' || dbb_p_order_id::text || '/%' then raise exception 'Fiş yolu geçersiz'; end if;
  if not exists (select 1 from storage.objects where bucket_id='dbb_shop_receipts' and name=dbb_p_object_path) then
    raise exception 'Fiş dosyası bulunamadı'; end if;
  insert into public.dbb_shop_receipts(dbb_order_id,dbb_store_id,dbb_courier_id,dbb_object_path)
    values(dbb_p_order_id,dbb_p_store_id,auth.uid(),dbb_p_object_path) returning dbb_id into dbb_receipt_id;
  insert into public.dbb_order_events(dbb_order_id,dbb_status,dbb_note)
    values(dbb_p_order_id,'shopping','Mağaza fişi yüklendi');
  return dbb_receipt_id;
end; $$;
revoke all on function public.dbb_submit_shop_receipt(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.dbb_submit_shop_receipt(uuid,uuid,text) to authenticated;

create or replace function public.dbb_advance_order(dbb_p_order_id uuid, dbb_p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare dbb_order public.dbb_orders%rowtype; dbb_next_stop integer; dbb_current_store uuid;
begin
  select * into dbb_order from public.dbb_orders where dbb_id=dbb_p_order_id and dbb_courier_id=auth.uid() for update;
  if not found then raise exception 'Atanmış sipariş yok'; end if;
  if not ((dbb_order.dbb_status='store_trip' and dbb_p_status='shopping') or
          (dbb_order.dbb_status='shopping' and dbb_p_status='store_trip' and dbb_order.dbb_stop_index+1<cardinality(dbb_order.dbb_route_store_ids)) or
          (dbb_order.dbb_status='shopping' and dbb_p_status='delivery' and dbb_order.dbb_stop_index+1=cardinality(dbb_order.dbb_route_store_ids)) or
          (dbb_order.dbb_status='delivery' and dbb_p_status='delivered')) then raise exception 'Geçersiz durum geçişi'; end if;
  if dbb_order.dbb_status='shopping' then
    dbb_current_store := dbb_order.dbb_route_store_ids[dbb_order.dbb_stop_index+1];
    if exists (select 1 from public.dbb_order_items where dbb_order_id=dbb_p_order_id and
      dbb_store_id=dbb_current_store and dbb_pick_status='pending') then raise exception 'Bu mağazadaki ürünleri işaretleyin'; end if;
    if not exists (select 1 from public.dbb_shop_receipts where dbb_order_id=dbb_p_order_id and dbb_store_id=dbb_current_store) then
      raise exception 'Bu mağazanın fişini yükleyin'; end if;
  end if;
  dbb_next_stop := dbb_order.dbb_stop_index+case when dbb_order.dbb_status='shopping' and dbb_p_status='store_trip' then 1 else 0 end;
  update public.dbb_orders set dbb_status=dbb_p_status,dbb_stop_index=dbb_next_stop,dbb_updated_at=now() where dbb_id=dbb_p_order_id;
  insert into public.dbb_order_events(dbb_order_id,dbb_status,dbb_note) values(dbb_p_order_id,dbb_p_status,'Kurye ilerleme kaydetti');
end; $$;

create function public.dbb_reconcile_order(dbb_p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare dbb_order public.dbb_orders%rowtype; dbb_items_actual integer; dbb_actual_total integer; dbb_difference integer;
begin
  if not exists(select 1 from public.dbb_admins where dbb_user_id=auth.uid()) then raise exception 'Yetkisiz'; end if;
  select * into dbb_order from public.dbb_orders where dbb_id=dbb_p_order_id and dbb_status='delivered' for update;
  if not found then raise exception 'Teslim edilmiş sipariş bulunamadı'; end if;
  if exists(select 1 from public.dbb_order_items where dbb_order_id=dbb_p_order_id and dbb_pick_status='pending') then
    raise exception 'İşlenmemiş ürün var'; end if;
  if (select count(*) from public.dbb_shop_receipts where dbb_order_id=dbb_p_order_id) <> cardinality(dbb_order.dbb_route_store_ids) then
    raise exception 'Tüm mağaza fişleri gerekli'; end if;
  select coalesce(sum(dbb_actual_price_kurus*dbb_quantity) filter(where dbb_pick_status='found'),0)::integer
    into dbb_items_actual from public.dbb_order_items where dbb_order_id=dbb_p_order_id;
  dbb_actual_total := dbb_items_actual+dbb_order.dbb_courier_fee_kurus+dbb_order.dbb_service_fee_kurus+dbb_order.dbb_bag_fee_kurus;
  dbb_difference := dbb_actual_total-dbb_order.dbb_total_kurus;
  insert into public.dbb_settlements(dbb_order_id,dbb_actual_items_kurus,dbb_actual_total_kurus,dbb_difference_kurus)
    values(dbb_p_order_id,dbb_items_actual,dbb_actual_total,dbb_difference);
  update public.dbb_orders set dbb_status='reconciling',dbb_updated_at=now() where dbb_id=dbb_p_order_id;
  insert into public.dbb_order_events(dbb_order_id,dbb_status,dbb_note) values(dbb_p_order_id,'reconciling',
    case when dbb_difference<0 then 'Müşteriye iade: '||abs(dbb_difference)::text||' kuruş'
         when dbb_difference>0 then 'Ek ödeme: '||dbb_difference::text||' kuruş'
         else 'Fark yok' end);
  return jsonb_build_object('dbb_actual_total_kurus',dbb_actual_total,'dbb_difference_kurus',dbb_difference);
end; $$;
revoke all on function public.dbb_reconcile_order(uuid) from public,anon,authenticated;
grant execute on function public.dbb_reconcile_order(uuid) to authenticated;

create function public.dbb_finalize_order(dbb_p_order_id uuid,dbb_p_reference text default '',dbb_p_note text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare dbb_settlement public.dbb_settlements%rowtype;
begin
  if not exists(select 1 from public.dbb_admins where dbb_user_id=auth.uid()) then raise exception 'Yetkisiz'; end if;
  select * into dbb_settlement from public.dbb_settlements where dbb_order_id=dbb_p_order_id and dbb_status='pending' for update;
  if not found or not exists(select 1 from public.dbb_orders where dbb_id=dbb_p_order_id and dbb_status='reconciling') then
    raise exception 'Bekleyen mutabakat yok'; end if;
  if dbb_settlement.dbb_difference_kurus<>0 and length(trim(dbb_p_reference))<5 then
    raise exception 'İade veya ek ödeme için gerçek banka işlem referansı zorunlu'; end if;
  update public.dbb_settlements set dbb_status='completed',dbb_reference=nullif(trim(dbb_p_reference),''),
    dbb_note=left(dbb_p_note,300),dbb_completed_at=now() where dbb_order_id=dbb_p_order_id;
  update public.dbb_orders set dbb_status='completed',dbb_updated_at=now() where dbb_id=dbb_p_order_id;
  insert into public.dbb_order_events(dbb_order_id,dbb_status,dbb_note) values(dbb_p_order_id,'completed','Mutabakat manuel tamamlandı');
end; $$;
revoke all on function public.dbb_finalize_order(uuid,text,text) from public,anon,authenticated;
grant execute on function public.dbb_finalize_order(uuid,text,text) to authenticated;

alter publication supabase_realtime add table public.dbb_shop_receipts,public.dbb_settlements;
