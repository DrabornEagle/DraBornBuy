-- Keep server-side order eligibility consistent with the availability label.
update public.dbb_offers set dbb_in_stock=false where dbb_availability='unavailable';

alter table public.dbb_offers drop constraint if exists dbb_offers_dbb_availability_check;
alter table public.dbb_offers add constraint dbb_offers_dbb_availability_check
  check (dbb_availability in ('confirmed','unknown','unavailable'));

alter table public.dbb_offers drop constraint if exists dbb_offers_unavailable_not_in_stock;
alter table public.dbb_offers add constraint dbb_offers_unavailable_not_in_stock
  check (dbb_availability <> 'unavailable' or dbb_in_stock=false);
