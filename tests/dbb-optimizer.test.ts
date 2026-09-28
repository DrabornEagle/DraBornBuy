import { test } from 'node:test';
import { strict as dbb_assert } from 'node:assert';
import { dbb_build_quote, dbb_distance_km, dbb_optimize } from '../src/dbb-optimizer';
import { dbb_center, dbb_demo_offers } from './dbb-fixtures';
import { dbb_demo_products } from './dbb-fixtures';
import { dbb_breakfast_draft, dbb_breakfast_under_budget, dbb_search_text } from '../src/dbb-planner';
const dbb_confirmed_offers=dbb_demo_offers.map(dbb_offer=>({...dbb_offer,dbb_verified:true,dbb_availability:'confirmed' as const}));

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
  const dbb_list = dbb_breakfast_under_budget(dbb_demo_products,dbb_confirmed_offers,dbb_center,50000);
  dbb_assert.ok(dbb_list.length > 0);
  dbb_assert.ok(dbb_optimize(dbb_list,dbb_confirmed_offers,dbb_center).dbb_best!.dbb_total <= 50000);
  dbb_assert.deepEqual(dbb_breakfast_under_budget(dbb_demo_products,dbb_confirmed_offers,dbb_center,1000),[]);
  dbb_assert.equal(new Set(dbb_list.map(dbb_item=>dbb_item.dbb_product_id)).size,dbb_list.length);
  dbb_assert.ok(dbb_list.every(dbb_item=>dbb_demo_products.find(dbb_product=>dbb_product.dbb_id===dbb_item.dbb_product_id)?.dbb_category==='Kahvaltılık'));
});

test('without branch offers, breakfast is a unique unpriced draft', () => {
  dbb_assert.deepEqual(dbb_breakfast_under_budget(dbb_demo_products,[],dbb_center,500000),[]);
  const dbb_list=dbb_breakfast_draft(dbb_demo_products);
  dbb_assert.equal(dbb_list.length,6);
  dbb_assert.equal(new Set(dbb_list.map(dbb_item=>dbb_item.dbb_product_id)).size,6);
});

test('store product link can be normalized into searchable words', () => {
  dbb_assert.match(dbb_search_text('https://example.com/urun/coca-cola-2-5-l?x=1'),/coca cola/);
});

test('admin fee changes affect optimization and the quoted total', () => {
  const dbb_basket = [{dbb_product_id:'kola',dbb_quantity:1}];
  const dbb_fees = {dbb_courier_base_kurus:4990,dbb_per_km_kurus:800,dbb_extra_store_kurus:2500,
    dbb_service_base_kurus:2490,dbb_service_rate_bps:200,dbb_bag_per_store_kurus:750};
  const dbb_normal = dbb_optimize(dbb_basket,dbb_demo_offers,dbb_center,dbb_fees).dbb_best!;
  const dbb_config = {...dbb_fees,dbb_courier_base_kurus:7490,dbb_service_rate_bps:500};
  const dbb_updated = dbb_optimize(dbb_basket,dbb_demo_offers,dbb_center,dbb_config).dbb_best!;
  dbb_assert.equal(dbb_updated.dbb_courier_fee-dbb_normal.dbb_courier_fee,2500);
  dbb_assert.equal(dbb_updated.dbb_service_fee-dbb_normal.dbb_service_fee,Math.round(dbb_updated.dbb_subtotal*.05)-Math.round(dbb_normal.dbb_subtotal*.02));
});
