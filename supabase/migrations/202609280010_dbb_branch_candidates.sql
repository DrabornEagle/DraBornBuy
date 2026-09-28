-- Official Ankara branch addresses, with Mapbox address-geocoded approximate coordinates.
-- These are operational candidates, deliberately inactive until a courier and branch offers are verified.
alter table public.dbb_stores add column dbb_source_url text not null default '';
insert into public.dbb_stores(dbb_name,dbb_address,dbb_lat,dbb_lon,dbb_active,dbb_source_url) values
('BİM İzmir Caddesi Mini','Kızılay Mah. İzmir 2 Cad. No:55/B Çankaya/Ankara',39.920272,32.850723,false,
 'https://www.bim.com.tr/Categories/104/magazalar.aspx?CityKey=6&CountyKey=1231'),
('Altunbilekler Seyranbağları','Göktürk Mh. Bağlar Cd. No:105/A Seyranbağları Çankaya/Ankara',39.912201,32.870222,false,
 'https://www.altunbilekler.com/magazalar'),
('Yunus Market Farabi','Çankaya Mah. Farabi Sokak 24/A-B Çankaya/Ankara',39.896682,32.858863,false,
 'https://www.yunusmarket.com.tr/magazalarimiz/ankara/farabi');
