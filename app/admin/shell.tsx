"use client";

import { useEffect, useMemo, useState } from "react";
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
  RefreshCw,
} from "lucide-react";
import MapPicker from "@/components/MapPicker";
import { normDb } from "@/lib/norm";

/* ===== Typy ===== */
type TurniejRow = {
  id: string;
  nazwa: string;
  gsheet_url: string;
  gsheet_id: string | null;
  arkusz_nazwa: string;
  kolumna_nazwisk: string;
  pierwszy_wiersz_z_nazwiskiem: number;
  data_turnieju: string | null;     // YYYY-MM-DD
  godzina_turnieju: string | null;  // HH:MM:SS
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

    const norms = Array.from(new Set(names.map(normDb)));
    const { data: found, error } = await supabaseBrowser
      .from("gracz")
      .select("fullname_norm")
      .in("fullname_norm", norms);

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    const foundSet = new Set((found || []).map((g: any) => g.fullname_norm));
    setRows(names.map((name) => ({ name, exists: foundSet.has(normDb(name)) })));
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
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

          {loading ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Wczytywanie listy z arkusza…
            </div>
          ) : total === 0 ? (
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
                              onClick={() => addOne(i)}
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
   Modal: Dodaj partię (prosty / szczegółowy)
   ============================================================ */
function AddPartiaModal({
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
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [mode, setMode] = useState<"simple" | "detailed">("simple");
  const [playedAt, setPlayedAt] = useState<string>(() => {
    const d = new Date();
    // yyyy-MM-ddTHH:mm (bez sekund)
    const pad = (n: number) => String(n).padStart(2, "0");
    const s = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return s;
  });

  // kandydaci (z arkusza -> przefiltrowani do realnych graczy z DB)
  const [options, setOptions] = useState<Gracz[]>([]);
  const [winnerId, setWinnerId] = useState<string>("");
  const [losersIds, setLosersIds] = useState<string[]>([]);
  const [losersSmall, setLosersSmall] = useState<Record<string, string>>({}); // string, walidujemy na końcu

  async function loadCandidates() {
    setLoading(true);
    setErr(null);
    setOk(null);

    // 1) imiona i nazwiska z arkusza
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
      .slice(0, 800);

    if (!names.length) {
      setOptions([]);
      setLoading(false);
      return;
    }

    // 2) dopasuj do bazy po fullname_norm
    const norms = Array.from(new Set(names.map(normDb)));
    const { data: found, error } = await supabaseBrowser
      .from("gracz")
      .select("id,imie,nazwisko,ranking,fullname_norm")
      .in("fullname_norm", norms);

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    // tylko istniejący w DB (brakujących najpierw dodaj w „Liście grających”)
    const arr = (found || []) as Gracz[];
    arr.sort((a, b) => (a.nazwisko + a.imie).localeCompare(b.nazwisko + b.imie, "pl"));
    setOptions(arr);
    setLoading(false);
  }

  useEffect(() => {
    if (open) loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tournament.id]);

  const losersAvailable = useMemo(
    () => options.filter((p) => p.id !== winnerId),
    [options, winnerId]
  );

  function toggleLoser(id: string) {
    setLosersIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function save() {
    setErr(null);
    setOk(null);

    if (!winnerId) {
      setErr("Wybierz zwycięzcę.");
      return;
    }
    if (losersIds.length < 1) {
      setErr("Wybierz co najmniej jednego przegranego.");
      return;
    }
    if (losersIds.length > 3) {
      setErr("Maksymalnie 3 przegranych (łącznie stół do 4 osób).");
      return;
    }

    // walidacja szczegółowa
    let losersPayload: { id: string; mp: number }[] = [];
    if (mode === "detailed") {
      for (const id of losersIds) {
        const raw = losersSmall[id];
        if (raw == null || raw === "") {
          setErr("Uzupełnij małe punkty dla wszystkich przegranych.");
          return;
        }
        const num = Number(raw);
        if (!Number.isFinite(num) || num >= 0) {
          setErr("Małe punkty przegranych muszą być ujemne (np. -35).");
          return;
        }
        losersPayload.push({ id, mp: num });
      }
    } else {
      losersPayload = losersIds.map((id) => ({ id, mp: -1 })); // placeholder
    }

    setLoading(true);
    try {
      // 1) utwórz stolik
      const { data: stolikIns, error: stErr } = await supabaseBrowser
        .from("stolik")
        .insert({ turniej_id: tournament.id })
        .select("id")
        .maybeSingle();
      if (stErr || !stolikIns?.id) throw new Error(stErr?.message || "Błąd tworzenia stołu");

      // 2) partia
      const playedIso = playedAt ? new Date(playedAt).toISOString() : new Date().toISOString();
      const { data: partiaIns, error: pErr } = await supabaseBrowser
        .from("partia")
        .insert({
          stolik_id: stolikIns.id,
          nr: 1,
          played_at: playedIso,
          zwyciezca_gracz_id: winnerId,
        })
        .select("id")
        .maybeSingle();
      if (pErr || !partiaIns?.id) throw new Error(pErr?.message || "Błąd tworzenia partii");

      // 3) małe punkty (dla przegranych)
      const rows = losersPayload.map((l) => ({
        partia_id: partiaIns.id,
        gracz_id: l.id,
        punkty: l.mp,
      }));
      const { error: pmErr } = await supabaseBrowser.from("partia_male").insert(rows);
      if (pmErr) throw new Error(pmErr.message);

      // 4) przelicz ranking
      const { error: rpcErr } = await supabaseBrowser.rpc("elo_recompute_all");
      if (rpcErr) throw new Error("Zapisano partię, ale przeliczenie ELO nie powiodło się: " + rpcErr.message);

      setOk("Partia dodana i ranking przeliczony ✅");
      onSaved();
    } catch (e: any) {
      setErr(e.message || "Błąd zapisu");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl ring-1 ring-black/10 overflow-hidden">
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
          {err && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}
          {ok && <div className="rounded-lg border border-green-200 bg-green-50 text-green-700 px-3 py-2 text-sm">{ok}</div>}

          {/* Data/czas */}
          <label className="text-sm grid gap-1">
            <span className="text-gray-600">Data i czas partii</span>
            <input
              type="datetime-local"
              value={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          {/* Tryb */}
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                value="simple"
                checked={mode === "simple"}
                onChange={() => setMode("simple")}
              />
              <span className="text-sm">Mniej szczegółowo (bez małych punktów)</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                value="detailed"
                checked={mode === "detailed"}
                onChange={() => setMode("detailed")}
              />
              <span className="text-sm">Więcej szczegółów (małe punkty przegranych)</span>
            </label>
          </div>

          {/* Wybór zwycięzcy */}
          <label className="text-sm grid gap-1">
            <span className="text-gray-600">Zwycięzca</span>
            <select
              value={winnerId}
              onChange={(e) => {
                setWinnerId(e.target.value);
                // usuń z przegranych, jeśli był zaznaczony
                setLosersIds((arr) => arr.filter((id) => id !== e.target.value));
              }}
              className="rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">— wybierz —</option>
              {options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.imie} {p.nazwisko} (ELO {Math.round(p.ranking)})
                </option>
              ))}
            </select>
          </label>

          {/* Wybór przegranych */}
          <div>
            <div className="text-sm text-gray-600 mb-1">Przegrani (zaznacz 1–3)</div>
            <div className="rounded-lg border divide-y">
              {losersAvailable.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">Najpierw wybierz zwycięzcę.</div>
              ) : (
                losersAvailable.map((p) => {
                  const checked = losersIds.includes(p.id);
                  return (
                    <label key={p.id} className="flex items-center gap-3 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleLoser(p.id)}
                      />
                      <span className="flex-1">
                        {p.imie} {p.nazwisko} <span className="text-xs text-gray-500">ELO {Math.round(p.ranking)}</span>
                      </span>

                      {mode === "detailed" && checked && (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs text-gray-500">małe:</span>
                          <input
                            type="number"
                            step="1"
                            placeholder="-35"
                            className="w-24 rounded-md border px-2 py-1 text-sm"
                            value={losersSmall[p.id] ?? ""}
                            onChange={(e) =>
                              setLosersSmall((m) => ({ ...m, [p.id]: e.target.value }))
                            }
                          />
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={loading}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
              Zapisz partię i przelicz ELO
            </button>
            <button onClick={onClose} className="btn btn-ghost">
              Anuluj
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Główny panel admina (turnieje + modale)
   ============================================================ */
export default function AdminShell({ email, role }: { email: string; role: string }) {
  // Formularz dodawania
  const [nazwa, setNazwa] = useState("");
  const [gsheetUrl, setGsheetUrl] = useState("");
  const [arkuszNazwa, setArkuszNazwa] = useState("Gracze");
  const [kolumnaNazwisk, setKolumnaNazwisk] = useState("B");
  const [pierwszyWiersz, setPierwszyWiersz] = useState(2);
  const [dataTurnieju, setDataTurnieju] = useState<string>("");
  const [godzinaTurnieju, setGodzinaTurnieju] = useState<string>("");

  // mapa dla nowego turnieju
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

  // komunikaty
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // ładowanie listy z miękkim retry
  async function loadList(retry = 0) {
    setIsLoadingList(true);
    const { data, error } = await supabaseBrowser
      .from("turniej")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (retry < 1) {
        setTimeout(() => loadList(retry + 1), 500);
      } else {
        setErr(error.message);
        setIsLoadingList(false);
      }
      return;
    }

    if (Array.isArray(data) && data.length === 0 && retry < 1) {
      setTimeout(() => loadList(retry + 1), 400);
      return;
    }

    setList((data || []) as TurniejRow[]);
    setIsLoadingList(false);
  }
  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setNazwa(""); setGsheetUrl(""); setArkuszNazwa("Gracze");
    setKolumnaNazwisk("B"); setPierwszyWiersz(2);
    setDataTurnieju(""); setGodzinaTurnieju("");
    setLat(""); setLng("");
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

  function onChange<K extends keyof EditState>(key: K, val: string) {
    setEditRow((row) => ({ ...row, [key]: val }));
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
    if ("kolumna_nazwisk" in editRow) body.kolumna_nazwisk = (editRow.kolumna_nazwisk || "").toUpperCase().trim();
    if ("pierwszy_wiersz_z_nazwiskiem" in editRow)
      body.pierwszy_wiersz_z_nazwiskiem = Number(editRow.pierwszy_wiersz_z_nazwiskiem || 2);

    if ("data_turnieju" in editRow)
      body.data_turnieju = editRow.data_turnieju === "" ? null : editRow.data_turnieju;
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

  // ręczny przycisk do pełnego przeliczenia (gdy zmienisz K)
  async function recomputeAll() {
    setErr(null);
    setOk(null);
    const { error } = await supabaseBrowser.rpc("elo_recompute_all");
    if (error) setErr("Błąd przeliczania ELO: " + error.message);
    else setOk("Ranking przeliczony ✅");
  }

  const canSaveNew = nazwa.trim() && gsheetUrl.trim() && arkuszNazwa.trim() && kolumnaNazwisk.trim();

  return (
    <div className="grid gap-6">
      {/* Pasek szybkich akcji */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Szybkie akcje</h3>
          <button onClick={recomputeAll} className="btn btn-outline inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Przelicz ranking ELO
          </button>
        </div>
      </div>

      {/* Dodawanie turnieju */}
      <div className="card">
        <h3 className="font-semibold mb-4">Dodaj turniej</h3>

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
          <Field label="Godzina rozpoczęcia" type="time" value={godzinaTurnieju} onChange={setGodzinaTurnieju} />

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
      </div>

      {/* Lista turniejów */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Twoje turnieje</h3>
          {!isLoadingList ? (
            <span className="text-xs text-gray-500">Kliknij nazwę, aby edytować</span>
          ) : (
            <span className="text-xs text-gray-500 inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Ładuję...
            </span>
          )}
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

                const latPreview = editRow.id === t.id && editRow.lat !== undefined
                  ? (editRow.lat === "" ? null : Number(editRow.lat))
                  : t.lat;
                const lngPreview = editRow.id === t.id && editRow.lng !== undefined
                  ? (editRow.lng === "" ? null : Number(editRow.lng))
                  : t.lng;

                return (
                  <>
                    <tr
                      key={t.id}
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

                          {/* Akcje przy turnieju */}
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
                              <Field label="Nazwa" value={String(editRow.nazwa ?? "")} onChange={(v) => onChange("nazwa", v)} />
                              <Field label="Arkusz (nazwa karty)" value={String(editRow.arkusz_nazwa ?? "")} onChange={(v) => onChange("arkusz_nazwa", v)} />
                              <Field label="Kolumna z nazwiskami" value={String(editRow.kolumna_nazwisk ?? "")} onChange={(v) => onChange("kolumna_nazwisk", v.toUpperCase())} />
                              <Field label="Pierwszy wiersz z nazwiskiem" type="number" value={String(editRow.pierwszy_wiersz_z_nazwiskiem ?? "2")} onChange={(v) => onChange("pierwszy_wiersz_z_nazwiskiem", v)} />
                              <Field
                                label="Link do Google Sheets"
                                value={String(editRow.gsheet_url ?? "")}
                                onChange={(v) => setEditRow((s) => ({ ...s, gsheet_url: v, gsheet_id: extractIdFromUrl(v) || null }))}
                                className="md:col-span-2"
                              />
                              <Field label="Data turnieju" type="date" value={String(editRow.data_turnieju ?? "")} onChange={(v) => setEditRow((s) => ({ ...s, data_turnieju: v || null }))} />
                              <Field label="Godzina rozpoczęcia" type="time" value={String(editRow.godzina_turnieju ?? "")} onChange={(v) => setEditRow((s) => ({ ...s, godzina_turnieju: v || null }))} />

                              <div className="md:col-span-2">
                                <div className="flex flex-wrap items-center gap-3">
                                  <button type="button" className="btn btn-outline" onClick={(e) => { e.stopPropagation(); setPickerEditOpenId(t.id); }}>
                                    Ustaw miejsce
                                  </button>

                                  {(editRow.id === t.id ? (editRow.lat && editRow.lng) : (t.lat != null && t.lng != null)) ? (
                                    <span className="text-sm text-gray-700">
                                      Wybrano:{" "}
                                      <b>
                                        {(editRow.id === t.id && editRow.lat) ? Number(editRow.lat).toFixed(6) : (t.lat ?? 0).toFixed(6)}
                                        ,{" "}
                                        {(editRow.id === t.id && editRow.lng) ? Number(editRow.lng).toFixed(6) : (t.lng ?? 0).toFixed(6)}
                                      </b>
                                    </span>
                                  ) : (
                                    <span className="text-sm text-gray-500">Brak miejsca</span>
                                  )}

                                  {(editRow.lat || editRow.lng) && (
                                    <button type="button" className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); setEditRow((s) => ({ ...s, lat: "", lng: "" })); }}>
                                      Wyczyść
                                    </button>
                                  )}

                                  <div className="ml-auto flex gap-2">
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50"
                                      onClick={(e) => { e.stopPropagation(); setPlayersModalFor(t); }}
                                    >
                                      <Users className="w-4 h-4" />
                                      Lista grających
                                    </button>
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50"
                                      onClick={(e) => { e.stopPropagation(); setAddPartiaFor(t); }}
                                    >
                                      <Swords className="w-4 h-4" />
                                      Dodaj partię
                                    </button>
                                  </div>
                                </div>

                                <MapPicker
                                  open={pickerEditOpenId === t.id}
                                  initialLat={(editRow.lat && editRow.lat !== "") ? Number(editRow.lat) : (typeof t.lat === "number" ? t.lat : null)}
                                  initialLng={(editRow.lng && editRow.lng !== "") ? Number(editRow.lng) : (typeof t.lng === "number" ? t.lng : null)}
                                  onClose={() => setPickerEditOpenId(null)}
                                  onPick={(la, lo) => { setEditRow((s) => ({ ...s, lat: String(la), lng: String(lo) })); setPickerEditOpenId(null); }}
                                  title="Ustaw miejsce turnieju"
                                />
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button onClick={(e) => { e.stopPropagation(); saveEdit(t.id); }} className="btn btn-primary inline-flex items-center gap-2">
                                <Save className="w-4 h-4" /> Zapisz zmiany
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setExpandedId(null); }} className="btn btn-ghost inline-flex items-center gap-2">
                                <X className="w-4 h-4" /> Zamknij
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setConfirmDel(t.id); }} className="btn btn-danger inline-flex items-center gap-2 ml-auto">
                                <Trash2 className="w-4 h-4" /> Usuń
                              </button>
                            </div>

                            {confirmDel === t.id && (
                              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3">
                                Usunąć ten turniej? Tej operacji nie można cofnąć.
                                <div className="mt-2 flex gap-2">
                                  <button onClick={(e) => { e.stopPropagation(); doDelete(t.id); }} className="btn btn-danger">Usuń</button>
                                  <button onClick={(e) => { e.stopPropagation(); setConfirmDel(null); }} className="btn btn-ghost">Anuluj</button>
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
                  </>
                );
              })}
              {(!isLoadingList && list.length === 0) && (
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
        <AddPartiaModal
          open={!!addPartiaFor}
          onClose={() => setAddPartiaFor(null)}
          tournament={addPartiaFor}
          onSaved={() => {
            // po zapisie możesz np. zamknąć modal i odświeżyć coś jeszcze
          }}
        />
      )}
    </div>
  );
}

/* ===== Pomocnicze ===== */
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
