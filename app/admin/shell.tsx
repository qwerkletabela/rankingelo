"use client";

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  ChevronDown,
  ChevronRight,
  Save,
  Trash2,
  X,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Swords,
} from "lucide-react";
import MapPicker from "@/components/MapPicker";

/* ===== Typy ===== */
type TurniejRow = {
  id: string;
  nazwa: string;
  gsheet_url: string;
  gsheet_id: string | null;
  arkusz_nazwa: string;
  kolumna_nazwisk: string;
  pierwszy_wiersz_z_nazwiskiem: number;
  data_turnieju: string | null; // YYYY-MM-DD
  godzina_turnieju: string | null; // HH:MM:SS
  lat: number | null;
  lng: number | null;
  created_at?: string;
};

type EditState = {
  id?: string;
  nazwa?: string;
  gsheet_url?: string;
  gsheet_id?: string | null;
  arkusz_nazwa?: string;
  kolumna_nazwisk?: string;
  pierwszy_wiersz_z_nazwiskiem?: string;
  data_turnieju?: string | null;
  godzina_turnieju?: string | null;
  lat?: string | null;
  lng?: string | null;
};

type Gracz = {
  id: string;
  imie: string;
  nazwisko: string;
  ranking: number;
  fullname_norm: string;
};

type WynikRow = {
  partia_id: string;
  gracz: string;
  elo_delta: number;
  wygral: boolean;
};

/* ===== Utils ===== */
function extractIdFromUrl(url: string): string | null {
  const m = url?.match?.(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}
function toTimeInput(v?: string | null) {
  if (!v) return "";
  return v.slice(0, 5);
}

/* ============================================================
   Modal: Lista grających (z dodawaniem brakujących do DB)
   ============================================================ */
function PlayersListModal({
  open,
  onClose,
  tournament,
}: {
  open: boolean;
  onClose: () => void;
  tournament: TurniejRow;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<{ name: string; exists: boolean }[]>([]);
  const [addingIdx, setAddingIdx] = useState<number | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    setOk(null);
    setRows([]);

    const resp = await fetch(`/api/turnieje/${tournament.id}/uczestnicy`);
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setErr(j.error || "Nie udało się pobrać listy z arkusza");
      setLoading(false);
      return;
    }

    const names: string[] = (j.names || [])
      .map((x: string) => x?.toString().replace(/\u00A0/g, " ").trim())
      .filter(Boolean)
      .slice(0, 1000);

    if (names.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    // 🔽 sprawdzenie istnienia po stronie bazy (diakrytyki obsłużone w SQL)
    const { data, error } = await supabaseBrowser.rpc("gracz_exists_by_names", { _names: names });
    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    const result = (data || []).map((r: any) => ({
      name: r.input_name as string,
      exists: !!r.found,
    }));
    setRows(result);
    setLoading(false);
  }

  useEffect(() => {
    if (open) void load();
  }, [open, tournament.id]);

  async function addOne(i: number) {
    setErr(null);
    setOk(null);
    setAddingIdx(i);
    try {
      const fullname = rows[i].name;
      const res = await fetch("/api/gracze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullname }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Błąd dodawania gracza");
      setRows((r) => r.map((row, idx) => (idx === i ? { ...row, exists: true } : row)));
      setOk(`Dodano: ${fullname}`);
    } catch (e: any) {
      setErr(e.message || "Błąd dodawania");
    } finally {
      setAddingIdx(null);
    }
  }

  async function addAllMissing() {
    setErr(null);
    setOk(null);
    const missing = rows.filter((r) => !r.exists).map((r) => r.name);
    if (missing.length === 0) return;

    setAddingAll(true);
    try {
      const res = await fetch("/api/gracze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullnames: missing }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Błąd dodawania brakujących");
      setRows((r) => r.map((row) => (row.exists ? row : { ...row, exists: true })));
      setOk(`Dodano ${missing.length} brakujących graczy.`);
    } catch (e: any) {
      setErr(e.message || "Błąd dodawania brakujących");
    } finally {
      setAddingAll(false);
    }
  }

  if (!open) return null;

  const total = rows.length;
  const yes = rows.filter((r) => r.exists).length;
  const no = total - yes;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl ring-1 ring-black/10 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Lista grających</div>
            <div className="font-semibold">{tournament.nazwa}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50"
              title="Odśwież"
            >
              <Users className="w-4 h-4" />
              Odśwież
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50"
            >
              <X className="w-4 h-4" /> Zamknij
            </button>
          </div>
        </div>

        <div className="p-4">
          {err && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {err}
            </div>
          )}
          {ok && (
            <div className="mb-3 rounded-lg border border-green-200 bg-green-50 text-green-700 px-3 py-2 text-sm">
              {ok}
            </div>
          )}

          {total === 0 ? (
            <div className="text-sm text-gray-600">Brak nazwisk do wyświetlenia.</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-700">
                  W bazie: <b>{yes}</b> / {total} &nbsp;•&nbsp; Brak w bazie:{" "}
                  <b className="text-red-700">{no}</b>
                </div>
                <button
                  onClick={addAllMissing}
                  disabled={addingAll || no === 0}
                  className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50 disabled:opacity-60"
                >
                  {addingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Dodaj brakujących
                </button>
              </div>

              <div className="max-h-[55vh] overflow-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 w-10">#</th>
                      <th className="text-left px-3 py-2">Imię i nazwisko z arkusza</th>
                      <th className="text-left px-3 py-2 w-48">Status</th>
                      <th className="text-left px-3 py-2 w-36"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2">{r.name}</td>
                        <td className="px-3 py-2">
                          {r.exists ? (
                            <span className="inline-flex items-center gap-1 text-green-700">
                              <CheckCircle2 className="w-4 h-4" /> W bazie
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700">
                              <XCircle className="w-4 h-4" /> Brak w bazie
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {!r.exists && (
                            <button
                              onClick={() => void addOne(i)}
                              disabled={addingIdx === i || addingAll}
                              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50 disabled:opacity-60"
                              title="Dodaj tego gracza"
                            >
                              {addingIdx === i ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                              Dodaj
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Autocomplete: szukanie w tabeli gracz po fullname_norm (bez ogonków)
   ============================================================ */
function PlayerSearch({
  label,
  value,
  onSelect,
  excludeIds,
}: {
  label: string;
  value: Gracz | null;
  onSelect: (g: Gracz | null) => void;
  excludeIds: string[];
}) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Gracz[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!q.trim()) {
      setList([]);
      return;
    }
    timer.current = window.setTimeout(async () => {
      // 🔽 server-side norma + ilike
      const { data, error } = await supabaseBrowser.rpc("gracz_search", { _q: q.trim(), _limit: 10 });
      if (!error) {
        setList(((data || []) as Gracz[]).filter((g) => !excludeIds.includes(g.id)));
      }
    }, 180);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [q, excludeIds.join(",")]);

  return (
    <div className="grid gap-1">
      <span className="text-xs text-gray-600">{label}</span>
      {value ? (
        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
          <span>
            {value.imie} {value.nazwisko}{" "}
            <span className="text-xs text-gray-500">ELO {Math.round(value.ranking)}</span>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => onSelect(null)}>
            <X className="w-4 h-4" /> Usuń
          </button>
        </div>
      ) : (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Wpisz imię i nazwisko…"
            className="w-full rounded-lg border px-3 py-2"
          />
          {list.length > 0 && (
            <div className="rounded-lg border divide-y">
              {list.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    onSelect(g);
                    setQ("");
                    setList([]);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                >
                  {g.imie} {g.nazwisko} <span className="text-xs text-gray-500">ELO {Math.round(g.ranking)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ============================================================
   Modal-kreator: Dodaj partię (tryb zwycięzca / tryb małe punkty)
   ============================================================ */
type GameMode = "winner" | "small";

function AddPartiaWizard({
  open,
  onClose,
  tournament,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  tournament: TurniejRow;
  onSaved: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Krok 1: ustawienia stołu
  const [playersCount, setPlayersCount] = useState(4);
  const [gamesCount, setGamesCount] = useState(3);

  // Krok 2: wybór składu
  const [A, setA] = useState<Gracz | null>(null);
  const [B, setB] = useState<Gracz | null>(null);
  const [C, setC] = useState<Gracz | null>(null);
  const [D, setD] = useState<Gracz | null>(null);

  // Krok 3: zwycięzcy / małe punkty
  const [modes, setModes] = useState<GameMode[]>([]);
  const [winners, setWinners] = useState<string[]>([]);
  const [smallMap, setSmallMap] = useState<Record<number, Record<string, string>>>({});

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ partia_id: string; rows: WynikRow[] }[] | null>(null);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setPlayersCount(4);
      setGamesCount(3);
      setA(null);
      setB(null);
      setC(null);
      setD(null);
      setModes([]);
      setWinners([]);
      setSmallMap({});
      setErr(null);
      setSummary(null);
    }
  }, [open]);

  const lineup = useMemo(() => [A, B, C, D].filter(Boolean) as Gracz[], [A, B, C, D]);
  const lineupIds = useMemo(() => lineup.map((g) => g.id).slice(0, playersCount), [lineup, playersCount]);
  const lineupLabels = useMemo(
    () => lineup.map((g) => `${g.imie} ${g.nazwisko}`).slice(0, playersCount),
    [lineup, playersCount]
  );

  const selectedIds = useMemo(
    () => [A?.id, B?.id, C?.id, D?.id].filter(Boolean) as string[],
    [A?.id, B?.id, C?.id, D?.id]
  );

  const lineupOk = useMemo(() => lineupIds.length === playersCount, [lineupIds.length, playersCount]);

  function proceedToWinners() {
    setErr(null);
    if (!lineupOk) {
      setErr("Uzupełnij skład (A, B, C, D) zgodnie z liczbą graczy.");
      return;
    }
    setStep(3);
    setWinners(Array(gamesCount).fill(""));
    setModes(Array(gamesCount).fill("winner"));
    setSmallMap({});
  }

  function setModeAt(i: number, mode: GameMode) {
    setModes((m) => {
      const copy = m.slice();
      copy[i] = mode;
      return copy;
    });
  }
  function setSmallVal(gameIdx: number, playerId: string, val: string) {
    setSmallMap((m) => {
      const copy = { ...m };
      copy[gameIdx] = { ...(copy[gameIdx] || {}), [playerId]: val };
      return copy;
    });
  }

  function parseNum(x: string | undefined) {
    if (x == null) return NaN;
    const n = Number(String(x).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }

  async function saveAll() {
    setErr(null);

    // Walidacja krok 3
    for (let i = 0; i < gamesCount; i++) {
      const mode = modes[i] || "winner";
      if (mode === "winner") {
        if (!winners[i]) {
          setErr(`Zaznacz zwycięzcę w partii ${i + 1}.`);
          return;
        }
      } else {
        // ujemne dla przegranych, zwycięzca puste/0
        const vals = lineupIds.map((pid) => parseNum(smallMap[i]?.[pid]));
        const negIdx = vals.map((v, idx) => (v < 0 ? idx : -1)).filter((k) => k >= 0);
        if (negIdx.length !== playersCount - 1) {
          setErr(
            `W partii ${i + 1} podaj ujemne małe punkty dla wszystkich przegranych (dokładnie ${playersCount - 1}).`
          );
          return;
        }
      }
    }

    setSaving(true);
    try {
      // 1) Stół
      const { data: st, error: stErr } = await supabaseBrowser
        .from("stolik")
        .insert({ turniej_id: tournament.id })
        .select("id")
        .maybeSingle();
      if (stErr || !st?.id) throw new Error(stErr?.message || "Błąd tworzenia stołu");

      const createdPartie: string[] = [];

      // 2) Partie
      for (let i = 0; i < gamesCount; i++) {
        const mode = modes[i] || "winner";
        let winnerId = "";
        let losersRows: { partia_id: string; gracz_id: string; punkty: number }[] = [];

        if (mode === "winner") {
          winnerId = winners[i];
        } else {
          const vals = lineupIds.map((pid) => parseNum(smallMap[i]?.[pid]));
          const losers: { pid: string; mp: number }[] = [];
          let winnerIdx: number | null = null;
          for (let j = 0; j < lineupIds.length; j++) {
            const v = vals[j];
            if (Number.isNaN(v) || v === 0) {
              if (winnerIdx === null) winnerIdx = j;
              else throw new Error(`W partii ${i + 1} jest więcej niż jeden gracz bez ujemnych wartości.`);
            } else if (v < 0) {
              losers.push({ pid: lineupIds[j], mp: v });
            } else {
              throw new Error(`W partii ${i + 1} u przegranych wpisz wartości ujemne (np. -10).`);
            }
          }
          if (winnerIdx === null) throw new Error(`W partii ${i + 1} nie wybrano zwycięzcy.`);
          if (losers.length !== playersCount - 1)
            throw new Error(`W partii ${i + 1} liczba przegranych różna od ${playersCount - 1}.`);
          winnerId = lineupIds[winnerIdx];
          losersRows = losers.map((L) => ({ partia_id: "", gracz_id: L.pid, punkty: L.mp }));
        }

        const { data: p, error: pErr } = await supabaseBrowser
          .from("partia")
          .insert({
            stolik_id: st.id,
            nr: i + 1,
            played_at: new Date().toISOString(),
            zwyciezca_gracz_id: winnerId,
          })
          .select("id")
          .maybeSingle();
        if (pErr || !p?.id) throw new Error(pErr?.message || "Błąd tworzenia partii");
        createdPartie.push(p.id);

        if (mode === "winner") {
          const losers = lineupIds.filter((id) => id !== winnerId);
          if (losers.length) {
            const rows = losers.map((id) => ({ partia_id: p.id, gracz_id: id, punkty: -1 }));
            const { error: mErr } = await supabaseBrowser.from("partia_male").insert(rows);
            if (mErr) throw new Error(mErr.message);
          }
        } else {
          if (losersRows.length) {
            const rows = losersRows.map((r) => ({ ...r, partia_id: p.id }));
            const { error: mErr } = await supabaseBrowser.from("partia_male").insert(rows);
            if (mErr) throw new Error(mErr.message);
          }
        }
      }

      // 3) Przelicz ELO
      const { error: rpcErr } = await supabaseBrowser.rpc("elo_recompute_all");
      if (rpcErr) throw new Error("Zapisano partie, ale przeliczenie ELO nie powiodło się: " + rpcErr.message);

      // 4) Podsumowanie
      const summaries: { partia_id: string; rows: WynikRow[] }[] = [];
      for (const pid of createdPartie) {
        const { data, error } = await supabaseBrowser
          .from("wyniki_rows")
          .select("partia_id,gracz,elo_delta,wygral")
          .eq("partia_id", pid);
        if (!error) summaries.push({ partia_id: pid, rows: (data || []) as WynikRow[] });
      }
      setSummary(summaries);
      onSaved();
    } catch (e: any) {
      setErr(e.message || "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl ring-1 ring-black/10 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold inline-flex items-center gap-2">
            <Swords className="w-4 h-4" />
            Dodaj partię — {tournament.nazwa}
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50"
          >
            <X className="w-4 h-4" /> Zamknij
          </button>
        </div>

        <div className="p-4 grid gap-4">
          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>
          )}

          {summary ? (
            <>
              <div className="text-sm font-semibold">Zapisano. Podsumowanie zmian (Δ) dla każdej partii:</div>
              <div className="grid gap-3">
                {summary.map((s, idx) => (
                  <div key={s.partia_id} className="rounded-lg border px-3 py-2">
                    <div className="text-xs text-gray-500 mb-1">Partia {idx + 1}</div>
                    <div className="flex flex-wrap gap-2">
                      {s.rows
                        .sort(
                          (a, b) =>
                            Number(b.wygral) - Number(a.wygral) || a.gracz.localeCompare(b.gracz, "pl")
                        )
                        .map((r, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${
                              r.wygral
                                ? "bg-green-50 border-green-200 text-green-700"
                                : "bg-gray-50 border-gray-200 text-gray-700"
                            }`}
                          >
                            {r.gracz}
                            <span className={r.elo_delta >= 0 ? "text-green-700" : "text-red-700"}>
                              ({r.elo_delta >= 0 ? "+" : ""}
                              {r.elo_delta})
                            </span>
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setSummary(null);
                    setStep(1);
                    setA(null);
                    setB(null);
                    setC(null);
                    setD(null);
                    setWinners([]);
                    setSmallMap({});
                    setModes([]);
                  }}
                >
                  Wprowadź kolejny stolik
                </button>
                <button className="btn btn-ghost" onClick={onClose}>
                  Zamknij
                </button>
              </div>
            </>
          ) : (
            <>
              {step === 1 && (
                <div className="grid gap-3">
                  <div className="text-sm">Ustawienia stołu</div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <span>Liczba graczy:</span>
                      <select
                        value={playersCount}
                        onChange={(e) => setPlayersCount(Number(e.target.value))}
                        className="rounded-md border px-2 py-1"
                      >
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                      </select>
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <span>Liczba partii:</span>
                      <select
                        value={gamesCount}
                        onChange={(e) => setGamesCount(Number(e.target.value))}
                        className="rounded-md border px-2 py-1"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="btn btn-primary" onClick={() => setStep(2)}>
                      Dalej
                    </button>
                    <button className="btn btn-ghost" onClick={onClose}>
                      Anuluj
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4">
                  <div className="text-sm">
                    Wybierz skład (A–D). Po wybraniu gracza nie pojawia się on w kolejnych polach.
                  </div>
                  <PlayerSearch label="Gracz A" value={A} onSelect={setA} excludeIds={selectedIds} />
                  {playersCount >= 2 && (
                    <PlayerSearch label="Gracz B" value={B} onSelect={setB} excludeIds={selectedIds} />
                  )}
                  {playersCount >= 3 && (
                    <PlayerSearch label="Gracz C" value={C} onSelect={setC} excludeIds={selectedIds} />
                  )}
                  {playersCount >= 4 && (
                    <PlayerSearch label="Gracz D" value={D} onSelect={setD} excludeIds={selectedIds} />
                  )}

                  <div className="flex items-center gap-2">
                    <button className="btn btn-ghost" onClick={() => setStep(1)}>
                      Wstecz
                    </button>
                    <button className="btn btn-primary" onClick={proceedToWinners}>
                      Zatwierdź skład
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-4">
                  <div className="text-sm">
                    Dla każdej partii wybierz tryb: <b>Zwycięzca</b> albo <b>Małe punkty</b>.
                  </div>

                  {Array.from({ length: gamesCount }).map((_, idx) => {
                    const mode = modes[idx] || "winner";
                    return (
                      <div key={idx} className="rounded-lg border px-3 py-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-gray-600">Partia {idx + 1}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">Tryb:</span>
                            <div className="inline-flex rounded-md border overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setModeAt(idx, "winner")}
                                className={`px-2 py-1 text-xs ${mode === "winner" ? "bg-gray-900 text-white" : "bg-white"}`}
                              >
                                Zwycięzca
                              </button>
                              <button
                                type="button"
                                onClick={() => setModeAt(idx, "small")}
                                className={`px-2 py-1 text-xs ${mode === "small" ? "bg-gray-900 text-white" : "bg-white"}`}
                              >
                                Małe punkty
                              </button>
                            </div>
                          </div>
                        </div>

                        {mode === "winner" ? (
                          <div className="flex flex-col gap-1">
                            {lineupIds.map((id, i2) => (
                              <label key={id} className="inline-flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`p${idx}`}
                                  value={id}
                                  checked={winners[idx] === id}
                                  onChange={(e) => {
                                    const copy = winners.slice();
                                    copy[idx] = e.target.value;
                                    setWinners(copy);
                                  }}
                                />
                                <span className="text-sm">{lineupLabels[i2]}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            <div className="text-xs text-gray-600">
                              Wpisz <b>ujemne</b> małe punkty wszystkim przegranym. Zwycięzcy zostaw puste lub 0.
                            </div>
                            {lineupIds.map((pid, i2) => (
                              <label key={pid} className="text-sm flex items-center gap-2">
                                <span className="w-44">{lineupLabels[i2]}</span>
                                <input
                                  type="number"
                                  step="1"
                                  placeholder="np. -10"
                                  value={smallMap[idx]?.[pid] ?? ""}
                                  onChange={(e) => setSmallVal(idx, pid, e.target.value)}
                                  className="w-28 rounded-md border px-2 py-1"
                                />
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex items-center gap-2">
                    <button className="btn btn-ghost" onClick={() => setStep(2)}>
                      Wstecz
                    </button>
                    <button className="btn btn-primary" disabled={saving} onClick={() => void saveAll()}>
                      {saving ? "Zapisywanie…" : "Zapisz partie"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Główny panel – sekcja Turnieje
   ============================================================ */
export default function AdminShell({ email, role }: { email: string; role: string }) {
  // Dodawanie turnieju
  const [nazwa, setNazwa] = useState("");
  const [gsheetUrl, setGsheetUrl] = useState("");
  const [arkuszNazwa, setArkuszNazwa] = useState("Gracze");
  const [kolumnaNazwisk, setKolumnaNazwisk] = useState("B");
  const [pierwszyWiersz, setPierwszyWiersz] = useState(2);
  const [dataTurnieju, setDataTurnieju] = useState<string>("");
  const [godzinaTurnieju, setGodzinaTurnieju] = useState<string>("");

  // geo
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [pickerNewOpen, setPickerNewOpen] = useState(false);

  // lista/edycja
  const [list, setList] = useState<TurniejRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<EditState>({});
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [pickerEditOpenId, setPickerEditOpenId] = useState<string | null>(null);

  // modale
  const [playersModalFor, setPlayersModalFor] = useState<TurniejRow | null>(null);
  const [addPartiaFor, setAddPartiaFor] = useState<TurniejRow | null>(null);

  // msg
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadList() {
    const { data, error } = await supabaseBrowser
      .from("turniej")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    else setList((data || []) as TurniejRow[]);
  }
  useEffect(() => {
    void loadList();
  }, []);

  async function addTurniej(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setLoading(true);

    const body: any = {
      nazwa,
      gsheet_url: gsheetUrl,
      gsheet_id: extractIdFromUrl(gsheetUrl),
      arkusz_nazwa: arkuszNazwa,
      kolumna_nazwisk: kolumnaNazwisk.toUpperCase(),
      pierwszy_wiersz_z_nazwiskiem: Number(pierwszyWiersz || 2),
      data_turnieju: dataTurnieju || null,
      godzina_turnieju: godzinaTurnieju || null,
    };
    if (lat !== "") body.lat = Number(lat);
    if (lng !== "") body.lng = Number(lng);

    const res = await fetch("/api/turnieje", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setErr(j.error || "Błąd zapisu");
      return;
    }

    setOk("Dodano turniej.");
    setNazwa("");
    setGsheetUrl("");
    setArkuszNazwa("Gracze");
    setKolumnaNazwisk("B");
    setPierwszyWiersz(2);
    setDataTurnieju("");
    setGodzinaTurnieju("");
    setLat("");
    setLng("");
    await loadList();
  }

  function toggleExpand(t: TurniejRow) {
    setErr(null);
    setOk(null);
    setConfirmDel(null);
    setExpandedId((curr) => (curr === t.id ? null : t.id));
    setEditRow({
      id: t.id,
      nazwa: t.nazwa,
      gsheet_url: t.gsheet_url,
      gsheet_id: t.gsheet_id,
      arkusz_nazwa: t.arkusz_nazwa,
      kolumna_nazwisk: t.kolumna_nazwisk,
      pierwszy_wiersz_z_nazwiskiem: String(t.pierwszy_wiersz_z_nazwiskiem ?? 2),
      data_turnieju: t.data_turnieju,
      godzina_turnieju: toTimeInput(t.godzina_turnieju),
      lat: t.lat == null ? "" : String(t.lat),
      lng: t.lng == null ? "" : String(t.lng),
    });
  }

  async function saveEdit(id: string) {
    setErr(null);
    setOk(null);

    const body: any = {};
    if ("nazwa" in editRow) body.nazwa = (editRow.nazwa || "").trim();
    if ("gsheet_url" in editRow) body.gsheet_url = (editRow.gsheet_url || "").trim();
    if ("gsheet_id" in editRow) body.gsheet_id = editRow.gsheet_id ?? null;
    if (!body.gsheet_id && body.gsheet_url) body.gsheet_id = extractIdFromUrl(body.gsheet_url);
    if ("arkusz_nazwa" in editRow) body.arkusz_nazwa = (editRow.arkusz_nazwa || "").trim();
    if ("kolumna_nazwisk" in editRow)
      body.kolumna_nazwisk = (editRow.kolumna_nazwisk || "").toUpperCase().trim();
    if ("pierwszy_wiersz_z_nazwiskiem" in editRow)
      body.pierwszy_wiersz_z_nazwiskiem = Number(editRow.pierwszy_wiersz_z_nazwiskiem || 2);

    if ("data_turnieju" in editRow) body.data_turnieju = editRow.data_turnieju === "" ? null : editRow.data_turnieju;
    if ("godzina_turnieju" in editRow)
      body.godzina_turnieju = editRow.godzina_turnieju === "" ? null : editRow.godzina_turnieju;

    if ("lat" in editRow) body.lat = editRow.lat === "" ? "" : editRow.lat;
    if ("lng" in editRow) body.lng = editRow.lng === "" ? "" : editRow.lng;

    const res = await fetch(`/api/turnieje/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j.error || "Błąd aktualizacji");
      return;
    }
    setOk("Zapisano zmiany.");
    await loadList();
  }

  async function doDelete(id: string) {
    const res = await fetch(`/api/turnieje/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Nie udało się usunąć");
      return;
    }
    setOk("Usunięto.");
    if (expandedId === id) setExpandedId(null);
    await loadList();
  }

  const canSaveNew = nazwa.trim() && gsheetUrl.trim() && arkuszNazwa.trim() && kolumnaNazwisk.trim();

  return (
    <div className="grid gap-6">
      {/* Dodawanie turnieju (zwin/rozwiń) */}
      <div className="card">
        <details>
          <summary className="cursor-pointer font-semibold mb-2">Dodaj turniej</summary>
          <form onSubmit={addTurniej} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nazwa" value={nazwa} onChange={setNazwa} />
            <Field
              label="Link do Google Sheets"
              value={gsheetUrl}
              onChange={setGsheetUrl}
              className="md:col-span-2"
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
            <Field label="Nazwa arkusza (karta)" value={arkuszNazwa} onChange={setArkuszNazwa} />
            <Field
              label="Kolumna z nazwiskami"
              value={kolumnaNazwisk}
              onChange={(v) => setKolumnaNazwisk(v.toUpperCase())}
              pattern="[A-Za-z]{1,3}"
            />
            <Field
              label="Pierwszy wiersz z nazwiskiem"
              type="number"
              value={String(pierwszyWiersz)}
              onChange={(v) => setPierwszyWiersz(parseInt(v || "1", 10))}
            />
            <Field label="Data turnieju" type="date" value={dataTurnieju} onChange={setDataTurnieju} />
            <Field
              label="Godzina rozpoczęcia"
              type="time"
              value={godzinaTurnieju}
              onChange={setGodzinaTurnieju}
            />

            {/* Miejsce */}
            <div className="md:col-span-2">
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn btn-outline" onClick={() => setPickerNewOpen(true)}>
                  Ustaw miejsce
                </button>

                {lat && lng ? (
                  <span className="text-sm text-gray-700">
                    Wybrano: <b>{Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}</b>
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">Brak miejsca</span>
                )}

                {(lat || lng) && (
                  <button type="button" className="btn btn-ghost" onClick={() => { setLat(""); setLng(""); }}>
                    Wyczyść
                  </button>
                )}
              </div>

              <MapPicker
                open={pickerNewOpen}
                initialLat={lat ? Number(lat) : null}
                initialLng={lng ? Number(lng) : null}
                onClose={() => setPickerNewOpen(false)}
                onPick={(la, lo) => { setLat(String(la)); setLng(String(lo)); setPickerNewOpen(false); }}
                title="Ustaw miejsce turnieju"
              />
            </div>

            <div className="md:col-span-2">
              {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
              {ok && <div className="text-green-700 text-sm mb-2">{ok}</div>}
              <button disabled={!canSaveNew || loading} className="btn btn-primary">
                {loading ? "Zapisywanie..." : "Zapisz turniej"}
              </button>
            </div>
          </form>
        </details>
      </div>

      {/* Lista turniejów */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Twoje turnieje</h3>
          <button onClick={() => void loadList()} className="btn btn-outline inline-flex items-center gap-2">
            Odśwież
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="table w-full">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="w-[48px]"></th>
                <th>Nazwa</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => {
                const open = expandedId === t.id;
                const datePart = t.data_turnieju || null;
                const timePart = toTimeInput(t.godzina_turnieju);
                const hasGeo = typeof t.lat === "number" && typeof t.lng === "number";

                const latPreview =
                  editRow.id === t.id && editRow.lat !== undefined
                    ? editRow.lat === ""
                      ? null
                      : Number(editRow.lat)
                    : t.lat;
                const lngPreview =
                  editRow.id === t.id && editRow.lng !== undefined
                    ? editRow.lng === ""
                      ? null
                      : Number(editRow.lng)
                    : t.lng;

                return (
                  <Fragment key={t.id}>
                    <tr
                      className="border-t border-gray-100 hover:bg-brand-50/60 transition-colors cursor-pointer group"
                      onClick={() => toggleExpand(t)}
                    >
                      <td className="py-2 pl-3 pr-1 align-middle">
                        {open ? (
                          <ChevronDown className="w-4 h-4 text-brand-700" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-brand-700" />
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <span className="font-medium group-hover:text-brand-700 group-hover:underline underline-offset-4">
                          {t.nazwa}
                        </span>
                        <span className="ml-3 inline-flex items-center gap-2">
                          {datePart && <Chip>{datePart}</Chip>}
                          {timePart && <Chip>{timePart}</Chip>}
                          {(hasGeo || (latPreview != null && lngPreview != null)) && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-gray-600">
                              <MapPin className="w-3 h-3" />
                              {(latPreview ?? t.lat)?.toFixed(4)}, {(lngPreview ?? t.lng)?.toFixed(4)}
                            </span>
                          )}

                          {/* Akcje */}
                          <button
                            type="button"
                            className="ml-2 inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                            onClick={(e) => { e.stopPropagation(); setPlayersModalFor(t); }}
                            title="Pokaż listę grających"
                          >
                            <Users className="w-3.5 h-3.5" />
                            Lista grających
                          </button>
                          <button
                            type="button"
                            className="ml-2 inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                            onClick={(e) => { e.stopPropagation(); setAddPartiaFor(t); }}
                            title="Dodaj partię do tego turnieju"
                          >
                            <Swords className="w-3.5 h-3.5" />
                            Dodaj partię
                          </button>
                        </span>
                      </td>
                    </tr>

                    {open && (
                      <tr className="border-t border-gray-100">
                        <td colSpan={2} className="p-0">
                          <div className="px-4 py-4 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Field
                                label="Nazwa"
                                value={String(editRow.nazwa ?? "")}
                                onChange={(v) => setEditRow((s) => ({ ...s, nazwa: v }))}
                              />
                              <Field
                                label="Arkusz (nazwa karty)"
                                value={String(editRow.arkusz_nazwa ?? "")}
                                onChange={(v) => setEditRow((s) => ({ ...s, arkusz_nazwa: v }))}
                              />
                              <Field
                                label="Kolumna z nazwiskami"
                                value={String(editRow.kolumna_nazwisk ?? "")}
                                onChange={(v) =>
                                  setEditRow((s) => ({ ...s, kolumna_nazwisk: v.toUpperCase() }))
                                }
                              />
                              <Field
                                label="Pierwszy wiersz z nazwiskiem"
                                type="number"
                                value={String(editRow.pierwszy_wiersz_z_nazwiskiem ?? "2")}
                                onChange={(v) => setEditRow((s) => ({ ...s, pierwszy_wiersz_z_nazwiskiem: v }))}
                              />
                              <Field
                                label="Link do Google Sheets"
                                value={String(editRow.gsheet_url ?? "")}
                                onChange={(v) =>
                                  setEditRow((s) => ({
                                    ...s,
                                    gsheet_url: v,
                                    gsheet_id: extractIdFromUrl(v) || null,
                                  }))
                                }
                                className="md:col-span-2"
                              />
                              <Field
                                label="Data turnieju"
                                type="date"
                                value={String(editRow.data_turnieju ?? "")}
                                onChange={(v) => setEditRow((s) => ({ ...s, data_turnieju: v || null }))}
                              />
                              <Field
                                label="Godzina rozpoczęcia"
                                type="time"
                                value={String(editRow.godzina_turnieju ?? "")}
                                onChange={(v) => setEditRow((s) => ({ ...s, godzina_turnieju: v || null }))}
                              />

                              <div className="md:col-span-2">
                                <div className="flex flex-wrap items-center gap-3">
                                  <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPickerEditOpenId(t.id);
                                    }}
                                  >
                                    Ustaw miejsce
                                  </button>

                                  {(editRow.id === t.id ? editRow.lat && editRow.lng : t.lat != null && t.lng != null) ? (
                                    <span className="text-sm text-gray-700">
                                      Wybrano:{" "}
                                      <b>
                                        {editRow.id === t.id && editRow.lat
                                          ? Number(editRow.lat).toFixed(6)
                                          : (t.lat ?? 0).toFixed(6)}
                                        ,{" "}
                                        {editRow.id === t.id && editRow.lng
                                          ? Number(editRow.lng).toFixed(6)
                                          : (t.lng ?? 0).toFixed(6)}
                                      </b>
                                    </span>
                                  ) : (
                                    <span className="text-sm text-gray-500">Brak miejsca</span>
                                  )}

                                  {(editRow.lat || editRow.lng) && (
                                    <button
                                      type="button"
                                      className="btn btn-ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditRow((s) => ({ ...s, lat: "", lng: "" }));
                                      }}
                                    >
                                      Wyczyść
                                    </button>
                                  )}

                                  <div className="ml-auto flex gap-2">
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPlayersModalFor(t);
                                      }}
                                    >
                                      <Users className="w-4 h-4" /> Lista grających
                                    </button>
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAddPartiaFor(t);
                                      }}
                                    >
                                      <Swords className="w-4 h-4" /> Dodaj partię
                                    </button>
                                  </div>
                                </div>

                                <MapPicker
                                  open={pickerEditOpenId === t.id}
                                  initialLat={
                                    editRow.lat && editRow.lat !== ""
                                      ? Number(editRow.lat)
                                      : typeof t.lat === "number"
                                      ? t.lat
                                      : null
                                  }
                                  initialLng={
                                    editRow.lng && editRow.lng !== ""
                                      ? Number(editRow.lng)
                                      : typeof t.lng === "number"
                                      ? t.lng
                                      : null
                                  }
                                  onClose={() => setPickerEditOpenId(null)}
                                  onPick={(la, lo) => {
                                    setEditRow((s) => ({ ...s, lat: String(la), lng: String(lo) }));
                                    setPickerEditOpenId(null);
                                  }}
                                  title="Ustaw miejsce turnieju"
                                />
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void saveEdit(t.id);
                                }}
                                className="btn btn-primary inline-flex items-center gap-2"
                              >
                                <Save className="w-4 h-4" /> Zapisz zmiany
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedId(null);
                                }}
                                className="btn btn-ghost inline-flex items-center gap-2"
                              >
                                <X className="w-4 h-4" /> Zamknij
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDel(t.id);
                                }}
                                className="btn btn-danger inline-flex items-center gap-2 ml-auto"
                              >
                                <Trash2 className="w-4 h-4" /> Usuń
                              </button>
                            </div>

                            {confirmDel === t.id && (
                              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3">
                                Usunąć ten turniej? Tej operacji nie można cofnąć.
                                <div className="mt-2 flex gap-2">
                                  <button onClick={() => void doDelete(t.id)} className="btn btn-danger">
                                    Usuń
                                  </button>
                                  <button onClick={() => setConfirmDel(null)} className="btn btn-ghost">
                                    Anuluj
                                  </button>
                                </div>
                              </div>
                            )}

                            {(err || ok) && (
                              <div className="mt-3">
                                {err && <div className="text-red-600 text-sm">{err}</div>}
                                {ok && <div className="text-green-700 text-sm">{ok}</div>}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-sm text-gray-600">
                    Brak turniejów. Dodaj pierwszy w sekcji powyżej.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modale */}
      {playersModalFor && (
        <PlayersListModal
          open={!!playersModalFor}
          onClose={() => setPlayersModalFor(null)}
          tournament={playersModalFor}
        />
      )}
      {addPartiaFor && (
        <AddPartiaWizard
          open={!!addPartiaFor}
          onClose={() => setAddPartiaFor(null)}
          tournament={addPartiaFor}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}

/* ===== Małe komponenty ===== */
function Field({
  label,
  value,
  onChange,
  type = "text",
  className = "",
  placeholder,
  pattern,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
  className?: string;
  placeholder?: string;
  pattern?: string;
  step?: string;
}) {
  return (
    <label className={`text-sm grid gap-1 ${className}`}>
      <span className="text-gray-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        pattern={pattern}
        step={step}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
      />
    </label>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-gray-100 text-gray-700 text-[11px] px-2 py-0.5">
      {children}
    </span>
  );
}
