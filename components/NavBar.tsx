"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Trophy, Mail, Lock, LogIn, LogOut, User, Shield } from "lucide-react";

type NavbarProps = {
  isAuthed?: boolean;
  isAdmin?: boolean;
  onSignIn?: (email: string, password: string) => Promise<void> | void;
  onSignOut?: () => Promise<void> | void;
};

export default function Navbar({
  isAuthed = false,
  isAdmin = false,
  onSignIn,
  onSignOut,
}: NavbarProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (onSignIn) await onSignIn(email, pass);
  }

  // będzie użyte do zamykania menu po kliknięciu linku w mobile
  const closeAnd = (fn?: () => void) => () => {
    setOpen(false);
    fn?.();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-red-900 bg-red-700 text-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo + nav */}
          <div className="flex items-center gap-4 md:gap-8">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold focus:outline-none focus-visible:ring-2 ring-white/70 rounded-md px-1">
              <Trophy className="h-6 w-6" />
              <span>ELO Arena</span>
            </Link>

            {/* Desktop nav */}
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
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    className="rounded-2xl bg-red-800 hover:bg-red-900 text-white px-3 py-2 shadow-sm shadow-black/20 transition-colors focus:outline-none focus-visible:ring-2 ring-white/70"
                    type="button"
                  >
                    <span className="inline-flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4" /> Panel
                    </span>
                  </button>
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
                  onClick={() => onSignOut?.()}
                  className="rounded-2xl bg-white text-red-800 hover:bg-white/90 px-3 py-2 shadow-sm shadow-black/10 transition-colors focus:outline-none focus-visible:ring-2 ring-white/70"
                  type="button"
                >
                  <span className="inline-flex items-center gap-2 text-sm">
                    <LogOut className="h-4 w-4" /> Wyloguj
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                    <input
                      type="email"
                      required
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-8 w-56 bg-white text-gray-900 placeholder:text-gray-500 rounded-md h-9 outline-none focus:ring-2 ring-offset-2 ring-red-300"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                    <input
                      type="password"
                      required
                      placeholder="Hasło"
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      className="pl-8 w-44 bg-white text-gray-900 placeholder:text-gray-500 rounded-md h-9 outline-none focus:ring-2 ring-offset-2 ring-red-300"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-2xl bg-white text-red-800 hover:bg-white/90 px-3 py-2 shadow-sm shadow-black/10 transition-colors focus:outline-none focus-visible:ring-2 ring-white/70"
                  >
                    <span className="inline-flex items-center gap-2 text-sm">
                      <LogIn className="h-4 w-4" /> Zaloguj
                    </span>
                  </button>
                </form>
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
            <form onSubmit={handleSubmit} className="space-y-2 px-1">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-8 w-full bg-white text-gray-900 placeholder:text-gray-500 rounded-md h-10 outline-none focus:ring-2 ring-offset-2 ring-red-300"
                />
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                <input
                  type="password"
                  required
                  placeholder="Hasło"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="pl-8 w-full bg-white text-gray-900 placeholder:text-gray-500 rounded-md h-10 outline-none focus:ring-2 ring-offset-2 ring-red-300"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-2xl bg-white text-red-800 hover:bg-white/90 px-3 py-2 shadow-sm shadow-black/10 transition-colors focus:outline-none focus-visible:ring-2 ring-white/70"
              >
                <span className="inline-flex items-center gap-2 text-sm">
                  <LogIn className="h-4 w-4" /> Zaloguj
                </span>
              </button>
              <Link
                href="/auth/register"
                className="block text-xs text-white/80 hover:text-white underline text-center"
              >
                Nie masz konta? Zarejestruj się
              </Link>
            </form>

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
                  onClick={closeAnd()}
                  className="px-3 py-2 rounded-2xl bg-red-800 hover:bg-red-900 text-white text-center shadow-sm shadow-black/20 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              {isAuthed && (
                <button
                  onClick={closeAnd(() => onSignOut?.())}
                  className="px-3 py-2 rounded-2xl bg-white text-red-800 hover:bg-white/90 text-center shadow-sm shadow-black/10 transition-colors"
                  type="button"
                >
                  <span className="inline-flex items-center gap-2 text-sm">
                    <LogOut className="h-4 w-4" /> Wyloguj
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/* --- Pomocniczy przycisk nawigacji (ciemny, z efektem hover i focus) --- */
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
