import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ADS } from "@/data/ads";

const STEPS = [
  { n: "1", title: "Bir reklam seç", text: "Yayında olan, işe yaradığı belli yüzlerce reklam arasından kendi işine uyanı bul." },
  { n: "2", title: "Ne değişsin, yaz", text: "\"Arka planı kırmızı yap, logoyu benimkiyle değiştir.\" İstersen kalemle işaretle." },
  { n: "3", title: "Reklamın hazır", text: "Yaklaşık 20 saniyede, sadece istediğin yerleri değişmiş yeni görselini indir." },
];

// Kahraman bölümündeki kolaj: farklı sektörlerden, dikey ya da kare reklamlar.
function collage() {
  const seen = new Set<string>();
  const picks = [];
  for (const ad of ADS) {
    if (seen.has(ad.sector) || ad.width > ad.height * 1.1) continue;
    seen.add(ad.sector);
    picks.push(ad);
    if (picks.length === 8) break;
  }
  return picks;
}

export default function Landing() {
  const picks = collage();
  const sectors = [...new Set(ADS.map((a) => a.sector))];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex w-full max-w-[1300px] items-center justify-between gap-4 px-5 py-5">
        <Link href="/" aria-label="RekAI ana sayfa">
          <Logo />
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="px-3 py-2 text-sm font-semibold text-ib hover:underline">
            Giriş Yap
          </Link>
          <Link
            href="/login?mode=signup"
            className="rounded-lg bg-io px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-io-dark"
          >
            Üye Ol
          </Link>
        </nav>
      </header>

      <div className="flex h-1.5" aria-hidden="true">
        <span className="flex-[3] bg-io" />
        <span className="flex-1 bg-sky" />
        <span className="flex-[2] bg-ib" />
        <span className="flex-1 bg-sun" />
        <span className="flex-[3] bg-io" />
      </div>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-[1300px] items-center gap-10 px-5 py-14 lg:grid-cols-2">
          <div>
            <p className="mb-4 inline-block rounded-full bg-io-soft px-3 py-1 text-xs font-semibold text-io-dark">
              Esnaf, kafe ve küçük dükkânlar için
            </p>
            <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-ink sm:text-5xl">
              Tutan reklamı seç,
              <br />
              <span className="text-io">kendi dükkânına</span> uyarla.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-mute">
              Tasarımcıya gerek yok. Büyük markaların ve senin gibi esnafın yayındaki reklamlarından birini seç, ne
              değişmesini istediğini yaz. Sadece istediğin şey değişir, gerisi aynı kalır.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login?mode=signup"
                className="rounded-xl bg-io px-7 py-3.5 text-base font-bold text-white shadow-sm hover:bg-io-dark"
              >
                Ücretsiz Üye Ol
              </Link>
              <Link
                href="/login"
                className="rounded-xl border-2 border-ib/30 px-7 py-3.5 text-base font-semibold text-ib hover:border-ib hover:bg-ib-soft"
              >
                Giriş Yap
              </Link>
            </div>
            <p className="mt-5 text-sm text-mute">
              {ADS.length} hazır reklam · {sectors.length} sektör
            </p>
          </div>

          <div className="columns-3 gap-3 sm:columns-4" aria-hidden="true">
            {picks.map((ad) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={ad.id}
                src={ad.src}
                alt=""
                width={ad.width}
                height={ad.height}
                loading="lazy"
                className="mb-3 h-auto w-full rounded-xl border border-line shadow-sm"
              />
            ))}
          </div>
        </section>

        <section className="bg-wash py-14">
          <div className="mx-auto w-full max-w-[1300px] px-5">
            <h2 className="text-2xl font-bold">Nasıl çalışır?</h2>
            <ol className="mt-6 grid gap-5 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-2xl border border-line bg-white p-6">
                  <span className="grid size-10 place-items-center rounded-full bg-ib text-lg font-bold text-white">
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm text-mute">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1300px] px-5 py-14">
          <h2 className="text-2xl font-bold">Her işe uygun şablon</h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {sectors.map((s) => (
              <li key={s} className="rounded-full border border-line px-4 py-1.5 text-sm">
                {s}
              </li>
            ))}
          </ul>
          <Link
            href="/login?mode=signup"
            className="mt-8 inline-block rounded-xl bg-io px-7 py-3.5 text-base font-bold text-white shadow-sm hover:bg-io-dark"
          >
            Hemen Başla
          </Link>
        </section>
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-mute">
        © {new Date().getFullYear()} RekAI · Galerideki reklamlar ilgili markalara aittir, yalnızca ilham amaçlı gösterilir.
      </footer>
    </div>
  );
}
