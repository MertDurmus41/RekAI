"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Komutun okunuyor…",
  "Agent değişecek alanı belirliyor…",
  "Orijinal düzen kilitleniyor…",
  "Pikseller yeniden boyanıyor…",
  "Işık ve renkler uyumlanıyor…",
  "Son rötuşlar yapılıyor…",
];

const SPARKS = [
  { left: "12%", top: "70%", delay: "0s", ch: "✦" },
  { left: "30%", top: "82%", delay: "0.7s", ch: "✧" },
  { left: "52%", top: "75%", delay: "1.4s", ch: "✦" },
  { left: "70%", top: "85%", delay: "0.3s", ch: "✧" },
  { left: "86%", top: "72%", delay: "1.9s", ch: "✦" },
  { left: "42%", top: "90%", delay: "2.4s", ch: "✧" },
];

export function GeneratingView({ src }: { src: string }) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(4);

  useEffect(() => {
    const stepTimer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 3500);
    // İlerleme çubuğu 94%'e doğru yavaşlayarak yaklaşır; gerçek sonuç gelince görünüm kapanır.
    const barTimer = setInterval(() => setProgress((p) => p + (94 - p) * 0.06), 400);
    return () => {
      clearInterval(stepTimer);
      clearInterval(barTimer);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-ink" role="status" aria-live="polite">
      {/* Orijinalin bulanık hâli */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-xl" />

      {/* Akan renkli aurora */}
      <div className="ar-aurora absolute inset-0 bg-gradient-to-br from-io/70 via-sky/50 to-ib/70 mix-blend-soft-light" />

      {/* Tarama ışını */}
      <div className="absolute inset-x-0 top-0 h-[7%]">
        <div className="ar-scan size-full bg-gradient-to-b from-transparent via-white/80 to-transparent" />
      </div>

      {/* Yükselen parıltılar */}
      {SPARKS.map((s, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="ar-float absolute text-xl text-white drop-shadow"
          style={{ left: s.left, top: s.top, animationDelay: s.delay }}
        >
          {s.ch}
        </span>
      ))}

      {/* Merkez: nabız halkaları ve adım metni */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center text-white">
        <div className="relative grid size-16 place-items-center">
          <span className="ar-ring absolute inset-0 rounded-full border-2 border-white/80" />
          <span className="ar-ring absolute inset-0 rounded-full border-2 border-white/80 [animation-delay:0.9s]" />
          <span className="grid size-14 place-items-center rounded-full bg-white/95 text-2xl text-io shadow-lg">✦</span>
        </div>
        <p key={step} className="ar-step text-sm font-semibold drop-shadow">
          {STEPS[step]}
        </p>
        <div className="w-4/5 max-w-60">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/30">
            <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-white/80">Genelde 15–60 saniye sürer</p>
        </div>
      </div>
    </div>
  );
}
