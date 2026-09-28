# DraBornBuy v0.4 · Ankara market

Expo SDK 58 uygulaması Android **version 0.4.0 / versionCode 1** kullanır. APK üretilmez; Android testleri Expo Go 58 ile yapılır. Aynı Expo kaynak kodu [web sürümüne](https://www.draborneagle.com/DraBornBuy/) aktarılır. Oturum, sepet ve sipariş verileri ayrı `dbb_` Supabase tablolarında tutulur.

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

## v0.4 stok kuralı

- Müşteri kataloğu artık yalnızca `dbb_catalog_in_stock=true`, pozitif güncel fiyatı bulunan ve son 24 saat içinde kontrol edilmiş ürünleri gösterir.
- Kaynak stok dışı işaretlerse katalog fiyatı `null` yapılır ve ürün müşteri aramasından/ana sayfadan çıkar. Eski sepet veya kayıtlı listede kalan stok dışı ürünler yeniden açılırken otomatik elenir.
- “Çevrimiçi stok yok, siparişe açık değil” şeklinde stok dışı ürün kartı gösterilmez. Arama sonuçlarında stok dışı kayıtların görünmesine izin verilmez.
- Sipariş hesabına yalnızca `dbb_availability='confirmed'`, doğrulanmış, stoklu ve süresi geçmemiş **fiziksel şube teklifleri** girer. Çevrimiçi katalog stoğu fiziksel Ankara şubesi stoğu gibi gösterilmez.
- Sunucu ödeme/sipariş oluşturma anında aynı şube doğrulamasını tekrar yapar. Bu güvenlik kuralı istemci tarafından atlanamaz.

## Market kaynakları

v0.4 veri modeli birden fazla market kaynağını destekler; ancak müşteri ekranında yalnızca gerçekten bağlı ve güncel stok verisi üreten kaynaklar gösterilir. Şu anda otomatik canlı katalog tarayıcısı Altunbilekler kaynağı için aktiftir. A101, BİM, ŞOK, Migros, CarrefourSA, Yunus ve diğer zincirler veri modeli/aday listesinde bulunsa da doğrulanmış resmi veya güvenilir canlı veri bağlantısı kurulmadan bu marketler için stok uydurulmaz.

Her yeni market adaptörü aynı sözleşmeye uymalıdır: ürün kimliği, kaynak URL'si, fiyat, stok durumu, kontrol zamanı ve mümkün olduğunda şube bazlı doğrulanmış teklif. Böylece “bütün marketler” kapsamı genişlerken yanlış stok veya sahte şube fiyatı müşteriye gösterilmez.

## v0.4 arayüz

- Tasarım sıfırdan Miami market yönüne taşındı: turkuaz/aqua, mercan, gün batımı sarısı, pembe ve koyu lacivert vurgular.
- Yeni gradient hero, kategori rafları, canlı stok sayaçları, renk kodlu ürün kartları ve modern sepet çubuğu eklendi.
- Ürün kartlarında yalnızca “Canlı çevrimiçi stok” veya gerçek teklif varsa “Doğrulanmış şube stoku” durumu gösterilir.
- Sepette eski “Teslimat hesabı şu anda sunulamıyor” mesajı kaldırıldı. Fiziksel şube teklifi yoksa ürünlerin stokta olduğu fakat şube eşleşmesinin beklendiği açıkça belirtilir.
- Header ve hesap ekranı `v0.4 · MIAMI` olarak güncellendi.

## Gerçek sipariş neden ayrı?

Çevrimiçi mağazada bir ürünün stokta görünmesi, Ankara'daki belirli fiziksel şubede o anda aynı ürünün ve fiyatın bulunduğunu kanıtlamaz. Bu nedenle gerçek sipariş/FAST ödemesi yalnızca şube bazlı doğrulanmış teklif olduğunda açılır. `dbb_requested_enabled` açılış isteğini saklar; hazır şube teklifleri ve kurye oluştuğunda hazır olma kontrolü çalışır. Katalog fiyatını doğrudan sipariş teklifine dönüştürmek bu koşulu karşılamaz.

## Kontrol

```bash
npx expo install --check
npm run check
npx expo export --platform android --output-dir dist-ci-android
npm run export:web
```

GitHub Actions Android Metro export'unu APK üretmeden doğrular. Web deposundaki iş akışı Expo web çıktısını `/DraBornBuy/` altına senkronlar.
