-- Public client Mapbox token is supplied from live configuration rather than committed source.
alter table public.dbb_config
  add column if not exists dbb_mapbox_public_token text not null default '';
