"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Turniej = { id: string; nazwa: string };
type Gracz = { id: string; imie: string; nazwisko: string; ranking: number; fullname_norm?: string };

type Mode = "simple" | "detailed";

const LS_KEY = "add-rounds-onepage-v1";

function norm(s: string) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function AddRoundsOnePage() {
  // konfiguracja
  const [turnieje, setTurnieje] = useState<Turniej[]>([]);
  const [turniejId, setTurniejId] = useState("");
  const [playersCount, setPlayersCount] = useState(3);
  const [roundsCount, setRoundsCount] = useState(3);
  const [mode, setMode] = useState<Mode>("simple");

  // sloty graczy
  const [slotText, setSlotText] = useState<string[]>(["", "", "", ""]);
  const [players, setPlayers] = useState<(Gracz | null)[]>([null, null, null, null]);

  // lista z arkusza + cache DB
  const [sheet, setSheet] = useState<string[]>([]);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetErr, setSheetErr] = useState<string | null>(null);
  const [dbByNorm, setDbByNorm] = useState<Map<string, Gracz>>(new Map());

  // po zapisaniu składu (tworzymy stolik)
  const [stolikId, setStolikId] = useState<string | null>(null);

  // tryb prosty – zwycięzcy
  const [winners, setWinners] = useState<Record<number, string>>({});

  // tryb szczegółowy – zwycięzca + ujemne punkty przegranych
  type RoundDetail = { winner_id: string; losers: Record<string, number> };
  const [details, setDetails] = useState<Record<number, RoundDetail>>({});

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const chosenPlayers = useMemo(
    () => (players.slice(0, playersCount).filter(Boolean) as Gracz[]),
    [players, playersCount]
  );

  // init
  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser.from("turniej").select("id,nazwa").order("nazwa");
      setTurnieje((data as any) || []);
    })();
  }, []);

  // odczyt persistent state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.turniejId) setTurniejId(s.turniejId);
      if (s.playersCount) setPlayersCount(s.playersCount);
      if (s.roundsCount) setRoundsCount(s.roundsCount);
      if (s.mode) setMode(s.mode);
      if (Array.isArray(s.slotText)) setSlotText(s.slotText);
      if (Array.isArray(s.players)) setPlayers(s.players);
    } catch {}
  }, []);

  // zapis persistent state
  useEffect(() => {
    const state = { turniejId, playersCount, roundsCount, mode, slotText, players };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {}
  }, [turniejId, playersCount, roundsCount, mode, slotText, players]);

  // 🔧 zapewnij odpowiednią liczbę slotów po zmianie playersCount
  useEffect(() => {
    setPlayers((prev) => {
      const next = [...prev];
      while (next.length < playersCount) next.push(null);
      return next.slice(0, playersCount);
    });
    setSlotText((prev) => {
      const next = [...prev];
      while (next.length < playersCount) next.push("");
      return next.slice(0, playersCount);
    });
  }, [playersCount]);

  // wczytaj arkusz po wybraniu turnieju
  useEffect(() => {
    async function loadSheet() {
      if (!turniejId) return;
      setSheetLoading(true);
      setSheetErr(null);
      setSheet([]);
      setDbByNorm(new Map());
      const resp = await fetch(`/api/turnieje/${turniejId}/uczestnicy`);
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setSheetErr(j.error || "Nie udało się pobrać listy z arkusza");
        setSheetLoading(false);
        return;
      }
      const names: string[] = (j.names || [])
        .map((x: string) => x.trim())
        .filter(Boolean)
        .slice(0, 500);
      setSheet(names);

      // pobierz hurtowo graczy po fullname_norm
      const norms = Array.from(new Set(names.map(norm)));
      if (norms.length) {
        const { data: found } = await supabaseBrowser
          .from("gracz")
          .select("id,imie,nazwisko,ranking,fullname_norm")
          .in("fullname_norm", norms);
        const mp = new Map<string, Gracz>();
        (found || []).forEach((g: any) => mp.set(g.fullname_norm, g));
        setDbByNorm(mp);
      }
      setSheetLoading(false);
    }
    loadSheet();
  }, [turniejId]);

  function filtered(i: number): string[] {
    const q = norm(slotText[i] || "");
    if (!q) return [];
    return sheet.filter((s) => norm(s).includes(q)).slice(0, 10);
  }

  async function chooseFromSheet(i: number, raw: string) {
    setErr(null);
    const key = norm(raw);

    // live-check w DB po fullname_norm
    const { data: found } = await supabaseBrowser
      .from("gracz")
      .select("id,imie,nazwisko,ranking,fullname_norm")
      .eq("fullname_norm", key)
      .maybeSingle();

    let g: Gracz | null = ((found as any) || dbByNorm.get(key) || null) as Gracz | null;

    if (!g) {
      // utwórz nowego (ELO 1200)
      const res = await fetch("/api/gracze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullname: raw }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error || "Nie udało się utworzyć gracza");
        return;
      }
      g = j.data as Gracz;
      setDbByNorm((mp) => {
        const n = new Map(mp);
        n.set(g!.fullname_norm || norm(`${g!.imie} ${g!.nazwisko}`), g!);
        return n;
      });
    }

    // nie duplikuj w składzie
    const dup = players.slice(0, playersCount).some((p) => p?.id === g!.id);
    if (dup) return;

    const next = [...players];
    next[i] = g!;
    setPlayers(next);
    setSlotText((arr) => {
      const n = [...arr];
      n[i] = `${g!.imie} ${g!.nazwisko}`;
      return n;
    });
  }

  function clearSlot(i: number) {
    const next = [...players];
    next[i] = null;
    setPlayers(next);
    setSlotText((arr) => {
      const n = [...arr];
      n[i] = "";
      return n;
    });
  }

  async function saveLineup() {
    setErr(null);
    setOk(null);
    if (!turniejId) {
      setErr("Wybierz turniej");
      return;
    }
    const picked = players.slice(0, playersCount).filter(Boolean) as Gracz[];
    if (picked.length !== playersCount) {
      setErr("Uzupełnij skład");
      return;
    }

    // utwórz stolik
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turniej_id: turniejId,
        liczba_graczy: playersCount,
        liczba_partii: roundsCount,
        players: picked.map((p) => p.id),
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j.error || "Błąd tworzenia stołu");
      return;
    }
    setStolikId(j.data.stolik_id);
    setOk("Skład zapisany — możesz wprowadzać partie.");
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
  }

  async function saveRounds() {
    setErr(null);
    setOk(null);
    if (!stolikId) {
      setErr("Brak stolika. Zapisz skład.");
      return;
    }

    if (mode === "simple") {
      const arr = Array.from({ length: roundsCount }, (_, i) => i + 1)
        .filter((nr) => winners[nr])
        .map((nr) => ({ nr, zwyciezca_gracz_id: winners[nr] }));
      if (!arr.length) {
        setErr("Wybierz zwycięzców partii");
        return;
      }

      const res = await fetch(`/api/matches/${stolikId}/partie`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "simple", winners: arr }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error || "Błąd zapisu partii");
        return;
      }
      setOk("Partie zapisane ✅");
      return;
    }

    // detailed
    const roundsPayload: any[] = [];
    for (let nr = 1; nr <= roundsCount; nr++) {
      const r = details[nr];
      if (!r?.winner_id) continue;
      const losersArr = Object.entries(r.losers || {}).map(([id, val]) => ({
        gracz_id: id,
        punkty: Number(val),
      }));
      // walidacja: przegrani muszą mieć ujemne
      if (losersArr.some((l) => !(Number.isFinite(l.punkty) && l.punkty < 0))) {
        setErr(`Partia ${nr}: małe punkty przegranych muszą być ujemne`);
        return;
      }
      roundsPayload.push({ nr, winner_id: r.winner_id, losers: losersArr });
    }
    if (!roundsPayload.length) {
      setErr("Uzupełnij co najmniej jedną partię");
      return;
    }

    const res = await fetch(`/api/matches/${stolikId}/partie`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "detailed", rounds: roundsPayload }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j.error || "Błąd zapisu partii");
      return;
    }
    setOk("Partie zapisane ✅");
  }

  return (
    <main>
      <div className="max-w-6xl mx-auto px-4 py-6 grid gap-6">
        <div className="card">
          <h1 className="text-lg font-semibold mb-4">Dodaj partię</h1>

          {/* konfiguracja */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className="text-sm grid gap-1 md:col-span-2">
              <span className="text-gray-600">Turniej</span>
              <select
                value={turniejId}
                onChange={(e) => setTurniejId(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">— wybierz —</option>
                {turnieje.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nazwa}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm grid gap-1">
              <span className="text-gray-600">Osób przy stoliku</span>
              <select
                value={playersCount}
                onChange={(e) => setPlayersCount(parseInt(e.target.value))}
                className="rounded-lg border border-gray-300 px-3 py-2"
              >
                {[2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm grid gap-1">
              <span className="text-gray-600">Liczba partii</span>
              <select
                value={roundsCount}
                onChange={(e) => setRoundsCount(parseInt(e.target.value))}
                className="rounded-lg border border-gray-300 px-3 py-2"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3">
            <label className="inline-flex items-center gap-2 mr-4">
              <input
                type="radio"
                name="mode"
                value="simple"
                checked={mode === "simple"}
                onChange={() => setMode("simple")}
              />
              <span className="text-sm">Mniej szczegółowo (tylko zwycięzca)</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                value="detailed"
                checked={mode === "detailed"}
                onChange={() => setMode("detailed")}
              />
              <span className="text-sm">Więcej szczegółów (małe punkty)</span>
            </label>
          </div>
        </div>

        {/* sloty graczy */}
        <div className="card">
          <h3 className="font-semibold mb-3">Skład stolika</h3>
          {sheetErr && <div className="text-red-600 text-sm mb-2">{sheetErr}</div>}
          {sheetLoading && <div className="text-sm mb-2">Pobieram listę z arkusza…</div>}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: playersCount }, (_, i) => i).map((i) => {
              const sugg = filtered(i);
              const picked = players[i];
              return (
                <div key={i} className="rounded-lg border p-3">
                  <div className="text-[11px] uppercase text-gray-500 mb-1">Gracz {i + 1}</div>

                  {/* RELATIVE: dropdown będzie absolutny */}
                  <div className="relative">
                    <input
                      value={slotText[i] || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSlotText((arr) => {
                          const n = [...arr];
                          n[i] = v;
                          return n;
                        });
                      }}
                      placeholder="np. Jan Kowalski"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      autoComplete="off"
                    />

                    {picked ? (
                      <div className="mt-2 text-sm">
                        <div className="font-medium">
                          {picked.imie} {picked.nazwisko}
                        </div>
                        <div className="text-xs text-gray-500">ELO {picked.ranking}</div>
                        <button className="btn btn-ghost mt-2" onClick={() => clearSlot(i)}>
                          Usuń ze składu
                        </button>
                      </div>
                    ) : (
                      !!sugg.length && (
                        <div
                          className="absolute left-0 right-0 mt-1 z-20 rounded-lg border bg-white shadow-lg divide-y max-h-56 overflow-auto"
                          onMouseDown={(e) => e.preventDefault()} // blokuje blur przed wyborem
                        >
                          {sugg.map((raw, idx) => {
                            const inDb = dbByNorm.has(norm(raw));
                            return (
                              <button
                                key={idx}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                title={inDb ? "Dodaj z bazy" : "Utwórz gracza i dodaj"}
                                // KLUCZ: wybór na onMouseDown
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  chooseFromSheet(i, raw);
                                }}
                              >
                                <span className="font-medium">{raw}</span>{" "}
                                {inDb ? (
                                  <span className="text-xs text-green-700">• w bazie</span>
                                ) : (
                                  <span className="text-xs text-gray-500">• utwórz nowego (ELO 1200)</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3">
            {stolikId ? (
              <div className="text-sm text-green-700">
                Skład zapisany. ID stołu: <code>{stolikId}</code>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={saveLineup}>
                Zatwierdź skład
              </button>
            )}
          </div>
        </div>

        {/* wprowadzanie wyników */}
        {stolikId && (
          <div className="card">
            <h3 className="font-semibold mb-3">Wyniki partii</h3>

            {mode === "simple" ? (
              <div className="grid gap-3">
                {Array.from({ length: roundsCount }, (_, i) => i + 1).map((nr) => (
                  <div key={nr} className="rounded-lg border px-3 py-2">
                    <div className="text-[12px] font-medium mb-2">Partia {nr}</div>
                    <div className="flex flex-wrap gap-3">
                      {chosenPlayers.map((p) => (
                        <label key={p.id} className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name={`p-${nr}`}
                            value={p.id}
                            checked={winners[nr] === p.id}
                            onChange={() => setWinners((prev) => ({ ...prev, [nr]: p.id }))}
                          />
                          <span>
                            {p.imie} {p.nazwisko}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-3">
                {Array.from({ length: roundsCount }, (_, i) => i + 1).map((nr) => (
                  <div key={nr} className="rounded-lg border px-3 py-2">
                    <div className="text-[12px] font-medium mb-2">Partia {nr}</div>

                    <div className="mb-2">
                      <span className="text-sm text-gray-600 mr-3">Zwycięzca:</span>
                      {chosenPlayers.map((p) => (
                        <label key={p.id} className="inline-flex items-center gap-2 mr-3">
                          <input
                            type="radio"
                            name={`win-${nr}`}
                            value={p.id}
                            checked={details[nr]?.winner_id === p.id}
                            onChange={() =>
                              setDetails((d) => ({
                                ...d,
                                [nr]: { winner_id: p.id, losers: d[nr]?.losers || {} },
                              }))
                            }
                          />
                          <span>
                            {p.imie} {p.nazwisko}
                          </span>
                        </label>
                      ))}
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {chosenPlayers.map((p) => {
                        const isWinner = details[nr]?.winner_id === p.id;
                        const val = details[nr]?.losers?.[p.id] ?? "";
                        return (
                          <label key={p.id} className="text-sm grid gap-1">
                            <span className="text-gray-600">
                              {p.imie} {p.nazwisko} {isWinner && <em className="text-green-700">(zwycięzca)</em>}
                            </span>
                            <input
                              type="number"
                              placeholder={isWinner ? "wyliczane automatycznie" : "np. -35"}
                              value={isWinner ? "" : String(val)}
                              disabled={isWinner}
                              onChange={(e) => {
                                const v = e.target.value;
                                setDetails((d) => {
                                  const r = d[nr] || { winner_id: "", losers: {} };
                                  return {
                                    ...d,
                                    [nr]: {
                                      ...r,
                                      losers: { ...r.losers, [p.id]: v === "" ? ("" as any) : Number(v) },
                                    },
                                  };
                                });
                              }}
                              className="rounded-lg border border-gray-300 px-3 py-2"
                            />
                          </label>
                        );
                      })}
                    </div>

                    {/* podgląd: suma idzie do zwycięzcy */}
                    <div className="mt-2 text-xs text-gray-600">
                      {(() => {
                        const r = details[nr];
                        if (!r?.winner_id) return null;
                        const sumAbs = Object.entries(r.losers || {}).reduce((a, [, v]) => {
                          const n = Number(v);
                          return a + (Number.isFinite(n) && n < 0 ? Math.abs(n) : 0);
                        }, 0);
                        return (
                          <>
                            Zwycięzca otrzyma: <b>+{sumAbs}</b> małych punktów
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {err && <div className="text-red-600 text-sm mt-2">{err}</div>}
            {ok && <div className="text-green-700 text-sm mt-2">{ok}</div>}

            <div className="mt-3 flex gap-2">
              <button className="btn btn-primary" onClick={saveRounds}>
                Zapisz partie
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  // szybkie rozpoczęcie następnego stołu: czyścimy skład/ID, zostawiamy turniej i ustawienia
                  setPlayers([null, null, null, null]);
                  setSlotText(["", "", "", ""]);
                  setStolikId(null);
                  setWinners({});
                  setDetails({});
                  setOk(null);
                  setErr(null);
                }}
              >
                Dodaj kolejny stół
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
