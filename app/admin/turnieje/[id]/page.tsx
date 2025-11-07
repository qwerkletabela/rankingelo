// app/admin/turnieje/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Trash2,
  RotateCcw,
  Swords,
  X,
} from "lucide-react";

/* ========= Typy ========= */
type TurniejRow = {
  id: string;
  nazwa: string;
  data_turnieju: string | null;
  godzina_turnieju: string | null;
};

type PartiaRow = {
  id: string;
  nr: number;
  played_at: string;
  zwyciezca_gracz_id: string;
  stolik_id: string;
};

type WinnerMap = Record<string, { gracz_id: string; gracz: string }>; // partia_id -> winner

type WynikRow = {
  partia_id: string;
  gracz_id: string;
  gracz: string; // "Imię Nazwisko"
  wygral: boolean;
  male_punkty: number; // u przegranych ujemne; zwycięzca – suma dodatnia
};

/* ========= Pomocnicze ========= */
function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = d.toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const tt = d.toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dd} ${tt}`;
  } catch {
    return iso;
  }
}

type Mode = "winner" | "small";

/* ========= Modal Edycji Partii ========= */
function EditPartiaModal({
  open,
  onClose,
  partia,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  partia: PartiaRow | null;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<WynikRow[]>([]);
  const [mode, setMode] = useState<Mode>("winner");
  const [winnerId, setWinnerId] = useState<string>("");
  const [small, setSmall] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setErr(null);
      setOk(null);
      setRows([]);
      setSmall({});
      setWinnerId("");
      if (!open || !partia) return;

      setLoading(true);
      const { data, error } = await supabaseBrowser
        .from("wyniki_rows")
        .select("partia_id,gracz_id,gracz,wygral,male_punkty")
        .eq("partia_id", partia.id);
      setLoading(false);

      if (error) {
        setErr(error.message);
        return;
      }

      const r = (data || []) as WynikRow[];
      setRows(r);

      // Domyślnie tryb „winner” jeśli:
      // - ktoś ma wygral = true ORAZ u przegranych male_punkty = -1 (placeholder),
      // w pozostałych przypadkach zostaw „small”.
      const wygr = r.find((x) => x.wygral);
      setWinnerId(wygr ? wygr.gracz_id : "");

      const anyPlaceholderLoser = r.some((x) => !x.wygral && Number(x.male_punkty) === -1);
      const allLosersHaveNegatives = r.filter((x) => !x.wygral).every((x) => Number(x.male_punkty) < 0);
      if (wygr && anyPlaceholderLoser) setMode("winner");
      else if (allLosersHaveNegatives) setMode("small");
      else setMode("winner"); // default

      // Wypełnij mapę małych punktów (dla edycji w trybie „small”)
      const m: Record<string, string> = {};
      for (const row of r) {
        if (row.wygral) {
          // Zwycięzcy zostawiamy pustą wartość (wprowadzamy wartości tylko u przegranych).
          m[row.gracz_id] = "";
        } else {
          m[row.gracz_id] = row.male_punkty ? String(row.male_punkty) : "";
        }
      }
      setSmall(m);
    })();
  }, [open, partia?.id]);

  function setSmallFor(id: string, val: string) {
    setSmall((s) => ({ ...s, [id]: val }));
  }

  function parseNum(x: string | undefined) {
    if (x == null) return NaN;
    const n = Number(String(x).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }

  async function handleSave() {
    setErr(null);
    setOk(null);

    if (!partia) {
      setErr("Brak wybranej partii.");
      return;
    }
    const pid = partia.id;

    try {
      if (mode === "winner") {
        if (!winnerId) {
          setErr("Zaznacz zwycięzcę.");
          return;
        }

        // 1) update zwycięzcy
        const { error: upErr } = await supabaseBrowser
          .from("partia")
          .update({ zwyciezca_gracz_id: winnerId })
          .eq("id", pid);
        if (upErr) throw upErr;

        // 2) placeholder -1 dla wszystkich przegranych
        const losers = rows
          .map((r) => r.gracz_id)
          .filter((gid) => gid !== winnerId);
        // wyczyść stare:
        const { error: delErr } = await supabaseBrowser
          .from("partia_male")
          .delete()
          .eq("partia_id", pid);
        if (delErr) throw delErr;

        if (losers.length) {
          const payload = losers.map((gid) => ({
            partia_id: pid,
            gracz_id: gid,
            punkty: -1,
          }));
          const { error: insErr } = await supabaseBrowser
            .from("partia_male")
            .insert(payload);
          if (insErr) throw insErr;
        }
      } else {
        // small-points: u przegranych wartości UJEMNE; zwycięzca – puste/0
        // Wnioskuj zwycięzcę: dokładnie jeden gracz bez ujemnej wartości
        const vals = rows.map((r) => ({
          id: r.gracz_id,
          v: parseNum(small[r.gracz_id]),
        }));
        const neg = vals.filter((x) => x.v < 0);
        const nonNeg = vals.filter((x) => !(x.v < 0)); // puste/0/NaN -> kandydat zwycięzcy

        if (neg.length !== rows.length - 1 || nonNeg.length !== 1) {
          setErr(
            "W trybie Małe punkty: wpisz wartości ujemne dla wszystkich przegranych, a zwycięzcy zostaw puste/0 (dokładnie jeden)."
          );
          return;
        }
        const newWinnerId = nonNeg[0].id;

        // 1) update zwycięzcy
        const { error: upErr } = await supabaseBrowser
          .from("partia")
          .update({ zwyciezca_gracz_id: newWinnerId })
          .eq("id", pid);
        if (upErr) throw upErr;

        // 2) przepisz partia_male = tylko ujemne przegranych
        const { error: delErr } = await supabaseBrowser
          .from("partia_male")
          .delete()
          .eq("partia_id", pid);
        if (delErr) throw delErr;

        if (neg.length) {
          const payload = neg.map((x) => ({
            partia_id: pid,
            gracz_id: x.id,
            punkty: Number(x.v),
          }));
          const { error: insErr } = await supabaseBrowser
            .from("partia_male")
            .insert(payload);
          if (insErr) throw insErr;
        }
      }

      // 3) przelicz ELO
      const { error: rpcErr } = await supabaseBrowser.rpc("elo_recompute_all");
      if (rpcErr) throw new Error("Przeliczenie ELO nie powiodło się: " + rpcErr.message);

      setOk("Zapisano zmiany. Ranking przeliczony.");
      onSaved();
    } catch (e: any) {
      setErr(e.message || "Błąd zapisu");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl ring-1 ring-black/10 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold inline-flex items-center gap-2">
            <Swords className="w-4 h-4" />
            Edytuj partię
          </div>
          <button onClick={onClose} className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50">
            <X className="w-4 h-4" /> Zamknij
          </button>
        </div>

        <div className="p-4 grid gap-3">
          {err && <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">{err}</div>}
          {ok && <div className="rounded-md border border-green-200 bg-green-50 text-green-700 text-sm px-3 py-2">{ok}</div>}
          {loading && (
            <div className="text-sm text-gray-600 inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Ładowanie…
            </div>
          )}

          {!loading && rows.length > 0 && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700">Tryb:</span>
                <div className="inline-flex rounded-md border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMode("winner")}
                    className={`px-3 py-1 text-sm ${mode === "winner" ? "bg-gray-900 text-white" : "bg-white"}`}
                  >
                    Zwycięzca
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("small")}
                    className={`px-3 py-1 text-sm ${mode === "small" ? "bg-gray-900 text-white" : "bg-white"}`}
                  >
                    Małe punkty
                  </button>
                </div>
              </div>

              {mode === "winner" ? (
                <div className="grid gap-2">
                  {rows
                    .slice()
                    .sort((a, b) => a.gracz.localeCompare(b.gracz, "pl"))
                    .map((r) => (
                      <label key={r.gracz_id} className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="win"
                          value={r.gracz_id}
                          checked={winnerId === r.gracz_id}
                          onChange={(e) => setWinnerId(e.target.value)}
                        />
                        <span>{r.gracz}</span>
                      </label>
                    ))}
                </div>
              ) : (
                <div className="grid gap-2">
                  <div className="text-xs text-gray-600">
                    Wpisz <b>ujemne</b> wartości przegranym. Zwycięzcy zostaw puste/0.
                  </div>
                  {rows
                    .slice()
                    .sort((a, b) => a.gracz.localeCompare(b.gracz, "pl"))
                    .map((r) => (
                      <label key={r.gracz_id} className="text-sm flex items-center gap-2">
                        <span className="w-48">{r.gracz}</span>
                        <input
                          type="number"
                          step="1"
                          placeholder={r.wygral ? "zostaw puste" : "np. -10"}
                          value={small[r.gracz_id] ?? ""}
                          onChange={(e) => setSmallFor(r.gracz_id, e.target.value)}
                          className="w-32 rounded-md border px-2 py-1"
                        />
                      </label>
                    ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button className="btn btn-primary" onClick={handleSave}>
                  Zapisz
                </button>
                <button className="btn btn-ghost" onClick={onClose}>
                  Zamknij
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========= Strona turnieju ========= */
export default function TurniejDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const turniejId = params?.id as string;

  const [turniej, setTurniej] = useState<TurniejRow | null>(null);
  const [partie, setPartie] = useState<PartiaRow[]>([]);
  const [winners, setWinners] = useState<WinnerMap>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editPartia, setEditPartia] = useState<PartiaRow | null>(null);

  async function loadAll() {
    setLoading(true);
    setErr(null);
    setMsg(null);

    // Turniej
    const { data: t, error: tErr } = await supabaseBrowser
      .from("turniej")
      .select("id,nazwa,data_turnieju,godzina_turnieju")
      .eq("id", turniejId)
      .maybeSingle();
    if (tErr) {
      setErr(tErr.message);
      setLoading(false);
      return;
    }
    setTurniej(t as TurniejRow);

    // Partie (po turnieju)
    const { data: p, error: pErr } = await supabaseBrowser
      .from("partia")
      .select("id,nr,played_at,zwyciezca_gracz_id,stolik_id")
      .order("played_at", { ascending: true })
      .order("nr", { ascending: true })
      .in(
        "stolik_id",
        (
          await supabaseBrowser
            .from("stolik")
            .select("id")
            .eq("turniej_id", turniejId)
        ).data?.map((s: any) => s.id) || []
      );

    if (pErr) {
      setErr(pErr.message);
      setLoading(false);
      return;
    }
    const list = (p || []) as PartiaRow[];
    setPartie(list);

    // Zwycięzcy – jedna paczka z widoku
    const { data: wr, error: wErr } = await supabaseBrowser
      .from("wyniki_rows")
      .select("partia_id,gracz_id,gracz,wygral")
      .eq("turniej_id", turniejId)
      .eq("wygral", true);
    if (wErr) {
      setErr(wErr.message);
      setLoading(false);
      return;
    }
    const map: WinnerMap = {};
    (wr || []).forEach((r: any) => {
      map[r.partia_id] = { gracz_id: r.gracz_id, gracz: r.gracz };
    });
    setWinners(map);

    setLoading(false);
  }

  useEffect(() => {
    if (turniejId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turniejId]);

  async function deletePartia(pid: string) {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const { error: delErr } = await supabaseBrowser.from("partia").delete().eq("id", pid);
      if (delErr) throw delErr;

      // Przelicz ELO po usunięciu
      const { error: rpcErr } = await supabaseBrowser.rpc("elo_recompute_all");
      if (rpcErr) throw new Error("Ranking zapisany, ale przeliczenie ELO nie powiodło się: " + rpcErr.message);

      setMsg("Usunięto partię i przeliczono ranking.");
      await loadAll();
    } catch (e: any) {
      setErr(e.message || "Nie udało się usunąć partii");
    } finally {
      setBusy(false);
    }
  }

  async function recomputeElo() {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const { error } = await supabaseBrowser.rpc("elo_recompute_all");
      if (error) throw error;
      setMsg("Ranking ELO przeliczony.");
    } catch (e: any) {
      setErr(e.message || "Błąd przeliczania ELO");
    } finally {
      setBusy(false);
    }
  }

  const title = useMemo(() => {
    if (!turniej) return "Turniej";
    const date = turniej.data_turnieju ?? "";
    const time = turniej.godzina_turnieju ? turniej.godzina_turnieju.slice(0, 5) : "";
    return `${turniej.nazwa}${date ? " • " + date : ""}${time ? " " + time : ""}`;
  }, [turniej]);

  return (
    <main>
      <div className="max-w-6xl mx-auto px-4 py-6 grid gap-4">
        <button onClick={() => router.push("/admin")} className="inline-flex items-center gap-2 text-sm text-gray-700 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Wróć do panelu
        </button>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{title}</h1>
          <button
            onClick={recomputeElo}
            disabled={busy}
            className="inline-flex items-center gap-2 btn btn-outline"
            title="Przelicz ranking ELO"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Przelicz ranking ELO
          </button>
        </div>

        {err && <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">{err}</div>}
        {msg && <div className="rounded-md border border-green-200 bg-green-50 text-green-700 text-sm px-3 py-2">{msg}</div>}

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Partie w tym turnieju</h3>
          </div>

          {loading ? (
            <div className="text-sm text-gray-600 inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Ładowanie…
            </div>
          ) : partie.length === 0 ? (
            <div className="text-sm text-gray-600">Brak partii.</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="table">
                <thead className="bg-gray-50/70">
                  <tr>
                    <th>#</th>
                    <th>Data</th>
                    <th>Zwycięzca</th>
                    <th className="w-56">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {partie.map((p) => {
                    const w = winners[p.id];
                    return (
                      <tr key={p.id} className="border-t">
                        <td className="py-2">{p.nr}</td>
                        <td className="py-2">{formatDateTime(p.played_at)}</td>
                        <td className="py-2">{w ? w.gracz : <span className="text-gray-500">—</span>}</td>
                        <td className="py-2">
                          <div className="inline-flex items-center gap-2">
                            <button
                              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50"
                              onClick={() => {
                                setEditPartia(p);
                                setEditOpen(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" /> Edytuj
                            </button>
                            <button
                              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-red-50 text-red-700 border-red-200"
                              onClick={() => deletePartia(p.id)}
                              disabled={busy}
                            >
                              <Trash2 className="w-4 h-4" /> Usuń
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal edycji */}
      <EditPartiaModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        partia={editPartia}
        onSaved={() => {
          setEditOpen(false);
          loadAll();
        }}
      />
    </main>
  );
}
