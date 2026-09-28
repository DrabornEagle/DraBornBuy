# DraBornBuy · Ankara pilotu

Expo SDK 58 / Expo Go 58.0.0 Android ve web uygulaması. Ürün kataloğu ve çevrimiçi referans fiyatları otomatik yenilenir. Sepet optimizasyonu, yalnızca Ankara'da fiyatı ve stoğu doğrulanmış şube teklifleriyle teslimat dahil hesap yapar.

Android ve [web sürümü](https://www.draborneagle.com/DraBornBuy/) aynı Expo kaynak kodunu ve Supabase projesini kullanır. Oturum açan müşterinin etkin sepeti `dbb_baskets` ile iki cihaz arasında, kayıtlı alışveriş listeleri ise `dbb_saved_lists` ile eşitlenir. Giriş yapılmadan oluşturulan sepet yalnızca cihazda kalır ve girişte mevcut hesap sepetiyle birleştirilir.

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

`.env` dosyasına Supabase **publishable** anahtarını ve Mapbox **public** token'ını koy. `service_role`/secret anahtarı uygulamaya veya GitHub'a konmaz. `.env` git dışında tutulur. Termux ve Expo Go aynı ağdayken Metro'nun `exp://` adresini Expo Go'da aç. APK oluşturulmaz. Termux'ta React Native DevTools için `arm64` uyarısı görülebilir; `Android Bundled` tamamlanıyorsa bu tek başına Metro derlemesini engellemez.

Web yayınındaki `/DraBornBuy` alt yolunu Expo `experiments.baseUrl` ayarlar. `.env.production` yalnızca tarayıcıda zaten görünen Supabase URL ve publishable anahtarını içerir. Web yayını için Mapbox public token'ı GitHub Actions `DBB_MAPBOX_TOKEN` değişkeni ile ayrıca sağlanır; değişken yoksa harita/adres araması kullanılamaz. Sunucu veya banka sırları burada bulunmaz. `DrabornEagle_Web` deposunun Pages iş akışı ana depodan web çıktısını üretir.

## Otomatik veri akışı

- `dbb-catalog-sync` Edge Function, Altunbilekler'in yayımlanan ürün sitemap'ini 24 ürünlük gruplarla her beş dakikada bir dolaşır. Görsel, kaynak adresi, barkod (varsa), ürün adı ve çevrimiçi stok işaretini `dbb_products` içine kaydeder. Kaynak sayfasında çevrimiçi stok sıfırsa eski fiyat alanı temizlenir; sadece stoklu ürünün fiyatı referans olarak görünür. İşlem günlüğü `dbb_sync_runs`, kalıcı ilerleme `dbb_catalog_cursor` içindedir. Kaynak değişirse tarama başarısız olur ve yönetici durumunu görür; otomatik ağ bağlantısı veya veri doğruluğu garantisi yoktur.
- Katalog dinamik büyür; başlangıç ekranı toplam sayıyı gösterir, arama bütün ürünlerde çalışır ve liste sayfalar halinde yüklenir. A101, BİM, Migros, CarrefourSA, ŞOK ve Yunus Market'in doğrulanmış şube verisi bu taramadan gelmez. Zincir adı veya ürün fotoğrafı, o markette mevcut şube fiyatı/stok kanıtı değildir.
- Perakendecinin beyaz fonlu JPEG fotoğrafı şeffaf PNG gibi gösterilmez. Kaynağın gerçek alfa kanallı Nutella ambalaj görseli kullanılır; diğerleri etiket/ambalaj doğruluğu korunarak nötr ürün alanlarında sunulur. Tüm ürünler için özgün şeffaf görsel kaynağı mevcut değildir.
- Sepette teklif yoksa çevrimiçi ürün toplamı yalnızca bütün kalemler son 24 saatte stoklu ve fiyatlı olarak görüldüğünde **taslak referans** olarak görünür; diğer durumda toplam hesaplanmaz. Kurye, hizmet ve poşet ücreti bu tutara dahil değildir. Bütçeli kahvaltılık düğmesi böyle kaynaklar varsa taslak çıkarır; bulunmazsa açık geri bildirim verir.

## Sipariş uygunluğu

Yönetici `draborneagle@gmail.com` hesabı `dbb_admins` ile yetkilidir. Hesap ekranında IBAN, banka adı, işletme hesap sahibi ve ücretler düzenlenir; kaydetme sonucu panelde gösterilir. Sipariş açma isteği `dbb_requested_enabled` içinde kalıcıdır. `dbb_readiness_every_5m` işi işletme banka hesabı, aktif Ankara şubesi, geçerli stoklu doğrulanmış şube teklifi ve onaylı kurye bulunduğunda `dbb_enabled` durumunu yeniden hesaplar. Teklif süresi dolduğunda sipariş yeniden kapanır.

Çevrimiçi fiyat/stok yalnızca referanstır; Ankara şube stoğu diye `dbb_offers` içine kopyalanmaz. **Şu an şube teklifleri ve aktif şubeler sıfır; gerçek siparişler kapalıdır.** İşletme hesabı kaydedilmiş olsa bile kullanıcıya ödeyemeyeceği veya kuryenin alamayacağı bir sipariş sunulmaz. A101, BİM ve diğer zincirlerde otomatik gerçek sipariş için yetkili, şubeye özgü güvenilir fiyat/stok bağlantısı gerekir. Bu kaynak olmadan uygulama kendi kendine kesin şube stoğu üretemez.

## Mevcut işlevler

Arama ve barkod tarama, ürün linkindeki kelimelerle arama, taslak sepet ve kayıtlı listeler, uygun tekliflerde çok mağazalı optimizasyon ve tek mağaza karşılaştırması, Mapbox adres/rota tahmini, bütçeli kahvaltılık taslağı, hesap, ödeme dekontu, manuel banka kontrolü, kurye görevleri, fiş mutabakatı, mesajlaşma ve sipariş olayları kodlanmıştır. Fotoğraf/ses tanıma, AI sohbet, fiş OCR, otomatik banka doğrulama, tüm zincirler için canlı stok, kampanya ve fiyat geçmişi gerçek servislerle bağlı değildir.

Supabase şeması `dbb_` öneki ve RLS ile aynı projedeki diğer uygulamalardan ayrı tutulur. Migration dosyaları `supabase/migrations/` içindedir.

## Doğrulama

```bash
npm run check
EXPO_OFFLINE=1 npx expo install --check
EXPO_OFFLINE=1 npx expo export --platform android
npm run export:web
```
