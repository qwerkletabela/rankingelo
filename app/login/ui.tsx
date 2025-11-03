"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next"); // np. ?next=/admin

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const { data, error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    // przekieruj wg rangi
    const user = data.user;
    let target = next || "/";

    if (user) {
      const { data: me } = await supabaseBrowser
        .from("users")
        .select("ranga")
        .eq("id", user.id)
        .maybeSingle();

      if (me?.ranga === "admin") {
        target = next || "/admin";
      }
    }

    // twardsze przeładowanie (czyści SSR), ale router też ok
    router.replace(target);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="text-sm grid gap-1">
        <span className="text-gray-600">E-mail</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </label>

      <label className="text-sm grid gap-1">
        <span className="text-gray-600">Hasło</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </label>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? "Logowanie..." : "Zaloguj"}
      </button>
    </form>
  );
}
