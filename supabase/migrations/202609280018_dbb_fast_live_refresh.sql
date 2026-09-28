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
