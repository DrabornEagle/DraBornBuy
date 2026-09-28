-- DraBornBuy market directory and scheduled catalog discovery; no other application's objects change.
create table public.dbb_chains (
  dbb_slug text primary key,
  dbb_name text not null,
  dbb_source_url text not null check (dbb_source_url ~ '^https://'),
  dbb_created_at timestamptz not null default now()
);
insert into public.dbb_chains(dbb_slug,dbb_name,dbb_source_url) values
  ('a101','A101','https://www.a101.com.tr/en-yakin-magazalar'),
  ('bim','BİM','https://www.bim.com.tr/Categories/104/magazalar.aspx'),
  ('altunbilekler','Altunbilekler','https://www.altunbilekler.com/'),
  ('yunus','Yunus Market','https://www.yunusmarket.com.tr/magazalarimiz/ankara'),
  ('migros','Migros','https://www.migros.com.tr/en-yakin-migros'),
  ('carrefoursa','CarrefourSA','https://www.carrefoursa.com/'),
  ('sok','ŞOK','https://www.sokmarket.com.tr/');
alter table public.dbb_chains enable row level security;
grant select on public.dbb_chains to anon,authenticated;
create policy dbb_chains_read on public.dbb_chains for select to anon,authenticated using (true);

alter table public.dbb_products
  add column dbb_external_key text unique,
  add column dbb_source_merchant text not null default '',
  add column dbb_last_seen_at timestamptz;

create table public.dbb_sync_guard (
  dbb_key text primary key check(dbb_key='catalog'),
  dbb_token text not null
);
insert into public.dbb_sync_guard values ('catalog',encode(extensions.gen_random_bytes(32),'hex'));
alter table public.dbb_sync_guard enable row level security;
grant select on public.dbb_sync_guard to service_role;

create table public.dbb_sync_runs (
  dbb_id bigint generated always as identity primary key,
  dbb_provider text not null,
  dbb_started_at timestamptz not null default now(),
  dbb_finished_at timestamptz,
  dbb_discovered integer not null default 0,
  dbb_status text not null default 'running' check(dbb_status in ('running','success','partial','failed')),
  dbb_error text not null default ''
);
alter table public.dbb_sync_runs enable row level security;
grant select on public.dbb_sync_runs to authenticated,service_role;
grant insert,update on public.dbb_sync_runs to service_role;
create policy dbb_sync_runs_admin_read on public.dbb_sync_runs for select to authenticated using (
  exists(select 1 from public.dbb_admins where dbb_user_id=(select auth.uid()))
);

-- This token never enters the Expo client or repository. The job only calls this project's function.
select cron.schedule('dbb_catalog_every_6h','17 */6 * * *',
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
