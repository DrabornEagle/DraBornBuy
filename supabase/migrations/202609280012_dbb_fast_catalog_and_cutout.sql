-- The published source sitemap is traversed in batches every five minutes.
select cron.unschedule('dbb_catalog_every_6h');
select cron.schedule('dbb_catalog_every_5m','*/5 * * * *',
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

-- This retailer's original Nutella PNG has a genuine alpha channel; the
-- packaging and label are unmodified. Other JPEGs remain source photographs.
update public.dbb_products set
  dbb_image_url='https://images.migrosone.com/macrocenter/product/07155709/07155709-f88e0b.png',
  dbb_source_url='https://www.macrocenter.com.tr/nutella-750-g-p-6d2ffd',
  dbb_source_merchant='Macrocenter'
where dbb_name='Nutella Kakaolu Fındık Kreması' and dbb_size='750 g'
  and dbb_external_key is null;
