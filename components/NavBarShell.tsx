"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  userEmail?: string;
  isAdmin?: boolean;
  signOutAction?: (formData: FormData) => Promise<void>;
};

export default function NavBarShell({ userEmail, isAdmin, signOutAction }: Props) {
  const [open, setOpen] = useState(false);

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link
      href={href}
      className="px-3 py-2 rounded-xl bg-red-700/90 hover:bg-red-800 active:bg-red-900 transition text-white text-sm shadow-sm"
      onClick={() => setOpen(false)}
    >
      {children}
    </Link>
  );

  return (
    <nav className="w-full bg-red-600 text-white border-b border-red-700 shadow-md">
      <div className="mx-auto max-w-6xl px-4 py-2.5 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg tracking-wide hover:opacity-90">
          Elo Arena
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-2">
          <NavLink href="/ranking">Ranking</NavLink>
          <NavLink href="/turnieje">Nadchodzące turnieje</NavLink>
          <NavLink href="/">Strona główna</NavLink>
          {isAdmin && <NavLink href="/admin">Panel admina</NavLink>}
        </div>

        {/* Prawa strona */}
        <div className="hidden md:flex items-center gap-3">
          {userEmail ? (
            <>
              <span className="text-xs md:text-sm bg-red-700/70 rounded-lg px-2 py-1">
                Zalogowany: {userEmail} {isAdmin ? "(admin)" : ""}
              </span>
              {signOutAction ? (
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl bg-white/90 text-red-700 hover:bg-white transition text-sm shadow"
                  >
                    Wyloguj
                  </button>
                </form>
              ) : (
                <Link
                  href="/logout"
                  className="px-3 py-2 rounded-xl bg-white/90 text-red-700 hover:bg-white transition text-sm shadow"
                >
                  Wyloguj
                </Link>
              )}
            </>
          ) : (
            <Link
              href="/login"
              className="px-3 py-2 rounded-xl bg-white/90 text-red-700 hover:bg-white transition text-sm shadow"
            >
              Zaloguj
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          aria-label="Menu"
          className="md:hidden inline-flex items-center justify-center rounded-xl px-3 py-2 bg-red-700/90 hover:bg-red-800 transition"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-red-700 bg-red-600/95">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2">
            <NavLink href="/ranking">Ranking</NavLink>
            <NavLink href="/turnieje">Nadchodzące turnieje</NavLink>
            <NavLink href="/">Strona główna</NavLink>
            {isAdmin && <NavLink href="/admin">Panel admina</NavLink>}

            <div className="h-px bg-red-700/70 my-2" />

            {userEmail ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs bg-red-700/70 rounded-lg px-2 py-1">
                  {userEmail} {isAdmin ? "(admin)" : ""}
                </span>
                {signOutAction ? (
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-xl bg-white/90 text-red-700 hover:bg-white transition text-sm shadow"
                    >
                      Wyloguj
                    </button>
                  </form>
                ) : (
                  <Link
                    href="/logout"
                    className="px-3 py-2 rounded-xl bg-white/90 text-red-700 hover:bg-white transition text-sm shadow"
                    onClick={() => setOpen(false)}
                  >
                    Wyloguj
                  </Link>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3 py-2 rounded-xl bg-white/90 text-red-700 hover:bg-white transition text-sm shadow self-start"
                onClick={() => setOpen(false)}
              >
                Zaloguj
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
