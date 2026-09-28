# DraBornBuy · Ankara pilotu

Expo SDK 58 / Expo Go 58.0.0 ile Android ve web aynı kaynak kodunu kullanır. Ürün kataloğu otomatik yenilenir; siparişe açık fiyatlar, teslimat rotası, kurye ücreti, hizmet bedeli ve poşet bedeli tek sepet içinde hesaplanır. Fiziksel mağaza mevcudiyeti kesin şube verisi yoksa `unknown` tutulur ve kurye alışveriş sırasında teyit eder; uygulama bunu kesin stok olarak göstermemelidir.

Android ve [web sürümü](https://www.draborneagle.com/DraBornBuy/) aynı Supabase projesiyle senkron çalışır. Oturum açan müşterinin etkin sepeti `dbb_baskets`, kayıtlı alışveriş listeleri `dbb_saved_lists`, siparişler ise `dbb_orders` üzerinden iki cihaz arasında eşitlenir.

## Termux kurulumu

```bash
pkg update -y
pkg install -y git nodejs-lts npm
cd ~
git clone https://github.com/DrabornEagle/DraBornBuy.git
cd DraBornBuy
cp .env.example .env
nano .env
npm ci --legacy-peer-deps
npx expo start --lan --clear
```

Önceden kurulduysa:

```bash
cd ~/DraBornBuy
git pull origin main
npm ci --legacy-peer-deps
npx expo start --lan --clear
```

`.env` için Supabase publishable anahtarı yeterlidir. Mapbox public token üretim ortamında `public.dbb_config.dbb_mapbox_public_token` alanından çalışma anında yüklenir; böylece Android ve web aynı canlı harita yapılandırmasını kullanır. `service_role`, banka erişim bilgileri veya secret token uygulamaya konmaz.

## Otomatik veri akışı

- `dbb-catalog-sync` Edge Function yayımlanan ürün kataloğunu küçük gruplar halinde tarar ve `dbb_products` içindeki ürün adı, görsel, barkod, kaynak adresi, çevrimiçi fiyat ve katalog durumunu yeniler.
- Katalog senkronu ve `dbb_refresh_catalog_procurement_offers()` işi dakikalık çalışır. Güncel, siparişe uygun katalog fiyatları `dbb_offers` içine `dbb_source='catalog'` ve `dbb_availability='unknown'` olarak taşınabilir. Bu kayıt fiziksel şube stoğu iddiası değildir; kuryenin mağazada teyit edeceği satın alma tahminidir.
- Kesin mağaza verisi geldiğinde teklif `dbb_availability='confirmed'` olarak tutulabilir. `unavailable` teklifler kullanıcıya ve optimizasyona girmez.
- A101, BİM, Migros, CarrefourSA, ŞOK ve Yunus Market gibi zincirler için yalnızca güvenilir, şubeye özgü veri kaynağı bulunduğunda aynı akışa eklenmelidir; katalog veya görsel tek başına kesin şube stoğu sayılmaz.

## Gerçek sipariş akışı

`dbb_requested_enabled` işletmenin sipariş açma isteğini saklar. `dbb_enabled` banka hesabı, aktif satın alma noktası, güncel siparişe açık fiyat ve onaylı kurye hazır olduğunda otomatik açılır. Kullanıcı sepetten sipariş oluşturduğunda toplam sunucuda yeniden hesaplanır; istemci toplamı güven kaynağı değildir.

Akış: müşteri hesabı → sepet → Ankara teslimat adresi → gerçek sipariş → IBAN/havale → dekont → ödeme kontrolü → kurye havuzu → alışveriş → teslimat → fiş/fiyat mutabakatı. Fiyat farkı izni ürün bazında kasadaki artışlar için kullanılır. Fiziksel mağaza mevcudiyeti `unknown` olan kalemlerde kurye mağazada ürünü teyit eder; bulunamazsa sipariş akışı bunu eksik ürün olarak işler.

## Kullanıcı deneyimi

Ürün eklenince üst sepet sayacı, alt menü rozeti ve hızlı “Sepetim” çubuğu anında güncellenir. Bütçeli kahvaltılık planı ilk bulunan katalog kaydını körlemesine seçmez; siparişe açık teklifleri tarar, bütçeyi aşmayan en uygun alternatifleri kullanır ve ana ürün bulunamazsa siparişe açık kahvaltılık ürünlerle yedek sepet oluşturur.

Arama, barkod tarama, ürün linkinden arama, kayıtlı listeler, çok mağazalı optimizasyon, tek mağaza karşılaştırması, Mapbox adres/rota tahmini, ödeme dekontu, manuel banka kontrolü, kurye görevleri, fiş mutabakatı, mesajlaşma ve sipariş olayları kodlanmıştır.

Supabase şeması `dbb_` öneki ve RLS ile aynı projedeki diğer uygulamalardan ayrı tutulur. Migration dosyaları `supabase/migrations/` içindedir.

## Doğrulama

```bash
npm run check
npm run export:web
```

`main` dalındaki her değişiklikte GitHub Actions TypeScript ve test paketini çalıştırır. `DrabornEagle_Web` Pages iş akışı da aynı kaynaktan `/DraBornBuy/` web çıktısını üretir.
