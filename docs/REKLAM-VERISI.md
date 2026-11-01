# Reklam verisi

Galerideki reklamlar Meta Reklam Kütüphanesi'nden (Türkiye, yayında olan reklamlar) Apify üzerinden çekilir, sonra tek tek gözle seçilir. Otomatik çekilen her şey galeriye girmez.

## Seçim kriterleri

Bir görselin galeriye girmesi için hepsi gerekir:

- Üzerinde okunabilir yazı var.
- Yazı Türkçe ya da İngilizce.
- Reklam, indirim, kampanya, menü ya da açılış afişi tarzında.
- Kısa kenarı en az 600 piksel.

Elenenler: yazısız fotoğraflar, beyaz fonda sade ürün çekimleri, ekran görüntüleri, başka dildeki reklamlar, aynı görselin kopyaları, video kareleri, konuyla ilgisiz içerik.

## Akış

Çekme ve seçme iki ayrı adımdır; ikisinin arasında insan (ya da görseli inceleyen bir ajan) karar verir.

### 1. Adayları indir

Belirli bir marka için:

```bash
npx tsx scripts/fetch-candidates.ts --brand "Starbucks" --sector "Kahve & Kafe" --pages "https://www.facebook.com/StarbucksTurkiye" --limit 40
```

Bir esnaf türü için (kategori modu; marka olarak reklamveren sayfanın adı kaydedilir):

```bash
npx tsx scripts/fetch-candidates.ts --category --brand "Dönerci" --sector "Dönerci" --keywords "döner,iskender" --limit 30
```

Çıktı `candidates/<klasör>/` altına yazılır: `img-001.jpg…`, `meta.json` ve numaralı kontak sayfaları (`sheet-1.jpg…`). Bu adım galeriye hiçbir şey eklemez.

### 2. Seç

Kontak sayfalarına bakıp tutulacakları `candidates/<klasör>/keep.json` dosyasına yaz:

```json
[
  { "n": 3, "title": "2 al 1 öde", "type": "İndirim" }
]
```

`n` kontak sayfasındaki numaradır. `type` şunlardan biri olmalı: `İndirim`, `Kampanya`, `Menü`, `Ürün Lansmanı`, `Marka Görseli`.

### 3. Galeriye ekle

```bash
npx tsx scripts/finalize-candidates.ts candidates/<klasör>
```

Görseller `public/pulled/` altına kopyalanır, künyeleri `src/data/pulled.json` dosyasına eklenir, baskın renkler görselden hesaplanır. Aynı reklam iki kez eklenmez.

## Pinterest ve Google Ads Şeffaflık Merkezi

Meta dışındaki kaynaklar için `scripts/fetch-coffee.ts` aynı aday biçimini üretir (sonra `keep.json` ve `finalize-candidates.ts` aynen geçerli):

```bash
npx tsx scripts/fetch-coffee.ts --source pinterest --brand "Kahve Pinterest" --sector "Kahve & Kafe" --limit 60 --keywords "coffee ad design,kahve reklamı"
npx tsx scripts/fetch-coffee.ts --source google --brand "Kahve Google" --sector "Kahve & Kafe" --region TR --limit 25 --keywords "kahvedunyasi.com,espressolab.com"
```

- Pinterest için `epctex/pinterest-scraper`, Google için `scrapesage/google-ads-transparency-scraper` kullanıldı. Pinterest aktörü sorgu başına yaklaşık 10 pin döndürdü; çeşitlilik için çok sayıda farklı sorgu gerekir.
- Google'ın görsel reklamları çoğunlukla banner boyutlu ya da kart önizlemesi olarak geliyor; kullanılabilir olanlar azdı. Marka adı ("advertiserName") reklamveren şirketin adıdır (örn. Espressolab için ESLAB KAHVE), elle düzeltmek gerekir.
- Apify ücretsiz planı aynı anda 5 çalıştırmaya izin verir; betik sınıra takılınca bekleyip yeniden dener.

## Hız: küçük görseller

Galeri `public/thumbs` (520 px webp) ve reklam penceresi `public/medium` (1100 px webp) kullanır; orijinaller yalnızca remix için `public/pulled` içinde durur. `finalize-candidates.ts` yeni reklam eklerken bunları kendisi üretir; eskileri yeniden üretmek için `npx tsx scripts/make-thumbs.ts --force`.

## Öğrenilenler

- Apify aktörüne verilen Reklam Kütüphanesi adresinde `media_type=image` filtresi kullanılınca sonuç boş dönüyor; filtre kullanılmıyor.
- Markanın Facebook sayfa adresi anahtar kelime aramasından çok daha isabetli. Anahtar kelime araması başka sayfaların ve başka ülkelerin (Gürcistan, Ermenistan) reklamlarını da getirir.
- Bazı markaların tüm reklamları video; bunların poster kareleri çoğu zaman reklam afişi niteliğinde değil.
- Bir Facebook sayfası başka bir markanın reklamını yayınlıyor olabilir (ör. Pidem sayfası KFC reklamları yayınlıyordu).
- Apify kullanımı ücretlidir; maliyeti `--limit` ve anahtar kelime sayısı belirler.

## Yeni kategori eklerken

Kategori çubuğundaki simgeler `src/components/AdBrowser.tsx` içindeki `SECTOR_ICONS` listesinden gelir. Listede olmayan bir sektör varsayılan simgeyle ve sırada en sonda görünür.

## Eski betikler

`scripts/fetch-ads.ts` ilk toplu çekimde kullanıldı; seçim adımı olmadığı için artık önerilmiyor. `scripts/seed-ads.ts` aynı işi Supabase'e yazar ve Supabase bağlanınca güncellenmesi gerekir.
