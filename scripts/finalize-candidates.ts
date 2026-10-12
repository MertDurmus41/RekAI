/**
 * Seçilen adayları galeriye ekler (public/pulled + src/data/pulled.json).
 *
 *   npx tsx scripts/finalize-candidates.ts candidates/starbucks
 *
 * Seçim dosyası: candidates/<slug>/keep.json  ->
 *   [{ "n": 3, "title": "2 al 1 öde", "type": "İndirim" }, ...]
 * type: İndirim | Kampanya | Menü | Ürün Lansmanı | Marka Görseli
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const OUT_JSON = "src/data/pulled.json";

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

async function colorsOf(path: string): Promise<string[]> {
  const { data } = await sharp(path).resize(64, 64, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const counts: Record<string, number> = {};
  let n = 0;
  for (let i = 0; i < data.length; i += 3) {
    const k = bucket(data[i], data[i + 1], data[i + 2]);
    if (k) { counts[k] = (counts[k] ?? 0) + 1; n++; }
  }
  return Object.entries(counts).filter(([, v]) => v / n >= 0.18).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
}

const TYPES = ["İndirim", "Kampanya", "Menü", "Ürün Lansmanı", "Marka Görseli"];

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("klasör ver: candidates/<slug>");
  const meta = JSON.parse(readFileSync(`${dir}/meta.json`, "utf8")) as Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const keep = JSON.parse(readFileSync(`${dir}/keep.json`, "utf8")) as { n: number; title: string; type: string }[];
  const entries: Record<string, unknown>[] = existsSync(OUT_JSON) ? JSON.parse(readFileSync(OUT_JSON, "utf8")) : [];
  const ids = new Set(entries.map((e) => e.id));
  const sources = new Set(entries.map((e) => e.sourceUrl));

  let added = 0;
  for (const k of keep) {
    const m = meta.find((x) => x.n === k.n);
    if (!m || ids.has(m.id) || sources.has(m.sourceUrl)) continue;
    const file = `${m.id}.jpg`;
    copyFileSync(`${dir}/${m.file}`, `public/pulled/${file}`);
    entries.push({
      id: m.id,
      file,
      brand: m.brand,
      sector: m.sector,
      type: TYPES.includes(k.type) ? k.type : "Kampanya",
      title: k.title.trim().slice(0, 70),
      width: m.width,
      height: m.height,
      colors: await colorsOf(`${dir}/${m.file}`),
      startedAt: m.startedAt,
      sourceUrl: m.sourceUrl,
    });
    added++;
  }
  writeFileSync(OUT_JSON, JSON.stringify(entries, null, 2));
  console.log(`${dir}: ${added} reklam eklendi (toplam ${entries.length})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
