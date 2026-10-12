# Kurulum

## Gereksinimler

- Node.js 20 veya üstü (geliştirme Node 24 ile yapıldı)
- Bir fal.ai hesabı ve API anahtarı (remix için zorunlu)
- Apify ve Firecrawl anahtarları (yalnızca yeni reklam çekmek için)

## Adımlar

1. Bağımlılıkları kur:

```bash
npm install
```

2. `.env.example` dosyasını `.env.local` adıyla kopyala ve değerleri doldur. `.env.local` git'e girmez.

3. Geliştirme sunucusunu başlat:

```bash
npm run dev
```

## Ortam değişkenleri

| Değişken | Zorunlu mu | Ne için |
|---|---|---|
| `FAL_KEY` | Remix için evet | fal.ai anahtarı. `fal_sk_...` biçiminde olmalı. |
| `FAL_EDIT_MODEL` | Hayır | Görsel düzenleme modeli. Varsayılan `ideogram/v4.5/edit`. |
| `FAL_EDIT_QUALITY` | Hayır | Ideogram kalite katmanı: `very_low`, `low` (varsayılan), `medium`, `high`. Yükseldikçe yavaşlar ve pahalanır. |
| `FAL_PLANNER_REASONING` | Hayır | `on` yapılırsa planlayıcı derin düşünme modunda çalışır (yaklaşık 13 sn ekler). |
| `FAL_PLANNER_MODEL` | Hayır | Komutu adımlara çeviren, görseli gören model. Varsayılan `google/gemini-3-flash-preview`. |
| `FAL_LLM_MODEL` | Hayır | Reklam metni yazan model. Varsayılan `google/gemini-2.5-flash`. |
| `APIFY_TOKEN` | Reklam çekmek için | Meta Reklam Kütüphanesi kazıyıcısı. |
| `APIFY_ACTOR` | Hayır | Varsayılan `apify/facebook-ads-scraper`. |
| `FIRECRAWL_API_KEY` | Hayır | Marka Facebook sayfası aramak için. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Hayır | Supabase bağlanınca. Boşken giriş zorunlu değildir. |

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu (`http://localhost:3000`) |
| `npm run build` | Üretim derlemesi |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Tip kontrolü |
| `npx tsx scripts/fetch-candidates.ts ...` | Bir marka ya da kategori için reklam adaylarını indirir |
| `npx tsx scripts/finalize-candidates.ts candidates/<klasör>` | Seçilen adayları galeriye ekler |

Reklam çekme akışı için: [REKLAM-VERISI.md](REKLAM-VERISI.md).

## Sık karşılaşılan sorunlar

- **Stil değişiklikleri görünmüyor:** geliştirme sunucusunun CSS önbelleği eskimiş olabilir. Sunucuyu durdur, `.next` klasörünü sil, yeniden başlat.
- **Remix 401 veriyor:** `FAL_KEY` geçersiz. Anahtarın `fal_sk_` ile başladığını kontrol et.
- **Giriş ve "Remixlerim" sayfaları çalışmıyor:** Supabase henüz bağlı değil; beklenen durum.
- **`next.config.ts` değişti ama etkisi yok:** yapılandırma değişiklikleri için sunucuyu yeniden başlatmak gerekir.

## Supabase kurulumu

1. [supabase.com](https://supabase.com)'da proje aç.
2. SQL Editor'da sırayla çalıştır: `supabase/migrations/0001_init.sql`, sonra `0002_local_ads.sql`.
3. Project Settings → API'den **Project URL** ve **publishable (anon) key** değerlerini `.env.local` dosyasına yaz (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Service role anahtarı yalnızca eski `seed-ads.ts` için gerekir; site için gerekmez.
4. Authentication → Providers → **Google**'ı aç (Google Cloud Console'da OAuth istemcisi oluşturup kimliği ve sırrı gir).
5. Authentication → URL Configuration: Site URL ve Redirect URL'lere `http://localhost:3000/auth/callback` ile canlı adresin `/auth/callback` yolunu ekle.

Supabase bağlıyken: galeri ve API'ler girişsiz açılmaz, kullanıcı başına günlük 20 remix sınırı uygulanır, sonuçlar Supabase Storage'a kaydedilir. `NEXT_PUBLIC_SUPABASE_URL` boşsa site demo modunda çalışır.

## Vercel'e yayınlama

1. Kodu GitHub'a gönder, [vercel.com/new](https://vercel.com/new) ile repoyu içe aktar.
2. Environment Variables: `FAL_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (isteğe bağlı: `FAL_EDIT_MODEL`, `FAL_EDIT_QUALITY`, `FAL_PLANNER_MODEL`, `FAL_LLM_MODEL`).
3. `APIFY_TOKEN` ve `FIRECRAWL_API_KEY` Vercel'e girilmez; reklam çekme yalnızca yerelde yapılır.
