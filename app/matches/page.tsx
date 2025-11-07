"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Wide = {
  partia_id: string;
  partia_nr: number;
  timestamp: string;
  numer_dodania: number;
  turniej: string;
  zwyciezca_id: string | null;

  gracz_a: string | null; elo_a_przed: number | null; delta_a: number | null; elo_a_po: number | null; male_a: number | null;
  gracz_b: string | null; elo_b_przed: number | null; delta_b: number | null; elo_b_po: number | null; male_b: number | null;
  gracz_c: string | null; elo_c_przed: number | null; delta_c: number | null; elo_c_po: number | null; male_c: number | null;
  gracz_d: string | null; elo_d_przed: number | null; delta_d: number | null; elo_d_po: number | null; male_d: number | null;
};

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return Math.round(n);
}
function fmtDelta(n: number | null | undefined) {
  if (n == null) return "—";
  const val = Math.round(n);
  const sign = val > 0 ? "+" : "";
  return `${sign}${val}`;
}

export default function MatchesPage() {
  const [rows, setRows] = useState<Wide[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load(retry = 0) {
    setErr(null);
    setLoading(true);

    const { data, error } = await supabaseBrowser
      .from("wyniki_wide")
      .select("*")
      .order("timestamp", { ascending: false })
      .order("numer_dodania", { ascending: false })
      .limit(200);

    if (error) {
      if (retry < 1) {
        setTimeout(() => load(retry + 1), 400);
        return;
      }
      setErr(error.message);
      setLoading(false);
      return;
    }

    setRows((data || []) as any);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter(r =>
      (r.turniej?.toLowerCase().includes(n)) ||
      (r.gracz_a?.toLowerCase().includes(n)) ||
      (r.gracz_b?.toLowerCase().includes(n)) ||
      (r.gracz_c?.toLowerCase().includes(n)) ||
      (r.gracz_d?.toLowerCase().includes(n))
    );
  }, [q, rows]);

  return (
    <main>
      <div className="max-w-6xl mx-auto px-4 -mt-12 pb-10">
        <div className="pt-6 mb-5 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Partie</h1>
            <p className="text-sm text-gray-600">Ostatnie zapisane partie (ELO na widoku w całościach).</p>
          </div>
          <div className="w-full max-w-[320px]">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Szukaj: turniej lub gracz…"
              className="w-full rounded-lg border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
        </div>

        {err && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
            {err}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="table w-full">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="text-left px-3 py-2">Czas</th>
                <th className="text-left px-3 py-2">Turniej</th>
                <th className="text-left px-3 py-2">A</th>
                <th className="text-left px-3 py-2">B</th>
                <th className="text-left px-3 py-2">C</th>
                <th className="text-left px-3 py-2">D</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-600">Ładowanie…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-600">Brak danych.</td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const ts = new Date(r.timestamp).toLocaleString("pl-PL");
                  const cell = (name: string | null, eloBefore: number | null, delta: number | null, male: number | null) => (
                    <div className="leading-tight">
                      <div className="font-medium">{name || "—"}</div>
                      <div className="text-xs text-gray-600">
                        ELO {fmt(eloBefore)} ({fmtDelta(delta)}){male != null ? ` • małe: ${male}` : ""}
                      </div>
                    </div>
                  );
                  return (
                    <tr key={r.partia_id} className="border-t border-gray-100 hover:bg-gray-50/60">
                      <td className="px-3 py-2 text-gray-700">{ts}</td>
                      <td className="px-3 py-2">{r.turniej}</td>
                      <td className="px-3 py-2">{cell(r.gracz_a, r.elo_a_przed, r.delta_a, r.male_a)}</td>
                      <td className="px-3 py-2">{cell(r.gracz_b, r.elo_b_przed, r.delta_b, r.male_b)}</td>
                      <td className="px-3 py-2">{cell(r.gracz_c, r.elo_c_przed, r.delta_c, r.male_c)}</td>
                      <td className="px-3 py-2">{cell(r.gracz_d, r.elo_d_przed, r.delta_d, r.male_d)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  );
}
