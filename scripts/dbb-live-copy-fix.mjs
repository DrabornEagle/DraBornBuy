import { readFile, writeFile } from 'node:fs/promises';

const dbb_path = 'src/dbb-app.tsx';
let dbb_source = await readFile(dbb_path, 'utf8');

const dbb_replacements = [
  [
    "Gerçek siparişler henüz açılmadı; Ankara şubesi ve ödeme hesabı doğrulanmalı.",
    "Sipariş altyapısı şu anda hazır değil; güncel fiyat akışı, kurye veya ödeme hesabı kontrol ediliyor."
  ],
  [
    "Bu bütçe için güncel stoklu kahvaltılık bulunamadı. Kaynak güncellendiğinde tekrar dene.",
    "Bu bütçe için güncel fiyatlı kahvaltılık bulunamadı. Katalog her dakika güncelleniyor; tekrar deneyebilirsin."
  ],
  [
    "Kahvaltılık taslak hazır: ${dbb_selected.length} ürün · çevrimiçi ürün toplamı ${dbb_lira(dbb_running)}. Stok, kurye ve şube fiyatı doğrulanmadığından ${dbb_budget} TL teslimat bütçesi garanti edilemez.",
    "Kahvaltılık taslak hazır: ${dbb_selected.length} ürün · ürün toplamı ${dbb_lira(dbb_running)}. Mağaza mevcudiyeti alışveriş sırasında kurye tarafından teyit edilir; fiyat farkı iznin uygulanır."
  ],
  [
    "Ankara şubelerinde güncel doğrulanan fiyatlar görünür.",
    "Güncel market fiyatlarıyla sipariş hemen hesaplanır; mağaza mevcudiyeti kurye alışverişte teyit eder."
  ],
  [
    "Bu ürünler için doğrulanmış Ankara mağaza stoğu bulunmuyor. Listeyi kaydedebilir, ürün eklemeye devam edebilirsin. Görünen fiyat ödeme tutarı değildir.",
    "Bu ürünler için şu anda siparişe açık güncel fiyat bulunmuyor. Listeyi kaydedebilir, ürün eklemeye devam edebilirsin."
  ],
  [
    "Ankara şube fiyatları, stok ve ödeme hesabı yönetici tarafından doğrulandıktan sonra sipariş açılır.",
    "Canlı sipariş altyapısı geçici olarak hazır değilse fiyat akışı, kurye ve ödeme hesabı otomatik kontrol edilir."
  ],
  [
    "Ürün bilgileri gerçek kaynaklara bağlıdır. Siparişler doğrulanmış şube fiyatı ve ödeme bilgileriyle açılır.",
    "Ürün bilgileri gerçek kaynaklara bağlıdır. Güncel fiyatla sipariş oluşturulur; fiziksel mağaza mevcudiyetini kurye alışveriş sırasında teyit eder."
  ],
  [
    "{dbb_choices.length?'EN UYGUN ŞUBE FİYATI':dbb_online?'ÇEVRİMİÇİ KAYNAK FİYATI':'ÇEVRİMİÇİ DURUM'}",
    "{dbb_choices.length?(dbb_choices[0]?.dbb_availability==='unknown'?'GÜNCEL MARKET FİYATI · KURYE TEYİDİ':'EN UYGUN ŞUBE FİYATI'):dbb_online?'ÇEVRİMİÇİ KAYNAK FİYATI':'ÇEVRİMİÇİ DURUM'}"
  ]
];

let dbb_changed = 0;
for (const [dbb_before, dbb_after] of dbb_replacements) {
  if (dbb_source.includes(dbb_after)) continue;
  if (!dbb_source.includes(dbb_before)) throw new Error(`Expected DraBornBuy UI text was not found: ${dbb_before.slice(0, 70)}`);
  dbb_source = dbb_source.replace(dbb_before, dbb_after);
  dbb_changed++;
}

if (dbb_changed) await writeFile(dbb_path, dbb_source, 'utf8');
console.log(`DraBornBuy live-order copy updates applied: ${dbb_changed}`);
