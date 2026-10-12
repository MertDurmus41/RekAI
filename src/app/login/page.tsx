"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

// Supabase ayarlanmadıysa gerçek oturum açılamaz; bu durumda giriş adımı atlanıp galeriye geçilir.
const AUTH_READY = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.900 2.3-8.400 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const signup = params.get("mode") === "signup";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending">("idle");
  const [error, setError] = useState<string | null>(
    params.get("error") ? "Giriş bağlantısı geçersiz veya süresi dolmuş." : null,
  );

  async function withGoogle() {
    if (!AUTH_READY) return router.push("/galeri");
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  // E-posta doğrulaması yok: yazılan adres hesaba etiket olarak kaydedilir ve kullanıcı doğrudan içeri alınır.
  // Arka planda Supabase'in anonim oturumu kullanılır; böylece her kullanıcının remixleri ayrı kalır.
  async function withEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!AUTH_READY) return router.push("/galeri");
    setStatus("sending");
    setError(null);
    const { error } = await createClient().auth.signInAnonymously({
      options: { data: { email_label: email.trim() } },
    });
    if (error) {
      setError(
        error.message.toLowerCase().includes("anonymous")
          ? "Giriş şu an kapalı: Supabase'de Authentication → Sign In / Providers → \"Allow anonymous sign-ins\" açılmalı."
          : error.message,
      );
      setStatus("idle");
      return;
    }
    router.push("/galeri");
    router.refresh();
  }

  return (
    <>
      <h1 className="text-2xl font-bold">{signup ? "Üye ol" : "Giriş yap"}</h1>
      <p className="mt-1 mb-6 text-sm text-mute">
        {signup ? "Bir dakikada hesabını aç, reklamını hazırla." : "Hesabına gir, kaldığın yerden devam et."}
      </p>

      <button
        type="button"
        onClick={withGoogle}
        className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-line bg-white px-3 py-3 text-sm font-semibold hover:border-ib"
      >
        <GoogleIcon />
        Google ile {signup ? "üye ol" : "giriş yap"}
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-mute">
        <span className="h-px flex-1 bg-line" />
        veya
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={withEmail} className="flex flex-col gap-3">
        <label htmlFor="email" className="text-sm font-medium">
          E-posta adresin
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@dukkanim.com"
          className="rounded-lg border-2 border-line px-3 py-3 text-sm outline-none focus:border-io"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-lg bg-io px-3 py-3 text-sm font-bold text-white hover:bg-io-dark disabled:opacity-60"
        >
          {status === "sending" ? "Giriliyor…" : "Devam et"}
        </button>
        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-mute">
        {signup ? "Zaten hesabın var mı? " : "Hesabın yok mu? "}
        <Link href={signup ? "/login" : "/login?mode=signup"} className="font-semibold text-ib hover:underline">
          {signup ? "Giriş yap" : "Üye ol"}
        </Link>
      </p>

      {!AUTH_READY && (
        <p className="mt-4 rounded-lg bg-ib-soft px-3 py-2 text-xs text-ib">
          Demo modu: hesap sistemi henüz bağlı değil, her iki seçenek de doğrudan galeriye götürür.
        </p>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-wash px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-7 shadow-lg">
        <Link href="/" className="mb-6 inline-block" aria-label="RekAI ana sayfa">
          <Logo />
        </Link>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
