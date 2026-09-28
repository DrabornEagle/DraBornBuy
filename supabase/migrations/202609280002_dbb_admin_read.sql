-- Operational queue access is restricted to explicitly registered DraBornBuy admins.
create policy dbb_orders_admin_read on public.dbb_orders for select to authenticated using
  (exists (select 1 from public.dbb_admins where dbb_user_id=(select auth.uid())));
create policy dbb_claims_admin_read on public.dbb_payment_claims for select to authenticated using
  (exists (select 1 from public.dbb_admins where dbb_user_id=(select auth.uid())));
create policy dbb_couriers_admin_read on public.dbb_courier_profiles for select to authenticated using
  (exists (select 1 from public.dbb_admins where dbb_user_id=(select auth.uid())));
grant update on public.dbb_courier_profiles to authenticated;
create policy dbb_couriers_admin_update on public.dbb_courier_profiles for update to authenticated
  using (exists (select 1 from public.dbb_admins where dbb_user_id=(select auth.uid())))
  with check (exists (select 1 from public.dbb_admins where dbb_user_id=(select auth.uid())));
