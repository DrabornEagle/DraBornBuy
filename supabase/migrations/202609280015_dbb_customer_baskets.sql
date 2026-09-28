-- Customer basket shared by the Android and web clients. No other project
-- table or permission is changed.
create table public.dbb_baskets (
  dbb_user_id uuid primary key references auth.users(id) on delete cascade,
  dbb_items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(dbb_items) = 'array' and jsonb_array_length(dbb_items) <= 60),
  dbb_updated_at timestamptz not null default now()
);

create function public.dbb_basket_touch() returns trigger language plpgsql as $$
begin
  new.dbb_updated_at := now();
  return new;
end;
$$;
create trigger dbb_baskets_touch before insert or update on public.dbb_baskets
for each row execute function public.dbb_basket_touch();

alter table public.dbb_baskets enable row level security;
grant select,insert,update on public.dbb_baskets to authenticated;
create policy dbb_baskets_own_select on public.dbb_baskets for select to authenticated
  using (dbb_user_id = (select auth.uid()));
create policy dbb_baskets_own_insert on public.dbb_baskets for insert to authenticated
  with check (dbb_user_id = (select auth.uid()));
create policy dbb_baskets_own_update on public.dbb_baskets for update to authenticated
  using (dbb_user_id = (select auth.uid()))
  with check (dbb_user_id = (select auth.uid()));
