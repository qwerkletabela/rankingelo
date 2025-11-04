"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Turniej = { id: string; nazwa: string };
type Gracz = { id: string; imie: string; nazwisko: string; ranking: number };

export default function NewMatchWizard() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // step1: wybór turnieju
  const [turnieje, setTurnieje] = useState<Turniej[]>([]);
  const [turniejId, setTurniejId] = useState<string>("");

  // step2: konfiguracja
  const [liczbaGraczy, setLiczbaGraczy] = useState<number>(3);
  const [liczbaPartii, setLiczbaPartii] = useState<number>(3);

  // step3: wybór graczy
  const [query, setQuery] = useState<string>("");
  const [suggests, setSuggests] = useState<Gracz[]>([]);
  const [players, setPlayers] = useState<(Gracz | null)[]>([null, null, null, null]);

  // utworzony stolik
  const [stolikId, setStolikId] = useState<string | null>(null);

  // step4: zwycięzcy
  const playersChosen = useMemo(() => players.slice(0, liczbaGraczy).filter(Boolean) as Gracz[], [players, liczbaGraczy]);
  const [winners, setWinners] = useState<Record<number, string>>({}); // {nrPartii: gracz_id}
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser.from("turniej").select("id,nazwa").order("nazwa");
      setTurnieje((data as any) || []);
    })();
  }, []);

  // podpowiedzi graczy
  useEffect(() => {
    let active = true;
    (async () => {
      const q = query.trim();
      if (!q) { setSuggests([]); return; }
      const { data } = await supabaseBrowser
        .from("gracz")
        .select("id,imie,nazwisko,ranking")
        .or(`imie.ilike.%${q}%,nazwisko.ilike.%${q}%`)
        .limit(20);
      if (active) setSuggests((data as any) || []);
    })();
    return () => { active = false; };
  }, [query]);

  function pickPlayer(slot: number, g: Gracz) {
    const exist = players.slice(0, liczbaGraczy).find((p) => p?.id === g.id);
    if (exist) return; // nie duplikujemy
    const next = [...players];
    next[slot] = g;
    setPlayers(next);
    setQuery("");
    setSuggests([]);
  }

  async function handleCreateTable() {
    setErr(null); setOk(null);
    if (!turniejId) { setErr("Wybierz turniej"); return; }
    if (playersChosen.length !== liczbaGraczy) { setErr("Wybierz kompletny skład"); return; }

    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turniej_id: turniejId,
        liczba_graczy: liczbaGraczy,
        liczba_partii: liczbaPartii,
        players: playersChosen.map((p) => p.id),
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(j.error || "Błąd tworzenia meczu"); return; }
    setStolikId(j.data.stolik_id);
    setStep(4);
  }

  async function handleSaveWinners() {
    if (!stolikId) return;
    const arr = Array.from({ length: liczbaPartii }, (_, i) => i + 1)
      .filter((nr) => winners[nr])
      .map((nr) => ({ nr, zwyciezca_gracz_id: winners[nr] }));

    if (!arr.length) { setErr("Uzupełnij zwycięzców"); return; }

    setSaving(true); setErr(null); setOk(null);
    const res = await fetch(`/api/matches/${stolikId}/partie`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winners: arr }),
    });
    const j = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setErr(j.error || "Błąd zapisu rund"); return; }
    setOk("Zapisano rundy ✅");
  }

  return (
    <div className="grid gap-6">
      {/* Krok 1 */}
      {step === 1 && (
        <div className="grid gap-3">
          <label className="text-sm grid gap-1">
            <span className="text-gray-600">Turniej</span>
            <select
              value={turniejId}
              onChange={(e) => setTurniejId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">— wybierz —</option>
              {turnieje.map((t) => (
                <option key={t.id} value={t.id}>{t.nazwa}</option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!turniejId}>
              Dalej
            </button>
          </div>
        </div>
      )}

      {/* Krok 2 */}
      {step === 2 && (
        <div className="grid gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm grid gap-1">
              <span className="text-gray-600">Liczba graczy</span>
              <select
                value={liczbaGraczy}
                onChange={(e) => setLiczbaGraczy(parseInt(e.target.value))}
                className="rounded-lg border border-gray-300 px-3 py-2"
              >
                {[2,3,4].map((n)=> <option key={n} value={n}>{n}</option>)}
              </select>
            </label>

            <label className="text-sm grid gap-1">
              <span className="text-gray-600">Liczba partii</span>
              <select
                value={liczbaPartii}
                onChange={(e) => setLiczbaPartii(parseInt(e.target.value))}
                className="rounded-lg border border-gray-300 px-3 py-2"
              >
                {[1,2,3,4,5].map((n)=> <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>Wstecz</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>Dalej</button>
          </div>
        </div>
      )}

      {/* Krok 3 */}
      {step === 3 && (
        <div className="grid gap-4">
          <div className="text-sm text-gray-600">
            Wybierz <b>{liczbaGraczy}</b> graczy. Wpisz fragment imienia/nazwiska i kliknij z listy.
          </div>

          <div className="grid gap-2">
            <input
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
              placeholder="Szukaj gracza..."
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
            {!!suggests.length && (
              <div className="rounded-lg border bg-white divide-y">
                {suggests.map((g)=>(
                  <button
                    key={g.id}
                    type="button"
                    onClick={()=>pickPlayer(players.findIndex(p=>!p) || 0, g)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50"
                  >
                    {g.imie} {g.nazwisko} <span className="text-xs text-gray-500">({g.ranking})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({length: liczbaGraczy}, (_,i)=>i).map((i)=>(
              <div key={i} className="rounded-lg border px-3 py-2">
                <div className="text-[11px] uppercase text-gray-500">Gracz {i+1}</div>
                <div className="mt-1 h-6">
                  {players[i]
                    ? <span className="text-sm font-medium">{players[i]!.imie} {players[i]!.nazwisko}</span>
                    : <span className="text-sm text-gray-500">—</span>}
                </div>
                {players[i] && (
                  <button className="btn btn-ghost mt-2" onClick={()=> {
                    const next=[...players]; next[i]=null; setPlayers(next);
                  }}>Usuń</button>
                )}
              </div>
            ))}
          </div>

          {err && <div className="text-red-600 text-sm">{err}</div>}
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>Wstecz</button>
            <button className="btn btn-primary" onClick={handleCreateTable}>Utwórz mecz</button>
          </div>
        </div>
      )}

      {/* Krok 4 */}
      {step === 4 && (
        <div className="grid gap-4">
          <div className="text-sm text-gray-600">
            Wybierz zwycięzcę dla każdej partii.
          </div>

          <div className="grid gap-3">
            {Array.from({length: liczbaPartii}, (_,i)=>i+1).map((nr)=>(
              <div key={nr} className="rounded-lg border px-3 py-2">
                <div className="text-[12px] font-medium mb-2">Partia {nr}</div>
                <div className="flex flex-wrap gap-3">
                  {playersChosen.map((p)=>(
                    <label key={p.id} className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name={`p-${nr}`}
                        value={p.id}
                        checked={winners[nr] === p.id}
                        onChange={()=> setWinners(prev=> ({...prev, [nr]: p.id}))}
                      />
                      <span>{p.imie} {p.nazwisko}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {err && <div className="text-red-600 text-sm">{err}</div>}
          {ok && <div className="text-green-700 text-sm">{ok}</div>}
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={handleSaveWinners} disabled={saving}>
              {saving ? "Zapisywanie..." : "Zapisz zwycięzców"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
