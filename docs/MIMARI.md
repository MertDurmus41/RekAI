# Mimari

## Klasör yapısı

```
src/
  app/
    page.tsx                 Ana sayfa (galeri)
    login/, auth/            E-posta ile giriş (Supabase bağlanınca çalışır)
    remixes/                 Kullanıcının remixleri (Supabase bağlanınca çalışır)
    api/remix/route.ts       Remix hattı: plan -> düzenleme -> boyut kilidi
    api/ad-copy/route.ts     Reklam metni üretimi
  components/
    AdBrowser.tsx            Üst bar, kategori çubuğu, marka kutucukları, filtreler, ızgara
    RemixModal.tsx           Üç sütunlu remix penceresi
    DrawLayer.tsx            Orijinal üstüne kalemle çizim katmanı
    GeneratingView.tsx       Üretim sırasındaki bekleme animasyonu
    Logo.tsx
  data/
    ads.ts                   Galerinin okuduğu reklam listesi ve renk paleti
    pulled.json              Apify'dan çekilip seçilmiş reklamların künyesi
  lib/
    remix-prompt.ts          En-boy oranı/kenar payı hesabı ve düzenleme talimatı
    supabase/                Supabase istemcileri (henüz kullanılmıyor)
  proxy.ts                   Oturum kontrolü; Supabase ayarı yoksa devre dışı
public/
  pulled/                    Çekilen reklam görselleri
  ads/                       Elle eklenen iki reklam
  remixes/                   Üretilen sonuçlar (git'e girmez)
scripts/                     Reklam çekme ve seçme betikleri
supabase/migrations/         Veritabanı şeması (henüz uygulanmadı)
candidates/                  Aday reklamlar, seçim öncesi (git'e girmez)
```

## Remix hattı (`src/app/api/remix/route.ts`)

İstek: `adId`, `prompt`, isteğe bağlı `file` (kullanıcının logosu/ürünü) ve `marks` (kalem çizimleri, şeffaf PNG).

1. **Hazırlık.** Orijinal görsel okunur. Ideogram dışındaki modellerde görselin oranı desteklenen oranlardan biri değilse kenarları en yakın orana kadar uzatılır (`paddingFor`). Çizimler orijinalin küçültülmüş kopyasına bindirilerek "işaretli kopya" oluşturulur. Tüm yüklemeler paralel yapılır.
2. **Planlama (agent).** Görseli gören bir dil modeli orijinali, işaretli kopyayı ve kullanıcının görselini alır; komutu tek tek uygulanabilir İngilizce adımlara çevirir. Kurallar: bir ögeye tek adım (çelişen istekler tek son duruma indirgenir), hedef "ne ve nerede" diye tarif edilir, yazılacak metin harfi harfine korunur, kalem işaretlerinden hiç söz edilmez.
3. **Düzenleme.** Görsel modeline orijinal + kullanıcının görseli ve numaralı adım listesi gider. İşaretli kopya gönderilmez; böylece çizimler çıktıya sızmaz. Planlama başarısız olursa ham komut tek adım olarak kullanılır ve işaretli kopya da gönderilir.
4. **Boyut kilidi.** Çıktı orijinalin tam genişlik ve yüksekliğindedir. Model zaten o boyutta verdiyse olduğu gibi kaydedilir; değilse tuval boyutuna getirilip eklenen kenar kesilir. Oran tutmuyorsa görsel gerilmez, kırpılır.
5. **Kayıt.** Sonuç şimdilik `public/remixes/` altına yazılır.

## Tasarım kararları ve nedenleri

- **Yeniden üretim yerine talimatla düzenleme.** Ürünün ana kuralı "sadece istenen değişsin". Bu yüzden görseli baştan üreten değil, var olanı düzenleyen modeller kullanılır.
- **Görseli gören planlayıcı.** İlk sürümde planlayıcı yalnızca metni okuyordu; çok parçalı komutlarda istekler atlanıyor, çelişen istekler yarım uygulanıyordu. Aynı komut adım listesiyle verildiğinde denenen dört modelin hepsi tüm adımları uyguladı.
- **Model seçimi.** Aynı senaryo birkaç modelde karşılaştırıldı. Varsayılan `ideogram/v4.5/edit`, yüksek hassasiyet (`edit_precision: "high"`) ve düşük kalite katmanıyla çalışır: değişmeyen pikselleri orijinalden geri yükler, kaynağın boyutunu aynen korur ve yaklaşık 13 saniyede sonuç verir. Yerel bir düzenlemede değişmemesi gereken bölgedeki ortalama piksel farkı 1,2/255 ölçüldü; `nano-banana-pro` ile aynı ölçüm 10,6 idi ve o model yaklaşık 30 saniye sürüyordu. `FAL_EDIT_MODEL` başka bir modele çevrilirse eski yol (oran için kenar uzatma) devreye girer.
- **Hız.** Bir remix yaklaşık 20 saniye sürer: yükleme ~2 sn, planlama ~4 sn, düzenleme ~13 sn, kaydetme ~2 sn. Bunu sağlayanlar: yüklemelerin paralel yapılması, planlayıcıya küçültülmüş kopyaların verilmesi, planlayıcıda derin düşünme modunun kapalı olması (`FAL_PLANNER_REASONING=on` ile açılır; ~13 sn ekler, planı belirgin iyileştirmedi) ve boyutu zaten doğru olan çıktının yeniden kodlanmaması.
- **Germek yerine kenar uzatma.** Sonucu orijinal boyuta zorla getirmek görseli bozuyordu. Belirli oranlarda üreten modellerde kenar uzatıp geri kesmek oranı korur; Ideogram'da buna gerek kalmaz.
- **Yerel veri.** Galeri şimdilik `pulled.json` ve `public/` klasöründen okur. Supabase şeması ve giriş kodu hazır, bağlanınca bu katman değişecek.

## Bilinen sınırlar

- Model piksel düzeyinde sabitlik garanti etmez; değişmemesi gereken ögelerde küçük kaymalar olabilir.
- Ürünlerin kamera açısını değiştirme gibi yerleşimi bozan istekler çoğu zaman uygulanmaz.
- Remix ve reklam metni uç noktalarında giriş kontrolü ve kullanım sınırı yok; Supabase bağlanmadan internete açılmamalı.
