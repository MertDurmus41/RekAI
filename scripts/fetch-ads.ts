/**
 * Apify ile Meta Reklam Kütüphanesi'nden Türkiye'de yayındaki yemek-içecek reklamlarını çeker.
 * Görselleri public/pulled/ altına, künyeyi src/data/pulled.json'a yazar (Supabase gerekmez).
 *
 *   npm run fetch-ads -- "Burger King"        -> tek marka
 *   npm run fetch-ads                          -> tüm markalar
 *   npm run fetch-ads -- "KFC" --limit 40      -> Apify'dan istenen reklam sayısı
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { ApifyClient } from "apify-client";
import { config } from "dotenv";
import sharp from "sharp";

config({ path: ".env.local" });

const MIN_SIDE = 600; // bundan küçük görseller bulanık olur, atlanır
const PER_BRAND = 8;
const OUT_DIR = "public/pulled";
const OUT_JSON = "src/data/pulled.json";

const BRANDS: { name: string; sector: string; page?: string }[] = [
  { name: "Burger King", sector: "Burger", page: "BurgerKingTurkiye" },
  { name: "McDonald's", sector: "Burger", page: "McDonaldsTurkiye" },
  { name: "KFC", sector: "Tavuk", page: "KFCTurkiye" },
  { name: "Popeyes", sector: "Tavuk" },
  { name: "Domino's Pizza", sector: "Pizza", page: "DominosTurkiye" },
  { name: "Starbucks", sector: "Kahve & Kafe", page: "StarbucksTurkiye" },
  { name: "Kahve Dünyası", sector: "Kahve & Kafe" },
  { name: "Simit Sarayı", sector: "Fırın & Tatlı" },
  { name: "Coca-Cola", sector: "İçecek", page: "CocaColaTurkiye" },
  { name: "Pepsi", sector: "İçecek", page: "PepsiTurkiye" },
  { name: "Red Bull", sector: "İçecek" },
  { name: "Yemeksepeti", sector: "Yemek Siparişi", page: "yemeksepeti" },
  { name: "Getir", sector: "Yemek Siparişi", page: "GetirYemek" },
];

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Entry = {
  id: string;
  file: string;
  brand: string;
  sector: string;
  type: string;
  title: string;
  width: number;
  height: number;
  colors: string[];
  startedAt: string | null;
  sourceUrl: string;
};

function bucket(r: number, g: number, b: number): string | null {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const s = mx ? d / mx : 0;
  if (mx < 0.18 || s < 0.28) return null;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  if (h < 15 || h >= 345) return "kirmizi";
  if (h < 40) return mx < 0.6 ? "kahverengi" : "turuncu";
  if (h < 70) return "sari";
  if (h < 170) return "yesil";
  if (h < 260) return "mavi";
  return "pembe";
}

async function dominantColors(buf: Buffer): Promise<string[]> {
  const { data } = await sharp(buf).resize(64, 64, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const counts: Record<string, number> = {};
  let n = 0;
  for (let i = 0; i < data.length; i += 3) {
    const k = bucket(data[i], data[i + 1], data[i + 2]);
    if (k) { counts[k] = (counts[k] ?? 0) + 1; n++; }
  }
  return Object.entries(counts)
    .filter(([, v]) => v / n >= 0.18)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);
}

function guessType(text: string): string {
  const t = text.toLocaleLowerCase("tr");
  if (/indirim|%\s?\d|\d+\s?tl|fırsat|hediye|bedava/.test(t)) return "İndirim";
  if (/menü|menu|combo|kombo/.test(t)) return "Menü";
  if (/yeni|lansman|artık/.test(t)) return "Ürün Lansmanı";
  if (/kampanya|ramazan|bayram|yılbaşı/.test(t)) return "Kampanya";
  return "Marka Görseli";
}

const normalize = (s: string) => s.toLocaleLowerCase("tr").replace(/[^a-z0-9ığüşöç]/g, "");

function imageUrlsOf(item: Raw): string[] {
  const snap = item.snapshot ?? {};
  const sources: Raw[] = [...(snap.images ?? []), ...(snap.cards ?? []), ...(snap.videos ?? [])];
  return sources
    .map((s) => s.originalImageUrl ?? s.original_image_url ?? s.resizedImageUrl ?? s.resized_image_url)
    .filter((u): u is string => typeof u === "string");
}

async function main() {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN .env.local içinde yok");
  const apify = new ApifyClient({ token });
  const actor = process.env.APIFY_ACTOR ?? "apify/facebook-ads-scraper";

  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 25;
  const only = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--limit");
  const brands = only ? BRANDS.filter((b) => b.name === only) : BRANDS;
  if (!brands.length) throw new Error(`Bilinmeyen marka: ${only}`);

  mkdirSync(OUT_DIR, { recursive: true });
  const entries: Entry[] = existsSync(OUT_JSON) ? JSON.parse(readFileSync(OUT_JSON, "utf8")) : [];
  const seen = new Set(entries.map((e) => e.sourceUrl));

  for (const brand of brands) {
    const keywordUrl =
      "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TR&search_type=keyword_unordered&q=" +
      encodeURIComponent(brand.name);
    const candidates = [brand.page ? `https://www.facebook.com/${brand.page}` : null, keywordUrl].filter(Boolean) as string[];

    let own: Raw[] = [];
    for (const url of candidates) {
      console.log(`
${brand.name}: Apify çalışıyor (${url.includes("ads/library") ? "anahtar kelime" : "marka sayfası"}, en fazla ${limit} reklam)…`);
      const run = await apify.actor(actor).call({ startUrls: [{ url }], resultsLimit: limit, activeStatus: "active" }, { log: null as never });
      const { items } = await apify.dataset(run.defaultDatasetId).listItems();
      if (process.env.DEBUG_FIRST && items[0]) console.log(JSON.stringify((items[0] as Raw).snapshot, null, 1).slice(0, 2500));
      own = (items as Raw[]).filter((it) =>
        normalize(String(it.pageName ?? it.snapshot?.pageName ?? "")).includes(normalize(brand.name.split(" ")[0])),
      );
      console.log(`  ${items.length} reklam geldi, ${own.length} tanesi markanın kendi sayfasından`);
      if (own.length) break;
    }

    let saved = 0, tooSmall = 0;
    for (const it of own) {
      if (saved >= PER_BRAND) break;
      const adId = String(it.adArchiveID ?? it.adArchiveId ?? it.ad_archive_id ?? "");
      const sourceUrl = `https://www.facebook.com/ads/library/?id=${adId}`;
      const imageUrl = imageUrlsOf(it)[0];
      if (!adId || !imageUrl || seen.has(sourceUrl)) continue;

      const res = await fetch(imageUrl);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(buf).metadata();
      if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < MIN_SIDE) { tooSmall++; continue; }

      const hash = createHash("sha1").update(buf).digest("hex").slice(0, 12);
      if (entries.some((e) => e.id === hash)) continue;
      const file = `${hash}.jpg`;
      await sharp(buf).flatten({ background: "#fff" }).jpeg({ quality: 92 }).toFile(`${OUT_DIR}/${file}`);

      const body: string = it.snapshot?.body?.text ?? it.snapshot?.cards?.[0]?.body ?? "";
      const title =
        (it.snapshot?.title ?? body.split("\n")[0] ?? "").replace(/\{\{.*?\}\}/g, "").trim().slice(0, 70) ||
        `${brand.name} reklamı`;
      const start = it.startDateFormatted ?? (it.startDate ? new Date(it.startDate * 1000).toISOString() : null);
      entries.push({
        id: hash,
        file,
        brand: brand.name,
        sector: brand.sector,
        type: guessType(`${title} ${body}`),
        title,
        width: meta.width,
        height: meta.height,
        colors: await dominantColors(buf),
        startedAt: start ?? null,
        sourceUrl,
      });
      seen.add(sourceUrl);
      saved++;
    }
    console.log(`  ${saved} yeni reklam kaydedildi, ${tooSmall} görsel çok küçük olduğu için atlandı`);
    writeFileSync(OUT_JSON, JSON.stringify(entries, null, 2));
  }
  console.log(`\nToplam ${entries.length} reklam: ${OUT_JSON}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
