"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Menu, X, Trophy, Mail, Lock, LogIn, LogOut, User, Shield,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  // formularz logowania
  const [emailInput, setEmailInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // stan użytkownika
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // === initial load + subskrypcja zmian sesji ===
  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      // pobierz aktualnego usera
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      setUserEmail(user?.email ?? null);

      // sprawdź uprawnienia admin
      if (user?.id) {
        await checkAdmin(user.id);
      } else {
        setIsAdmin(false);
      }

      // słuchacz zmian sesji
      const sub = supabaseBrowser.auth.onAuthStateChange(async (_evt, session) => {
        const u = session?.user ?? null;
        setUserEmail(u?.email ?? null);
        if (u?.id) {
          await checkAdmin(u.id);
        } else {
          setIsAdmin(false);
        }
      });
      unsub = () => sub.data.subscription.unsubscribe();
    })();

    return () => { unsub?.(); };
  }, []);

  // === sprawdzanie roli admin ===
  async function checkAdmin(_uid: string) {
    // 1) preferowane: RPC is_admin() (SQL helper w bazie)
    const rpc = await supabaseBrowser.rpc("is_admin");
    if (!rpc.error && typeof rpc.data === "boolean") {
      setIsAdmin(rpc.data);
      return;
    }
    // 2) fallback: odczyt rangi z tabeli users (musi istnieć polityka pozwalająca odczytać swój wiersz)
    const sel = await supabaseBrowser
      .from("users")
      .select("ranga")
      .eq("id", _uid)
      .maybeSingle();
    if (!sel.error && sel.data?.ranga === "admin") {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }

  // === logowanie / wylogowanie ===
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setAuthErr(null);
    setBusy(true);
    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({
        email: emailInput.trim(),
        password: passInput,
      });
      if (error) throw error;
      setEmailInput("");
      setPassInput("");
      setOpen(false);
    } catch (err: any) {
      setAuthErr(err?.message || "Nie udało się zalogować");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setAuthErr(null);
    await supabaseBrowser.auth.signOut();
    setOpen(false);
  }

  const isAuthed = !!userEmail;
  const closeMobile = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-red-900 bg-red-700 text-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo + desktop nav */}
          <div className="flex items-center gap-4 md:gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold focus:outline-none focus-visible:ring-2 ring-white/70 rounded-md px-1"
            >
              <Trophy className="h-6 w-6" />
              <span>ELO Arena</span>
            </Link>

            <nav className="hidden md:flex items-center gap-3 lg:gap-4">
              <NavButton href="/ranking">Ranking</NavButton>
              <NavButton href="/gracze">Gracze</NavButton>
              <NavButton href="/turnieje">Turnieje</NavButton>
              <NavButton href="/statystyki">Statystyki</NavButton>
            </nav>
          </div>

          {/* Desktop: auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthed ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/90 bg-white/10 px-3 py-1.5 rounded-md">
                  Zalogowany jako <strong className="font-semibold">{userEmail}</strong>
                </span>

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="rounded-2xl bg-red-800 hover:bg-red-900 text-white px-3 py-2 shadow-sm shadow-black/20 transition-colors focus:outline-none focus-visible:ring-2 ring-white/70"
                  >
                    <span className="inline-flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4" /> Panel
                    </span>
                  </Link>
                )}

                <Link
                  href="/profil"
                  className="rounded-2xl border border-white/30 text-white hover:bg-white/10 px-3 py-2 transition-colors focus:outline-none focus-visible:ring-2 ring-white/70"
                >
                  <span className="inline-flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" /> Profil
                  </span>
                </Link>

                <button
                  onClick={handleSignOut}
                  type="button"
                  className="rounded-2xl bg-white text-red-800 hover:bg-white/90 px-3 py-2 shadow-sm shadow-black/10 transition-colors focus:outline-none focus-visible:ring-2 ring-white/70"
                >
                  <span className="inline-flex items-center gap-2 text-sm">
                    <LogOut className="h-4 w-4" /> Wyloguj
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <form onSubmit={handleSignIn} className="flex items-center gap-2">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                    <input
                      type="email"
                      required
                      placeholder="Email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="pl-8 w-56 bg-white text-gray-900 placeholder:text-gray-500 rounded-md h-9 outline-none focus:ring-2 ring-offset-2 ring-red-300"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                    <input
                      type="password"
                      required
                      placeholder="Hasło"
                      value={passInput}
                      onChange={(e) => setPassInput(e.target.value)}
                      className="pl-8 w-44 bg-white text-gray-900 placeholder:text-gray-500 rounded-md h-9 outline-none focus:ring-2 ring-offset-2 ring-red-300"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-2xl bg-white text-red-800 hover:bg-white/90 px-3 py-2 shadow-sm shadow-black/10 transition-colors focus:outline-none focus-visible:ring-2 ring-white/70 disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-2 text-sm">
                      <LogIn className="h-4 w-4" /> {busy ? "Logowanie…" : "Zaloguj"}
                    </span>
                  </button>
                </form>
                {authErr && (
                  <div className="text-xs text-red-100/90">{authErr}</div>
                )}
                <Link href="/auth/register" className="text-xs text-white/80 hover:text-white underline">
                  Nie masz konta? Zarejestruj się
                </Link>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-md focus:outline-none focus-visible:ring-2 ring-white/70"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
            type="button"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile panel */}
        {open && (
          <div id="mobile-nav" className="md:hidden pb-4 space-y-4 bg-red-700 text-white">
            {isAuthed ? (
              <div className="space-y-3 px-1">
                <div className="text-sm bg-white/10 px-3 py-2 rounded-md">
                  Zalogowany jako <strong className="font-semibold">{userEmail}</strong>
                </div>

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={closeMobile}
                    className="px-3 py-2 rounded-2xl bg-red-800 hover:bg-red-900 text-white text-center shadow-sm shadow-black/20 transition-colors"
                  >
                    <span className="inline-flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4" /> Panel
                    </span>
                  </Link>
                )}

                <Link
                  href="/profil"
                  onClick={closeMobile}
                  className="px-3 py-2 rounded-2xl bg-red-800 hover:bg-red-900 text-white text-center shadow-sm shadow-black/20 transition-colors"
                >
                  <span className="inline-flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" /> Profil
                  </span>
                </Link>

                <button
                  onClick={async () => { closeMobile(); await handleSignOut(); }}
                  className="px-3 py-2 rounded-2xl bg.white text-red-800 hover:bg-white/90 text-center shadow-sm shadow-black/10 transition-colors bg-white"
                  type="button"
                >
                  <span className="inline-flex items-center gap-2 text-sm">
                    <LogOut className="h-4 w-4" /> Wyloguj
                  </span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-2 px-1">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="pl-8 w-full bg-white text-gray-900 placeholder:text-gray-500 rounded-md h-10 outline-none focus:ring-2 ring-offset-2 ring-red-300"
                  />
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                  <input
                    type="password"
                    required
                    placeholder="Hasło"
                    value={passInput}
                    onChange={(e) => setPassInput(e.target.value)}
                    className="pl-8 w-full bg-white text-gray-900 placeholder:text-gray-500 rounded-md h-10 outline-none focus:ring-2 ring-offset-2 ring-red-300"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-2xl bg-white text-red-800 hover:bg.white/90 px-3 py-2 shadow-sm shadow-black/10 transition-colors focus:outline-none focus-visible:ring-2 ring-white/70 disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2 text-sm">
                    <LogIn className="h-4 w-4" /> {busy ? "Logowanie…" : "Zaloguj"}
                  </span>
                </button>
                {authErr && (
                  <div className="text-xs text-red-100/90 px-1">{authErr}</div>
                )}
                <Link
                  href="/auth/register"
                  className="block text-xs text.white/80 hover:text-white underline text-center"
                  onClick={closeMobile}
                >
                  Nie masz konta? Zarejestruj się
                </Link>
              </form>
            )}

            <div className="grid gap-2 pt-2 border-t border-white/20 px-1">
              {[
                { label: "Ranking", href: "/ranking" },
                { label: "Gracze", href: "/gracze" },
                { label: "Turnieje", href: "/turnieje" },
                { label: "Statystyki", href: "/statystyki" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobile}
                  className="px-3 py-2 rounded-2xl bg-red-800 hover:bg-red-900 text-white text-center shadow-sm shadow-black/20 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function NavButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-red-800 hover:bg-red-900 text-white px-3 py-2 shadow-sm shadow-black/20 transition-colors focus:outline-none focus-visible:ring-2 ring-white/70"
    >
      {children}
    </Link>
  );
}
