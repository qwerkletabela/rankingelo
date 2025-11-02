"use client";

import { BarChart3, Users, Medal } from "lucide-react";
import Link from "next/link";

export default function NavBar() {
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
        </nav>
      </div>
    </header>
  );
}
