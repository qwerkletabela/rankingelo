"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    if (password !== confirm) {
      setError("Hasła nie są takie same.");
      return;
    }
    setLoading(true);

    const { data, error } = await supabaseBrowser.auth.signUp({
      email,
      password,
      // jeśli masz włączone potwierdzanie e-maili w Supabase,
      // możesz dodać redirect:
      // options: { emailRedirectTo: `${window.location.origin}/login` }
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Gdy wymagane jest potwierdzenie e-maila, session będzie null:
    if (!data.session) {
      setOk("Konto utworzone. Sprawdź e-mail i potwierdź rejestrację.");
    } else {
      setOk("Konto utworzone. Przekierowuję do panelu logowania…");
      setTimeout(() => router.push("/login"), 800);
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
        <input
          type="password"
          placeholder="Powtórz hasło"
          className="rounded-lg border border-gray-300 px-3 py-2"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {ok && <div className="text-green-700 text-sm">{ok}</div>}
        <button disabled={loading} className="rounded-lg bg-black text-white px-4 py-2">
          {loading ? "Zakładanie..." : "Załóż konto"}
        </button>
      </form>
      <div className="text-sm text-gray-600 mt-3">
        Masz już konto? <Link href="/login" className="underline">Zaloguj się</Link>
      </div>
    </>
  );
}
