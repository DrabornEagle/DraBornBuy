import type { Dbb_BasketItem, Dbb_Coordinates, Dbb_Offer, Dbb_Product } from './dbb-model';
import { dbb_optimize } from './dbb-optimizer';

/** A deterministic starter list. This is deliberately not labeled as an AI recommendation. */
export function dbb_breakfast_under_budget(dbb_products: Dbb_Product[], dbb_offers: Dbb_Offer[], dbb_home: Dbb_Coordinates, dbb_limit_kurus: number): Dbb_BasketItem[] {
  const dbb_desired = ['ekmek','yumurta','süt','peynir','zeytin','çay'];
  let dbb_basket: Dbb_BasketItem[] = [];
  for (const dbb_term of dbb_desired) {
    const dbb_product = dbb_products.find(dbb_item => `${dbb_item.dbb_name} ${dbb_item.dbb_category}`.toLocaleLowerCase('tr-TR').includes(dbb_term));
    if (!dbb_product) continue;
    const dbb_candidate = [...dbb_basket, { dbb_product_id:dbb_product.dbb_id, dbb_quantity:1 }];
    const dbb_quote = dbb_optimize(dbb_candidate,dbb_offers,dbb_home).dbb_best;
    if (dbb_quote && dbb_quote.dbb_total <= dbb_limit_kurus) dbb_basket = dbb_candidate;
  }
  return dbb_basket;
}

export function dbb_search_text(dbb_value: string): string {
  if (!/^https?:\/\//i.test(dbb_value.trim())) return dbb_value;
  try {
    const dbb_url = new URL(dbb_value.trim());
    return decodeURIComponent(`${dbb_url.pathname.split('/').filter(Boolean).pop() || ''} ${dbb_url.searchParams.get('q') || ''}`)
      .replace(/\d{7,}/g,' ').replace(/[-_/+]+/g,' ').replace(/\s+/g,' ').trim();
  } catch { return dbb_value; }
}
