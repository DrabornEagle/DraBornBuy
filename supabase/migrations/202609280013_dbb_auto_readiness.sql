-- Remember the founder's existing request to open orders, and let the DB
-- continually derive operational readiness instead of requiring a save tap.
alter table public.dbb_config
  add column dbb_requested_enabled boolean not null default false;
update public.dbb_config set dbb_requested_enabled=true where dbb_key='ankara';

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
        where dbb_o.dbb_verified and dbb_o.dbb_in_stock and dbb_s.dbb_active
          and dbb_p.dbb_active
          and dbb_o.dbb_checked_at >= now() - dbb_c.dbb_max_age_hours * interval '1 hour'
      )
      and exists (select 1 from public.dbb_courier_profiles where dbb_approved)
    where dbb_c.dbb_key='ankara';
  $dbb$
);
