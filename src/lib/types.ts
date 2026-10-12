export const CATEGORIES = [
  "Burger",
  "Tavuk",
  "Pizza",
  "Kahve & Kafe",
  "Tatlı & Fırın",
  "İçecek",
  "Yemek Siparişi",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Ad = {
  id: string;
  brand: string;
  category: string;
  title: string | null;
  body_text: string | null;
  image_path: string;
  width: number;
  height: number;
  started_at: string | null;
};

export type AdCopy = {
  headline: string;
  primary_text: string;
  cta: string;
};

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

/** Meta'da 30 günden uzun süredir yayında olan reklam büyük olasılıkla işe yarıyordur. */
export function isLongRunning(ad: Ad) {
  return !!ad.started_at && Date.now() - new Date(ad.started_at).getTime() > THIRTY_DAYS;
}

export function adImageUrl(imagePath: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ads/${imagePath}`;
}
