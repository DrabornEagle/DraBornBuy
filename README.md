# DraBornBuy · Ankara pilotu v0.1

Expo SDK 58 Android/Expo Go ve web için ortak React Native uygulaması. Sepet, doğrulanmış mağaza teklifleriyle ürün fiyatı + mağaza sayısı + yaklaşık rota + kurye + hizmet + poşet ücretini birlikte değerlendirir. Ankara dışı sipariş sunucuda engellenir.

## Termux / Expo Go 58.0.0

```bash
pkg update -y
pkg install -y git nodejs-lts
cd ~
git clone https://github.com/DrabornEagle/DraBornBuy.git
cd DraBornBuy
cp .env.example .env
nano .env
npm ci --legacy-peer-deps
npx expo start --lan --clear
```

Telefon ve Expo Go aynı Wi-Fi ağında olmalı. Expo Go 58.0.0 ile Termux'ta görünen QR kodu okutun veya gösterilen `exp://` adresini Expo Go ana sayfasına girin. Termux'ta Node 22.13+ gerekir. Bu sürümde APK üretilmez. Web denemesi için `npm run web`; üretim web dosyaları için `npm run export:web`.

`.env` dosyasındaki iki yer tutucuyu sana verilen Supabase **publishable** anahtarı ve Mapbox **public** token'ı ile değiştir. `.env` GitHub'a yüklenmez; GitHub gizli bilgi taraması token'ı repoya yazmayı engeller. `service_role` veya Supabase secret key mobil uygulamaya asla eklenmez.

`expo@58.0.0-preview.7`, Expo SDK 58'in 28 Eylül 2026 tarihinde npm'de yayımlanmış önizleme sürümüdür. Expo Go ekranında desteklenen SDK'nın **58** olduğundan emin olun. `--legacy-peer-deps`, önizleme React Native `0.88.0-rc.1` sürümünün bazı paketlerin kararlı sürüm peer aralığına girmemesi içindir. Kilit dosyası sabit bağımlılıkları korur.

## Neler çalışıyor?

- Ankara örnek kataloğuyla Türkçe arama, ürün linkindeki adı eşleştirme, barkod kamerası, kategori filtreleri ve sepet; örnek veri tüm ekranlarda açıkça işaretlidir.
- Teslimat dahil bütçeye sığan kahvaltılık örnek listesi ve hesabınla Android/web arasında eşzamanlı kayıtlı sepetler.
- Tek mağaza ve toplam maliyeti en düşük mağaza kombinasyonu. 50.000'e kadar kombinasyon tam taranır; daha büyük sepetlerde 180 adaylı yaklaşık arama açıkça etiketlenir. En fazla 4 mağazalık gerçek sipariş sunucuda kabul edilir.
- Mapbox v6 Ankara adres araması ve statik harita, yol süresi tahmini. Fiyat hesabı kuş uçuşu uzaklığa göre sunucuda yeniden yapılır. Motorlu araç yol süresi bilgilendirme içindir.
- Supabase e-posta hesabı, aynı veriyi Android ve web'de kullanma, sunucu tarafından fiyatı tekrar hesaplanan sipariş, IBAN/dekont yükleme, gerçek banka işlem referansını isteyen manuel yönetici onayı.
- Kurye başvurusu/onayı, müşteri adresini gizleyen ödeme onaylı iş havuzu, tek kurye tarafından atomik kabul, mağaza/ürün işaretleme, fiyat toleransı, uygulama açıkken konum paylaşımı, mesajlaşma ve olay akışı.
- Ayrı `dbb_` tabloları ve RLS; özel `dbb_receipts` bucket. Diğer ortak Supabase tablolarına müdahale edilmez.

## Canlı sipariş açma koşulları

**Varsayılan `dbb_enabled=false` ve hiç mağaza/teklif yoktur.** Demo fiyatları yalnızca işleyişi denemek içindir. Gerçek piyasa fiyatı, stok veya mağaza anlaşması iddiası taşımaz. Para transferi istemek için önce Ankara mağazalarını, gerçek ürün eşleştirmelerini, güncel doğrulanmış fiyatları, stok kontrol sürecini, kurye operasyonunu ve işletme IBAN'ını kurun. Supabase Dashboard SQL Editor'da `dbb_*` tablolarını yönetin; hiçbir zaman uydurma veriyi `dbb_verified=true` yapmayın.

Yönetici hesabı oluşturduktan sonra **yalnızca ilgili hesabın e-posta adresiyle** `auth.users` içinden kendi UUID'sini bulun. SQL Editor'da kendi hesabını yetkilendirme örneği:

```sql
insert into public.dbb_admins(dbb_user_id)
select id from auth.users where email = 'SIZIN_EPOSTANIZ'
on conflict do nothing;
```

Fiyatları gerçekten doğruladıktan ve ödeme hesabını belirledikten sonra:

```sql
update public.dbb_config
set dbb_bank_name = 'BANKA ADI', dbb_account_holder = 'HESAP SAHİBİ',
    dbb_iban = 'TR...', dbb_enabled = true
where dbb_key = 'ankara';
```

Bu komutları örnek yer tutucularla çalıştırmayın. Fiyat kaynağı şu anda manuel/partner verisi içindir; marketlerin canlı fiyat API'leri, kampanyaları ve stok entegrasyonları kurulmadı. `dbb_offers` RLS yalnızca doğrulanmış, stokta ve son 24 saat içinde kontrol edilmiş aktif ürünleri gösterir. Yönetici panelinde dekont onayı, **banka hareketi ve benzersiz işlem referansı manuel kontrol edilmeden verilmemelidir**. Dekont üzerindeki yazı bir ödeme doğrulaması değildir.

## Mimari ve devam planı

- `src/dbb-optimizer.ts`: saf hesaplama fonksiyonları; kuruş cinsinden tam sayılar.
- `src/dbb-api.ts`: Supabase ve Mapbox istemcileri. `EXPO_PUBLIC_*` değerleri herkese açıktır; gizli servis anahtarı burada bulunmaz.
- `supabase/migrations/`: yalnızca `dbb_` uygulama nesneleri. İlk göçler bağlı Supabase projesine uygulanmıştır. Aynı projede tekrar çalıştırmayın.
- Android ve web aynı Auth ve Supabase veritabanını kullanır. Aktif sepet cihazda saklanır; kayıtlı listeler, gerçek siparişler ve mesajlar sunucuda eşzamanlıdır.
- Sonraki işler: güvenilir fiyat sağlayıcıları ve stok anlaşmaları; barkod ürün kataloğu genişletme; fotoğraf/sesle ürün tanıma; AI alışveriş önerileri; onaylı alternatif seçimi; fiş OCR ve iade mutabakatı; kampanyalar/fiyat geçmişi/bildirimler; gerçek kurye uygunluğu/konumuyla rota maliyeti; çok mağazalı sipariş yükleme performansı.

## Doğrulama

```bash
npm run check
npm run export:web
npx expo install --check
```

Gerçek transferi, iki ayrı telefonun canlı konum paylaşımını ve mağaza içi stok akışını test etmek için pilot verisi ve gerçek işletme hesapları gerekir. Demo sipariş hiçbir banka veya kurye görevi oluşturmaz.
