# DraBornBuy v0.2 · Ankara pilotu

Android sürümü **0.2.0 / versionCode 1** olarak ayarlıdır. Geliştirme aşamasında APK üretilmez; testler Expo Go ile yapılır. Proje Expo SDK 58 `58.0.0-preview.8` ile hizalanmıştır ve Android ile web aynı kaynak kodunu kullanır.

Ürün kataloğu otomatik yenilenir; siparişe açık fiyatlar, teslimat rotası, kurye ücreti, hizmet bedeli ve poşet bedeli tek sepet içinde hesaplanır. Fiziksel mağaza mevcudiyeti kesin şube verisi yoksa `unknown` tutulur ve kurye alışveriş sırasında teyit eder; uygulama bunu kesin stok olarak göstermez.

Android ve [web sürümü](https://www.draborneagle.com/DraBornBuy/) aynı Supabase projesiyle senkron çalışır. Oturum açan müşterinin etkin sepeti `dbb_baskets`, kayıtlı alışveriş listeleri `dbb_saved_lists`, siparişler ise `dbb_orders` üzerinden cihazlar arasında eşitlenir.

## Termux kurulumu

Temiz kurulum:

```bash
pkg update -y
pkg install -y git nodejs-lts npm
cd ~
git clone https://github.com/DrabornEagle/DraBornBuy.git
cd DraBornBuy
cp -f .env.example .env
npm ci --legacy-peer-deps
npx expo start --lan --clear
```

Mevcut kurulumu v0.2'ye güncellemek için:

```bash
cd ~/DraBornBuy
git pull origin main
cp -f .env.example .env
rm -rf .expo
npm ci --legacy-peer-deps
npx expo start --lan --clear
```

`.env.example` çalışır durumdaki **public Supabase URL + publishable key** değerlerini içerir; eski `PASTE_...` placeholder değerlerinin kalmaması için güncellemede `.env` üzerine yeniden kopyalanır. Uygulama ayrıca yanlış/boş yerel public anahtar algılarsa DraBornBuy'ın public Supabase yapılandırmasına güvenli fallback uygular. `service_role`, banka erişim bilgileri veya secret token uygulamaya ya da repoya konmaz.

Mapbox public token üretim ortamında `public.dbb_config.dbb_mapbox_public_token` alanından çalışma anında yüklenir; Android ve web aynı canlı harita yapılandırmasını kullanır. Yerel `EXPO_PUBLIC_MAPBOX_TOKEN` boş kalabilir.

Termux üzerinde React Native DevTools kurulurken görülebilen `Cannot read properties of undefined (reading 'arm64')` mesajı Metro bundle tamamlandığı sürece uygulamanın Android bundle'ını tek başına engellemez.

## Otomatik veri akışı

- `dbb-catalog-sync` Edge Function yayımlanan ürün kataloğunu küçük gruplar halinde tarar ve `dbb_products` içindeki ürün adı, görsel, barkod, kaynak adresi, çevrimiçi fiyat ve katalog durumunu yeniler.
- Katalog senkronu ve `dbb_refresh_catalog_procurement_offers()` işi dakikalık çalışır. Güncel, siparişe uygun katalog fiyatları `dbb_offers` içine `dbb_source='catalog'` ve `dbb_availability='unknown'` olarak taşınabilir. Bu kayıt fiziksel şube stoğu iddiası değildir; kuryenin mağazada teyit edeceği satın alma tahminidir.
- Kesin mağaza verisi geldiğinde teklif `dbb_availability='confirmed'` olarak tutulabilir. `unavailable` teklifler kullanıcıya ve optimizasyona girmez.
- A101, BİM, Migros, CarrefourSA, ŞOK ve Yunus Market gibi zincirler için yalnızca güvenilir, şubeye özgü veri kaynağı bulunduğunda aynı akışa eklenmelidir; katalog veya görsel tek başına kesin şube stoğu sayılmaz.

## Gerçek sipariş akışı

`dbb_requested_enabled` işletmenin sipariş açma isteğini saklar. `dbb_enabled` banka hesabı, aktif satın alma noktası, güncel siparişe açık fiyat ve onaylı kurye hazır olduğunda otomatik açılır. Kullanıcı sepetten sipariş oluşturduğunda toplam sunucuda yeniden hesaplanır; istemci toplamı güven kaynağı değildir.

Akış: müşteri hesabı → sepet → Ankara teslimat adresi → gerçek sipariş → IBAN/havale → dekont → ödeme kontrolü → kurye havuzu → alışveriş → teslimat → fiş/fiyat mutabakatı. Fiyat farkı izni ürün bazında kasadaki artışlar için kullanılır. Fiziksel mağaza mevcudiyeti `unknown` olan kalemlerde kurye mağazada ürünü teyit eder; bulunamazsa sipariş akışı bunu eksik ürün olarak işler.

## v0.2 istemci düzeltmeleri

- Hatalı `.env` placeholder değerlerinden kaynaklanan **Invalid API key** problemi giderildi.
- Eski demo sürümlerinden kalan UUID olmayan sepet kimlikleri otomatik ayıklanır; sonsuza kadar “Ürün yükleniyor” kartı gösterilmez.
- Expo 58 paketleri preview.8 ile hizalandı; React Native, Expo Router, kamera, konum, image picker ve web paketleri uyumlu sürümlere güncellendi.
- TypeScript 6 ve Node test tipleri etkinleştirildi; CI `npm run check` ile tip kontrolü ve testleri çalıştırır.
- Ana ekran, kartlar, arama alanı ve aksiyon düğmeleri daha renkli premium market temasına geçirildi; hero alanına hafif hareket/pulse animasyonları eklendi.
- Ürün eklenince üst sepet sayacı, alt menü rozeti ve hızlı “Sepetim” çubuğu anında güncellenir.

Arama, barkod tarama, ürün linkinden arama, kayıtlı listeler, çok mağazalı optimizasyon, tek mağaza karşılaştırması, Mapbox adres/rota tahmini, bütçeli kahvaltılık planı, ödeme dekontu, manuel banka kontrolü, kurye görevleri, fiş mutabakatı, mesajlaşma ve sipariş olayları kodlanmıştır.

Supabase şeması `dbb_` öneki ve RLS ile aynı projedeki diğer uygulamalardan ayrı tutulur. Migration dosyaları `supabase/migrations/` içindedir.

## Doğrulama

```bash
npx expo install --check
npm run check
npm run export:web
```

`main` dalındaki her değişiklikte GitHub Actions TypeScript ve test paketini çalıştırır. `DrabornEagle_Web` Pages iş akışı da aynı kaynaktan `/DraBornBuy/` web çıktısını üretir.
