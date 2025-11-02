"use client";
import Link from "next/link";
import { BarChart3, Users, Medal, Lock, LogOut } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";


export default function NavBar() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await supabaseBrowser.auth.signOut();
    router.refresh();
    setLoading(false);
  }

  return (
    <header className="sticky top-0 z-20 bg-white/70 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          <Link href="/" className="font-semibold">Rummikub & Qwirkle Stats</Link>
        </div>
        <nav className="flex items-center gap-6 text-sm text-gray-600">
          <Link href="/" className="hover:text-black inline-flex items-center gap-1"><Users className="w-4 h-4" />Ranking</Link>
          <Link href="/matches" className="hover:text-black inline-flex items-center gap-1"><Medal className="w-4 h-4" />Mecze</Link>
          <Link href="/admin" className="hover:text-black inline-flex items-center gap-1"><Lock className="w-4 h-4" />Admin</Link>
          <button onClick={signOut} disabled={loading} className="inline-flex items-center gap-1 text-gray-600 hover:text-black">
            <LogOut className="w-4 h-4" />Wyloguj
          </button>
        </nav>
      </div>
    </header>
  );
}
