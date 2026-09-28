-- Online pages sometimes retain old prices after stock reaches zero.
-- Keep only purchasable online reference prices; branch offers are independent.
update public.dbb_products
set dbb_catalog_price_kurus = null
where dbb_source_merchant = 'Altunbilekler'
  and dbb_catalog_in_stock is not true
  and dbb_catalog_price_kurus is not null;
