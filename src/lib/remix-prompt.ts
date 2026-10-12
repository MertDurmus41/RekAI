// fal düzenleme modelinin kabul ettiği en-boy oranları
const ASPECT_RATIOS: [string, number][] = [
  ["21:9", 21 / 9],
  ["16:9", 16 / 9],
  ["3:2", 3 / 2],
  ["4:3", 4 / 3],
  ["5:4", 5 / 4],
  ["1:1", 1],
  ["4:5", 4 / 5],
  ["3:4", 3 / 4],
  ["2:3", 2 / 3],
  ["9:16", 9 / 16],
];

/** Orijinale en yakın desteklenen oran. */
export function nearestAspect(width: number, height: number): { label: string; value: number } {
  const target = width / height;
  let best = ASPECT_RATIOS[0];
  for (const candidate of ASPECT_RATIOS) {
    if (Math.abs(candidate[1] - target) < Math.abs(best[1] - target)) best = candidate;
  }
  return { label: best[0], value: best[1] };
}

/**
 * Görseli desteklenen orana getirmek için eklenecek kenar payı. Model bu oranda üretir;
 * sonuçta payın kapladığı bölge geri kesilir, böylece orijinal boyut/oran bozulmaz.
 */
export function paddingFor(width: number, height: number) {
  const { label, value } = nearestAspect(width, height);
  let paddedW = width;
  let paddedH = height;
  if (Math.abs(width / height - value) / value > 0.005) {
    if (width / height > value) paddedH = Math.round(width / value);
    else paddedW = Math.round(height * value);
  }
  const left = Math.floor((paddedW - width) / 2);
  const top = Math.floor((paddedH - height) / 2);
  return {
    label,
    paddedW,
    paddedH,
    left,
    top,
    right: paddedW - width - left,
    bottom: paddedH - height - top,
  };
}

/** Planlayıcının çıkardığı adımları "sadece bunları uygula" kuralına sarar. */
export function buildRemixPrompt(
  steps: string[],
  opts: { hasMarks: boolean; hasUpload: boolean; padded: boolean },
): string {
  const lines = [
    "Edit the first image, which is an advertisement. Apply ALL of the numbered edits below, and nothing else.",
    "",
    ...steps.map((step, i) => `${i + 1}. ${step.trim()}`),
    "",
    "Strict rules:",
    "- Every numbered edit must be fully visible in the result. Do not skip any.",
    "- Everything the edits do not mention stays exactly as in the first image: layout, position and size of every element, framing, every piece of text and its wording, fonts, people, faces, poses, products, logos, colors and lighting.",
    "- Keep the same canvas, aspect ratio and composition. Do not zoom, crop, shift, or add borders or bands.",
    "- Write new text in the same typeface, weight, color and position as the text it replaces, spelled exactly as given. Keep Turkish characters (ç, ğ, ı, İ, ö, ş, ü) exact.",
    "- Make each edit blend naturally with the original lighting and perspective.",
  ];
  if (opts.padded) {
    lines.push(
      "- The outer edges of the first image were extended artificially to fit the canvas. Treat those edge strips as plain background (they follow any background change); do not put any other content there.",
    );
  }
  let next = 2;
  if (opts.hasMarks) {
    lines.push(
      `- Image ${next} is the same advertisement with hand-drawn marks made by the user. The marks only show WHERE a requested change applies. Use image ${next} just to locate the area; never draw any of the marks in the output.`,
    );
    next++;
  }
  if (opts.hasUpload) {
    lines.push(
      `- Image ${next} is the user's own logo or product photo: place it as-is, sharp and unaltered (same colors, text and shape), only scaled to fit.`,
    );
  }
  return lines.join("\n");
}
