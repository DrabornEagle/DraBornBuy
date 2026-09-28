import type { Dbb_BasketItem, Dbb_Coordinates, Dbb_Offer, Dbb_Product } from './dbb-model';
import { dbb_optimize } from './dbb-optimizer';
import type { Dbb_Config } from './dbb-api';

/** A deterministic starter list. This is deliberately not labeled as an AI recommendation. */
export function dbb_breakfast_under_budget(dbb_products: Dbb_Product[], dbb_offers: Dbb_Offer[], dbb_home: Dbb_Coordinates, dbb_limit_kurus: number, dbb_fees?: Dbb_Config): Dbb_BasketItem[] {
  const dbb_desired = ['ekmek','yumurta','süt','peynir','zeytin','çay','tereyağ','reçel','bal'];
  const dbb_orderable_product_ids = new Set(dbb_offers.filter(dbb_offer => dbb_offer.dbb_in_stock && dbb_offer.dbb_availability !== 'unavailable').map(dbb_offer => dbb_offer.dbb_product_id));
  let dbb_basket: Dbb_BasketItem[] = [];

  for (const dbb_term of dbb_desired) {
    const dbb_candidates = dbb_products.filter(dbb_item =>
      dbb_orderable_product_ids.has(dbb_item.dbb_id) &&
      `${dbb_item.dbb_name} ${dbb_item.dbb_category}`.toLocaleLowerCase('tr-TR').includes(dbb_term)
    );
    let dbb_best_basket: Dbb_BasketItem[] | null = null;
    let dbb_best_total = Number.POSITIVE_INFINITY;
    for (const dbb_product of dbb_candidates) {
      const dbb_candidate = [...dbb_basket, { dbb_product_id:dbb_product.dbb_id, dbb_quantity:1 }];
      const dbb_quote = dbb_optimize(dbb_candidate,dbb_offers,dbb_home,dbb_fees).dbb_best;
      if (dbb_quote && dbb_quote.dbb_total <= dbb_limit_kurus && dbb_quote.dbb_total < dbb_best_total) {
        dbb_best_total = dbb_quote.dbb_total;
        dbb_best_basket = dbb_candidate;
      }
    }
    if (dbb_best_basket) dbb_basket = dbb_best_basket;
  }

  if (dbb_basket.length) return dbb_basket;

  const dbb_fallbacks = dbb_products.filter(dbb_product =>
    dbb_product.dbb_category === 'Kahvaltılık' && dbb_orderable_product_ids.has(dbb_product.dbb_id)
  );
  for (const dbb_product of dbb_fallbacks) {
    const dbb_candidate = [...dbb_basket, { dbb_product_id:dbb_product.dbb_id, dbb_quantity:1 }];
    const dbb_quote = dbb_optimize(dbb_candidate,dbb_offers,dbb_home,dbb_fees).dbb_best;
    if (dbb_quote && dbb_quote.dbb_total <= dbb_limit_kurus) dbb_basket = dbb_candidate;
    if (dbb_basket.length >= 6) break;
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
