"use client";

import { useEffect, useMemo, useState } from "react";
import type { Player } from "@/lib/mockData";
import { WOJEWODZTWA } from "@/constants/regions";

type Props = { initial: Player[] };

const LS_KEY = "admin_players";

export default function AdminPlayerTable({ initial }: Props) {
  const [rows, setRows] = useState<Player[]>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setRows(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(rows));
    } catch {}
  }, [rows]);

  const [query, setQuery] = useState("");

  const view = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            String(r.elo).includes(q) ||
            (r.region || "").toLowerCase().includes(q)
        )
      : rows;
    return base.sort((a, b) => b.elo - a.elo);
  }, [rows, query]);

  const update = <K extends keyof Player>(id: string, key: K, value: Player[K]) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };

  const addRow = () => {
    const nid = "p" + Math.random().toString(36).slice(2, 8);
    setRows((prev) => [
      { id: nid, name: "Nowy Gracz", elo: 1400, country: "PL", region: undefined, played: 0, wins: 0, losses: 0 },
      ...prev,
    ]);
  };

  const remove = (id: string) => setRows((prev) => prev.filter((r) => r.id != id));

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="font-semibold">Gracze — edycja inline (demo)</h3>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj..."
            className="w-56 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <button onClick={addRow} className="rounded-lg bg-black text-white text-sm px-3 py-1.5">
            + Dodaj gracza
          </button>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="table min-w-[720px]">
          <thead>
            <tr>
              <th>Gracz</th>
              <th>ELO</th>
              <th>Województwo</th>
              <th>Rozegrane</th>
              <th>Wygrane</th>
              <th>Przegrane</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="py-2 pr-3">
                  <input
                    value={r.name}
                    onChange={(e) => update(r.id, "name", e.target.value)}
                    className="w-52 rounded-md border border-gray-200 px-2 py-1"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    value={r.elo}
                    onChange={(e) => update(r.id, "elo", Number(e.target.value || 0))}
                    className="w-24 rounded-md border border-gray-200 px-2 py-1"
                  />
                </td>
                <td className="py-2 pr-3">
                  <select
                    value={r.region || ""}
                    onChange={(e) => update(r.id, "region", e.target.value || undefined)}
                    className="w-48 rounded-md border border-gray-200 px-2 py-1 bg-white"
                  >
                    <option value="">—</option>
                    {WOJEWODZTWA.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    value={r.played}
                    onChange={(e) => update(r.id, "played", Number(e.target.value || 0))}
                    className="w-24 rounded-md border border-gray-200 px-2 py-1"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    value={r.wins}
                    onChange={(e) => update(r.id, "wins", Number(e.target.value || 0))}
                    className="w-24 rounded-md border border-gray-200 px-2 py-1"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    value={r.losses}
                    onChange={(e) => update(r.id, "losses", Number(e.target.value || 0))}
                    className="w-24 rounded-md border border-gray-200 px-2 py-1"
                  />
                </td>
                <td className="py-2">
                  <button onClick={() => remove(r.id)} className="text-red-600 text-sm hover:underline">
                    Usuń
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Demo: dane zapisują się w <code>localStorage</code>. Po podłączeniu Supabase będziemy aktualizować tabelę <code>player</code>.
      </p>
    </div>
  );
}
