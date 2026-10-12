# adremix

Esnaf, kafe ve küçük dükkân sahipleri için reklam remix aracı. Kullanıcı, yayında olan gerçek reklamlardan birini seçer, ne değişmesini istediğini yazar (isterse kalemle işaretler ve kendi logosunu yükler) ve yalnızca istediği şeyler değişmiş yeni bir görsel alır.

## Ne yapıyor

- **Galeri:** Meta Reklam Kütüphanesi'nden çekilmiş, elle seçilmiş reklamlar. Kategori, marka, içerik türü ve baskın renge göre filtrelenir; 30 günden uzun süredir yayında olanlar rozetle işaretlenir.
- **Remix penceresi:** solda orijinal, ortada komut, sağda sonuç. Orijinalin üstüne kalemle çizilebilir ("işaretlediğim logoyu kaldır").
- **Agent:** komutu, görseli ve kalem işaretlerini görerek tek tek uygulanabilir düzenleme adımlarına çevirir; görsel modeli yalnızca bu adımları uygular.
- **Boyut kilidi:** çıktı her zaman orijinalin piksel boyutundadır; görsel hiçbir aşamada gerilmez.
- **Reklam metni:** üretilen görsel için başlık, ana metin ve buton önerisi.

## Hızlı başlangıç

```bash
npm install
```

`.env.example` dosyasını `.env.local` adıyla kopyalayıp `FAL_KEY` değerini gir, sonra:

```bash
npm run dev
```

Site `http://localhost:3000` adresinde açılır. Ayrıntılar: [docs/KURULUM.md](docs/KURULUM.md).

## Belgeler

| Belge | İçerik |
|---|---|
| [docs/KURULUM.md](docs/KURULUM.md) | Kurulum, ortam değişkenleri, komutlar |
| [docs/MIMARI.md](docs/MIMARI.md) | Klasör yapısı, remix hattının adımları, tasarım kararları |
| [docs/REKLAM-VERISI.md](docs/REKLAM-VERISI.md) | Reklamların nasıl çekildiği, seçim kriterleri, yeni reklam ekleme |
| [docs/YOL-HARITASI.md](docs/YOL-HARITASI.md) | Biten işler, bilinen eksikler, sıradaki adımlar |
| [AGENTS.md](AGENTS.md) | Kod yazan yapay zekâ ajanları için not (Next.js 16) |

## Teknoloji

Next.js 16 (App Router, TypeScript), Tailwind CSS 4, fal.ai (Ideogram 4.5 ile görsel düzenleme, Gemini ile planlama), Apify (Meta Reklam Kütüphanesi), Firecrawl (marka sayfası bulma), sharp (görsel işleme). Supabase (giriş, veritabanı, depolama) için kod hazır ama henüz bağlı değil.

## Önemli uyarı

Galerideki reklamlar üçüncü taraf markalara aittir ve yalnızca ilham/şablon olarak gösterilir. Başka bir markanın logosunu ya da tescilli görselini kendi reklamında yayınlamak hukuki risk taşır. Bu depo özel (private) tutulmalıdır.
