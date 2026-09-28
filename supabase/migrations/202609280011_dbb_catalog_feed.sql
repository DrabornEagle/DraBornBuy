-- Product metadata and online reference prices belong only to DraBornBuy.
-- Online availability is never used as evidence of stock in an Ankara branch.
alter table public.dbb_products
  add column dbb_catalog_price_kurus integer check (dbb_catalog_price_kurus > 0),
  add column dbb_catalog_in_stock boolean,
  add column dbb_catalog_checked_at timestamptz;

create table public.dbb_catalog_cursor (
  dbb_source text primary key check (dbb_source = 'altunbilekler'),
  dbb_position integer not null default 7000 check (dbb_position >= 0),
  dbb_updated_at timestamptz not null default now()
);
insert into public.dbb_catalog_cursor(dbb_source) values ('altunbilekler');
alter table public.dbb_catalog_cursor enable row level security;
grant select,update on public.dbb_catalog_cursor to service_role;

-- Keep a single scheduled crawl of modest batches; do not affect other jobs.
select cron.schedule('dbb_catalog_every_6h','17,47 * * * *',
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
