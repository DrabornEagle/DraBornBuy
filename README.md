# DraBornBuy v0.3 · Ankara market

Expo SDK 58 uygulaması Android **version 0.3.0 / versionCode 1** kullanır. APK üretilmez; Android testleri Expo Go 58 ile yapılır. Aynı Expo kaynak kodu [web sürümüne](https://www.draborneagle.com/DraBornBuy/) aktarılır. Oturum, sepet ve sipariş verileri ayrı `dbb_` Supabase tablolarında tutulur.

## Kurulum · Termux

```bash
pkg update -y
pkg install -y git nodejs-lts npm
cd ~
git clone https://github.com/DrabornEagle/DraBornBuy.git
cd DraBornBuy
cp .env.example .env
npm ci --legacy-peer-deps
npx expo start --lan --clear
```

Mevcut kurulum:

```bash
cd ~/DraBornBuy
git pull origin main
cp .env.example .env
npm ci --legacy-peer-deps
npx expo start --lan --clear
```

`.env.example` yalnızca public Supabase URL ve publishable key içerir. Public Mapbox token, uygulama açıldığında `dbb_config.dbb_mapbox_public_token` alanından yüklenir. Hizmet rolü veya banka erişim sırrı mobil uygulamaya konmaz. Termux üzerinde React Native DevTools kurulurken görülen `arm64` uyarısı, Metro Android bundle tamamlanıyorsa Expo Go'nun açılmasını engellemez.

## Fiyatın anlamı

- Katalogdaki ürün adı, görseli, kaynak URL'si, çevrimiçi fiyatı ve kaynak stok durumu birbirinden ayrı veridir. Kaynak sayfasında görünen tutar, kasada veya Ankara şubesinde alınacak fiyat değildir. Kaynak stok göstermiyorsa ekranda açıkça “çevrimiçi stok yok” denir.
- Ana ekranda önce çevrimiçi stoğu ve son 24 saatte gözlenmiş fiyatı olan ürünler görünür. Aramada son görülen fiyat, çevrimiçi stok yokken de **referans** olarak gösterilebilir; ödeme toplamı sayılmaz.
- Sipariş hesabına yalnızca `dbb_availability='confirmed'`, doğrulanmış, stoklu ve süresi geçmemiş **şube teklifleri** girer. Katalog taramasının otomatik yazdığı eski `catalog` teklifleri siparişten ayrılmıştır. Sunucu aynı koşulu ödeme öncesinde tekrar denetler.
- Mevcut katalog tarayıcısı bir kaynaktan küçük partiler alır; binlerce ürünün hepsinin anlık veya şube bazında doğrulanmış fiyatı olduğu iddia edilmez. A101, BİM, Migros, CarrefourSA ve başka marketlerin şube fiyatlarını otomatik doğrulayacak yetkili veri bağlantısı henüz bulunmuyor.

Bu nedenle gerçek sipariş/FAST ödemesi, Ankara şubesi için kullanılabilir veri bağlantısı ve doğrulanmış fiyat ile stok bulunana kadar kapalı kalır. Bu durum müşteri ekranında açıkça anlatılır. `dbb_requested_enabled` açılış isteğini saklar; hazır şube teklifleri ve kurye oluştuğunda hazır olma kontrolü çalışır. Katalog fiyatını siparişe dönüştürmek bu koşulu karşılamaz.

## v0.3

- Açık zeminli indigo, mor, mercan ve sarı market teması; hareketsiz, daha kısa arama alanı ve fiyatı öne çıkaran ürün kartları.
- Ürün eklenince sepet rozeti, adet ve hızlı sepet çubuğu güncellenir.
- Kahvaltılık planı ürün adlarını ayrı ayrı eşleştirir; doğrulanmış teklifler varsa teslimat dahil bütçe hesabı yapar, yoksa düzenlenebilir bir taslak oluşturur ve bütçenin doğrulanamadığını açıklar.
- Mapbox'un public token'ı Android ve web için aynı `dbb_config` kaydından okunur.
- Katalog fiyatı ile sipariş teklifi arasındaki sunucu ayrımı sıkılaştırıldı. Ödeme için katalog tahminine dayanılmaz.

## Kontrol

```bash
npx expo install --check
npm run check
npx expo export --platform android --output-dir dist-ci-android
npm run export:web
```

GitHub Actions Android Metro export'unu APK üretmeden doğrular. Web deposundaki iş akışı Expo web çıktısını `/DraBornBuy/` altına senkronlar.
