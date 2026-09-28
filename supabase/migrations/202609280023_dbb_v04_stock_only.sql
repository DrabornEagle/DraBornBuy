-- DraBornBuy v0.4: customer catalog contains only fresh, source-confirmed online stock.
-- Physical Ankara branch checkout remains stricter and still requires a confirmed dbb_offer.
update public.dbb_products
set dbb_catalog_price_kurus = null
where dbb_catalog_in_stock is not true
  and dbb_catalog_price_kurus is not null;

create index if not exists dbb_products_live_catalog_idx
on public.dbb_products(dbb_catalog_checked_at desc)
where dbb_active
  and dbb_catalog_in_stock is true
  and dbb_catalog_price_kurus is not null;
