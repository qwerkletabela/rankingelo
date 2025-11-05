"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

// Prosty mapping na klasy „odznak” ELO (5 poziomów)
function eloBadge(elo: number) {
  if (elo >= 2200) return "badge-elo-2200";
  if (elo >= 2000) return "badge-elo-2000";
  if (elo >= 1800) return "badge-elo-1800";
  if (elo >= 1400) return "badge-elo-1400";
  return "badge-elo-lt1400";
}

type Row = {
  id: string;
  imie: string;
  nazwisko: string;
  ranking: number;        // numeric(10,4) w DB
  games_played: number;
  wins: number;
  last_played_at: string | null; // timestamptz
};

export default function RankingPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Ładowanie z lekką odpornością (1 szybka próba powtórna)
  async function load(retry = 0) {
    setErr(null);
    setLoading(true);
    const { data, error } = await supabaseBrowser
      .from("gracz")
      .select("id,imie,nazwisko,ranking,games_played,wins,last_played_at")
      .order("ranking", { ascending: false })
      .order("wins", { ascending: false })
      .order("games_played", { ascending: true })
      .limit(1000);

    if (error) {
      if (retry < 1) {
        setTimeout(() => load(retry + 1), 400);
        return;
      }
      setErr(error.message);
      setLoading(false);
      return;
    }

    // Czasem pierwszy „zimny” strzał daje [] – spróbuj raz jeszcze
    if (Array.isArray(data) && data.length === 0 && retry < 1) {
      setTimeout(() => load(retry + 1), 300);
      return;
    }

    setRows((data || []) as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(r =>
      (r.imie + " " + r.nazwisko).toLowerCase().includes(needle)
    );
  }, [q, rows]);

  return (
    <main>
      <div className="max-w-6xl mx-auto px-4 -mt-12 pb-8">
        <div className="flex items-end justify-between gap-3 pt-6 mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Ranking ELO</h1>
            <p className="text-sm text-gray-600">Aktualny ranking graczy (ELO zaokrąglone do całości na widoku).</p>
          </div>
          <div className="w-full max-w-[320px]">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Szukaj gracza…"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>

        {/* Info / błędy */}
        {err && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
            {err}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="table w-full">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="w-[64px] text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Gracz</th>
                <th className="text-left px-3 py-2">ELO</th>
                <th className="text-left px-3 py-2">Rozegrane</th>
                <th className="text-left px-3 py-2">Wygrane</th>
                <th className="text-left px-3 py-2">Win%</th>
                <th className="text-left px-3 py-2">Ostatnia gra</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm text-gray-600">
                    Ładowanie rankingu…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm text-gray-600">
                    Brak wyników.
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => {
                  const eloInt = Math.round(r.ranking); // prezentujemy w całościach
                  const winPct =
                    r.games_played > 0 ? Math.round((r.wins / r.games_played) * 1000) / 10 : 0;
                  const last =
                    r.last_played_at ? new Date(r.last_played_at).toLocaleString("pl-PL") : "—";
                  return (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-600">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.imie} {r.nazwisko}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-sm ${eloBadge(eloInt)}`}>
                          {eloInt}
                        </span>
                      </td>
                      <td className="px-3 py-2">{r.games_played}</td>
                      <td className="px-3 py-2">{r.wins}</td>
                      <td className="px-3 py-2">{winPct.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-gray-600">{last}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mały przypis: dane w 4 miejscach po przecinku, prezentacja zaokrąglona */}
        <p className="mt-2 text-xs text-gray-500">
          Uwaga: ELO w bazie jest zapisywane z dokładnością do 4 miejsc po przecinku; tutaj prezentowane jako liczby całkowite.
        </p>
      </div>
    </main>
  );
}
