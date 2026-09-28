// Scheduled discovery of public product catalog and online reference data.
// Public list prices are stored separately from physical branch availability.
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

export function dbb_parse_detail(html: string, sourceUrl: string) {
  const rest = html.split('var productDetailModel = ')[1];
  let end = -1,depth=0,inside=false,escaped=false;
  if (rest?.[0] === '{') for (let index=0;index<rest.length;index++) {
    const character=rest[index];
    if (escaped) {escaped=false;continue;}
    if (inside && character==='\\') {escaped=true;continue;}
    if (character==='"') {inside=!inside;continue;}
    if (inside) continue;
    if (character==='{') depth++;
    if (character==='}' && --depth===0) {end=index+1;break;}
  }
  const raw=end>0?rest.slice(0,end):'';
  if (!raw || raw.length > 250000) return null;
  const detail = JSON.parse(raw) as Record<string,unknown>;
  const product = (detail.product || {}) as Record<string,unknown>;
  const images = (detail.productImages || []) as {bigImagePath?:string}[];
  const id = Number(detail.productId);
  const name = String(detail.productName || '').trim();
  const image = images[0]?.bigImagePath || html.match(/<meta property="og:image"[^>]*content="([^"]+)"/)?.[1] || '';
  const price = Number(detail.productPriceKDVIncluded);
  const onlineInStock = Number(detail.totalStockAmount) > 0;
  const barcode = String(product.barkod || '').trim();
  if (!Number.isInteger(id) || !name || name.length > 160 ||
      !image.startsWith('https://static.ticimax.cloud/') ||
      !sourceUrl.startsWith('https://www.altunbilekler.com/')) return null;
  const lower = name.toLocaleLowerCase('tr-TR');
  const category = /deterjan|yumuşatıcı|sabun|tuvalet kağıdı|havlu|bulaşık|temizleyici/.test(lower) ? 'Temizlik' :
    /şampuan|diş macunu|deodorant|bebek bezi/.test(lower) ? 'Kişisel bakım' :
    /tavuk|dana|köfte|sucuk|kıyma|balık/.test(lower) ? 'Et ve tavuk' :
    /tereyağ/.test(lower) ? 'Kahvaltılık' :
    /pirinç|bulgur|makarna|(?:^|\s)un(?:\s|$)|yağ|yag|salça|şeker|bakliyat/.test(lower) ? 'Temel gıda' :
    /simit|ekmek|peynir|yumurta|tereyağ|reçel|kahvaltı|fındık krem|(?:^|\s)(?:zeytin|süt|sut|çay|cay|bal)(?:\s|$)/.test(lower) ? 'Kahvaltılık' :
    /kola|gazoz|(?:^|\s)su(?:\s|$)|maden|meyve suyu|içecek|kahve/.test(lower) ? 'İçecek' : 'Market';
  const now = new Date().toISOString();
  return {dbb_external_key:`altunbilekler:${id}`,dbb_name:name,
    dbb_brand:String(detail.brandName || '').slice(0,100),
    dbb_size:name.match(/\b\d+(?:[.,]\d+)?\s*(?:kg|gr|g|lt|l|ml|adet|li|lü)\b/i)?.[0] || '',
    dbb_category:category,dbb_image_url:image,dbb_source_url:sourceUrl,
    dbb_source_merchant:'Altunbilekler',dbb_last_seen_at:now,dbb_active:true,
    ...(barcode && /^\d{8,14}$/.test(barcode) ? {dbb_barcode:barcode}:{}),
    dbb_catalog_price_kurus:Number.isFinite(price) && price > 0 ? Math.round(price*100) : null,
    dbb_catalog_in_stock:onlineInStock,dbb_catalog_checked_at:now};
}

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method not allowed',{status:405});
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return new Response('Server configuration missing',{status:500});
  const dbb = createClient(url,key,{auth:{persistSession:false}});
  const {data:guard,error:guardError} = await dbb.from('dbb_sync_guard').select('dbb_token').eq('dbb_key','catalog').single();
  if (guardError || !guard || req.headers.get('X-DBB-Sync-Token') !== guard.dbb_token)
    return new Response('Unauthorized',{status:401});
  const {data:run,error:runError} = await dbb.from('dbb_sync_runs').insert({dbb_provider:'altunbilekler'}).select('dbb_id').single();
  if (runError) return new Response('Sync log unavailable',{status:500});
  let discovered=0,failed=0;
  const errors:string[]=[];
  try {
    const {data:cursor,error:cursorError}=await dbb.from('dbb_catalog_cursor')
      .select('dbb_position').eq('dbb_source','altunbilekler').single();
    if (cursorError || !cursor) throw new Error('Catalog cursor unavailable');
    const sitemapIndex=await fetch('https://www.altunbilekler.com/sitemap.xml',
      {headers:{'User-Agent':'DraBornBuy-Catalog/1.2'},signal:AbortSignal.timeout(12000)});
    if (!sitemapIndex.ok) throw new Error('Sitemap unavailable');
    const maps=[...(await sitemapIndex.text()).matchAll(/<loc>(https:\/\/www\.altunbilekler\.com\/sitemap\/products\/\d+\.xml)<\/loc>/g)]
      .map(match=>match[1]);
    if (!maps.length) throw new Error('No product sitemaps');
    const page=Math.floor(cursor.dbb_position/500)%maps.length;
    const sitemap=await fetch(maps[page],{headers:{'User-Agent':'DraBornBuy-Catalog/1.2'},signal:AbortSignal.timeout(12000)});
    if (!sitemap.ok) throw new Error('Product sitemap unavailable');
    const links=[...(await sitemap.text()).matchAll(/<loc>(https:\/\/www\.altunbilekler\.com\/[^<]+)<\/loc>/g)]
      .map(match=>match[1].replaceAll('&amp;','&'));
    const offset=cursor.dbb_position%500;
    const targets=links.slice(offset,offset+24);
    if (!targets.length) throw new Error('No products at sitemap cursor');
    const next=offset+targets.length>=links.length ? ((page+1)%maps.length)*500 : cursor.dbb_position+targets.length;
    const {data:claim,error:claimError}=await dbb.from('dbb_catalog_cursor')
      .update({dbb_position:next,dbb_updated_at:new Date().toISOString()})
      .eq('dbb_source','altunbilekler').eq('dbb_position',cursor.dbb_position).select('dbb_position');
    if (claimError || !claim?.length) throw new Error('Concurrent crawl claimed the batch');
    for (let start=0;start<targets.length;start+=6) {
      const results=await Promise.allSettled(targets.slice(start,start+6).map(async target=>{
        const response=await fetch(target,{headers:{'User-Agent':'DraBornBuy-Catalog/1.2'},signal:AbortSignal.timeout(14000)});
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html=await response.text();
        if (html.length>750000) throw new Error('Oversized product page');
        return dbb_parse_detail(html,target);
      }));
      const products=results.flatMap((result,index)=>{
        if (result.status==='fulfilled' && result.value) return [result.value];
        failed++;
        if (errors.length<8) errors.push(`Product ${start+index}: ${result.status==='rejected'?String(result.reason).slice(0,50):'missing data'}`);
        return [];
      });
      if (products.length) {
        const {error}=await dbb.from('dbb_products').upsert(products,{onConflict:'dbb_external_key'});
        if (error) {
          const withoutBarcodes=products.map(({dbb_barcode,...rest})=>rest);
          const retry=await dbb.from('dbb_products').upsert(withoutBarcodes,{onConflict:'dbb_external_key'});
          if (retry.error) { failed+=products.length; errors.push(retry.error.message.slice(0,100)); }
          else discovered+=products.length;
        } else discovered+=products.length;
      }
    }
  } catch(error) {failed++;errors.push(`Sitemap: ${String((error as Error).message).slice(0,100)}`);}
  const status=discovered ? failed ? 'partial':'success':'failed';
  await dbb.from('dbb_sync_runs').update({dbb_finished_at:new Date().toISOString(),
    dbb_discovered:discovered,dbb_status:status,dbb_error:errors.join('; ').slice(0,1000)}).eq('dbb_id',run.dbb_id);
  return Response.json({status,discovered,failed});
});
