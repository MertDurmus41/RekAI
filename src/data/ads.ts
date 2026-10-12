import pulled from "./pulled.json";

export type ColorKey =
  | "kirmizi"
  | "turuncu"
  | "sari"
  | "yesil"
  | "mavi"
  | "pembe"
  | "kahverengi";

export const COLORS: { key: ColorKey; label: string; hex: string }[] = [
  { key: "kirmizi", label: "Kırmızı", hex: "#ef4444" },
  { key: "turuncu", label: "Turuncu", hex: "#f97316" },
  { key: "sari", label: "Sarı", hex: "#facc15" },
  { key: "yesil", label: "Yeşil", hex: "#22c55e" },
  { key: "mavi", label: "Mavi", hex: "#3b82f6" },
  { key: "pembe", label: "Pembe", hex: "#ec4899" },
  { key: "kahverengi", label: "Kahverengi", hex: "#92400e" },
];

export type SampleAd = {
  id: string;
  src: string;
  brand: string;
  sector: string;
  type: string;
  title: string;
  width: number;
  height: number;
  colors: ColorKey[];
  startedAt?: string | null;
};

// Masaüstü\Yemek klasöründen elle eklenen, yeterince büyük iki reklam.
const MANUAL: SampleAd[] = [
  { id: "ad-01", src: "/ads/ad-01.jpg", brand: "Anatolium", sector: "Restoran", type: "Kampanya", title: "1 yemek sizden, 1 yemek bizden", width: 1000, height: 1000, colors: ["kirmizi"] },
  { id: "ad-14", src: "/ads/ad-14.jpg", brand: "KFC", sector: "Tavuk", type: "Kampanya", title: "Big Treat Week", width: 568, height: 946, colors: ["kirmizi"] },
];

// scripts/fetch-ads.ts ile Apify'dan çekilen reklamlar (public/pulled altındaki görseller).
type PulledEntry = Omit<SampleAd, "src" | "colors"> & { file: string; colors: string[] };

const PULLED: SampleAd[] = (pulled as PulledEntry[]).map(({ file, colors, ...rest }) => ({
  ...rest,
  colors: colors as ColorKey[],
  src: `/pulled/${file}`,
}));

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

/** Meta'da 30 günden uzun süredir yayındaki reklam büyük olasılıkla işe yarıyordur. */
export function isLongRunning(ad: SampleAd, now: number) {
  return !!ad.startedAt && now - new Date(ad.startedAt).getTime() > THIRTY_DAYS;
}

export const ADS: SampleAd[] = [...PULLED, ...MANUAL];
