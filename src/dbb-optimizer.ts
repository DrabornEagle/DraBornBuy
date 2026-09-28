import type { Dbb_Assignment, Dbb_BasketItem, Dbb_Coordinates, Dbb_Offer, Dbb_Quote, Dbb_Store } from './dbb-model';

export function dbb_distance_km(dbb_a: Dbb_Coordinates, dbb_b: Dbb_Coordinates): number {
  const dbb_radians = (dbb_degrees: number) => dbb_degrees * Math.PI / 180;
  const dbb_lat = dbb_radians(dbb_b.dbb_lat - dbb_a.dbb_lat);
  const dbb_lon = dbb_radians(dbb_b.dbb_lon - dbb_a.dbb_lon);
  const dbb_curve = Math.sin(dbb_lat / 2) ** 2 + Math.cos(dbb_radians(dbb_a.dbb_lat)) * Math.cos(dbb_radians(dbb_b.dbb_lat)) * Math.sin(dbb_lon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(dbb_curve), Math.sqrt(1 - dbb_curve));
}

export function dbb_route(dbb_stores: Dbb_Store[], dbb_destination: Dbb_Coordinates): { dbb_route: Dbb_Store[]; dbb_distance_km: number } {
  if (!dbb_stores.length) return { dbb_route: [], dbb_distance_km: 0 };
  let dbb_best = { dbb_route: [] as Dbb_Store[], dbb_distance_km: Number.POSITIVE_INFINITY };
  const dbb_walk = (dbb_remaining: Dbb_Store[], dbb_current: Dbb_Coordinates, dbb_path: Dbb_Store[], dbb_total: number) => {
    if (!dbb_remaining.length) {
      const dbb_final = dbb_total + dbb_distance_km(dbb_current, dbb_destination);
      if (dbb_final < dbb_best.dbb_distance_km) dbb_best = { dbb_route: dbb_path, dbb_distance_km: dbb_final };
      return;
    }
    if (dbb_total >= dbb_best.dbb_distance_km) return;
    for (const dbb_stop of dbb_remaining) {
      dbb_walk(dbb_remaining.filter(dbb_candidate => dbb_candidate.dbb_id !== dbb_stop.dbb_id), dbb_stop,
        [...dbb_path, dbb_stop], dbb_total + dbb_distance_km(dbb_current, dbb_stop));
    }
  };
  if (dbb_stores.length <= 5) dbb_walk(dbb_stores, dbb_destination, [], 0);
  else {
    const dbb_remaining = [...dbb_stores]; let dbb_cursor: Dbb_Coordinates = dbb_destination;
    let dbb_distance = 0; const dbb_path: Dbb_Store[] = [];
    while (dbb_remaining.length) {
      dbb_remaining.sort((dbb_first, dbb_second) => dbb_distance_km(dbb_cursor, dbb_first) - dbb_distance_km(dbb_cursor, dbb_second));
      const dbb_next = dbb_remaining.shift()!;
      dbb_distance += dbb_distance_km(dbb_cursor, dbb_next); dbb_cursor = dbb_next; dbb_path.push(dbb_next);
    }
    dbb_best = { dbb_route: dbb_path, dbb_distance_km: dbb_distance + dbb_distance_km(dbb_cursor, dbb_destination) };
  }
  return dbb_best;
}

export function dbb_build_quote(dbb_assignments: Dbb_Assignment[], dbb_destination: Dbb_Coordinates, dbb_exact = true): Dbb_Quote {
  const dbb_stores = [...new Map(dbb_assignments.map(dbb_item => [dbb_item.dbb_offer.dbb_store_id, dbb_item.dbb_offer.dbb_store])).values()];
  const { dbb_route: dbb_stops, dbb_distance_km: dbb_distance } = dbb_route(dbb_stores, dbb_destination);
  const dbb_subtotal = dbb_assignments.reduce((dbb_sum, dbb_item) => dbb_sum + dbb_item.dbb_offer.dbb_price_kurus * dbb_item.dbb_quantity, 0);
  const dbb_courier_fee = 4990 + Math.ceil(dbb_distance * 800) + Math.max(dbb_stops.length - 1, 0) * 2500;
  const dbb_service_fee = 2490 + Math.round(dbb_subtotal * 0.02);
  const dbb_bag_fee = dbb_stops.length * 750;
  return { dbb_assignments, dbb_route: dbb_stops, dbb_subtotal, dbb_courier_fee, dbb_service_fee, dbb_bag_fee,
    dbb_total: dbb_subtotal + dbb_courier_fee + dbb_service_fee + dbb_bag_fee,
    dbb_distance_km: dbb_distance, dbb_minutes: Math.round(18 + dbb_stops.length * 9 + dbb_distance * 3), dbb_exact };
}

export function dbb_optimize(dbb_basket: Dbb_BasketItem[], dbb_offers: Dbb_Offer[], dbb_destination: Dbb_Coordinates) {
  const dbb_options = dbb_basket.filter(dbb_item => dbb_item.dbb_quantity > 0).map(dbb_item => ({ dbb_item,
    dbb_offers: dbb_offers.filter(dbb_offer => dbb_offer.dbb_product_id === dbb_item.dbb_product_id && dbb_offer.dbb_in_stock)
  }));
  if (!dbb_options.length || dbb_options.some(dbb_option => !dbb_option.dbb_offers.length)) return { dbb_best: null, dbb_single: null, dbb_cheapest_items: null };
  const dbb_cheapest_items = dbb_options.map(({ dbb_item, dbb_offers: dbb_choices }) => ({ dbb_product_id: dbb_item.dbb_product_id,
    dbb_quantity: dbb_item.dbb_quantity, dbb_offer: [...dbb_choices].sort((dbb_a, dbb_b) => dbb_a.dbb_price_kurus - dbb_b.dbb_price_kurus)[0] }));
  const dbb_candidate_count = dbb_options.reduce((dbb_count, dbb_option) => dbb_count * dbb_option.dbb_offers.length, 1);
  const dbb_exact = dbb_candidate_count <= 50000;
  let dbb_best: Dbb_Quote | null = null;
  if (dbb_exact) {
    const dbb_search = (dbb_index: number, dbb_assignments: Dbb_Assignment[]) => {
      if (dbb_index === dbb_options.length) {
        const dbb_quote = dbb_build_quote(dbb_assignments, dbb_destination);
        if (!dbb_best || dbb_quote.dbb_total < dbb_best.dbb_total) dbb_best = dbb_quote;
        return;
      }
      const { dbb_item, dbb_offers: dbb_choices } = dbb_options[dbb_index];
      for (const dbb_offer of dbb_choices) dbb_search(dbb_index + 1, [...dbb_assignments,
        { dbb_product_id: dbb_item.dbb_product_id, dbb_quantity: dbb_item.dbb_quantity, dbb_offer }]);
    };
    dbb_search(0, []);
  } else {
    let dbb_beam: Dbb_Assignment[][] = [[]];
    for (const { dbb_item, dbb_offers: dbb_choices } of dbb_options) {
      dbb_beam = dbb_beam.flatMap(dbb_partial => dbb_choices.map(dbb_offer => [...dbb_partial,
        { dbb_product_id: dbb_item.dbb_product_id, dbb_quantity: dbb_item.dbb_quantity, dbb_offer }]))
        .sort((dbb_a, dbb_b) => dbb_build_quote(dbb_a, dbb_destination).dbb_total - dbb_build_quote(dbb_b, dbb_destination).dbb_total).slice(0, 180);
    }
    dbb_best = dbb_build_quote(dbb_beam[0], dbb_destination, false);
  }
  const dbb_store_ids = [...new Set(dbb_offers.map(dbb_offer => dbb_offer.dbb_store_id))];
  let dbb_single: Dbb_Quote | null = null;
  for (const dbb_store_id of dbb_store_ids) {
    const dbb_assignments: Dbb_Assignment[] = [];
    for (const { dbb_item, dbb_offers: dbb_choices } of dbb_options) {
      const dbb_offer = dbb_choices.find(dbb_candidate => dbb_candidate.dbb_store_id === dbb_store_id);
      if (dbb_offer) dbb_assignments.push({ dbb_product_id: dbb_item.dbb_product_id, dbb_quantity: dbb_item.dbb_quantity, dbb_offer });
    }
    if (dbb_assignments.length !== dbb_options.length) continue;
    const dbb_quote = dbb_build_quote(dbb_assignments, dbb_destination);
    if (!dbb_single || dbb_quote.dbb_total < dbb_single.dbb_total) dbb_single = dbb_quote;
  }
  return { dbb_best, dbb_single, dbb_cheapest_items };
}

export const dbb_lira = (dbb_kurus: number) => `${(dbb_kurus / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
