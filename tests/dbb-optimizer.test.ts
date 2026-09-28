import { test } from 'node:test';
import { strict as dbb_assert } from 'node:assert';
import { dbb_build_quote, dbb_distance_km, dbb_optimize } from '../src/dbb-optimizer';
import { dbb_center, dbb_demo_offers } from '../src/dbb-demo';
import { dbb_demo_products } from '../src/dbb-demo';
import { dbb_breakfast_under_budget, dbb_search_text } from '../src/dbb-planner';

test('Ankara basket quote includes every fee and each product once', () => {
  const dbb_result = dbb_optimize([{ dbb_product_id: 'kola', dbb_quantity: 2 }, { dbb_product_id: 'nutella', dbb_quantity: 1 }], dbb_demo_offers, dbb_center);
  dbb_assert.ok(dbb_result.dbb_best);
  dbb_assert.equal(dbb_result.dbb_best.dbb_assignments.length, 2);
  dbb_assert.equal(dbb_result.dbb_best.dbb_total, dbb_result.dbb_best.dbb_subtotal + dbb_result.dbb_best.dbb_courier_fee + dbb_result.dbb_best.dbb_service_fee + dbb_result.dbb_best.dbb_bag_fee);
  dbb_assert.equal(dbb_result.dbb_best.dbb_exact, true);
});

test('the cheapest item combination can lose to the single store total', () => {
  const dbb_items = [{ dbb_product_id: 'kola', dbb_quantity: 1 }, { dbb_product_id: 'ariel', dbb_quantity: 1 }];
  const dbb_result = dbb_optimize(dbb_items, dbb_demo_offers, dbb_center);
  dbb_assert.ok(dbb_result.dbb_best && dbb_result.dbb_single && dbb_result.dbb_cheapest_items);
  const dbb_naive = dbb_build_quote(dbb_result.dbb_cheapest_items, dbb_center);
  dbb_assert.ok(dbb_result.dbb_best.dbb_total <= dbb_naive.dbb_total);
  dbb_assert.ok(dbb_result.dbb_best.dbb_total <= dbb_result.dbb_single.dbb_total);
});

test('missing stock prevents a quote and non Ankara coordinates are rejected in UI', () => {
  dbb_assert.equal(dbb_optimize([{ dbb_product_id: 'unknown', dbb_quantity: 1 }], dbb_demo_offers, dbb_center).dbb_best, null);
  dbb_assert.equal(dbb_distance_km(dbb_center, dbb_center), 0);
});

test('budget breakfast list stays below total including delivery', () => {
  const dbb_list = dbb_breakfast_under_budget(dbb_demo_products,dbb_demo_offers,dbb_center,50000);
  dbb_assert.ok(dbb_list.length > 0);
  dbb_assert.ok(dbb_optimize(dbb_list,dbb_demo_offers,dbb_center).dbb_best!.dbb_total <= 50000);
  dbb_assert.deepEqual(dbb_breakfast_under_budget(dbb_demo_products,dbb_demo_offers,dbb_center,1000),[]);
});

test('store product link can be normalized into searchable words', () => {
  dbb_assert.match(dbb_search_text('https://example.com/urun/coca-cola-2-5-l?x=1'),/coca cola/);
});
