-- Supabase's existing public-schema default privileges granted ALL to anon/authenticated.
-- Narrow privileges on DraBornBuy objects only; RLS remains an additional row-level boundary.
revoke all on public.dbb_config,public.dbb_stores,public.dbb_products,public.dbb_offers,
  public.dbb_admins,public.dbb_courier_profiles,public.dbb_saved_lists,public.dbb_orders,
  public.dbb_order_items,public.dbb_payment_claims,public.dbb_order_events,public.dbb_messages,
  public.dbb_order_locations from public,anon,authenticated;
grant select on public.dbb_config,public.dbb_stores,public.dbb_products,public.dbb_offers to anon,authenticated;
grant select on public.dbb_admins,public.dbb_courier_profiles,public.dbb_saved_lists,public.dbb_orders,
  public.dbb_order_items,public.dbb_payment_claims,public.dbb_order_events,public.dbb_messages,
  public.dbb_order_locations to authenticated;
grant insert on public.dbb_courier_profiles,public.dbb_saved_lists,public.dbb_messages to authenticated;
grant update,delete on public.dbb_saved_lists to authenticated;
grant update on public.dbb_courier_profiles to authenticated;
revoke all on sequence public.dbb_order_number_seq from public,anon,authenticated;

revoke all on function public.dbb_distance_km(numeric,numeric,numeric,numeric) from public,anon,authenticated;
revoke all on function public.dbb_route_distance(uuid[],numeric,numeric) from public,anon,authenticated;
revoke all on function public.dbb_create_order(jsonb,text,numeric,numeric,integer) from public,anon,authenticated;
revoke all on function public.dbb_submit_payment(uuid,text,text) from public,anon,authenticated;
revoke all on function public.dbb_review_payment(uuid,boolean,text,text) from public,anon,authenticated;
revoke all on function public.dbb_accept_order(uuid) from public,anon,authenticated;
revoke all on function public.dbb_advance_order(uuid,text) from public,anon,authenticated;
revoke all on function public.dbb_mark_item(uuid,text,integer) from public,anon,authenticated;
revoke all on function public.dbb_publish_location(uuid,numeric,numeric) from public,anon,authenticated;
grant execute on function public.dbb_create_order(jsonb,text,numeric,numeric,integer),
  public.dbb_submit_payment(uuid,text,text),public.dbb_review_payment(uuid,boolean,text,text),
  public.dbb_accept_order(uuid),public.dbb_advance_order(uuid,text),
  public.dbb_mark_item(uuid,text,integer),public.dbb_publish_location(uuid,numeric,numeric) to authenticated;
