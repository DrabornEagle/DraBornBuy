// Scheduled discovery of public product catalog details from Altunbilekler.
// It never imports a price, branch stock, or an order-ready offer.
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const dbb_sources = [
  ['kahvaltilik','Kahvaltılık'],['bal-recel','Kahvaltılık'],
  ['misir-gevregi-yulaf','Kahvaltılık'],['icecekler','İçecek'],
  ['yemeklik-malzemeler','Temel gıda'],['temizlik','Temizlik'],
  ['kisisel-bakim','Kişisel bakım']
] as const;

function dbb_text(value: string): string {
  return value.replace(/<[^>]*>/g,'').replace(/&#(\d+);/g,(_,number)=>String.fromCodePoint(Number(number)))
    .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&nbsp;/g,' ')
    .replace(/\\+/g,' ').replace(/\s+/g,' ').trim();
}

export function dbb_extract_products(html: string, category: string) {
  const products: Record<string,unknown>[] = [];
  const parts = html.matchAll(/<div\s+class=["']productImage["'][^>]*>([\s\S]*?)<div\s+class=["']productName detailUrl["'][^>]*>([\s\S]*?)<\/div>/g);
  for (const match of parts) {
    const imageBlock = match[1], nameBlock = match[2];
    const id = imageBlock.match(/data-id=["'](\d+)["']/)?.[1];
    const href = imageBlock.match(/href=["'](\/[^"']+)["']/)?.[1];
    const image = imageBlock.match(/data-original=["'](https:\/\/static\.ticimax\.cloud\/11108\/Uploads\/UrunResimleri\/[^"']+)["']/)?.[1]
      || imageBlock.match(/src=["'](https:\/\/static\.ticimax\.cloud\/11108\/Uploads\/UrunResimleri\/[^"']+)["']/)?.[1];
    const name = dbb_text(nameBlock);
    const brand = dbb_text(match[0].match(/<div\s+class=["']productMarka["'][^>]*>([\s\S]*?)<\/div>/)?.[1] || '');
    if (!id || !href || !image || name.length < 3 || name.length > 160) continue;
    const size = name.match(/\b\d+(?:[.,]\d+)?\s*(?:kg|gr|g|lt|l|ml|adet|li|lü)\b/i)?.[0] || '';
    products.push({ dbb_external_key:`altunbilekler:${id}`,dbb_name:name,dbb_brand:brand.slice(0,100),
      dbb_size:size,dbb_category:category,dbb_image_url:image,dbb_source_url:`https://www.altunbilekler.com${href}`,
      dbb_source_merchant:'Altunbilekler',dbb_last_seen_at:new Date().toISOString(),dbb_active:true });
  }
  return products;
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
  const seen=new Set<string>();
  for (const [path,category] of dbb_sources) {
    try {
      const response=await fetch(`https://www.altunbilekler.com/${path}`,{
        headers:{'User-Agent':'DraBornBuy-Catalog/1.0 (+https://github.com/DrabornEagle/DraBornBuy)'},
        signal:AbortSignal.timeout(12000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body=await response.text();
      if (body.length>3000000) throw new Error('Oversized source page');
      const products=dbb_extract_products(body,category).filter(product=>{
        const id=String(product.dbb_external_key);
        if (seen.has(id)) return false;
        seen.add(id);return true;
      }).slice(0,250);
      if (!products.length) throw new Error('No product cards found');
      for (let i=0;i<products.length;i+=50) {
        const {error}=await dbb.from('dbb_products').upsert(products.slice(i,i+50),{onConflict:'dbb_external_key'});
        if (error) throw error;
        discovered+=Math.min(50,products.length-i);
      }
    } catch(error) {failed++;errors.push(`${path}: ${String((error as Error).message).slice(0,90)}`);}
  }
  const status=discovered ? failed ? 'partial':'success':'failed';
  await dbb.from('dbb_sync_runs').update({dbb_finished_at:new Date().toISOString(),
    dbb_discovered:discovered,dbb_status:status,dbb_error:errors.join('; ').slice(0,1000)}).eq('dbb_id',run.dbb_id);
  return Response.json({status,discovered,failed});
});
