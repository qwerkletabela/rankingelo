"use client";
import { usePathname } from "next/navigation";

type HeroProps = {
  /** "auto" = ukryj na ścieżkach z hideOn, "always" = pokazuj zawsze */
  mode?: "auto" | "always";
  title?: string;
  subtitle?: string;
  /** Ścieżki, na których hero ma być ukryte gdy mode="auto" */
  hideOn?: string[];
};

export default function Hero({
  mode = "auto",
  title = "Ranking Elo",
  subtitle = "Ranking Elo Graczy Rummikub.",
  hideOn = ["/login", "/register"],
}: HeroProps) {
  const p = usePathname() || "/";
  if (mode === "auto" && hideOn.some((base) => p.startsWith(base))) return null;

  return (
    <section className="relative overflow-hidden">
      {/* czerwone tło */}
      <div className="absolute inset-0 -z-10">
        <div className="h-64 bg-gradient-to-b from-brand-700 via-brand-700 to-brand-800" />
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-10 pb-20 text-white">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-3 text-white/90 max-w-2xl">{subtitle}</p>
      </div>
    </section>
  );
}
