"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function InviteCallback() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const client = createClient();
    const activate = async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      const code = url.searchParams.get("code");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (hash.has("error") || url.searchParams.has("error")) {
        if (active) setError(true);
        return;
      }

      const result = code
        ? await client.auth.exchangeCodeForSession(code)
        : accessToken && refreshToken
          ? await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          : await client.auth.getSession();

      if (!active) return;
      if (result.error || !result.data.session) {
        setError(true);
        return;
      }
      router.replace("/reset-password");
    };

    void activate().catch(() => {
      if (active) setError(true);
    });
    return () => { active = false; };
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f7f4] px-5 py-12">
      <section className="w-full max-w-[420px]">
        <p className="text-sm font-medium text-[#52706a]">Soul+</p>
        <h1 className="mt-2 text-2xl font-semibold">Ativando seu acesso</h1>
        {error ? (
          <div className="mt-4 space-y-4">
            <p role="alert" className="text-sm leading-6 text-[#a23f2b]">Este link expirou ou já foi usado. Peça à escola para enviar outro.</p>
            <Link href="/login" className="text-sm font-medium text-[#126b63] underline">Voltar ao login</Link>
          </div>
        ) : <p className="mt-3 text-sm text-[#667873]">Validando o link enviado para seu email…</p>}
      </section>
    </main>
  );
}