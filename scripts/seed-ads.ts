/**
 * Meta Reklam Kütüphanesi'nden (Apify üzerinden) Türkiye'de yayındaki yemek-içecek
 * reklamlarını çekip Supabase'e yazar. Tekrar çalıştırmak güvenlidir.
 *
 *   npm run seed                 -> tüm markalar
 *   npm run seed -- "Burger King" -> tek marka
 */
import { createHash } from "node:crypto";
import { ApifyClient } from "apify-client";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import sharp from "sharp";
import type { Category } from "../src/lib/types";

config({ path: ".env.local" });

const PER_BRAND = 10; // marka başına kaydedilecek görsel
const FETCH_LIMIT = 30; // marka başına Apify'dan istenen reklam (ücreti bu belirler)
const MIN_SIDE = 500;

const BRANDS: { name: string; category: Category }[] = [
  { name: "Burger King", category: "Burger" },
  { name: "McDonald's", category: "Burger" },
  { name: "KFC", category: "Tavuk" },
  { name: "Popeyes", category: "Tavuk" },
  { name: "Domino's", category: "Pizza" },
  { name: "Little Caesars", category: "Pizza" },
  { name: "Starbucks", category: "Kahve & Kafe" },
  { name: "Kahve Dünyası", category: "Kahve & Kafe" },
  { name: "Espressolab", category: "Kahve & Kafe" },
  { name: "Simit Sarayı", category: "Tatlı & Fırın" },
  { name: "Mado", category: "Tatlı & Fırın" },
  { name: "Coca-Cola", category: "İçecek" },
  { name: "Pepsi", category: "İçecek" },
  { name: "Red Bull", category: "İçecek" },
  { name: "Yemeksepeti", category: "Yemek Siparişi" },
  { name: "Getir", category: "Yemek Siparişi" },
];

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} .env.local içinde tanımlı değil`);
  return value;
}

const normalize = (s: string) =>
  s.toLocaleLowerCase("tr").replace(/[^a-z0-9ığüşöç]/g, "");

// Aktörün çıktısı sürüme göre camelCase veya snake_case gelebiliyor.
type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function imageUrlsOf(item: Raw): string[] {
  const snapshot = item.snapshot ?? {};
  const sources = [...(snapshot.images ?? []), ...(snapshot.cards ?? [])];
  return sources
    .map((s: Raw) => s.originalImageUrl ?? s.original_image_url)
    .filter((url: unknown): url is string => typeof url === "string");
}

async function main() {
  const apify = new ApifyClient({ token: env("APIFY_TOKEN") });
  const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const actor = process.env.APIFY_ACTOR ?? "apify/facebook-ads-scraper";

  const only = process.argv[2];
  const brands = only ? BRANDS.filter((b) => b.name === only) : BRANDS;
  if (brands.length === 0) throw new Error(`Bilinmeyen marka: ${only}`);

  for (const brand of brands) {
    const searchUrl =
      "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TR&media_type=image&search_type=keyword_unordered&q=" +
      encodeURIComponent(brand.name);

    console.log(`\n${brand.name}: Apify çalışıyor…`);
    const run = await apify.actor(actor).call({
      startUrls: [{ url: searchUrl }],
      resultsLimit: FETCH_LIMIT,
      activeStatus: "active",
    });
    const { items } = await apify.dataset(run.defaultDatasetId).listItems();

    // Anahtar kelime araması başka sayfaların reklamlarını da getirir; sadece markanın kendi sayfası.
    const own = (items as Raw[]).filter((item) =>
      normalize(String(item.pageName ?? item.page_name ?? item.snapshot?.pageName ?? "")).includes(
        normalize(brand.name),
      ),
    );
    console.log(`  ${items.length} reklam geldi, ${own.length} tanesi markanın kendi sayfasından`);

    let saved = 0;
    for (const item of own) {
      if (saved >= PER_BRAND) break;
      const adId = item.adArchiveID ?? item.adArchiveId ?? item.ad_archive_id;
      const imageUrl = imageUrlsOf(item)[0];
      if (!adId || !imageUrl) continue;

      const res = await fetch(imageUrl);
      if (!res.ok) continue;
      const original = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(original).metadata();
      if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < MIN_SIDE) continue;

      // Aynı görsel birden çok reklamda kullanılıyor; içerik özeti yol olduğu için tekrarlar çakışır.
      const hash = createHash("sha1").update(original).digest("hex");
      // Supabase Storage yolları ASCII olmalı
      const folder = normalize(brand.name).replace(/[^a-z0-9]/g, "");
      const imagePath = `${folder}/${hash}.jpg`;
      const jpeg = await sharp(original).jpeg({ quality: 92 }).toBuffer();

      const { error: uploadError } = await supabase.storage
        .from("ads")
        .upload(imagePath, jpeg, { contentType: "image/jpeg" });
      if (uploadError) {
        if (!/exists/i.test(uploadError.message)) console.warn(`  yükleme hatası: ${uploadError.message}`);
        continue;
      }

      const snapshot = item.snapshot ?? {};
      const bodyText: string | null = snapshot.body?.text ?? null;
      const startSeconds = item.startDate ?? item.start_date;
      const { error: insertError } = await supabase.from("ads").insert({
        brand: brand.name,
        category: brand.category,
        title: snapshot.title ?? bodyText?.split("\n")[0].slice(0, 80) ?? null,
        body_text: bodyText,
        image_path: imagePath,
        width: meta.width,
        height: meta.height,
        started_at: startSeconds ? new Date(startSeconds * 1000).toISOString() : null,
        source_url: `https://www.facebook.com/ads/library/?id=${adId}`,
      });
      if (insertError) {
        console.warn(`  kayıt hatası: ${insertError.message}`);
        continue;
      }
      saved++;
    }
    console.log(`  ${saved} yeni reklam kaydedildi`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
