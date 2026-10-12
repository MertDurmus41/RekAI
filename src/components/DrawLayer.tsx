"use client";

import { useEffect, useRef } from "react";

/** Koordinatlar ve kalınlık görselin genişliğine oranla tutulur; ekran boyutundan bağımsızdır. */
export type Stroke = { color: string; size: number; pts: [number, number][] };

export function paintStrokes(ctx: CanvasRenderingContext2D, w: number, h: number, strokes: Stroke[]) {
  ctx.clearRect(0, 0, w, h);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = s.size * w;
    const [first, ...rest] = s.pts;
    if (!first) continue;
    if (!rest.length) {
      ctx.beginPath();
      ctx.arc(first[0] * w, first[1] * h, (s.size * w) / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(first[0] * w, first[1] * h);
    for (const [x, y] of rest) ctx.lineTo(x * w, y * h);
    ctx.stroke();
  }
}

/** Çizimleri orijinal görsel çözünürlüğünde, şeffaf zeminli PNG olarak döndürür. */
export function renderMarks(strokes: Stroke[], w: number, h: number): Promise<Blob | null> {
  if (!strokes.length) return Promise.resolve(null);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  paintStrokes(canvas.getContext("2d")!, w, h, strokes);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export function DrawLayer({
  width,
  height,
  strokes,
  onChange,
  enabled,
  color,
  size,
}: {
  width: number;
  height: number;
  strokes: Stroke[];
  onChange: (strokes: Stroke[]) => void;
  enabled: boolean;
  color: string;
  size: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) paintStrokes(ctx, width, height, strokes);
  }, [strokes, width, height]);

  function point(e: React.PointerEvent): [number, number] {
    const rect = ref.current!.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    ];
  }

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      aria-label="Orijinal görsel üzerine çizim alanı"
      onPointerDown={(e) => {
        if (!enabled) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drawing.current = true;
        onChange([...strokes, { color, size, pts: [point(e)] }]);
      }}
      onPointerMove={(e) => {
        if (!enabled || !drawing.current || !strokes.length) return;
        const last = strokes[strokes.length - 1];
        onChange([...strokes.slice(0, -1), { ...last, pts: [...last.pts, point(e)] }]);
      }}
      onPointerUp={() => {
        drawing.current = false;
      }}
      onPointerCancel={() => {
        drawing.current = false;
      }}
      className={`absolute inset-0 size-full ${enabled ? "cursor-crosshair touch-none" : "pointer-events-none"}`}
    />
  );
}
