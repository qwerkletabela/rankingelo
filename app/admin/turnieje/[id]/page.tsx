"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Loader2, Trash2, Pencil, X, Save, ArrowLeft, Swords } from "lucide-react";

/* ===== Typy ===== */
type Gracz = { id: string; imie: string; nazwisko: string; ranking: number };
type PartiaMaleRow = { partia_id: string; gracz_id: string; punkty: number; gracz?: Gracz };

type PartiaView = {
  id: string;
  nr: number;
  played_at: string;
  numer_dodania: number;
  winner_id: string;
  winner?: Gracz | null;
  losers: { gracz: Gracz; punkty: number }[]; // ujemne
  players: Gracz[]; // winner + losers (kolejność: zwycięzca pierwszy)
};

type Turniej = { id: string; nazwa: string; data_turnieju: string | null; godzina_turnieju: string | null };

/* ===== Utils ===== */
function fmtDateTime(iso: string) {
  try {
    const d = new Date(iso);
    const dd = d.toLocaleDateString("pl-PL");
    const tt = d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
    return `${dd} ${tt}`;
  } catch { return iso; }
}

/* ============================================================
   Modal edycji partii
   ============================================================ */
type GameMode = "winner" | "small";

function EditPartiaModal({
  open,
  onClose,
  partia,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  partia: PartiaView | null;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<GameMode>("winner");
  const [winnerId, setWinnerId] = useState<string>("");
  const [smallMap, setSmallMap] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !partia) return;
    setErr(null);
    // domyślnie: jeśli są ujemne małe punkty w losserach, pokaż „small”, inaczej „winner”
    const hasSmall = partia.losers.some((l) => Number(l.punkty) < 0);
    setMode(hasSmall ? "small" : "winner");
    setWinnerId(partia.winner_id);
    const m: Record<string, string> = {};
    partia.players.forEach((p) => {
      const row = partia.losers.find((l) => l.gracz.id === p.id);
      m[p.id] = row ? String(row.punkty) : ""; // zwycięzca pusty/0
    });
    setSmallMap(m);
  }, [open, partia]);

  if (!open || !partia) return null;

  const players = partia.players;

  function setSmall(pid: string, v: string) {
    setSmallMap((m) => ({ ...m, [pid]: v }));
  }

  function parseNum(x: string | undefined) {
    if (x == null || x === "") return 0;
    const n = Number(String(x).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }

  async function save() {
    setErr(null);

    // Walidacja
    if (mode === "winner") {
      if (!winnerId) { setErr("Wybierz zwycięzcę."); return; }
    } else {
      // small: dokładnie (players.length-1) ujemnych; jeden zwycięzca z 0/pusto
      const vals = players.map((p) => parseNum(smallMap[p.id]));
      if (vals.some((v) => Number.isNaN(v))) { setErr("Błędne wartości małych punktów."); return; }
      const negCount = vals.filter((v) => v < 0).length;
      if (negCount !== players.length - 1) {
        setErr(`Wpisz ujemne wartości przegranym (dokładnie ${players.length - 1}). Zwycięzcy zostaw 0/puste.`);
        return;
      }
      // winner = jedyny nieujemny
      const winIdx = vals.findIndex((v) => v >= 0);
      if (winIdx < 0) { setErr("Brak zwycięzcy w małych punktach."); return; }
      setWinnerId(players[winIdx].id);
    }

    setSaving(true);
    try {
      // 1) zaktualizuj zwycięzcę
      const { error: upErr } = await supabaseBrowser
        .from("partia")
        .update({ zwyciezca_gracz_id: winnerId })
        .eq("id", partia.id);
      if (upErr) throw upErr;

      // 2) przebuduj partia_male
      const { error: delErr } = await supabaseBrowser.from("partia_male").delete().eq("partia_id", partia.id);
      if (delErr) throw delErr;

      if (mode === "winner") {
        // wpisz placeholder -1 przegranym
        const losers = players.filter((p) => p.id !== winnerId).map((p) => ({
          partia_id: partia.id,
          gracz_id: p.id,
          punkty: -1,
        }));
        if (losers.length) {
          const { error: insErr } = await supabaseBrowser.from("partia_male").insert(losers);
          if (insErr) throw insErr;
        }
      } else {
        // wpisz ujemne wartości przegranym (winner ma 0/puste)
        const rows = players
          .filter((p) => p.id !== winnerId)
          .map((p) => ({
            partia_id: partia.id,
            gracz_id: p.id,
            punkty: Number(String(smallMap[p.id] ?? "0").replace(",", ".")) || -1,
          }));
        if (rows.length) {
          const { error: insErr } = await supabaseBrowser.from("partia_male").insert(rows);
          if (insErr) throw insErr;
        }
      }

      // 3) przelicz ELO
      const { error: rpcErr } = await supabaseBrowser.rpc("elo_recompute_all");
      if (rpcErr) throw rpcErr;

      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message || "Błąd zapisu zmian");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl ring-1 ring-black/10 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold inline-flex items-center gap-2">
            <Swords className="w-4 h-4" />
            Edytuj partię #{partia.nr}
          </div>
          <button onClick={onClose} className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50">
            <X className="w-4 h-4" /> Zamknij
          </button>
        </div>

        <div className="p-4 grid gap-3">
          {err && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Tryb:</span>
            <div className="inline-flex rounded-md border overflow-hidden">
              <button
                type="button"
                onClick={() => setMode("winner")}
                className={`px-2 py-1 text-xs ${mode === "winner" ? "bg-gray-900 text-white" : "bg-white"}`}
              >
                Zwycięzca
              </button>
              <button
                type="button"
                onClick={() => setMode("small")}
                className={`px-2 py-1 text-xs ${mode === "small" ? "bg-gray-900 text-white" : "bg-white"}`}
              >
                Małe punkty
              </button>
            </div>
          </div>

          {mode === "winner" ? (
            <div className="grid gap-2">
              {players.map((p) => (
                <label key={p.id} className="inline-flex items-center gap-2">
                  <input type="radio" name="win" value={p.id} checked={winnerId === p.id} onChange={(e) => setWinnerId(e.target.value)} />
                  <span className="text-sm">{p.imie} {p.nazwisko}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="grid gap-2">
              <div className="text-xs text-gray-600">U przegranych wpisz wartości <b>ujemne</b>. Zwycięzcy zostaw 0/puste.</div>
              {players.map((p) => (
                <label key={p.id} className="text-sm flex items-center gap-2">
                  <span className="w-48">{p.imie} {p.nazwisko}</span>
                  <input
                    type="number"
                    step="1"
                    placeholder="np. -10"
                    value={smallMap[p.id] ?? ""}
                    onChange={(e) => setSmall(p.id, e.target.value)}
                    className="w-28 rounded-md border px-2 py-1"
                  />
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button className="btn btn-ghost" onClick={onClose}>Anuluj</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Zapisywanie…</span> : <><Save className="w-4 h-4" /> Zapisz zmiany</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Strona: Szczegóły turnieju
   ============================================================ */
export default function TournamentDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const turniejId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [turniej, setTurniej] = useState<Turniej | null>(null);
  const [partie, setPartie] = useState<PartiaView[]>([]);
  const [edit, setEdit] = useState<PartiaView | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      // 1) turniej
      const { data: t, error: tErr } = await supabaseBrowser
        .from("turniej")
        .select("id,nazwa,data_turnieju,godzina_turnieju")
        .eq("id", turniejId)
        .maybeSingle();
      if (tErr) throw tErr;
      if (!t) throw new Error("Nie znaleziono turnieju");
      setTurniej(t as Turniej);

      // 2) stoliki
      const { data: sto, error: sErr } = await supabaseBrowser
        .from("stolik")
        .select("id")
        .eq("turniej_id", turniejId);
      if (sErr) throw sErr;
      const stolikIds = (sto || []).map((x: any) => x.id);
      if (stolikIds.length === 0) { setPartie([]); setLoading(false); return; }

      // 3) partie
      const { data: p1, error: pErr } = await supabaseBrowser
        .from("partia")
        .select("id, nr, played_at, numer_dodania, zwyciezca_gracz_id, stolik_id")
        .in("stolik_id", stolikIds)
        .order("played_at", { ascending: false })
        .order("numer_dodania", { ascending: false });
      if (pErr) throw pErr;
      const partiaIds = (p1 || []).map((p: any) => p.id);

      // 4) winners (gracze)
      const winnerIds = Array.from(new Set((p1 || []).map((p: any) => p.zwyciezca_gracz_id)));
      const { data: wg, error: wgErr } = await supabaseBrowser
        .from("gracz")
        .select("id,imie,nazwisko,ranking")
        .in("id", winnerIds.length ? winnerIds : ["00000000-0000-0000-0000-000000000000"]);
      if (wgErr) throw wgErr;
      const winnerMap = new Map((wg || []).map((g: any) => [g.id, g as Gracz]));

      // 5) partia_male + gracze
      const { data: pm, error: pmErr } = await supabaseBrowser
        .from("partia_male")
        .select("partia_id,gracz_id,punkty,gracz:gracz(id,imie,nazwisko,ranking)")
        .in("partia_id", partiaIds.length ? partiaIds : ["00000000-0000-0000-0000-000000000000"]);
      if (pmErr) throw pmErr;
      const pmByPartia = new Map<string, PartiaMaleRow[]>();
      (pm || []).forEach((r: any) => {
        const arr = pmByPartia.get(r.partia_id) || [];
        arr.push({
          partia_id: r.partia_id,
          gracz_id: r.gracz_id,
          punkty: Number(r.punkty),
          gracz: r.gracz ? { id: r.gracz.id, imie: r.gracz.imie, nazwisko: r.gracz.nazwisko, ranking: r.gracz.ranking } : undefined,
        });
        pmByPartia.set(r.partia_id, arr);
      });

      // 6) zbuduj widok
      const list: PartiaView[] = (p1 || []).map((p: any) => {
        const losersRows = pmByPartia.get(p.id) || [];
        const winner = winnerMap.get(p.zwyciezca_gracz_id) || null;
        const losers = losersRows
          .filter((r) => r.gracz)
          .map((r) => ({ gracz: r.gracz as Gracz, punkty: Number(r.punkty) }));
        const players: Gracz[] = [winner, ...losers].filter(Boolean) as Gracz[];
        return {
          id: p.id,
          nr: p.nr,
          played_at: p.played_at,
          numer_dodania: p.numer_dodania,
          winner_id: p.zwyciezca_gracz_id,
          winner,
          losers,
          players,
        };
      });

      setPartie(list);
    } catch (e: any) {
      setErr(e.message || "Błąd pobierania danych");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (turniejId) load(); }, [turniejId]);

  async function deletePartia(pid: string) {
    if (!confirm("Na pewno usunąć tę partię?")) return;
    const { error: delErr } = await supabaseBrowser.from("partia").delete().eq("id", pid);
    if (delErr) { alert(delErr.message); return; }
    const { error: rpcErr } = await supabaseBrowser.rpc("elo_recompute_all");
    if (rpcErr) { alert("Usunięto partię, ale przeliczenie ELO się nie powiodło: " + rpcErr.message); }
    await load();
  }

  return (
    <main>
      <div className="max-w-6xl mx-auto px-4 py-6 grid gap-4">
        <div className="flex items-center justify-between">
          <button className="btn btn-ghost inline-flex items-center gap-2" onClick={() => router.push("/admin")}>
            <ArrowLeft className="w-4 h-4" /> Wróć
          </button>
          <div></div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Turniej</div>
              <div className="text-xl font-semibold">{turniej?.nazwa ?? "…"}</div>
              {turniej?.data_turnieju && (
                <div className="text-sm text-gray-600 mt-1">
                  Data: {turniej.data_turnieju}{turniej.godzina_turnieju ? `, ${turniej.godzina_turnieju.slice(0,5)}` : ""}
                </div>
              )}
            </div>
            <a href="/admin" className="btn btn-outline">Panel</a>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Partie w tym turnieju</h3>
            <button className="btn btn-outline" onClick={load}>Odśwież</button>
          </div>

          {loading ? (
            <div className="text-sm text-gray-600 inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Ładowanie…
            </div>
          ) : err ? (
            <div className="text-sm text-red-700">{err}</div>
          ) : partie.length === 0 ? (
            <div className="text-sm text-gray-600">Brak partii dla tego turnieju.</div>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 w-16">#</th>
                    <th className="text-left px-3 py-2">Zwycięzca</th>
                    <th className="text-left px-3 py-2">Przegrani (małe pkt)</th>
                    <th className="text-left px-3 py-2">Data</th>
                    <th className="text-left px-3 py-2 w-40">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {partie.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-3 py-2">#{p.nr}</td>
                      <td className="px-3 py-2">
                        {p.winner ? (<b>{p.winner.imie} {p.winner.nazwisko}</b>) : <span className="text-gray-500">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {p.losers.length === 0 ? (
                          <span className="text-gray-500">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {p.losers.map((l) => (
                              <span key={l.gracz.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs bg-gray-50 border-gray-200 text-gray-700">
                                {l.gracz.imie} {l.gracz.nazwisko} <span className="text-red-700">({l.punkty})</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">{fmtDateTime(p.played_at)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button className="btn btn-outline inline-flex items-center gap-2" onClick={() => setEdit(p)}>
                            <Pencil className="w-4 h-4" /> Edytuj
                          </button>
                          <button className="btn btn-danger inline-flex items-center gap-2" onClick={() => deletePartia(p.id)}>
                            <Trash2 className="w-4 h-4" /> Usuń
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal edycji */}
      {edit && (
        <EditPartiaModal
          open={!!edit}
          partia={edit}
          onClose={() => setEdit(null)}
          onSaved={load}
        />
      )}
    </main>
  );
}
