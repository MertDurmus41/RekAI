import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import sharp, { type Sharp } from "sharp";
import { ADS } from "@/data/ads";
import { buildRemixPrompt, paddingFor } from "@/lib/remix-prompt";
import { createClient } from "@/lib/supabase/server";

const DAILY_LIMIT = 20;
const SUPABASE_READY = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

// Vercel'in ücretsiz planındaki üst sınır; bir remix yaklaşık 20 saniye sürer.
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const UPLOAD_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const PLANNER_PROMPT = `You are the planning agent of an advertisement editing tool. You receive images in this order:
1. the ORIGINAL advertisement,
2. (only if stated) the same advertisement with the user's hand-drawn pen marks showing where a change applies,
3. (only if stated) the user's own logo or product image.
The user gives a command (usually Turkish) that may contain several requests.

Turn the command into a list of ATOMIC edits describing the FINAL desired image. Rules:
- One element, one step. Never output two steps that touch the same element: work out what the user wants that element to finally look like after ALL their requests are applied in order, and write a single step for it.
- When the user says "X yazısını Y yap", the whole text X is replaced by Y (not appended to it).
- Each step is one self-contained English instruction a retoucher could follow without seeing the command.
- Identify the target by what it IS and WHERE it is in the original (e.g. "the orange word 'MENÜ' directly under the brown 'WHOPPER' headline"). Use the pen marks to work out which element the user means, but never mention pen marks, circles or the marked copy in a step.
- Copy any text to be written character for character as the user typed it. Do not translate it, fix its spelling or add diacritics. You may match the letter case of the text it replaces.
- Refer to the user's image as "the user's image (the last reference image)" and say it must be placed unaltered.
- A background-color request means the entire background, edge to edge, top to bottom.
- Do not invent edits the user did not ask for.
Return ONLY JSON: {"steps": ["..."]}`;

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Agent adımı: görseli (ve varsa kalem işaretlerini) görerek komutu somut, tek tek uygulanabilir
 * düzenleme adımlarına çevirir. Başarısız olursa null döner ve ham komut kullanılır.
 */
async function plan(command: string, imageUrls: string[], o: { hasMarks: boolean; hasUpload: boolean }) {
  try {
    const result = await fal.subscribe("openrouter/router/vision", {
      input: {
        model: process.env.FAL_PLANNER_MODEL ?? "google/gemini-3-flash-preview",
        system_prompt: PLANNER_PROMPT,
        prompt: `Images provided: original${o.hasMarks ? ", marked copy" : ""}${o.hasUpload ? ", user's image" : ""}.\nUser command: ${command}`,
        image_urls: imageUrls,
        temperature: 0.1,
        max_tokens: 4000,
        ...(process.env.FAL_PLANNER_REASONING === "on" ? { reasoning: true } : {}),
      },
    });
    const text = (result.data as { output: string }).output;
    const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const steps = Array.isArray(parsed.steps)
      ? parsed.steps.filter((s: unknown): s is string => typeof s === "string" && !!s.trim()).slice(0, 12)
      : [];
    if (steps.length) return steps as string[];
  } catch (error) {
    console.error("planner failed, using raw command", error);
  }
  return null;
}

/** Kalem çizimlerini orijinalin küçültülmüş kopyasına bindirir (yalnızca planlayıcı görür). */
async function markedCopy(original: Buffer, marks: File) {
  // sharp bindirmeyi yeniden boyutlandırmadan sonra yapar; bu yüzden iki katman önce aynı boyuta getirilir.
  const base = await sharp(original).resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).toBuffer({ resolveWithObject: true });
  const overlay = await sharp(Buffer.from(await marks.arrayBuffer()))
    .resize(base.info.width, base.info.height, { fit: "fill" })
    .png()
    .toBuffer();
  return sharp(base.data).composite([{ input: overlay }]).jpeg({ quality: 85 }).toBuffer();
}

function validImage(file: unknown): file is File {
  return file instanceof File && file.size > 0;
}

export async function POST(request: Request) {
  if (!process.env.FAL_KEY) return fail("FAL_KEY tanımlı değil.", 500);

  // Supabase bağlıysa giriş zorunlu ve kullanıcı başına günlük sınır var; değilse (yerel demo) kısıtsız.
  const supabase = SUPABASE_READY ? await createClient() : null;
  let userId: string | null = null;
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("Giriş yapmalısın.", 401);
    userId = user.id;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("remixes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) return fail(`Günlük ${DAILY_LIMIT} remix sınırına ulaştın. Yarın tekrar dene.`, 429);
  }

  const form = await request.formData();
  const adId = form.get("adId");
  const command = form.get("prompt");
  const upload = form.get("file");
  const marks = form.get("marks");

  if (typeof adId !== "string" || typeof command !== "string" || !command.trim()) {
    return fail("Ne değişmesini istediğini yaz.", 400);
  }
  if (command.length > 1000) return fail("Komut en fazla 1000 karakter olabilir.", 400);

  const ad = ADS.find((a) => a.id === adId);
  if (!ad) return fail("Reklam bulunamadı.", 404);

  const uploadFile = validImage(upload) ? upload : null;
  if (uploadFile) {
    if (!UPLOAD_TYPES.has(uploadFile.type)) return fail("Sadece PNG, JPG veya WEBP yükleyebilirsin.", 400);
    if (uploadFile.size > MAX_UPLOAD_BYTES) return fail("Görsel en fazla 8 MB olabilir.", 400);
  }
  const marksFile = validImage(marks) && marks.type === "image/png" && marks.size <= MAX_UPLOAD_BYTES ? marks : null;

  fal.config({ credentials: process.env.FAL_KEY });

  const t0 = Date.now();
  const timings: Record<string, number> = {};
  const lap = (name: string) => {
    timings[name] = Date.now() - t0 - Object.values(timings).reduce((a, b) => a + b, 0);
  };

  try {
    // Yerelde görsel diskten okunur. Vercel'de public/ klasörü fonksiyonun diskinde bulunmaz;
    // orada görsel sitenin kendi adresinden indirilir.
    const original = await readFile(path.join(process.cwd(), "public", ad.src)).catch(async () => {
      const res = await fetch(new URL(ad.src, request.url));
      if (!res.ok) throw new Error(`reklam görseli okunamadı: ${ad.src} (${res.status})`);
      return Buffer.from(await res.arrayBuffer());
    });
    const meta = await sharp(original).metadata();
    const W = meta.width!;
    const H = meta.height!;

    const model = process.env.FAL_EDIT_MODEL ?? "ideogram/v4.5/edit";
    // Ideogram kaynak görselin boyutunu korur. Diğer modeller yalnızca belirli oranları desteklediği için
    // görsel o orana kenar uzatılarak getirilir; sonuçta uzantı geri kesilir.
    const isIdeogram = model.startsWith("ideogram/");
    const pad = isIdeogram
      ? { label: "auto", paddedW: W, paddedH: H, left: 0, top: 0, right: 0, bottom: 0 }
      : paddingFor(W, H);
    const padded = pad.paddedW !== W || pad.paddedH !== H;
    const store = (b: Buffer, type: string) => fal.storage.upload(new Blob([new Uint8Array(b)], { type }));
    // Planlayıcı ayrıntıya değil yerleşime bakar; ona küçültülmüş kopyalar yeter (daha hızlı ve ucuz).
    const small = (img: Sharp) =>
      img.resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();

    // Düzenleme modeline giden görsel: kenar uzatma gerekmiyorsa dosya olduğu gibi yüklenir.
    const editSource = padded
      ? {
          buf: await sharp(original)
            .extend({ top: pad.top, bottom: pad.bottom, left: pad.left, right: pad.right, extendWith: "copy" })
            .png()
            .toBuffer(),
          type: "image/png",
        }
      : { buf: original, type: meta.format === "png" ? "image/png" : "image/jpeg" };

    const [originalUrl, planOriginalUrl, markedUrl, uploadUrl] = await Promise.all([
      store(editSource.buf, editSource.type),
      small(sharp(original)).then((b) => store(b, "image/jpeg")),
      marksFile ? markedCopy(original, marksFile).then((b) => store(b, "image/jpeg")) : null,
      // Logo her zaman PNG'ye çevrilir: modelin okuyamadığı biçimleri eler, şeffaflığı korur.
      uploadFile
        ? uploadFile
            .arrayBuffer()
            .then((ab) =>
              sharp(Buffer.from(ab)).resize(1536, 1536, { fit: "inside", withoutEnlargement: true }).png().toBuffer(),
            )
            .then((b) => store(b, "image/png"))
        : null,
    ]);

    lap("upload");
    // Planlayıcı görseli ve işaretleri görür; işaretleri "nerede, ne" diye somut tarife çevirir.
    const steps = await plan(
      command.trim(),
      [planOriginalUrl, markedUrl, uploadUrl].filter((u): u is string => !!u),
      { hasMarks: !!markedUrl, hasUpload: !!uploadUrl },
    );

    lap("plan");
    // Plan varsa işaretli kopya görsel modeline gönderilmez (çizimlerin çıktıya sızmasını önler).
    const sendMarks = !steps && !!markedUrl;
    const imageUrls = [originalUrl, sendMarks ? markedUrl : null, uploadUrl].filter((u): u is string => !!u);

    const prompt = buildRemixPrompt(steps ?? [command.trim()], { hasMarks: sendMarks, hasUpload: !!uploadUrl, padded });
    const result = await fal.subscribe(model, {
      input: isIdeogram
        ? {
            prompt,
            image_url: originalUrl,
            ...(imageUrls.length > 1 ? { reference_image_urls: imageUrls.slice(1) } : {}),
            // "high": değişmeyen pikseller orijinalden geri yüklenir.
            edit_precision: "high",
            quality: process.env.FAL_EDIT_QUALITY ?? "low",
            num_images: 1,
          }
        : {
            prompt,
            image_urls: imageUrls,
            aspect_ratio: pad.label,
            resolution: Math.max(pad.paddedW, pad.paddedH) > 1100 ? "2K" : "1K",
            num_images: 1,
            output_format: "png",
          },
    });
    lap("edit");
    const resultUrl = (result.data as { images?: { url: string }[] }).images?.[0]?.url;
    if (!resultUrl) return fail("Model görsel döndürmedi. Komutu değiştirip tekrar dene.", 502);

    // Çıktı her zaman orijinalin tam boyutunda olur. Model zaten o boyutta PNG verdiyse olduğu gibi kaydedilir;
    // aksi hâlde tuval boyutuna getirilip eklenen kenar kesilir. Oran tutmuyorsa gerilmez, "cover" ile kırpılır.
    const generated = Buffer.from(await (await fetch(resultUrl)).arrayBuffer());
    const gm = await sharp(generated).metadata();
    const want = pad.paddedW / pad.paddedH;
    const ratioOff = Math.abs(gm.width! / gm.height! - want) / want;
    const output =
      !padded && gm.width === W && gm.height === H && gm.format === "png"
        ? generated
        : await sharp(generated)
            .resize(pad.paddedW, pad.paddedH, { fit: ratioOff > 0.01 ? "cover" : "fill" })
            .extract({ left: pad.left, top: pad.top, width: W, height: H })
            .png({ compressionLevel: 4 })
            .toBuffer();

    const id = randomUUID();
    let url: string;
    if (supabase && userId) {
      // Vercel'de dosya sistemi salt okunurdur; sonuç kullanıcının kendi klasörüne (RLS) yüklenir.
      const resultPath = `${userId}/${id}.png`;
      const { error: saveError } = await supabase.storage
        .from("remixes")
        .upload(resultPath, output, { contentType: "image/png" });
      if (saveError) throw saveError;
      const { error: rowError } = await supabase.from("remixes").insert({
        id,
        user_id: userId,
        ad_id: ad.id,
        prompt: command.trim(),
        result_path: resultPath,
      });
      if (rowError) throw rowError;
      const { data: signed } = await supabase.storage.from("remixes").createSignedUrl(resultPath, 60 * 60 * 24);
      url = signed?.signedUrl ?? "";
    } else {
      await mkdir(path.join(process.cwd(), "public", "remixes"), { recursive: true });
      await writeFile(path.join(process.cwd(), "public", "remixes", `${id}.png`), output);
      url = `/remixes/${id}.png`;
    }

    lap("save");
    console.info("remix timings (ms)", timings);
    return NextResponse.json({ id, url, width: W, height: H, steps });
  } catch (error) {
    console.error("remix failed", error);
    return fail("Görsel üretilemedi. Tekrar dene.", 502);
  }
}
