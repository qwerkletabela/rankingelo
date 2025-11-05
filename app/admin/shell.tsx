"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  ChevronDown, ChevronRight, Save, Trash2, X, MapPin, Users, Loader2, Plus
} from "lucide-react";
import MapPicker from "@/components/MapPicker";

type Role = "admin" | "user";

export default function AdminShell({ email, role }: { email: string; role: Role }) {
  return (
    <div className="grid gap-6">
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Zalogowano jako</div>
            <div className="font-semibold">{email}</div>
          </div>
          <NewTournamentButton />
        </div>
      </div>

      <AdminTournamentPanel />
    </div>
  );
}

/* ================== Modal „Nowy turniej” ================== */
function NewTournamentButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        + Nowy turniej
      </button>
      {open && <NewTournamentModal onClose={() => setOpen(false)} />}
    </>
  );
}

function Field({
  label, value, onChange, type = "text", className = "", placeholder, pattern
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
  className?: string; placeholder?: string; pattern?: string;
}) {
  return (
    <label className={`text-sm grid gap-1 ${className}`}>
      <span className="text-gray-600">{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} pattern={pattern}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
      />
    </label>
  );
}

function extractIdFromUrl(url: string): string | null {
  const m = url?.match?.(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

function NewTournamentModal({ onClose }: { onClose: () => void }) {
  const [nazwa, setNazwa] = useState("");
  const [gsheetUrl, setGsheetUrl] = useState("");
  const [arkuszNazwa, setArkuszNazwa] = useState("Gracze");
  const [kolumnaNazwisk, setKolumnaNazwisk] = useState("B");
  const [pierwszyWiersz, setPierwszyWiersz] = useState("2");
  const [dataTurnieju, setDataTurnieju] = useState("");
  const [godzinaTurnieju, setGodzinaTurnieju] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSave = nazwa.trim() && gsheetUrl.trim() && arkuszNazwa.trim() && kolumnaNazwisk.trim();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null); setLoading(true);

    const body: any = {
      nazwa,
      gsheet_url: gsheetUrl,
      gsheet_id: extractIdFromUrl(gsheetUrl),
      arkusz_nazwa: arkuszNazwa,
      kolumna_nazwisk: kolumnaNazwisk.toUpperCase(),
      pierwszy_wiersz_z_nazwiskiem: Number(pierwszyWiersz || "2"),
      data_turnieju: dataTurnieju || null,
      godzina_turnieju: godzinaTurnieju || null,
    };
    if (lat !== "") body.lat = Number(lat);
    if (lng !== "") body.lng = Number(lng);

    const res = await fetch("/api/turnieje", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) { setErr(j.error || "Błąd zapisu"); return; }
    setOk("Dodano turniej ✅");
    setTimeout(onClose, 700);
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl ring-1 ring-black/10 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Nowy turniej</div>
          <button className="btn btn-ghost" onClick={onClose}><X className="w-4 h-4" /> Zamknij</button>
        </div>

        <form onSubmit={save} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nazwa" value={nazwa} onChange={setNazwa} />
          <Field
            label="Link do Google Sheets" value={gsheetUrl} onChange={setGsheetUrl}
            className="md:col-span-2" placeholder="https://docs.google.com/spreadsheets/d/..."
          />
          <Field label="Nazwa arkusza (karta)" value={arkuszNazwa} onChange={setArkuszNazwa} />
          <Field label="Kolumna z nazwiskami" value={kolumnaNazwisk}
                 onChange={(v) => setKolumnaNazwisk(v.toUpperCase())} pattern="[A-Za-z]{1,3}" />
          <Field label="Pierwszy wiersz z nazwiskiem" value={pierwszyWiersz} onChange={setPierwszyWiersz} />
          <Field label="Data turnieju" type="date" value={dataTurnieju} onChange={setDataTurnieju} />
          <Field label="Godzina" type="time" value={godzinaTurnieju} onChange={setGodzinaTurnieju} />

          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <button type="button" className="btn btn-outline" onClick={() => setPickerOpen(true)}>
                Ustaw miejsce
              </button>
              {lat && lng ? (
                <span className="text-sm text-gray-700">
                  Wybrano: <b>{Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}</b>
                </span>
              ) : <span className="text-sm text-gray-500">Brak miejsca</span>}
              {(lat || lng) && (
                <button type="button" className="btn btn-ghost" onClick={() => { setLat(""); setLng(""); }}>
                  Wyczyść
                </button>
              )}
            </div>

            <MapPicker
              open={pickerOpen}
              initialLat={lat ? Number(lat) : null}
              initialLng={lng ? Number(lng) : null}
              onClose={() => setPickerOpen(false)}
              onPick={(la, lo) => { setLat(String(la)); setLng(String(lo)); setPickerOpen(false); }}
              title="Ustaw miejsce turnieju"
            />
          </div>

          <div className="md:col-span-2">
            {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
            {ok && <div className="text-green-700 text-sm mb-2">{ok}</div>}
            <button disabled={!canSave || loading} className="btn btn-primary">
              {loading ? "Zapisywanie…" : "Zapisz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ================== Lista turniejów ================== */
type TurniejRow = {
  id: string;
  nazwa: string;
  gsheet_url: string | null;
  gsheet_id: string | null;
  arkusz_nazwa: string | null;
  kolumna_nazwisk: string | null;
  pierwszy_wiersz_z_nazwiskiem: number | null;
  data_turnieju: string | null;
  godzina_turnieju: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

function toTimeInput(v?: string | null) { return v ? v.slice(0,5) : ""; }

function AdminTournamentPanel() {
  const [list, setList] = useState<TurniejRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<any>({});
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [pickerEditOpenId, setPickerEditOpenId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function loadList(retry = 0) {
    const { data, error } = await supabaseBrowser
      .from("turniej")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (retry < 1) setTimeout(() => loadList(retry + 1), 500);
      else setErr(error.message);
      return;
    }
    if (Array.isArray(data) && data.length === 0 && retry < 1) {
      setTimeout(() => loadList(retry + 1), 400);
      return;
    }
    setList((data || []) as TurniejRow[]);
  }
  useEffect(() => { loadList(); }, []);

  function toggleExpand(t: TurniejRow) {
    setErr(null); setOk(null); setConfirmDel(null);
    setExpandedId((curr) => (curr === t.id ? null : t.id));
    setEditRow({
      id: t.id,
      nazwa: t.nazwa,
      gsheet_url: t.gsheet_url ?? "",
      gsheet_id: t.gsheet_id ?? "",
      arkusz_nazwa: t.arkusz_nazwa ?? "",
      kolumna_nazwisk: t.kolumna_nazwisk ?? "",
      pierwszy_wiersz_z_nazwiskiem: String(t.pierwszy_wiersz_z_nazwiskiem ?? 2),
      data_turnieju: t.data_turnieju,
      godzina_turnieju: toTimeInput(t.godzina_turnieju),
      lat: t.lat == null ? "" : String(t.lat),
      lng: t.lng == null ? "" : String(t.lng),
    });
  }

  async function saveEdit(id: string) {
    setErr(null); setOk(null);
    const body: any = {};
    const s = editRow as any;
    if ("nazwa" in s) body.nazwa = (s.nazwa || "").trim();
    if ("gsheet_url" in s) body.gsheet_url = (s.gsheet_url || "").trim();
    if ("gsheet_id" in s) body.gsheet_id = s.gsheet_id || null;
    if (!body.gsheet_id && body.gsheet_url) {
      const m = body.gsheet_url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (m) body.gsheet_id = m[1];
    }
    if ("arkusz_nazwa" in s) body.arkusz_nazwa = (s.arkusz_nazwa || "").trim();
    if ("kolumna_nazwisk" in s) body.kolumna_nazwisk = (s.kolumna_nazwisk || "").toUpperCase().trim();
    if ("pierwszy_wiersz_z_nazwiskiem" in s)
      body.pierwszy_wiersz_z_nazwiskiem = Number(s.pierwszy_wiersz_z_nazwiskiem || 2);
    if ("data_turnieju" in s) body.data_turnieju = s.data_turnieju === "" ? null : s.data_turnieju;
    if ("godzina_turnieju" in s) body.godzina_turnieju = s.godzina_turnieju === "" ? null : s.godzina_turnieju;
    if ("lat" in s) body.lat = s.lat === "" ? "" : s.lat;
    if ("lng" in s) body.lng = s.lng === "" ? "" : s.lng;

    const res = await fetch(`/api/turnieje/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(j.error || "Błąd aktualizacji"); return; }
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

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Twoje turnieje</h3>
        <span className="text-xs text-gray-500">Kliknij nazwę, aby edytować</span>
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
                        {t.data_turnieju && <Chip>{t.data_turnieju}</Chip>}
                        {t.godzina_turnieju && <Chip>{toTimeInput(t.godzina_turnieju)}</Chip>}
                        {(hasGeo || (latPreview != null && lngPreview != null)) && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-600">
                            <MapPin className="w-3 h-3" />
                            {(latPreview ?? t.lat)?.toFixed(4)}, {(lngPreview ?? t.lng)?.toFixed(4)}
                          </span>
                        )}

                        {/* NOWY: Dodaj wyniki */}
                        <a
                          href={`/admin/wyniki/new?turniej_id=${t.id}`}
                          className="ml-2 inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          + Dodaj wyniki
                        </a>

                        {/* Lista grających (z arkusza → DB) */}
                        <button
                          type="button"
                          className="ml-2 inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                          onClick={(e) => { e.stopPropagation(); setPlayersModalFor(t); }}
                          title="Pokaż listę grających"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Lista grających
                        </button>
                      </span>
                    </td>
                  </tr>

                  {open && (
                    <tr className="border-t border-gray-100">
                      <td colSpan={2} className="p-0">
                        <div className="px-4 py-4 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Nazwa" value={String(editRow.nazwa ?? "")}
                                   onChange={(v) => setEditRow((s:any)=>({ ...s, nazwa:v }))} />
                            <Field label="Arkusz (karta)" value={String(editRow.arkusz_nazwa ?? "")}
                                   onChange={(v)=>setEditRow((s:any)=>({ ...s, arkusz_nazwa:v }))}/>
                            <Field label="Kolumna z nazwiskami" value={String(editRow.kolumna_nazwisk ?? "")}
                                   onChange={(v)=>setEditRow((s:any)=>({ ...s, kolumna_nazwisk:v.toUpperCase() }))}/>
                            <Field label="Pierwszy wiersz z nazwiskiem" value={String(editRow.pierwszy_wiersz_z_nazwiskiem ?? "2")}
                                   onChange={(v)=>setEditRow((s:any)=>({ ...s, pierwszy_wiersz_z_nazwiskiem:v }))}/>
                            <Field label="Link do Google Sheets" value={String(editRow.gsheet_url ?? "")}
                                   onChange={(v)=>setEditRow((s:any)=>({ ...s, gsheet_url:v }))} className="md:col-span-2"/>
                            <Field label="Data turnieju" type="date" value={String(editRow.data_turnieju ?? "")}
                                   onChange={(v)=>setEditRow((s:any)=>({ ...s, data_turnieju: v || null }))}/>
                            <Field label="Godzina rozpoczęcia" type="time" value={String(editRow.godzina_turnieju ?? "")}
                                   onChange={(v)=>setEditRow((s:any)=>({ ...s, godzina_turnieju: v || null }))}/>

                            <div className="md:col-span-2">
                              <div className="flex flex-wrap items-center gap-3">
                                <button type="button" className="btn btn-outline"
                                        onClick={(e) => { e.stopPropagation(); setPickerEditOpenId(t.id); }}>
                                  Ustaw miejsce
                                </button>

                                {latPreview != null && lngPreview != null ? (
                                  <span className="text-sm text-gray-700">
                                    Wybrano: <b>{latPreview.toFixed(6)}, {lngPreview.toFixed(6)}</b>
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-500">Brak miejsca</span>
                                )}

                                {(editRow.lat || editRow.lng) && (
                                  <button type="button" className="btn btn-ghost"
                                          onClick={(e)=>{ e.stopPropagation(); setEditRow((s:any)=>({ ...s, lat:"", lng:"" })); }}>
                                    Wyczyść
                                  </button>
                                )}
                              </div>

                              <MapPicker
                                open={pickerEditOpenId === t.id}
                                initialLat={(editRow.lat && editRow.lat !== "") ? Number(editRow.lat) : (typeof t.lat === "number" ? t.lat : null)}
                                initialLng={(editRow.lng && editRow.lng !== "") ? Number(editRow.lng) : (typeof t.lng === "number" ? t.lng : null)}
                                onClose={() => setPickerEditOpenId(null)}
                                onPick={(la, lo) => { setEditRow((s:any)=>({ ...s, lat:String(la), lng:String(lo) })); setPickerEditOpenId(null); }}
                                title="Ustaw miejsce turnieju"
                              />
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button onClick={(e) => { e.stopPropagation(); saveEdit(t.id); }}
                                    className="btn btn-primary inline-flex items-center gap-2">
                              <Save className="w-4 h-4" /> Zapisz zmiany
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}
                                    className="btn btn-ghost inline-flex items-center gap-2">
                              <X className="w-4 h-4" /> Zamknij
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setConfirmDel(t.id); }}
                                    className="btn btn-danger inline-flex items-center gap-2 ml-auto">
                              <Trash2 className="w-4 h-4" /> Usuń
                            </button>
                          </div>

                          {confirmDel === t.id && (
                            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3">
                              Usunąć ten turniej? Tej operacji nie można cofnąć.
                              <div className="mt-2 flex gap-2">
                                <button onClick={(e)=>{ e.stopPropagation(); doDelete(t.id); }} className="btn btn-danger">Usuń</button>
                                <button onClick={(e)=>{ e.stopPropagation(); setConfirmDel(null); }} className="btn btn-ghost">Anuluj</button>
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
          </tbody>
        </table>
      </div>

      {/* Modal „Lista grających” */}
      {playersModalFor && (
        <PlayersListModal
          open={!!playersModalFor}
          onClose={() => setPlayersModalFor(null)}
          tournament={playersModalFor}
        />
      )}
    </div>
  );
}

/* ====== Lista grających – ten sam modal co wcześniej ====== */
function norm(s: string) {
  return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-block rounded-full bg-gray-100 text-gray-700 text-[11px] px-2 py-0.5">{children}</span>;
}

type PlayersListRow = { name: string; exists: boolean };
function PlayersListModal({
  open, onClose, tournament,
}: { open: boolean; onClose: () => void; tournament: TurniejRow }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [rows, setRows] = useState<PlayersListRow[]>([]);
  const [addingIdx, setAddingIdx] = useState<number | null>(null);
  const [addingAll, setAddingAll] = useState(false);

  async function load() {
    setLoading(true); setErr(null); setOk(null); setRows([]);
    const resp = await fetch(`/api/turnieje/${tournament.id}/uczestnicy`);
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) { setErr(j.error || "Nie udało się pobrać listy"); setLoading(false); return; }

    const names: string[] = (j.names || []).map((x: string) => x?.toString().trim()).filter(Boolean).slice(0, 1000);
    if (names.length === 0) { setRows([]); setLoading(false); return; }

    const norms = Array.from(new Set(names.map(norm)));
    const { data: found, error } = await supabaseBrowser.from("gracz").select("fullname_norm").in("fullname_norm", norms);
    if (error) { setErr(error.message); setLoading(false); return; }
    const foundSet = new Set((found || []).map((g: any) => g.fullname_norm));
    setRows(names.map((name) => ({ name, exists: foundSet.has(norm(name)) })));
    setLoading(false);
  }
  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open, tournament.id]);

  async function addOne(i: number) {
    setErr(null); setOk(null); setAddingIdx(i);
    try {
      const fullname = rows[i].name;
      const res = await fetch("/api/gracze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullname }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Błąd dodawania gracza");
      setRows((r) => r.map((row, idx) => (idx === i ? { ...row, exists: true } : row)));
      setOk(`Dodano: ${fullname}`);
    } catch (e: any) { setErr(e.message || "Błąd dodawania"); }
    finally { setAddingIdx(null); }
  }
  async function addAllMissing() {
    setErr(null); setOk(null);
    const missing = rows.filter((r) => !r.exists).map((r) => r.name);
    if (!missing.length) return;
    setAddingAll(true);
    try {
      const res = await fetch("/api/gracze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullnames: missing }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Błąd dodawania brakujących");
      setRows((r) => r.map((row) => (row.exists ? row : { ...row, exists: true })));
      setOk(`Dodano ${missing.length} graczy.`);
    } catch (e: any) { setErr(e.message || "Błąd dodawania brakujących"); }
    finally { setAddingAll(false); }
  }

  if (!open) return null;
  const total = rows.length, yes = rows.filter((r) => r.exists).length, no = total - yes;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl ring-1 ring-black/10 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Lista grających</div>
            <div className="font-semibold">{tournament.nazwa}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />} Odśwież
            </button>
            <button onClick={onClose} className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50">
              <X className="w-4 h-4" /> Zamknij
            </button>
          </div>
        </div>

        <div className="p-4">
          {err && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}
          {ok && <div className="mb-3 rounded-lg border border-green-200 bg-green-50 text-green-700 px-3 py-2 text-sm">{ok}</div>}

          {loading ? (
            <div className="flex items-center gap-2 text-gray-600"><Loader2 className="w-4 h-4 animate-spin" /> Wczytywanie…</div>
          ) : total === 0 ? (
            <div className="text-sm text-gray-600">Brak nazwisk.</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-700">
                  W bazie: <b>{yes}</b> / {total} • Brak: <b className="text-red-700">{no}</b>
                </div>
                <button onClick={addAllMissing} disabled={addingAll || no === 0}
                        className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50 disabled:opacity-60">
                  {addingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Dodaj brakujących
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
                            <span className="text-green-700">W bazie</span>
                          ) : (
                            <span className="text-red-700">Brak w bazie</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {!r.exists && (
                            <button onClick={() => addOne(i)} disabled={addingIdx === i || addingAll}
                                    className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50 disabled:opacity-60">
                              {addingIdx === i ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Dodaj
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

// stan modalu gracze
const playersModalForState = { _val: null as TurniejRow | null };
function setPlayersModalFor(t: TurniejRow | null) { playersModalForState._val = t; }
function get playersModalFor() { return playersModalForState._val; }
