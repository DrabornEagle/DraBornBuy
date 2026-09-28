-- Catalog-derived procurement estimates are not retailer partnerships.
alter table public.dbb_offers drop constraint if exists dbb_offers_dbb_source_check;
alter table public.dbb_offers add constraint dbb_offers_dbb_source_check
  check (dbb_source in ('manual','partner','receipt','catalog'));

update public.dbb_offers
set dbb_source='catalog'
where dbb_source='partner'
  and dbb_availability='unknown'
  and dbb_operator_note like 'Siparişe açık canlı katalog fiyatı%';

create or replace function public.dbb_refresh_catalog_procurement_offers()
returns integer language plpgsql security definer set search_path='' as $$
declare dbb_target_store_id uuid; dbb_changed integer:=0;
begin
  select dbb_id into dbb_target_store_id from public.dbb_stores
  where dbb_name='Altunbilekler Seyranbağları' order by dbb_created_at limit 1;
  if dbb_target_store_id is null then return 0; end if;

  insert into public.dbb_offers(
    dbb_store_id,dbb_product_id,dbb_price_kurus,dbb_in_stock,dbb_verified,
    dbb_source,dbb_checked_at,dbb_source_url,dbb_operator_note,dbb_availability)
  select dbb_target_store_id,dbb_p.dbb_id,dbb_p.dbb_catalog_price_kurus,true,true,
    'catalog',dbb_p.dbb_catalog_checked_at,dbb_p.dbb_source_url,
    'Siparişe açık canlı katalog fiyatı; fiziksel mağaza mevcudiyeti kurye tarafından teyit edilir.','unknown'
  from public.dbb_products dbb_p cross join public.dbb_config dbb_c
  where dbb_c.dbb_key='ankara' and dbb_p.dbb_active
    and dbb_p.dbb_source_merchant='Altunbilekler'
    and dbb_p.dbb_catalog_price_kurus is not null and dbb_p.dbb_catalog_price_kurus>0
    and dbb_p.dbb_catalog_checked_at>=now()-dbb_c.dbb_max_age_hours*interval '1 hour'
  on conflict(dbb_store_id,dbb_product_id) do update set
    dbb_price_kurus=excluded.dbb_price_kurus,dbb_in_stock=true,dbb_verified=true,
    dbb_source='catalog',dbb_checked_at=excluded.dbb_checked_at,
    dbb_source_url=excluded.dbb_source_url,dbb_operator_note=excluded.dbb_operator_note,
    dbb_availability='unknown';
  get diagnostics dbb_changed=row_count;
  return dbb_changed;
end; $$;

select public.dbb_refresh_catalog_procurement_offers();
