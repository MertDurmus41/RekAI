# Yol haritası

## Biten

- Hepsiburada tarzı arayüz: logo, arama, kategori çubuğu, marka kutucukları, filtreler
- Meta Reklam Kütüphanesi'nden reklam çekme ve seçme akışı
- Remix penceresi: üç sütun, kalemle işaretleme, logo yükleme, bekleme animasyonu
- Görseli gören planlayıcı agent + adım listesiyle düzenleme
- Ideogram 4.5 yüksek hassasiyetli düzenleme; bir remix yaklaşık 20 saniye
- Boyut kilidi (çıktı orijinalin tam boyutunda, germe yok)
- Reklam metni üretimi

## Bilinen eksikler

- **Supabase bağlı değil.** Giriş, "Remixlerim" sayfası ve kalıcı depolama çalışmıyor; sonuçlar yerel `public/remixes/` klasörüne yazılıyor.
- **Uç noktalarda koruma yok.** `/api/remix` ve `/api/ad-copy` giriş istemiyor ve kullanım sınırı uygulamıyor. Her çağrı ücretli olduğu için site bu hâliyle internete açılmamalı.
- **İçerik sabitliği.** Yüksek hassasiyet modu değişmeyen pikselleri geri yüklüyor, ama çok parçalı komutlarda (ör. arka plan + başlık) model belirtilmeyen ayrıntıları (yazı rengi gibi) kendisi seçebiliyor.
- **Bazı istekler uygulanmıyor.** Ürünlerin kamera açısını değiştirme gibi yerleşimi bozan istekler çoğu zaman atlanıyor.
- **Remix her zaman orijinalden başlıyor.** "Tekrar dene" bir önceki sonucun üstüne devam etmiyor.

## Sıradaki adımlar

1. Supabase'i bağla: giriş, `ads` ve `remixes` tabloları, depolama; uç noktalara giriş kontrolü ve günlük sınır.
2. Korumalı birleştirme: işaretlenen bölgenin dışını orijinalden geri yapıştırarak kaymaları gider.
3. Doğrulama adımı: sonuç ile adım listesini karşılaştırıp eksik kalan adımları bir kez daha uygula.
4. Sonucun üstünden devam etme (ardışık düzenleme) ve geri alma.
5. Çoklu format çıktı (1:1, 9:16, 16:9).
6. Esnafın web sitesinden/Instagram'ından marka rengi ve menü çıkarma (Firecrawl).

## Fikir havuzu

- Hazır psikolojik taktik düğmeleri (kaçırma korkusu, sosyal kanıt, mahalle dili)
- Afişten kısa video (Reels/Story)
- Rakibe yanıt afişi
