import type { Dbb_BasketItem, Dbb_Offer, Dbb_Product, Dbb_Store } from '../src/dbb-model';

export const dbb_center = { dbb_lat: 39.92077, dbb_lon: 32.85411 };
export const dbb_demo_stores: Dbb_Store[] = [
  { dbb_id: 'a101', dbb_name: 'A101 · Örnek', dbb_address: 'Kızılay / Ankara', dbb_lat: 39.9181, dbb_lon: 32.8557 },
  { dbb_id: 'migros', dbb_name: 'Migros · Örnek', dbb_address: 'Kızılay / Ankara', dbb_lat: 39.9237, dbb_lon: 32.8509 },
  { dbb_id: 'carrefour', dbb_name: 'CarrefourSA · Örnek', dbb_address: 'Kızılay / Ankara', dbb_lat: 39.9222, dbb_lon: 32.8612 }
];
export const dbb_demo_products: Dbb_Product[] = [
  { dbb_id: 'kola', dbb_name: 'Coca-Cola', dbb_brand: 'Coca-Cola', dbb_size: '2,5 L', dbb_category: 'İçecek', dbb_barcode: '5449000054227' },
  { dbb_id: 'nutella', dbb_name: 'Nutella', dbb_brand: 'Ferrero', dbb_size: '750 g', dbb_category: 'Kahvaltılık' },
  { dbb_id: 'ariel', dbb_name: 'Ariel Toz Deterjan', dbb_brand: 'Ariel', dbb_size: '8 kg', dbb_category: 'Temizlik' },
  { dbb_id: 'finish', dbb_name: 'Finish Tablet', dbb_brand: 'Finish', dbb_size: '40’lı', dbb_category: 'Temizlik' },
  { dbb_id: 'tavuk', dbb_name: 'Tavuk Göğsü', dbb_brand: 'Kasap', dbb_size: '1 kg', dbb_category: 'Taze gıda' },
  { dbb_id: 'pirinc', dbb_name: 'Baldo Pirinç', dbb_brand: 'Örnek', dbb_size: '1 kg', dbb_category: 'Bakliyat' },
  { dbb_id: 'sut', dbb_name: 'Tam Yağlı Süt', dbb_brand: 'Örnek', dbb_size: '1 L', dbb_category: 'Kahvaltılık' },
  { dbb_id: 'yumurta', dbb_name: 'Yumurta', dbb_brand: 'Örnek', dbb_size: '10’lu', dbb_category: 'Kahvaltılık' },
  { dbb_id: 'peynir', dbb_name: 'Beyaz Peynir', dbb_brand: 'Örnek', dbb_size: '500 g', dbb_category: 'Kahvaltılık' },
  { dbb_id: 'ekmek', dbb_name: 'Ekmek', dbb_brand: 'Örnek', dbb_size: '1 adet', dbb_category: 'Kahvaltılık' },
  { dbb_id: 'zeytin', dbb_name: 'Siyah Zeytin', dbb_brand: 'Örnek', dbb_size: '400 g', dbb_category: 'Kahvaltılık' },
  { dbb_id: 'cay', dbb_name: 'Siyah Çay', dbb_brand: 'Örnek', dbb_size: '500 g', dbb_category: 'Kahvaltılık' }
];
const dbb_demo_prices: Record<string, Record<string, number>> = {
  kola: { a101: 6750, migros: 7295, carrefour: 6990 },
  nutella: { a101: 19990, migros: 20490, carrefour: 19750 },
  ariel: { a101: 48990, migros: 45990, carrefour: 42990 },
  finish: { a101: 27990, migros: 25990, carrefour: 22990 },
  tavuk: { a101: 19490, migros: 18990, carrefour: 20490 },
  pirinc: { a101: 8990, migros: 9390, carrefour: 9490 },
  sut: { a101: 4790, migros: 4990, carrefour: 5190 },
  yumurta: { a101: 7490, migros: 6990, carrefour: 7990 },
  peynir: { a101: 12990, migros: 13990, carrefour: 13490 },
  ekmek: { a101: 1990, migros: 2190, carrefour: 2290 },
  zeytin: { a101: 8990, migros: 8590, carrefour: 9990 },
  cay: { a101: 11490, migros: 11990, carrefour: 10990 }
};
export const dbb_demo_offers: Dbb_Offer[] = dbb_demo_products.flatMap(dbb_product =>
  dbb_demo_stores.map(dbb_store => ({
    dbb_id: `${dbb_product.dbb_id}:${dbb_store.dbb_id}`, dbb_product_id: dbb_product.dbb_id,
    dbb_store_id: dbb_store.dbb_id, dbb_price_kurus: dbb_demo_prices[dbb_product.dbb_id][dbb_store.dbb_id],
    dbb_in_stock: true, dbb_verified: false, dbb_checked_at: '2026-09-28T00:00:00Z', dbb_store, dbb_product
  })));
export const dbb_demo_basket: Dbb_BasketItem[] = [
  { dbb_product_id: 'kola', dbb_quantity: 2 }, { dbb_product_id: 'nutella', dbb_quantity: 1 },
  { dbb_product_id: 'ariel', dbb_quantity: 1 }, { dbb_product_id: 'finish', dbb_quantity: 1 },
  { dbb_product_id: 'tavuk', dbb_quantity: 2 }
];
