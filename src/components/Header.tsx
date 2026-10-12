import Link from "next/link";

export function Header({ email }: { email: string | undefined }) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
      <Link href="/" className="font-semibold">
        <span className="mr-2 inline-block rounded-md bg-violet-600 px-1.5 py-0.5 text-xs">AR</span>
        AdRemix
      </Link>
      <nav className="flex items-center gap-4 text-sm text-zinc-400">
        <Link href="/" className="hover:text-white">
          Galeri
        </Link>
        <Link href="/remixes" className="hover:text-white">
          Remixlerim
        </Link>
        <span className="hidden text-zinc-600 sm:inline">{email}</span>
        <form action="/auth/signout" method="post">
          <button type="submit" className="hover:text-white">
            Çıkış
          </button>
        </form>
      </nav>
    </header>
  );
}
