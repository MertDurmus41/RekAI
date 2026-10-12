"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ADS, COLORS, isLongRunning, type ColorKey, type SampleAd } from "@/data/ads";
import { Logo } from "./Logo";
import { RemixModal } from "./RemixModal";

const SECTOR_ICONS: Record<string, string> = {
  Burger: "🍔",
  Pizza: "🍕",
  Tavuk: "🍗",
  Dönerci: "🌯",
  "Çiğ Köfteci": "🥙",
  "Tost & Sandviç": "🥪",
  Büfe: "🌭",
  "Esnaf Lokantası": "🍲",
  "Kahvaltı Salonu": "🍳",
  "Waffle & Krep": "🧇",
  Dondurmacı: "🍦",
  "Kahve & Kafe": "☕",
  "Nargile Kafe": "💨",
  İçecek: "🥤",
  Restoran: "🍽️",
  "Yemek Siparişi": "🛵",
  "Pet Shop": "🐾",
  Kırtasiye: "✏️",
  "Berber & Kuaför": "💈",
  "Oto Yıkama": "🚿",
  "Oto Galeri": "🚗",
  Fotoğrafçı: "📷",
  "Giyim Mağazası": "👕",
  Ayakkabıcı: "👟",
  Mobilyacı: "🛋️",
  "Dershane & Kurs": "📚",
};
const SECTOR_ORDER = Object.keys(SECTOR_ICONS);

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function rank(sector: string) {
  const i = SECTOR_ORDER.indexOf(sector);
  return i === -1 ? SECTOR_ORDER.length : i;
}

export function AdBrowser({ email = null }: { email?: string | null }) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<string | null>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [colors, setColors] = useState<ColorKey[]>([]);
  const [selected, setSelected] = useState<SampleAd | null>(null);
  const [now] = useState(() => Date.now());

  const sectors = useMemo(
    () => [...new Set(ADS.map((a) => a.sector))].sort((a, b) => rank(a) - rank(b)),
    [],
  );

  // Marka kutucukları seçili kategoriye göre daralır.
  const brandTiles = useMemo(() => {
    const pool = sector ? ADS.filter((a) => a.sector === sector) : ADS;
    const map = new Map<string, { brand: string; count: number; cover: SampleAd }>();
    for (const ad of pool) {
      const entry = map.get(ad.brand);
      if (entry) entry.count++;
      else map.set(ad.brand, { brand: ad.brand, count: 1, cover: ad });
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand, "tr"));
  }, [sector]);

  const typeOptions = useMemo(
    () => [...new Set(ADS.map((a) => a.type))].sort((a, b) => a.localeCompare(b, "tr")),
    [],
  );

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return ADS.filter(
      (ad) =>
        (!sector || ad.sector === sector) &&
        (!brands.length || brands.includes(ad.brand)) &&
        (!types.length || types.includes(ad.type)) &&
        (!colors.length || ad.colors.some((c) => colors.includes(c))) &&
        (!q || `${ad.brand} ${ad.title} ${ad.sector} ${ad.type}`.toLocaleLowerCase("tr").includes(q)),
    );
  }, [query, sector, brands, types, colors]);

  const hasFilters = !!(query || sector || brands.length || types.length || colors.length);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Üst bar: logo, arama, giriş */}
      <header className="mx-auto flex w-full max-w-[1400px] items-center gap-6 px-5 py-5">
        <Link href="/galeri" aria-label="RekAI galeri" className="shrink-0">
          <Logo />
        </Link>
        <div className="relative mx-auto w-full max-w-2xl">
          <svg
            viewBox="0 0 24 24"
            className="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-mute"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Reklam, marka veya kampanya ara"
            className="w-full rounded-lg border-2 border-io bg-white py-3 pr-4 pl-11 text-sm outline-none placeholder:text-mute focus:ring-4 focus:ring-io/15"
          />
        </div>
        {email ? (
          <div className="flex shrink-0 items-center gap-4 text-sm">
            <Link href="/remixes" className="font-semibold text-ib hover:underline">
              Remixlerim
            </Link>
            <span className="hidden max-w-44 truncate text-mute lg:inline">{email}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="font-semibold text-io hover:underline">
                Çıkış
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="shrink-0 rounded-lg border-2 border-ib/30 px-5 py-2.5 text-sm font-semibold text-ib hover:border-ib hover:bg-ib-soft"
          >
            Giriş Yap
            <span className="block text-[11px] font-normal text-mute">veya üye ol</span>
          </Link>
        )}
      </header>

      {/* Renkli şerit */}
      <div className="flex h-1.5" aria-hidden="true">
        <span className="flex-[3] bg-io" />
        <span className="flex-1 bg-sky" />
        <span className="flex-[2] bg-ib" />
        <span className="flex-1 bg-sun" />
        <span className="flex-[3] bg-io" />
      </div>

      {/* Kategori çubuğu */}
      <nav aria-label="Kategoriler" className="border-b border-line bg-wash">
        <ul className="mx-auto flex w-full max-w-[1400px] gap-x-1 overflow-x-auto px-5 lg:flex-wrap lg:overflow-visible">
          {[null, ...sectors].map((s) => (
            <li key={s ?? "all"} className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSector(s);
                  setBrands([]);
                }}
                aria-current={sector === s ? "page" : undefined}
                className={`flex items-center gap-1.5 border-b-[3px] px-3 py-2.5 text-sm font-medium transition ${
                  sector === s ? "border-io text-io" : "border-transparent text-ink hover:text-io"
                }`}
              >
                <span aria-hidden="true">{s ? (SECTOR_ICONS[s] ?? "🏪") : "✨"}</span>
                {s ?? "Tümü"}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-6">
        {/* Marka kutucukları */}
        <ul className="mb-6 flex gap-3 overflow-x-auto pb-1" aria-label="Markalar">
          {brandTiles.map(({ brand, count, cover }) => {
            const active = brands.includes(brand);
            return (
              <li key={brand} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setBrands((s) => toggle(s, brand))}
                  aria-pressed={active}
                  className="group block w-28 text-center"
                >
                  <span
                    className={`block aspect-square overflow-hidden rounded-xl bg-io p-1.5 transition ${
                      active ? "ring-4 ring-ib" : "group-hover:-translate-y-0.5"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover.src} alt="" loading="lazy" className="size-full rounded-lg object-cover" />
                  </span>
                  <span className={`mt-1.5 block truncate text-xs font-semibold ${active ? "text-ib" : "text-ink"}`}>
                    {brand}
                  </span>
                  <span className="block text-[11px] text-mute">{count} reklam</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Filtre çubuğu */}
        <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl bg-wash px-4 py-3">
          <span className="text-sm font-semibold">{results.length} sonuç</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="İçerik türü">
            {typeOptions.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={types.includes(t)}
                onClick={() => setTypes((s) => toggle(s, t))}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  types.includes(t) ? "border-ib bg-ib text-white" : "border-line bg-white text-ink hover:border-ib"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2" role="group" aria-label="Baskın renk">
            {COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                title={c.label}
                aria-label={c.label}
                aria-pressed={colors.includes(c.key)}
                onClick={() => setColors((s) => toggle(s, c.key))}
                style={{ background: c.hex }}
                className={`size-5 rounded-full ring-offset-2 ${
                  colors.includes(c.key) ? "ring-2 ring-ib" : "opacity-80 hover:opacity-100"
                }`}
              />
            ))}
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSector(null);
                setBrands([]);
                setTypes([]);
                setColors([]);
              }}
              className="ml-auto text-xs font-semibold text-io hover:underline"
            >
              Filtreleri temizle
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <p className="py-16 text-center text-sm text-mute">Bu filtrelere uyan reklam yok.</p>
        ) : (
          <div className="columns-2 gap-4 md:columns-3 lg:columns-4 2xl:columns-5">
            {results.map((ad) => (
              <button
                key={ad.id}
                type="button"
                onClick={() => setSelected(ad)}
                className="group mb-5 block w-full break-inside-avoid text-left"
              >
                <div className="relative overflow-hidden rounded-xl border border-line bg-wash shadow-sm transition group-hover:shadow-lg">
                  {isLongRunning(ad, now) && (
                    <span className="absolute top-2 left-2 z-10 rounded-full bg-ib px-2.5 py-0.5 text-[11px] font-semibold text-white">
                      30+ gündür yayında
                    </span>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ad.src}
                    alt={`${ad.brand}: ${ad.title}`}
                    width={ad.width}
                    height={ad.height}
                    loading="lazy"
                    className="h-auto w-full transition duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute inset-x-0 bottom-0 translate-y-full bg-io py-2 text-center text-sm font-semibold text-white transition group-hover:translate-y-0">
                    ✦ Remix yap
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold">{ad.brand}</p>
                <p className="truncate text-xs text-mute">{ad.title}</p>
                <div className="mt-1.5 flex gap-1.5">
                  {[ad.sector, ad.type].map((tag) => (
                    <span key={tag} className="rounded bg-io-soft px-1.5 py-0.5 text-[10px] font-medium text-io-dark">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {selected && <RemixModal ad={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
