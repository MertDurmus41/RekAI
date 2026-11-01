/**
 * Galeri için küçük görseller üretir: public/thumbs (kart ve kutucuklar, 520 px) ve
 * public/medium (reklam penceresi, 1100 px), ikisi de webp. Orijinaller yalnızca remix için kullanılır.
 *
 *   npx tsx scripts/make-thumbs.ts          -> eksik olanları üretir
 *   npx tsx scripts/make-thumbs.ts --force  -> hepsini yeniden üretir
 */
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import sharp from "sharp";

const force = process.argv.includes("--force");
mkdirSync("public/thumbs", { recursive: true });
mkdirSync("public/medium", { recursive: true });

const sources: { id: string; path: string }[] = [
  ...(JSON.parse(readFileSync("src/data/pulled.json", "utf8")) as { id: string; file: string }[]).map((e) => ({
    id: e.id,
    path: `public/pulled/${e.file}`,
  })),
  ...readdirSync("public/ads").map((f) => ({ id: f.replace(/\.[^.]+$/, ""), path: `public/ads/${f}` })),
];

async function main() {
  let made = 0;
  for (const { id, path } of sources) {
    const thumb = `public/thumbs/${id}.webp`;
    const medium = `public/medium/${id}.webp`;
    if (!force && existsSync(thumb) && existsSync(medium)) continue;
    const img = sharp(path).rotate();
    await img.clone().resize({ width: 520, withoutEnlargement: true }).webp({ quality: 76 }).toFile(thumb);
    await img.clone().resize({ width: 1100, withoutEnlargement: true }).webp({ quality: 82 }).toFile(medium);
    made++;
  }
  console.log(`${made} görsel için küçük sürümler üretildi (${sources.length} kaynak).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
