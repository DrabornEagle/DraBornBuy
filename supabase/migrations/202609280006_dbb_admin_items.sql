create policy dbb_items_admin_read on public.dbb_order_items for select to authenticated using
  (exists (select 1 from public.dbb_admins where dbb_user_id=(select auth.uid())));
