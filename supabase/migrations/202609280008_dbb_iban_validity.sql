-- Only DraBornBuy payment settings are constrained; a blank IBAN keeps ordering closed.
alter table public.dbb_config add constraint dbb_iban_checksum check (
  case when dbb_iban = '' then true
    when regexp_replace(upper(dbb_iban), '[[:space:]]', '', 'g') ~ '^TR[0-9]{24}$' then
      ((substring(regexp_replace(upper(dbb_iban), '[[:space:]]', '', 'g') from 5) || '2927' ||
        substring(regexp_replace(upper(dbb_iban), '[[:space:]]', '', 'g') from 3 for 2))::numeric % 97) = 1
    else false end
);
