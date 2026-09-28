-- Correct obvious category matches from early catalog batches. This touches
-- only automatically discovered DraBornBuy products; future scans use the
-- corresponding parser rules.
update public.dbb_products set dbb_category='Temizlik'
where dbb_external_key like 'altunbilekler:%'
  and dbb_category='Kahvaltılık'
  and dbb_name ~* 'sabun|deterjan|yumuşatıcı|bulaşık|havlu|temizleyici';

update public.dbb_products set dbb_category='Temel gıda'
where dbb_external_key like 'altunbilekler:%'
  and dbb_category='Kahvaltılık'
  and dbb_name ~* 'zeytin[[:space:]]*ya[ğg]|sıvı[[:space:]]*ya[ğg]|riviera|pirinç|bulgur|makarna';

update public.dbb_products set dbb_category='Kahvaltılık'
where dbb_external_key like 'altunbilekler:%'
  and dbb_category='Market'
  and dbb_name ~* 'simit|ekmek|peynir|yumurta|reçel|kahvaltı';
