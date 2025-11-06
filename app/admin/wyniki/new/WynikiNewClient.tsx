"use client";

import { useSearchParams } from "next/navigation";

/**
 * To jest prosty klientowy „holder” – możesz tu wpiąć swoją
 * właściwą logikę dodawania partii/wyników. Najważniejsze:
 * - hook useSearchParams działa, bo jesteśmy w "use client"
 * - strona jest opakowana w <Suspense/> w page.tsx
 */
export default function WynikiNewClient() {
  const sp = useSearchParams();
  const turniejId = sp.get("turniej") || "";
  const presetPlayers = Number(sp.get("players") || 4);
  const presetRounds = Number(sp.get("rounds") || 3);

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-lg font-semibold mb-4">Dodaj partię</h1>

      <div className="grid gap-3">
        <div className="text-sm">
          <div>
            <span className="text-gray-600">Turniej ID:&nbsp;</span>
            <code>{turniejId || "—"}</code>
          </div>
          <div>
            <span className="text-gray-600">Domyślna liczba graczy:&nbsp;</span>
            <b>{presetPlayers}</b>
          </div>
          <div>
            <span className="text-gray-600">Domyślna liczba partii:&nbsp;</span>
            <b>{presetRounds}</b>
          </div>
        </div>

        {/* TODO: tu wklej swój właściwy formularz dodawania wyników,
            który wcześniej pisałeś (skład + zwycięzcy/małe punkty).
            Ten plik jest tylko klientową otoczką, żeby zniknął błąd
            Suspense/CSR-bailout i żeby build przechodził. */}
        <div className="mt-2 rounded-lg border p-4 text-sm text-gray-600">
          Formularz dodawania wyników – wstaw swoją istniejącą logikę.
        </div>
      </div>
    </main>
  );
}
