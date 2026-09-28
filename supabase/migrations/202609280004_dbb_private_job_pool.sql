-- A courier can browse job summaries, but sees a customer's exact address only after accepting.
drop policy dbb_orders_participant on public.dbb_orders;
create policy dbb_orders_participant on public.dbb_orders for select to authenticated using
  (dbb_customer_id=(select auth.uid()) or dbb_courier_id=(select auth.uid()));

create function public.dbb_open_jobs()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare dbb_result jsonb;
begin
  if not exists (select 1 from public.dbb_courier_profiles where dbb_user_id=auth.uid() and dbb_approved) then
    return '[]'::jsonb;
  end if;
  select coalesce(jsonb_agg(dbb_job order by (dbb_job->>'dbb_created_at') desc),'[]'::jsonb) into dbb_result
  from (
    select jsonb_build_object('dbb_id',dbb_o.dbb_id,'dbb_code',dbb_o.dbb_code,
      'dbb_created_at',dbb_o.dbb_created_at,'dbb_courier_fee_kurus',dbb_o.dbb_courier_fee_kurus,
      'dbb_subtotal_kurus',dbb_o.dbb_subtotal_kurus,'dbb_store_count',cardinality(dbb_o.dbb_route_store_ids),
      'dbb_stops',(select coalesce(jsonb_agg(jsonb_build_object('dbb_name',dbb_s.dbb_name,
        'dbb_address',dbb_s.dbb_address,'dbb_lat',dbb_s.dbb_lat,'dbb_lon',dbb_s.dbb_lon) order by dbb_i.dbb_ordinal),'[]'::jsonb)
        from unnest(dbb_o.dbb_route_store_ids) with ordinality as dbb_i(dbb_id,dbb_ordinal)
        join public.dbb_stores dbb_s on dbb_s.dbb_id=dbb_i.dbb_id),
      'dbb_items',(select coalesce(jsonb_agg(jsonb_build_object('dbb_product_name',dbb_oi.dbb_product_name,
        'dbb_store_name',dbb_oi.dbb_store_name,'dbb_quantity',dbb_oi.dbb_quantity,
        'dbb_unit_price_kurus',dbb_oi.dbb_unit_price_kurus)),'[]'::jsonb)
        from public.dbb_order_items dbb_oi where dbb_oi.dbb_order_id=dbb_o.dbb_id)) as dbb_job
    from public.dbb_orders dbb_o where dbb_o.dbb_status='searching_courier'
    order by dbb_o.dbb_created_at desc limit 20
  ) dbb_cards;
  return dbb_result;
end; $$;
revoke all on function public.dbb_open_jobs() from public,anon,authenticated;
grant execute on function public.dbb_open_jobs() to authenticated;
