/**
 * Bir marka için Apify (Meta Reklam Kütüphanesi) adaylarını candidates/<slug>/ altına indirir.
 * Galeriye HİÇBİR ŞEY eklemez; seçim `finalize-candidates.ts` ile yapılır.
 *
 *   npx tsx scripts/fetch-candidates.ts --brand "Starbucks" --sector "Kahve & Kafe" \
 *     --pages "https://www.facebook.com/StarbucksTurkiye" [--keyword "starbucks"] [--limit 40]
 *
 * Kategori modu (belirli bir marka yerine bir esnaf türü):
 *   npx tsx scripts/fetch-candidates.ts --category --brand "Dönerci" --sector "Dönerci"
 *     --keywords "döner,iskender,dürüm döner" --limit 30
 *
 * Çıktı: candidates/<slug>/img-001.jpg…, meta.json, sheet-1.jpg… (numaralı kontak sayfaları)
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { ApifyClient } from "apify-client";
import { config } from "dotenv";
import sharp, { type Metadata } from "sharp";

config({ path: ".env.local", quiet: true });

const MIN_SIDE = 600;

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const normalize = (s: string) => s.toLocaleLowerCase("tr").replace(/[^a-z0-9ığüşöç]/g, "");
const slugify = (s: string) =>
  normalize(s.replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")).replace(/[^a-z0-9]/g, "") || "brand";

function imageUrlsOf(item: Raw): string[] {
  const snap = item.snapshot ?? {};
  // Video reklamlarda poster karesi (videoPreviewImageUrl) alınır.
  return [...(snap.images ?? []), ...(snap.cards ?? []), ...(snap.videos ?? [])]
    .map((s: Raw) => s.originalImageUrl ?? s.resizedImageUrl ?? s.videoPreviewImageUrl)
    .filter((u: unknown): u is string => typeof u === "string");
}

async function main() {
  const brand = arg("brand");
  const sector = arg("sector");
  if (!brand || !sector) throw new Error('--brand ve --sector zorunlu');
  const limit = Number(arg("limit") ?? 40);
  const pages = (arg("pages") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  // Kategori modu (--category): marka yerine sektör aranır; her reklamın markası reklamveren sayfanın adıdır.
  const category = process.argv.includes("--category");
  const keywords = (arg("keywords") ?? arg("keyword") ?? brand).split(",").map((s) => s.trim()).filter(Boolean);
  const matchWord = category ? "" : normalize(arg("match") ?? brand.split(" ")[0]);

  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN yok");
  const apify = new ApifyClient({ token });
  const actor = process.env.APIFY_ACTOR ?? "apify/facebook-ads-scraper";

  const urls = [
    ...pages,
    ...keywords.map(
      (k) =>
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TR&search_type=keyword_unordered&q=" +
        encodeURIComponent(k),
    ),
  ];

  const slug = slugify(brand);
  const dir = `candidates/${slug}`;
  mkdirSync(dir, { recursive: true });

  let own: Raw[] = [];
  for (const url of urls) {
    console.log(`Apify: ${url.slice(0, 110)} (limit ${limit})`);
    const run = await apify.actor(actor).call({ startUrls: [{ url }], resultsLimit: limit, activeStatus: "active" }, { log: null as never });
    const { items } = await apify.dataset(run.defaultDatasetId).listItems();
    const matched = (items as Raw[]).filter((it) =>
      normalize(String(it.pageName ?? it.snapshot?.pageName ?? "")).includes(matchWord),
    );
    const names = [...new Set((items as Raw[]).map((it) => String(it.pageName ?? it.snapshot?.pageName ?? "?")))];
    console.log(`  ${items.length} reklam, ${matched.length} eşleşti. Sayfa adları: ${names.slice(0, 6).join(" | ")}`);
    own = [...own, ...matched];
    if (!category && matched.length >= 8) break; // yeterli aday var, ücretli ikinci çalıştırmaya gerek yok
  }

  const seen = new Set<string>();
  const meta: Record<string, unknown>[] = [];
  let tooSmall = 0;
  let unreadable = 0;
  for (const it of own) {
    const adId = String(it.adArchiveID ?? it.adArchiveId ?? "");
    const imageUrl = imageUrlsOf(it)[0];
    if (!adId || !imageUrl) continue;
    const res = await fetch(imageUrl).catch(() => null);
    if (!res?.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    const hash = createHash("sha1").update(buf).digest("hex").slice(0, 12);
    if (seen.has(hash)) continue;
    seen.add(hash);

    // sharp'ın çözemediği biçimler (ör. HEIC) betiği çökertmesin; o görsel atlanır.
    let jpeg: Buffer;
    let m: Metadata;
    try {
      m = await sharp(buf).metadata();
      if (!m.width || !m.height || Math.min(m.width, m.height) < MIN_SIDE) { tooSmall++; continue; }
      jpeg = await sharp(buf).flatten({ background: "#fff" }).jpeg({ quality: 92 }).toBuffer();
    } catch {
      unreadable++;
      continue;
    }

    const n = meta.length + 1;
    const file = `img-${String(n).padStart(3, "0")}.jpg`;
    writeFileSync(`${dir}/${file}`, jpeg);
    const body: string = it.snapshot?.body?.text ?? it.snapshot?.cards?.[0]?.body ?? "";
    meta.push({
      n,
      id: hash,
      file,
      brand: category ? String(it.pageName ?? it.snapshot?.pageName ?? brand).trim() : brand,
      sector,
      width: m.width,
      height: m.height,
      body: body.replace(/\{\{.*?\}\}/g, "").slice(0, 200),
      startedAt: it.startDateFormatted ?? null,
      sourceUrl: `https://www.facebook.com/ads/library/?id=${adId}`,
    });
  }
  writeFileSync(`${dir}/meta.json`, JSON.stringify(meta, null, 2));

  // Numaralı kontak sayfaları: 5x4 = 20 görsel
  const TILE = 320, COLS = 5, ROWS = 4, PER = COLS * ROWS;
  for (let s = 0; s * PER < meta.length; s++) {
    const chunk = meta.slice(s * PER, (s + 1) * PER);
    const tiles = await Promise.all(
      chunk.map(async (e, i) => {
        const img = await sharp(`${dir}/${e.file}`).resize(TILE - 8, TILE - 8, { fit: "contain", background: "#1c1c1c" }).toBuffer();
        const label = Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="40"><rect width="64" height="40" fill="#000" opacity="0.85"/><text x="32" y="29" font-size="26" font-family="Arial" font-weight="bold" fill="#ffeb3b" text-anchor="middle">${e.n}</text></svg>`,
        );
        const tile = await sharp({ create: { width: TILE, height: TILE, channels: 3, background: "#1c1c1c" } })
          .composite([{ input: img, left: 4, top: 4 }, { input: label, left: 4, top: 4 }])
          .jpeg().toBuffer();
        return { input: tile, left: (i % COLS) * TILE, top: Math.floor(i / COLS) * TILE };
      }),
    );
    await sharp({ create: { width: TILE * COLS, height: TILE * Math.ceil(chunk.length / COLS), channels: 3, background: "#000" } })
      .composite(tiles).jpeg({ quality: 85 }).toFile(`${dir}/sheet-${s + 1}.jpg`);
  }
  console.log(`\n${brand}: ${meta.length} aday indirildi (${tooSmall} küçük, ${unreadable} okunamayan görsel atlandı) -> ${dir}/ (sheet-*.jpg numaralı kontak sayfaları)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
