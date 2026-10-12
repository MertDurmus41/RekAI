import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ADS } from "@/data/ads";
import { createClient } from "@/lib/supabase/server";

export default async function RemixesPage() {
  const supabase = await createClient();
  const { data: remixes } = await supabase
    .from("remixes")
    .select("id, ad_id, prompt, result_path, created_at")
    .order("created_at", { ascending: false })
    .limit(60);

  const paths = (remixes ?? []).map((r) => r.result_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("remixes").createSignedUrls(paths, 3600)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-5 py-5">
        <Link href="/galeri" aria-label="RekAI galeri">
          <Logo />
        </Link>
        <Link href="/galeri" className="text-sm font-semibold text-ib hover:underline">
          ← Galeriye dön
        </Link>
      </header>
      <div className="h-1.5 bg-io" aria-hidden="true" />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-6">
        <h1 className="mb-4 text-xl font-bold">Remixlerim</h1>
        {!remixes?.length ? (
          <p className="text-sm text-mute">Henüz remix yapmadın.</p>
        ) : (
          <div className="columns-2 gap-4 md:columns-3 xl:columns-5">
            {remixes.map((remix) => {
              const url = urlByPath.get(remix.result_path) ?? undefined;
              const brand = ADS.find((a) => a.id === remix.ad_id)?.brand;
              return (
                <a key={remix.id} href={url} target="_blank" rel="noreferrer" className="mb-5 block break-inside-avoid">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={remix.prompt} loading="lazy" className="w-full rounded-xl border border-line shadow-sm" />
                  <p className="mt-2 text-xs text-mute">{brand}</p>
                  <p className="line-clamp-2 text-sm">{remix.prompt}</p>
                </a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
