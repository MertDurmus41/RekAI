"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(
    useSearchParams().get("error") ? "Giriş bağlantısı geçersiz veya süresi dolmuş." : null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setStatus("idle");
    } else {
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-ink">
        <span className="font-medium text-ink">{email}</span> adresine giriş bağlantısı
        gönderdik. E-postandaki bağlantıya tıkla.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label htmlFor="email" className="text-sm text-mute">
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
        className="rounded-lg border-2 border-line px-3 py-2.5 text-sm outline-none focus:border-io"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-lg bg-io px-3 py-2.5 text-sm font-bold text-white hover:bg-io-dark disabled:opacity-60"
      >
        {status === "sending" ? "Gönderiliyor…" : "Giriş bağlantısı gönder"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-lg">
        <div className="mb-4"><Logo /></div>
        <p className="mb-6 text-sm text-mute">
          Tutan reklamları kendi dükkanına uyarla.
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
