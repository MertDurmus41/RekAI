/**
 * Pinterest ve Google Ads Transparency Center'dan reklam/içerik adaylarını candidates/<slug>/ altına indirir
 * (Meta için scripts/fetch-candidates.ts kullanılır). Galeriye hiçbir şey eklemez; seçim
 * finalize-candidates.ts ile yapılır. Çıktı biçimi fetch-candidates.ts ile aynıdır.
 *
 *   npx tsx scripts/fetch-coffee.ts --source pinterest --brand "Kahve Pinterest" --sector "Kahve & Kafe" \
 *     --keywords "coffee ad design,kahve reklamı" --limit 40
 *   npx tsx scripts/fetch-coffee.ts --source google --brand "Kahve Google" --sector "Kahve & Kafe" \
 *     --keywords "starbucks.com,kahvedunyasi.com" --region TR --limit 25
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { ApifyClient } from "apify-client";
import { config } from "dotenv";
import sharp, { type Metadata } from "sharp";

config({ path: ".env.local", quiet: true });

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Item = { imageUrl: string; brand: string; body: string; sourceUrl: string; startedAt: string | null };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const normalize = (s: string) => s.toLocaleLowerCase("tr").replace(/[^a-z0-9ığüşöç]/g, "");
const slugify = (s: string) =>
  normalize(s.replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")).replace(/[^a-z0-9]/g, "") || "brand";

/** Eşzamanlı çalıştırma sınırına (402) takılırsa bekleyip yeniden dener. */
async function callRetry(apify: ApifyClient, actor: string, input: Record<string, unknown>) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await apify.actor(actor).call(input, { log: null as never });
    } catch (e) {
      const limited = (e as { type?: string }).type === "concurrent-runs-limit-exceeded";
      if (!limited || attempt >= 30) throw e;
      await new Promise((r) => setTimeout(r, 20000));
    }
  }
}

async function pinterest(apify: ApifyClient, keywords: string[], limit: number): Promise<Item[]> {
  const out: Item[] = [];
  // silentflow aktörü sonuç başına ücretlidir (epctex'in ücretsiz aylık çalıştırma limiti hızla doluyor).
  // Her anahtar kelime ayrı çalışır; aynı anda en fazla 2 çalıştırma (Apify eşzamanlılık sınırı).
  for (let i = 0; i < keywords.length; i += 2) {
    const batch = keywords.slice(i, i + 2);
    const results = await Promise.all(
      batch.map(async (q) => {
        const run = await callRetry(apify, "silentflow/pinterest-scraper-ppr", { search: q, maxItems: limit });
        return { q, items: (await apify.dataset(run.defaultDatasetId).listItems()).items as Raw[] };
      }),
    );
    for (const { q, items } of results) {
      console.log(`  Pinterest "${q}": ${items.length} pin`);
      for (const p of items) {
        if (p.type !== "pin" || p.isVideo || !p.imageUrl) continue;
        out.push({
          imageUrl: String(p.imageUrl),
          brand: String(p.pinner?.fullName ?? p.pinner?.name ?? p.pinner?.username ?? "Pinterest").trim() || "Pinterest",
          body: `${p.gridTitle ?? p.title ?? ""} ${p.description ?? ""}`.replace(/\s+/g, " ").trim().slice(0, 200),
          sourceUrl: String(p.url),
          startedAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
        });
      }
    }
  }
  return out;
}

async function google(apify: ApifyClient, queries: string[], region: string, limit: number): Promise<Item[]> {
  const out: Item[] = [];
  for (let i = 0; i < queries.length; i += 3) {
    const batch = queries.slice(i, i + 3);
    const results = await Promise.all(
      batch.map(async (q) => {
        const run = await callRetry(apify, "scrapesage/google-ads-transparency-scraper", { queries: [q], region, adFormat: "IMAGE", maxAdsPerSearch: limit, maxAdvertisersPerQuery: 2 });
        return { q, items: (await apify.dataset(run.defaultDatasetId).listItems()).items as Raw[] };
      }),
    );
    for (const { q, items } of results) {
      console.log(`  Google "${q}" (${region}): ${items.length} reklam`);
      for (const a of items) {
        const url = a.imageUrl ?? a.previewUrl;
        if (!url || a.previewType === "video") continue;
        out.push({
          imageUrl: url,
          brand: String(a.advertiserName ?? q).trim(),
          body: `${a.domain ?? ""} ${a.adHeadline ?? ""}`.trim(),
          sourceUrl: String(a.adUrl),
          startedAt: a.firstShown ?? null,
        });
      }
    }
  }
  return out;
}

async function main() {
  const source = arg("source");
  const brand = arg("brand");
  const sector = arg("sector");
  if (!source || !brand || !sector) throw new Error("--source, --brand ve --sector zorunlu");
  const keywords = (arg("keywords") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!keywords.length) throw new Error("--keywords zorunlu");
  const limit = Number(arg("limit") ?? 40);
  const region = arg("region") ?? "TR";
  const minSide = Number(arg("min-side") ?? (source === "google" ? 250 : 500));

  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN yok");
  const apify = new ApifyClient({ token });

  console.log(`${source}: ${keywords.length} sorgu`);
  const items = source === "pinterest" ? await pinterest(apify, keywords, limit) : await google(apify, keywords, region, limit);

  const slug = slugify(brand);
  const dir = `candidates/${slug}`;
  mkdirSync(dir, { recursive: true });

  const seen = new Set<string>();
  const meta: Record<string, unknown>[] = [];
  let tooSmall = 0;
  let unreadable = 0;
  for (const it of items) {
    if (seen.has(it.sourceUrl)) continue;
    seen.add(it.sourceUrl);
    const res = await fetch(it.imageUrl).catch(() => null);
    if (!res?.ok) { unreadable++; continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    const hash = createHash("sha1").update(buf).digest("hex").slice(0, 12);
    if (seen.has(hash)) continue;
    seen.add(hash);

    let jpeg: Buffer;
    let m: Metadata;
    try {
      m = await sharp(buf).metadata();
      if (!m.width || !m.height || Math.min(m.width, m.height) < minSide) { tooSmall++; continue; }
      jpeg = await sharp(buf).flatten({ background: "#fff" }).resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
    } catch {
      unreadable++;
      continue;
    }
    const out = await sharp(jpeg).metadata();
    const n = meta.length + 1;
    const file = `img-${String(n).padStart(3, "0")}.jpg`;
    writeFileSync(`${dir}/${file}`, jpeg);
    meta.push({ n, id: hash, file, brand: it.brand, sector, width: out.width, height: out.height, body: it.body, startedAt: it.startedAt, sourceUrl: it.sourceUrl });
  }
  writeFileSync(`${dir}/meta.json`, JSON.stringify(meta, null, 2));

  const TILE = 300, COLS = 6, PER = 24;
  for (let s = 0; s * PER < meta.length; s++) {
    const chunk = meta.slice(s * PER, (s + 1) * PER) as { n: number; file: string }[];
    const tiles = await Promise.all(
      chunk.map(async (e, i) => {
        const img = await sharp(`${dir}/${e.file}`).resize(TILE - 6, TILE - 6, { fit: "contain", background: "#1c1c1c" }).toBuffer();
        const label = Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="34"><rect width="56" height="34" fill="#000" opacity="0.85"/><text x="28" y="25" font-size="22" font-family="Arial" font-weight="bold" fill="#ffeb3b" text-anchor="middle">${e.n}</text></svg>`,
        );
        const tile = await sharp({ create: { width: TILE, height: TILE, channels: 3, background: "#1c1c1c" } })
          .composite([{ input: img, left: 3, top: 3 }, { input: label, left: 3, top: 3 }]).jpeg().toBuffer();
        return { input: tile, left: (i % COLS) * TILE, top: Math.floor(i / COLS) * TILE };
      }),
    );
    await sharp({ create: { width: TILE * COLS, height: TILE * Math.ceil(chunk.length / COLS), channels: 3, background: "#000" } })
      .composite(tiles).jpeg({ quality: 85 }).toFile(`${dir}/sheet-${s + 1}.jpg`);
  }
  console.log(`\n${brand}: ${meta.length} aday indirildi (${tooSmall} küçük, ${unreadable} okunamayan atlandı) -> ${dir}/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
