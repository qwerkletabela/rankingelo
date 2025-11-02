"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

function toMsg(err: string) {
  const s = err.toLowerCase();
  if (s.includes("invalid login") || s.includes("invalid credentials")) return "Nieprawidłowy e-mail lub hasło.";
  if (s.includes("email not confirmed") || s.includes("email_not_confirmed")) return "E-mail niepotwierdzony. Sprawdź skrzynkę i kliknij link.";
  return err;
}

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

    async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setLoading(true);
    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Nieprawidłowy e-mail lub hasło (albo e-mail niepotwierdzony).");
        return;
      }
      setOk("Zalogowano pomyślnie. Przenoszę do panelu…");
      // kluczowe: natychmiastowe przejście + odświeżenie, middleware zadba o cookies
      router.replace("/admin");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Nieznany błąd");
    } finally {
      setLoading(false);
    }
  }


  return (
    <>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input
          type="email"
          placeholder="Email"
          className="rounded-lg border border-gray-300 px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Hasło"
          className="rounded-lg border border-gray-300 px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <div className="text-red-600 text-sm">{error}</div>}
        {ok && <div className="text-green-700 text-sm">{ok}</div>}

        <button disabled={loading} className="rounded-lg bg-black text-white px-4 py-2">
          {loading ? "Logowanie…" : "Zaloguj"}
        </button>
      </form>

      <div className="text-sm text-gray-600 mt-3">
        Nie masz konta? <Link href="/register" className="underline">Zarejestruj się</Link>
      </div>
    </>
  );
}
