import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

export default async function RemixesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: remixes } = await supabase
    .from("remixes")
    .select("id, prompt, result_path, created_at, ads(brand)")
    .order("created_at", { ascending: false })
    .limit(60);

  const paths = (remixes ?? []).map((r) => r.result_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("remixes").createSignedUrls(paths, 3600)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <>
      <Header email={user?.email} />
      <main className="flex-1 p-5">
        <h1 className="mb-4 text-lg font-semibold">Remixlerim</h1>
        {!remixes?.length ? (
          <p className="text-sm text-zinc-500">Henüz remix yapmadın.</p>
        ) : (
          <div className="columns-2 gap-4 md:columns-3 xl:columns-5">
            {remixes.map((remix) => {
              const url = urlByPath.get(remix.result_path) ?? undefined;
              const brand = (remix.ads as unknown as { brand: string } | null)?.brand;
              return (
                <a
                  key={remix.id}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-4 block break-inside-avoid"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={remix.prompt}
                    loading="lazy"
                    className="w-full rounded-xl border border-zinc-800"
                  />
                  <p className="mt-2 text-xs text-zinc-500">{brand}</p>
                  <p className="line-clamp-2 text-sm">{remix.prompt}</p>
                </a>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
