"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Puzzle, LogOut, LogIn, Shield } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function NavBar() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      setEmail(user?.email ?? null);
      setChecking(false);
    })();
  }, []);

  const isActive = (p: string) => pathname === p;

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    window.location.href = "/"; // twarde odświeżenie, żeby wyczyścić SSR
  }

  return (
    <header className="navbar">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-2 text-white">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center ring-1 ring-white/20">
            <Puzzle className="w-5 h-5" />
          </div>
          <span className="font-semibold tracking-tight">Ranking</span>
        </Link>

        {/* Links */}
        <nav className="ml-auto hidden sm:flex items-center gap-6">
          <Link href="/" className={`nav-link ${isActive("/") ? "nav-link-active underline underline-offset-8 decoration-white/80" : ""}`}>Ranking</Link>
          <Link href="/matches" className={`nav-link ${isActive("/matches") ? "nav-link-active underline underline-offset-8 decoration-white/80" : ""}`}>Mecze</Link>
          <Link href="/admin" className={`nav-link ${pathname?.startsWith("/admin") ? "nav-link-active underline underline-offset-8 decoration-white/80" : ""}`}>Admin</Link>
        </nav>

        {/* CTA / Auth */}
        <div className="ml-2 flex items-center gap-2">
          {!checking && email ? (
            <>
              <span className="hidden md:inline text-xs text-white/80">{email}</span>
              <button onClick={signOut} className="btn btn-ghost text-white/90">
                <LogOut className="w-4 h-4 mr-2" /> Wyloguj
              </button>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary">
              <LogIn className="w-4 h-4 mr-2" /> Zaloguj
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

