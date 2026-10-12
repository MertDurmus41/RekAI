"use client";

import { useEffect, useState } from "react";
import type { SampleAd } from "@/data/ads";
import type { AdCopy } from "@/lib/types";
import { DrawLayer, renderMarks, type Stroke } from "./DrawLayer";
import { GeneratingView } from "./GeneratingView";

const CHIPS = [
  "Arka planı maviye çevir",
  "İşaretlediğim logoyu kaldır",
  "Logoyu yüklediğim logoyla değiştir",
  "Başka markaya uyarla",
  "Daha enerjik yap",
  "Minimalist hale getir",
];

const PEN_COLORS = [
  { name: "Kırmızı", hex: "#e11d1d" },
  { name: "Mavi", hex: "#1d4ed8" },
  { name: "Sarı", hex: "#facc15" },
  { name: "Yeşil", hex: "#16a34a" },
];
// Görsel genişliğine oran
const PEN_SIZES = [
  { name: "İnce", value: 0.004 },
  { name: "Orta", value: 0.008 },
  { name: "Kalın", value: 0.016 },
];

export function RemixModal({ ad, onClose }: { ad: SampleAd; onClose: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; url: string; steps: string[] | null } | null>(null);
  const [copy, setCopy] = useState<AdCopy | null>(null);
  const [copyBusy, setCopyBusy] = useState(false);

  const [pen, setPen] = useState(false);
  const [color, setColor] = useState(PEN_COLORS[0].hex);
  const [size, setSize] = useState(PEN_SIZES[1].value);
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  async function remix() {
    setBusy(true);
    setError(null);
    setCopy(null);
    const body = new FormData();
    body.set("adId", ad.id);
    body.set("prompt", prompt);
    if (file) body.set("file", file);
    const marks = await renderMarks(strokes, ad.width, ad.height);
    if (marks) body.set("marks", marks, "marks.png");
    try {
      const res = await fetch("/api/remix", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult(json);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Bir şeyler ters gitti.");
    } finally {
      setBusy(false);
    }
  }

  async function writeCopy() {
    setCopyBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ad-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adId: ad.id, prompt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCopy(json);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Bir şeyler ters gitti.");
    } finally {
      setCopyBusy(false);
    }
  }

  const ratio = { aspectRatio: `${ad.width} / ${ad.height}` };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/60 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${ad.brand} reklamını remixle`}
        className="mx-auto my-2 w-full max-w-[1680px] rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{ad.brand}</h2>
            <p className="text-sm text-mute">{ad.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Kapat" className="px-2 text-2xl leading-none text-mute hover:text-ink">
            ×
          </button>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)_minmax(0,1fr)]">
          {/* Sol: orijinal + kalem */}
          <section aria-label="Orijinal görsel">
            <div className="flex h-14 items-center gap-2">
              <p className="mr-auto text-[11px] font-semibold tracking-wider text-mute uppercase">Orijinal görsel</p>
              <button
                type="button"
                onClick={() => setPen((p) => !p)}
                aria-pressed={pen}
                className={`rounded-xl border-2 border-red-600 px-5 py-2.5 text-base font-bold shadow-sm transition ${
                  pen ? "bg-red-600 text-white ring-4 ring-red-600/25" : "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                }`}
              >
                ✏️ Kalemle işaretle
              </button>
            </div>

            {/* Kalem seçenekleri satırı her zaman yer kaplar; böylece iki görsel aynı hizada başlar. */}
            <div className="mb-2 h-11">
            {pen && (
              <div className="flex h-full items-center gap-3 rounded-lg bg-wash px-3">
                <div className="flex items-center gap-1.5" role="group" aria-label="Kalem rengi">
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.name}
                      aria-label={c.name}
                      aria-pressed={color === c.hex}
                      onClick={() => setColor(c.hex)}
                      style={{ background: c.hex }}
                      className={`size-6 rounded-full ring-offset-2 ${color === c.hex ? "ring-2 ring-ink" : ""}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1" role="group" aria-label="Kalem kalınlığı">
                  {PEN_SIZES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      aria-pressed={size === s.value}
                      onClick={() => setSize(s.value)}
                      className={`rounded px-2 py-0.5 text-xs ${size === s.value ? "bg-ib text-white" : "bg-white text-ink"}`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setStrokes((s) => s.slice(0, -1))}
                  disabled={!strokes.length}
                  className="ml-auto text-xs font-semibold text-ib disabled:opacity-40"
                >
                  ↶ Geri al
                </button>
                <button
                  type="button"
                  onClick={() => setStrokes([])}
                  disabled={!strokes.length}
                  className="text-xs font-semibold text-io disabled:opacity-40"
                >
                  Temizle
                </button>
              </div>
            )}
            </div>

            <div style={ratio} className="relative mx-auto max-h-[calc(100vh-236px)] min-h-64 w-auto overflow-hidden rounded-xl border-2 border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ad.src} alt={`${ad.brand} orijinal reklam`} draggable={false} className="size-full select-none" />
              <DrawLayer
                width={ad.width}
                height={ad.height}
                strokes={strokes}
                onChange={setStrokes}
                enabled={pen && !busy}
                color={color}
                size={size}
              />
            </div>
          </section>

          {/* Orta: komut paneli */}
          <section aria-label="Komut" className="lg:sticky lg:top-2">
            <div className="flex h-14 items-center">
              <p className="text-[11px] font-semibold tracking-wider text-mute uppercase">Komutun</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setPrompt(chip)}
                  className="rounded-full border border-line px-3 py-1 text-xs text-ink hover:border-io hover:text-io"
                >
                  {chip}
                </button>
              ))}
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              maxLength={1000}
              placeholder="Ne değişsin? Örn: arka planı mavi yap, kadını erkek yap, işaretlediğim logoyu kaldır benimkini ekle"
              className="mt-3 w-full resize-none rounded-xl border-2 border-line p-3 text-sm outline-none placeholder:text-mute focus:border-io"
            />

            <div className="mt-3 flex items-center gap-3">
              <label className="cursor-pointer rounded-lg border-2 border-ib/30 px-3 py-2 text-sm font-medium text-ib hover:border-ib hover:bg-ib-soft">
                <span className="block max-w-56 truncate">{file ? `📎 ${file.name}` : "Logo / ürün görseli yükle"}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              {file && (
                <button type="button" onClick={() => setFile(null)} className="text-xs text-mute hover:text-ink">
                  Kaldır
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={remix}
              disabled={busy || !prompt.trim()}
              className="mt-4 w-full rounded-xl bg-io py-3.5 text-sm font-bold text-white shadow-sm hover:bg-io-dark disabled:opacity-50"
            >
              {busy ? "Remix yapılıyor…" : result ? "✦ Tekrar dene" : "✦ Remix Oluştur"}
            </button>
            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            {result && !busy && (
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={result.url}
                  download={`adremix-${result.id}.png`}
                  className="rounded-lg bg-ib px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Görseli indir
                </a>
                <button
                  type="button"
                  onClick={writeCopy}
                  disabled={copyBusy}
                  className="rounded-lg border-2 border-ib/30 px-4 py-2 text-sm font-semibold text-ib hover:border-ib disabled:opacity-50"
                >
                  {copyBusy ? "Yazılıyor…" : "Reklam metni yaz"}
                </button>
              </div>
            )}

            {copy && (
              <dl className="mt-3 space-y-2 text-sm">
                {(
                  [
                    ["Başlık", copy.headline],
                    ["Ana metin", copy.primary_text],
                    ["Buton", copy.cta],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-wash p-3">
                    <dt className="mb-1 flex items-center justify-between text-xs text-mute">
                      {label}
                      <button type="button" onClick={() => navigator.clipboard.writeText(value)} className="font-semibold text-io hover:underline">
                        Kopyala
                      </button>
                    </dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <p className="mt-4 text-xs text-mute">
              Başka bir markanın logosunu veya tescilli görselini kendi reklamında yayınlama. Paylaşmadan önce orijinal logoyu kaldırıp kendi logonu ekle.
            </p>
          </section>

          {/* Sağ: remix sonucu */}
          <section aria-label="Remix sonucu">
            <div className="mb-2 flex h-25 items-start pt-5">
              <p className="text-[11px] font-semibold tracking-wider text-mute uppercase">AI Canvas — Remix</p>
            </div>
            <div
              style={ratio}
              className="relative mx-auto max-h-[calc(100vh-236px)] min-h-64 w-auto overflow-hidden rounded-xl border-2 border-dashed border-line bg-wash"
            >
              {busy ? (
                <GeneratingView src={ad.src} />
              ) : result ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.url} alt="Remix sonucu" className="size-full" />
              ) : (
                <div className="flex size-full items-center justify-center px-6 text-center text-sm text-mute">
                  Sadece yazdığın şey değişir; geri kalan her şey aynı kalır.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
