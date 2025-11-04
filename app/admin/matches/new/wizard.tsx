"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

/* ===== Typy ===== */
type Turniej = { id: string; nazwa: string };
type Gracz = { id: string; imie: string; nazwisko: string; ranking: number; fullname_norm?: string };
type SheetCandidate = string;

/* ===== Utils ===== */
// normalizacja jak w fullname_norm (lower, bez diakrytyków, pojedyncze spacje)
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    // @ts-ignore
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export default function NewMatchWizard() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // step 1: turniej
  const [turnieje, setTurnieje] = useState<Turniej[]>([]);
  const [turniejId, setTurniejId] = useState("");

  // step 2: konfiguracja
  const [liczbaGraczy, setLiczbaGraczy] = useState(3);
  const [liczbaPartii, setLiczbaPartii] = useState(3);

  // step 3: sloty ze wskazaniem graczy
  const [players, setPlayers] = useState<(Gracz | null)[]>([null, null, null, null]);

  // źródło podpowiedzi: arkusz Google dla wybranego turnieju
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetErr, setSheetErr] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<SheetCandidate[]>([]);
  const [dbByNorm, setDbByNorm] = useState<Map<string, Gracz>>(new Map());

  // teksty w polach slotów + lista proponowanych
  const [slotText, setSlotText] = useState<string[]>(["", "", "", ""]);

  // step 4: zwycięzcy
  const chosenPlayers = useMemo(
    () => players.slice(0, liczbaGraczy).filter(Boolean) as Gracz[],
    [players, liczbaGraczy]
  );
  const [winners, setWinners] = useState<Record<number, string>>({});
  const [stolikId, setStolikId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* ===== Init: turnieje ===== */
  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser.from("turniej").select("id,nazwa").order("nazwa");
      setTurnieje((data as any) || []);
    })();
  }, []);

  /* ===== Załaduj listę z arkusza po wyborze turnieju / wejściu w krok 3 ===== */
  useEffect(() => {
    async function loadSheet() {
      if (!turniejId) return;
      setSheetLoading(true);
      setSheetErr(null);
      setSheetNames([]);
      setDbByNorm(new Map());

      // 1) pobierz surowe nazwy z naszego API
      const res = await fetch(`/api/turnieje/${turniejId}/uczestnicy`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSheetLoading(false);
        setSheetErr(j.error || "Nie udało się pobrać listy z arkusza");
        return;
      }
      const raw: string[] = (j.names || []).map((s: string) => s.trim()).filter(Boolean);
      const rawLimited = raw.slice(0, 500);
      setSheetNames(rawLimited);

      // 2) pobierz hurtowo graczy z bazy po fullname_norm
      const norms = unique(rawLimited.map(norm).filter(Boolean));
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

    if (step === 3 && turniejId) loadSheet();
  }, [step, turniejId]);

  /* ===== Pomocnicze ===== */
  function setSlot(i: number, g: Gracz | null) {
    const dup = players.slice(0, liczbaGraczy).some((p, idx) => p?.id === g?.id && idx !== i);
    if (g && dup) return; // nie duplikujemy
    const next = [...players];
    next[i] = g;
    setPlayers(next);
  }

  function filteredSheetSuggestions(i: number): string[] {
    const q = norm(slotText[i] || "");
    if (!q) return [];
    // dopasowanie "zawiera" po znormalizowanej frazie
    return sheetNames
      .filter((name) => norm(name).includes(q))
      .slice(0, 10);
  }

  async function chooseFromSheet(i: number, rawName: string) {
    // jeśli istnieje w bazie — weź go
    const m = dbByNorm.get(norm(rawName));
    if (m) {
      setSlot(i, m);
      setSlotText((arr) => {
        const n = [...arr]; n[i] = `${m.imie} ${m.nazwisko}`; return n;
      });
      return;
    }
    // w przeciwnym razie: utwórz nowego gracza via API
    const res = await fetch("/api/gracze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullname: rawName }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j.error || "Nie udało się utworzyć gracza");
      return;
    }
    const g: Gracz = j.data;
    // zaktualizuj mapę
    setDbByNorm((mp) => {
      const nmp = new Map(mp);
      nmp.set(g.fullname_norm || norm(`${g.imie} ${g.nazwisko}`), g);
      return nmp;
    });
    setSlot(i, g);
    setSlotText((arr) => {
      const n = [...arr]; n[i] = `${g.imie} ${g.nazwisko}`; return n;
    });
  }

  function clearSlot(i: number) {
    setSlot(i, null);
    setSlotText((arr) => {
      const n = [...arr]; n[i] = ""; return n;
    });
  }

  /* ===== Tworzenie stołu ===== */
  async function handleCreateTable() {
    setErr(null); setOk(null);
    if (!turniejId) { setErr("Wybierz turniej"); return; }
    const picked = players.slice(0, liczbaGraczy).filter(Boolean) as Gracz[];
    if (picked.length !== liczbaGraczy) { setErr("Uzupełnij skład"); return; }

    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turniej_id: turniejId,
        liczba_graczy: liczbaGraczy,
        liczba_partii: liczbaPartii,
        players: picked.map((p) => p.id),
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(j.error || "Błąd tworzenia meczu"); return; }
    setStolikId(j.data.stolik_id);
    setStep(4);
  }

  /* ===== Zapis zwycięzców ===== */
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

  /* ===== UI ===== */
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

      {/* Krok 3 – sloty z podpowiedziami z arkusza */}
      {step === 3 && (
        <div className="grid gap-4">
          <div className="text-sm text-gray-600">
            Wpisz imię i nazwisko. Lista poniżej filtruje się z <b>arkusza turnieju</b>.
            Jeśli ktoś nie istnieje w bazie — utworzymy go z rankingiem 1200.
          </div>

          {sheetErr && <div className="text-red-600 text-sm">{sheetErr}</div>}
          {sheetLoading && <div className="text-sm">Pobieram listę z arkusza…</div>}

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: liczbaGraczy }, (_, i) => i).map((i) => {
              const sugg = filteredSheetSuggestions(i);
              const picked = players[i];
              return (
                <div key={i} className="rounded-lg border p-3">
                  <div className="text-[11px] uppercase text-gray-500 mb-1">Gracz {i + 1}</div>

                  <input
                    value={slotText[i] || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSlotText((arr) => { const n=[...arr]; n[i]=v; return n; });
                    }}
                    placeholder="np. Jan Kowalski"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />

                  {picked ? (
                    <div className="mt-2 text-sm">
                      <div className="font-medium">{picked.imie} {picked.nazwisko}</div>
                      <div className="text-xs text-gray-500">ELO {picked.ranking}</div>
                      <button className="btn btn-ghost mt-2" onClick={() => clearSlot(i)}>
                        Usuń ze składu
                      </button>
                    </div>
                  ) : (
                    !!sugg.length && (
                      <div className="mt-2 rounded-lg border bg-white divide-y max-h-56 overflow-auto">
                        {sugg.map((raw, idx) => {
                          const m = dbByNorm.get(norm(raw));
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => chooseFromSheet(i, raw)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50"
                              title={m ? "Dodaj z bazy" : "Utwórz gracza i dodaj"}
                            >
                              <span className="font-medium">{raw}</span>{" "}
                              {m ? (
                                <span className="text-xs text-green-700">• w bazie</span>
                              ) : (
                                <span className="text-xs text-gray-500">• utwórz nowego</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>

          {err && <div className="text-red-600 text-sm">{err}</div>}
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>Wstecz</button>
            <button className="btn btn-primary" onClick={handleCreateTable}>Utwórz mecz</button>
          </div>
        </div>
      )}

      {/* Krok 4 – zwycięzcy */}
      {step === 4 && (
        <div className="grid gap-4">
          <div className="text-sm text-gray-600">
            Wybierz zwycięzcę dla każdej partii.
          </div>

          <div className="grid gap-3">
            {Array.from({ length: liczbaPartii }, (_, i) => i + 1).map((nr) => (
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
