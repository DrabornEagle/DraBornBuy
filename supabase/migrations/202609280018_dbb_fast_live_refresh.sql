-- Refresh catalog discovery and orderable procurement estimates every minute.
select cron.unschedule('dbb_catalog_every_5m');
select cron.schedule('dbb_catalog_every_1m','* * * * *',
  $dbb$
    select net.http_post(
      url := 'https://xpdiwyxnnrmyvpcqwuyb.supabase.co/functions/v1/dbb-catalog-sync',
      headers := jsonb_build_object('Content-Type','application/json','X-DBB-Sync-Token',
        (select dbb_token from public.dbb_sync_guard where dbb_key='catalog')),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $dbb$
);
select cron.schedule('dbb_procurement_offer_every_1m','* * * * *',
  'select public.dbb_refresh_catalog_procurement_offers();');

select public.dbb_refresh_catalog_procurement_offers();

update public.dbb_config dbb_c set dbb_enabled =
  dbb_c.dbb_requested_enabled
  and length(trim(dbb_c.dbb_bank_name)) >= 2
  and length(trim(dbb_c.dbb_account_holder)) >= 3
  and length(trim(dbb_c.dbb_iban)) = 26
  and exists(
    select 1 from public.dbb_offers dbb_o
    join public.dbb_stores dbb_s on dbb_s.dbb_id=dbb_o.dbb_store_id
    where dbb_o.dbb_verified and dbb_o.dbb_in_stock and dbb_s.dbb_active
      and dbb_o.dbb_checked_at >= now()-dbb_c.dbb_max_age_hours*interval '1 hour'
  )
  and exists(select 1 from public.dbb_courier_profiles where dbb_approved)
where dbb_c.dbb_key='ankara';
