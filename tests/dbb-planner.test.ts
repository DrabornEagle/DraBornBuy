import test from 'node:test';
import assert from 'node:assert/strict';
import type { Dbb_Offer, Dbb_Product, Dbb_Store } from '../src/dbb-model';
import { dbb_breakfast_under_budget } from '../src/dbb-planner';

const dbb_home = { dbb_lat:39.92077, dbb_lon:32.85411 };
const dbb_store: Dbb_Store = { dbb_id:'store', dbb_name:'Market', dbb_address:'Ankara', dbb_lat:39.921, dbb_lon:32.855 };

function dbb_product(dbb_id:string, dbb_name:string, dbb_category='Kahvaltılık'):Dbb_Product {
  return { dbb_id, dbb_name, dbb_brand:'Test', dbb_size:'1 adet', dbb_category };
}
function dbb_offer(dbb_product_value:Dbb_Product, dbb_price_kurus:number, dbb_availability:'confirmed'|'unknown'|'unavailable'='unknown'):Dbb_Offer {
  return { dbb_id:`offer-${dbb_product_value.dbb_id}`, dbb_store_id:dbb_store.dbb_id, dbb_product_id:dbb_product_value.dbb_id,
    dbb_price_kurus, dbb_in_stock:dbb_availability!=='unavailable', dbb_verified:true, dbb_checked_at:new Date().toISOString(),
    dbb_availability, dbb_store, dbb_product:dbb_product_value };
}

test('kahvaltılık planı ilk eşleşme satın alınamazsa siparişe açık alternatifi seçer', () => {
  const dbb_unavailable = dbb_product('milk-old','Süt Eski Kayıt');
  const dbb_orderable = dbb_product('milk-live','Süt Güncel');
  const dbb_result = dbb_breakfast_under_budget(
    [dbb_unavailable,dbb_orderable],
    [dbb_offer(dbb_orderable,6500,'unknown')],
    dbb_home,
    100000
  );
  assert.deepEqual(dbb_result,[{dbb_product_id:'milk-live',dbb_quantity:1}]);
});

test('istenen ana ürün bulunmazsa siparişe açık kahvaltılık ürünlerden sepet oluşturur', () => {
  const dbb_granola = dbb_product('granola','Granola');
  const dbb_result = dbb_breakfast_under_budget(
    [dbb_granola],
    [dbb_offer(dbb_granola,4500,'confirmed')],
    dbb_home,
    100000
  );
  assert.equal(dbb_result.length,1);
  assert.equal(dbb_result[0].dbb_product_id,'granola');
});
