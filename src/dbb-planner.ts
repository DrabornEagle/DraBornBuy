import type { Dbb_BasketItem, Dbb_Coordinates, Dbb_Offer, Dbb_Product } from './dbb-model';
import { dbb_optimize } from './dbb-optimizer';
import type { Dbb_Config } from './dbb-api';

// Match product names only. The category "Kahvaltılık" appears on every row and
// must never make one product satisfy all six breakfast essentials.
const dbb_essentials = [
  /(?:^|\s)yumurta(?:\s|$)/,
  /peynir/,
  /(?:^|\s)zeytin(?:\s|$)/,
  /ekmek|simit/,
  /(?:^|\s)s[uü]t(?:\s|$)/,
  /(?:^|\s)[cç]ay(?:\s|$)/,
];

/** Only verified branch offers can produce a delivered-budget recommendation. */
export function dbb_breakfast_under_budget(dbb_products: Dbb_Product[], dbb_offers: Dbb_Offer[], dbb_home: Dbb_Coordinates, dbb_limit_kurus: number, dbb_fees?: Dbb_Config): Dbb_BasketItem[] {
  const dbb_confirmed=dbb_offers.filter(dbb_offer=>dbb_offer.dbb_verified && dbb_offer.dbb_in_stock && dbb_offer.dbb_availability==='confirmed');
  let dbb_basket: Dbb_BasketItem[] = [];
  for (const dbb_match of dbb_essentials) {
    const dbb_candidates = dbb_products.filter(dbb_item => dbb_match.test(dbb_item.dbb_name.toLocaleLowerCase('tr-TR')) &&
      !dbb_basket.some(dbb_saved => dbb_saved.dbb_product_id === dbb_item.dbb_id) &&
      dbb_confirmed.some(dbb_offer => dbb_offer.dbb_product_id === dbb_item.dbb_id))
      .sort((dbb_a,dbb_b) => Math.min(...dbb_confirmed.filter(dbb_o=>dbb_o.dbb_product_id===dbb_a.dbb_id).map(dbb_o=>dbb_o.dbb_price_kurus)) -
        Math.min(...dbb_confirmed.filter(dbb_o=>dbb_o.dbb_product_id===dbb_b.dbb_id).map(dbb_o=>dbb_o.dbb_price_kurus))).slice(0,12);
    let dbb_best: {dbb_item:Dbb_BasketItem;dbb_total:number} | null = null;
    for (const dbb_product of dbb_candidates) {
      const dbb_item={dbb_product_id:dbb_product.dbb_id,dbb_quantity:1};
      const dbb_quote=dbb_optimize([...dbb_basket,dbb_item],dbb_confirmed,dbb_home,dbb_fees).dbb_best;
      if (dbb_quote && dbb_quote.dbb_total<=dbb_limit_kurus && (!dbb_best || dbb_quote.dbb_total<dbb_best.dbb_total))
        dbb_best={dbb_item,dbb_total:dbb_quote.dbb_total};
    }
    if (dbb_best) dbb_basket=[...dbb_basket,dbb_best.dbb_item];
  }
  if (dbb_basket.length) return dbb_basket;
  // Some catalogs have no exact essentials. Offer a real priced breakfast item
  // instead of an empty tap response, while keeping the delivered budget cap.
  for (const dbb_product of dbb_products.filter(dbb_item=>dbb_item.dbb_category==='Kahvaltılık' &&
    dbb_confirmed.some(dbb_offer=>dbb_offer.dbb_product_id===dbb_item.dbb_id))) {
    const dbb_item={dbb_product_id:dbb_product.dbb_id,dbb_quantity:1};
    const dbb_quote=dbb_optimize([dbb_item],dbb_confirmed,dbb_home,dbb_fees).dbb_best;
    if (dbb_quote && dbb_quote.dbb_total<=dbb_limit_kurus) return [dbb_item];
  }
  return [];
}

/** A product list without a price or stock promise when branch data is missing. */
export function dbb_breakfast_draft(dbb_products:Dbb_Product[]):Dbb_BasketItem[] {
  const dbb_used=new Set<string>();
  return dbb_essentials.flatMap(dbb_match=>{
    const dbb_product=dbb_products.find(dbb_item=>!dbb_used.has(dbb_item.dbb_id) &&
      dbb_match.test(dbb_item.dbb_name.toLocaleLowerCase('tr-TR')) &&
      !/kinder|sürpriz|surprise/i.test(dbb_item.dbb_name));
    if (!dbb_product) return [];
    dbb_used.add(dbb_product.dbb_id);
    return [{dbb_product_id:dbb_product.dbb_id,dbb_quantity:1}];
  });
}

export function dbb_search_text(dbb_value: string): string {
  if (!/^https?:\/\//i.test(dbb_value.trim())) return dbb_value;
  try {
    const dbb_url = new URL(dbb_value.trim());
    return decodeURIComponent(`${dbb_url.pathname.split('/').filter(Boolean).pop() || ''} ${dbb_url.searchParams.get('q') || ''}`)
      .replace(/\d{7,}/g,' ').replace(/[-_/+]+/g,' ').replace(/\s+/g,' ').trim();
  } catch { return dbb_value; }
}
