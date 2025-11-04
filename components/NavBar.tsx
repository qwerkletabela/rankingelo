"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Puzzle, LogOut, LogIn, Menu, X, User, Shield } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Role = "admin" | "user" | null;

export default function NavBar() {
  const pathname = usePathname() || "/";
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [checking, setChecking] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isActive = (p: string) =>
    pathname === p || (p !== "/" && pathname.startsWith(p + "/"));

  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      setEmail(user?.email ?? null);

      if (user) {
        const { data } = await supabaseBrowser
          .from("users")
          .select("ranga")
          .eq("id", user.id)
          .maybeSingle();
        setRole((data?.ranga as Role) ?? "user");
      } else {
        setRole(null);
      }

      const sub = supabaseBrowser.auth.onAuthStateChange(async (_evt, session) => {
        const u = session?.user ?? null;
        setEmail(u?.email ?? null);
        if (u) {
          const { data } = await supabaseBrowser
            .from("users")
            .select("ranga")
            .eq("id", u.id)
            .maybeSingle();
          setRole((data?.ranga as Role) ?? "user");
        } else {
          setRole(null);
        }
      });
      unsub = () => sub.data.subscription.unsubscribe();
      setChecking(false);
    })();

    return () => { unsub?.(); };
  }, []);

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    setMobileOpen(false);
    router.replace("/");
  }

  const links = [
    { href: "/", label: "Start" },
    { href: "/ranking", label: "Ranking" },
    { href: "/matches", label: "Mecze" },
    { href: "/turnieje", label: "Turnieje" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-[#8d0b0b] text-white">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center ring-1 ring-white/20">
            <Puzzle className="w-5 h-5" />
          </div>
          <span className="font-semibold tracking-tight">Ranking</span>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-6 hidden md:flex items-center gap-2">
          {links.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                isActive(it.href)
                  ? "bg-white/15 underline underline-offset-8 decoration-white/70"
                  : "hover:bg-white/10"
              }`}
            >
              {it.label}
            </Link>
          ))}
        </nav>

        {/* Right side (desktop) */}
        <div className="ml-auto hidden md:flex items-center gap-2 relative">
          {!checking && email ? (
            <>
              <button
                onClick={() => setUserMenuOpen((s) => !s)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/10"
              >
                <User className="w-4 h-4" />
                <span className="text-sm">{email}</span>
              </button>
              {userMenuOpen && (
                <div
                  className="absolute right-0 top-[110%] w-56 rounded-lg bg-white text-gray-800 shadow-lg ring-1 ring-black/10 overflow-hidden"
                  onMouseLeave={() => setUserMenuOpen(false)}
                >
                  {role === "admin" && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Shield className="w-4 h-4" />
                      Panel admina
                    </Link>
                  )}
                  <button
                    onClick={signOut}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Wyloguj
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link href="/login" className="btn btn-primary">
              <LogIn className="w-4 h-4 mr-2" /> Zaloguj
            </Link>
          )}
        </div>

        {/* Mobile toggler */}
        <button
          className="ml-auto md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md hover:bg-white/10"
          onClick={() => setMobileOpen((s) => !s)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile sheet */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#8d0b0b]">
          <div className="max-w-6xl mx-auto px-4 py-3 grid gap-2">
            {links.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-md ${
                  isActive(it.href) ? "bg-white/15" : "hover:bg-white/10"
                }`}
              >
                {it.label}
              </Link>
            ))}

            <div className="h-px bg-white/10 my-2" />

            {!checking && email ? (
              <>
                {role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10"
                  >
                    <Shield className="w-4 h-4" />
                    Panel admina
                  </Link>
                )}
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10"
                >
                  <LogOut className="w-4 h-4" />
                  Wyloguj
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10"
              >
                <LogIn className="w-4 h-4" />
                Zaloguj
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
