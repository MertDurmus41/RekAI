import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { ADS } from "@/data/ads";
import type { AdCopy } from "@/lib/types";

export const maxDuration = 60;

const SYSTEM_PROMPT = `Sen Türkiye'deki küçük esnaf (restoran, kafe, büfe) için Instagram/Meta reklam metni yazan bir metin yazarısın.
Sana ilham alınan orijinal reklam ve esnafın o reklamda yaptırdığı değişiklik verilecek.
Esnafın kendi işletmesi için samimi, kısa ve Türkçe bir reklam metni yaz. Orijinal markanın adını kullanma. Bilmediğin fiyat, adres veya kampanya uydurma.
Sadece şu JSON'u döndür, başka hiçbir şey yazma:
{"headline": "en fazla 40 karakter", "primary_text": "en fazla 3 cümle", "cta": "Sipariş Ver | Yol Tarifi Al | Hemen Ara | Menüyü Gör | Mesaj Gönder seçeneklerinden biri"}`;

export async function POST(request: Request) {
  if (!process.env.FAL_KEY) {
    return NextResponse.json({ error: "FAL_KEY tanımlı değil." }, { status: 500 });
  }
  const { adId, prompt } = await request.json();
  const ad = ADS.find((a) => a.id === adId);
  if (!ad || typeof prompt !== "string") {
    return NextResponse.json({ error: "Reklam bulunamadı." }, { status: 404 });
  }

  fal.config({ credentials: process.env.FAL_KEY });
  try {
    const result = await fal.subscribe("openrouter/router", {
      input: {
        model: process.env.FAL_LLM_MODEL ?? "google/gemini-2.5-flash",
        system_prompt: SYSTEM_PROMPT,
        prompt: `Kategori: ${ad.sector}\nOrijinal reklam mesajı: ${ad.title}\nEsnafın istediği değişiklik: ${prompt}`,
        temperature: 0.7,
        max_tokens: 400,
      },
    });
    const text = (result.data as { output: string }).output;
    const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const copy: AdCopy = {
      headline: String(parsed.headline),
      primary_text: String(parsed.primary_text),
      cta: String(parsed.cta),
    };
    return NextResponse.json(copy);
  } catch (error) {
    console.error("ad copy failed", error);
    return NextResponse.json({ error: "Reklam metni üretilemedi. Tekrar dene." }, { status: 502 });
  }
}
