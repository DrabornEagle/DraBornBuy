# DraBornBuy · Ankara pilotu

Expo Go SDK 58 Android ve web uygulaması. Kullanıcı ürünleri arar; doğrulanmış Ankara şube teklifleri mevcut olduğunda sepet, mağaza kombinasyonu, yaklaşık rota, kurye, hizmet ve poşet ücretlerini birlikte karşılaştırır. Sunucu sipariş tutarını aynı ücret ayarlarıyla yeniden hesaplar.

## Termux / Expo Go 58.0.0

Yeni kurulum:

```bash
pkg update -y
pkg install -y git nodejs-lts npm
cd ~
git clone https://github.com/DrabornEagle/DraBornBuy.git
cd DraBornBuy
cp .env.example .env
nano .env
npm ci --legacy-peer-deps
npx expo login
npx expo start --lan --clear
```

Önceden klonladıysan:

```bash
cd ~/DraBornBuy
git pull origin main
npm ci --legacy-peer-deps
npx expo start --lan --clear
```

`.env` içine Supabase **publishable** anahtarını ve Mapbox **public** token'ını yerleştir. Bunlar istemci tarafında açık değerlerdir; Supabase `service_role`/secret anahtarı asla eklenmez. `.env` GitHub'a yüklenmez. Expo Go 58.0.0 ekranında SDK 58 desteklendiğinden emin ol. Termux ve Expo Go aynı telefon/ağ üzerinde çalışırken Metro'nun gösterdiği `exp://` bağlantısını Expo Go ana sayfasına gir. APK üretilmez. Önizleme sürümü ve kilit dosyası birlikte kullanılmalıdır.

Termux'ta `React Native DevTools ... arm64` kurulumu uyarısı görülebilir. **`Android Bundled` satırı geliyorsa Metro derlemesi tamamlanmıştır**; DevTools kurulum uyarısı tek başına Expo Go açılmasını engellemez. Eski `node_modules` yerine yukarıdaki `npm ci --legacy-peer-deps` komutuyla kilit dosyasındaki sürümleri kur.

## Veri durumu

- `dbb_products` sekiz kaynak bağlantılı CarrefourSA ürününün yanında Altunbilekler'in resmî sanal marketindeki fotoğraflı ürün kartlarını da içerir. `dbb-catalog-sync` Edge Function'ı resmî kategori sayfalarından ürün adı/görsel/kaynak bilgisini altı saatte bir yeniler. Sonuç ve erişilemeyen kategoriler `dbb_sync_runs` kaydında yöneticiye görünür. İlk iki çalışmadan sonra toplam 25 fotoğraflı ürün vardı; sayı kaynak sayfalarına göre değişebilir. Bütün fotoğraflar satıcının CDN bağlantılarıdır; beyaz ambalaj fotoğrafları uygulamada yuvarlak raf alanlarında gösterilir.
- `dbb_chains` market dizininde A101, BİM, Altunbilekler, Yunus Market, Migros, CarrefourSA ve ŞOK resmî bağlantıları yer alır. Dizinde bulunmak, o marketin Ankara şube fiyatı ve stoğunun sisteme bağlı olduğu anlamına gelmez.
- **Şu anda `dbb_offers` ve `dbb_stores` boştur; `dbb_enabled=false`.** İlk kayıt girişiminde yöneticiye IBAN ve ücretler, fiyat/şube eksiği nedeniyle kaydedilemedi; proje bu alanları boş gördü. Güncel durumu yönetici ekranında yeniden kontrol et. Uygulamada örnek market fiyatı, sahte stok ve kurye görevi gösterilmez.
- Genel web ürün fiyatı belirli Ankara şubesinin kasadaki fiyatı veya stoğu sayılmaz. Teklif ancak yönetici şube konumunu, nihai fiyatı, stok kontrolünü ve kaynak/kontrol notunu kaydedince görünür. Teklifler ayarlanan geçerlilik süresi dolunca müşteri listesinden çıkar; sipariş sunucuda tekrar doğrulanır.
- TÜBİTAK Market Fiyatı karşılaştırması halka açıktır; bu proje için izinli, belgelenmiş, şube/stok eşlemeli bir otomatik veri akışı henüz sağlanmadı. Resmî sayfalardan katalog taraması **fiyat veya stok taraması değildir**. A101, BİM, Migros, CarrefourSA ve Yunus şube fiyatlarının sürekli güncellenmesi için o marketlerin sağladığı güvenilir şube feed'i veya yerinde operasyon doğrulaması gerekir.

## Yönetici

Supabase projesindeki doğrulanmış `draborneagle@gmail.com` hesabının UUID'si `dbb_admins` tablosuna eklendi. Bu hesapla uygulamada **Hesap → DraBornBuy yönetimi** ekranını aç. Diğer hesaplara düzenleme yetkisi verilmez.

Panelden banka adı, işletme hesap sahibi, geçerli TR IBAN, sipariş açma anahtarı, kurye/hizmet/poşet ücretleri, teklif geçerlilik süresi, mağazalar ve Ankara koordinatları, ürünler ve görsel/kaynak bağlantıları, her şube için nihai fiyat, stok ve kontrol notu eklenip değiştirilebilir. Ödeme/ücret bilgileri şube teklifi henüz yokken de kaydedilir; sipariş anahtarı hazır koşulları sağlanıncaya kadar kapalı kalır. Kayıt sonucu düğmenin altında görünür. IBAN biçimi ve kontrol basamağı sunucuda da doğrulanır. Gerçek banka hesabını proje sahibi girmelidir; buraya herhangi bir IBAN uydurulmadı.

Yönetici operasyon panelinde dekont, banka işlem referansı, kurye başvurusu ve fiş mutabakatını yönetir. Dekont resmi tek başına ödeme kanıtı sayılmaz; banka hareketi manuel kontrol edilmelidir. Başka uygulamaların tabloları değiştirilmedi; yeni veri yapıları `dbb_` önekli, RLS korumalıdır.

## Mevcut akış ve sınırlar

Arama, barkod tarama, ürün bağlantısı araması, çok mağazalı optimizasyon, bütçeye göre kahvaltılık seçimi (yalnızca doğrulanmış teklif varsa), kayıtlı listeler, Mapbox adres ve rota tahmini, e-posta hesabı, sipariş, IBAN/dekont, manuel ödeme onayı, kurye görev ve fiş akışı, mesajlaşma, canlı olaylar/konum ve son mutabakat kodu vardır. Fiyat farkı toleransı desteklenir. Kahvaltılık düğmesi, geçerli teklif olmadığında nedeni hemen kendi altında açıklar.

Fotoğraftan/sesten ürün tanıma, AI alışveriş sohbeti, otomatik banka doğrulaması, fiş OCR, otomatik alternatif ürün onayı, canlı kampanya/stok sağlayıcıları, fiyat geçmişi ve bildirim otomasyonu henüz gerçek servislerle bağlı değildir. Böyle özellikler için ayrı veri anlaşmaları ve servis kimlik bilgileri gereklidir. Mevcut uygulama bu özellikleri varmış gibi göstermemelidir.

## Doğrulama

```bash
npm run check
EXPO_OFFLINE=1 npx expo install --check
EXPO_OFFLINE=1 npx expo export --platform android
npm run export:web
```

Veritabanı değişiklikleri `supabase/migrations/` içindedir ve paylaşılan `DraBorn-Park-Garage-SportOdds` projesine uygulanmıştır. Yeni migration yalnızca DraBornBuy nesnelerine dokunur. Gerçek siparişi açmadan önce Ankara şubesi fiyat/stok doğrulaması, kurye operasyonu ve işletme IBAN'ı gerekir.
