"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ChevronDown, ChevronRight, Save, Trash2, X, MapPin } from "lucide-react";

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
  pierwszy_wiersz_z_nazwiskiem?: string; // trzymamy w input jako string
  data_turnieju?: string | null;
  godzina_turnieju?: string | null;      // "HH:MM"
  lat?: string | null;                   // input
  lng?: string | null;                   // input
};

/* ===== Utils ===== */
function extractIdFromUrl(url: string): string | null {
  const m = url?.match?.(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}
function toTimeInput(v?: string | null) {
  if (!v) return "";
  return v.slice(0, 5); // "HH:MM:SS" -> "HH:MM"
}

/* ===== Komponent ===== */
export default function AdminTournamentPanel() {
  /* Formularz dodawania */
  const [nazwa, setNazwa] = useState("");
  const [gsheetUrl, setGsheetUrl] = useState("");
  const [arkuszNazwa, setArkuszNazwa] = useState("Gracze");
  const [kolumnaNazwisk, setKolumnaNazwisk] = useState("B");
  const [pierwszyWiersz, setPierwszyWiersz] = useState(2);
  const [dataTurnieju, setDataTurnieju] = useState<string>("");
  const [godzinaTurnieju, setGodzinaTurnieju] = useState<string>(""); // "HH:MM"
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");

  /* Lista + edycja */
  const [list, setList] = useState<TurniejRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<EditState>({});
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  /* Komunikaty */
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* Pobranie listy */
  async function loadList() {
    const { data, error } = await supabaseBrowser
      .from("turniej")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    else setList((data || []) as TurniejRow[]);
  }
  useEffect(() => {
    loadList();
  }, []);

  /* Dodawanie */
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
      godzina_turnieju: godzinaTurnieju || null, // "HH:MM"
    };

    // lat/lng: jeżeli puste => pomiń
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

  /* Rozwijanie/ustawienie edycji */
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
      lat: t.lat === null || typeof t.lat === "undefined" ? "" : String(t.lat),
      lng: t.lng === null || typeof t.lng === "undefined" ? "" : String(t.lng),
    });
  }

  function onChange<K extends keyof EditState>(key: K, val: string) {
    setEditRow((row) => ({ ...row, [key]: val }));
  }

  /* Zapis zmian */
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

    // data/godzina
    if ("data_turnieju" in editRow)
      body.data_turnieju = editRow.data_turnieju === "" ? null : editRow.data_turnieju;
    if ("godzina_turnieju" in editRow)
      body.godzina_turnieju = editRow.godzina_turnieju === "" ? null : editRow.godzina_turnieju;

    // lat/lng: "" -> null, inaczej string/number idzie do API (walidacja po stronie API)
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

  /* Usuwanie */
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

  const canSaveNew =
    nazwa.trim() && gsheetUrl.trim() && arkuszNazwa.trim() && kolumnaNazwisk.trim();

  return (
    <div className="grid gap-6">
      {/* ===== Dodawanie ===== */}
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
          <Field
            label="Data turnieju"
            type="date"
            value={dataTurnieju}
            onChange={setDataTurnieju}
          />
          <Field
            label="Godzina rozpoczęcia"
            type="time"
            value={godzinaTurnieju}
            onChange={setGodzinaTurnieju}
          />
          <Field
            label="Szerokość (lat)"
            type="number"
            value={lat}
            onChange={setLat}
            step="any"
            placeholder="52.2297"
          />
          <Field
            label="Długość (lng)"
            type="number"
            value={lng}
            onChange={setLng}
            step="any"
            placeholder="21.0122"
          />

          <div className="md:col-span-2">
            {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
            {ok && <div className="text-green-700 text-sm mb-2">{ok}</div>}
            <button disabled={!canSaveNew || loading} className="btn btn-primary">
              {loading ? "Zapisywanie..." : "Zapisz turniej"}
            </button>
          </div>
        </form>
      </div>

      {/* ===== Lista ===== */}
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
                const datePart = t.data_turnieju || null;
                const timePart = toTimeInput(t.godzina_turnieju);
                const hasGeo = typeof t.lat === "number" && typeof t.lng === "number";

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
                          {datePart && (
                            <Chip>{datePart}</Chip>
                          )}
                          {timePart && (
                            <Chip>{timePart}</Chip>
                          )}
                          {hasGeo && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-gray-600">
                              <MapPin className="w-3 h-3" />
                              {t.lat?.toFixed(4)}, {t.lng?.toFixed(4)}
                            </span>
                          )}
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
                                onChange={(v) => onChange("nazwa", v)}
                              />
                              <Field
                                label="Arkusz (nazwa karty)"
                                value={String(editRow.arkusz_nazwa ?? "")}
                                onChange={(v) => onChange("arkusz_nazwa", v)}
                              />
                              <Field
                                label="Kolumna z nazwiskami"
                                value={String(editRow.kolumna_nazwisk ?? "")}
                                onChange={(v) => onChange("kolumna_nazwisk", v.toUpperCase())}
                              />
                              <Field
                                label="Pierwszy wiersz z nazwiskiem"
                                type="number"
                                value={String(editRow.pierwszy_wiersz_z_nazwiskiem ?? "2")}
                                onChange={(v) => onChange("pierwszy_wiersz_z_nazwiskiem", v)}
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
                              <Field
                                label="Szerokość (lat)"
                                type="number"
                                value={String(editRow.lat ?? "")}
                                onChange={(v) => setEditRow((s) => ({ ...s, lat: v }))}
                                step="any"
                              />
                              <Field
                                label="Długość (lng)"
                                type="number"
                                value={String(editRow.lng ?? "")}
                                onChange={(v) => setEditRow((s) => ({ ...s, lng: v }))}
                                step="any"
                              />
                            </div>

                            {/* Akcje */}
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveEdit(t.id);
                                }}
                                className="btn btn-primary inline-flex items-center gap-2"
                              >
                                <Save className="w-4 h-4" />
                                Zapisz zmiany
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedId(null);
                                }}
                                className="btn btn-ghost inline-flex items-center gap-2"
                              >
                                <X className="w-4 h-4" />
                                Zamknij
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDel(t.id);
                                }}
                                className="btn btn-danger inline-flex items-center gap-2 ml-auto"
                              >
                                <Trash2 className="w-4 h-4" />
                                Usuń
                              </button>
                            </div>

                            {/* Potwierdzenie usunięcia */}
                            {confirmDel === t.id && (
                              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3">
                                Usunąć ten turniej? Tej operacji nie można cofnąć.
                                <div className="mt-2 flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      doDelete(t.id);
                                    }}
                                    className="btn btn-danger"
                                  >
                                    Usuń
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDel(null);
                                    }}
                                    className="btn btn-ghost"
                                  >
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
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ===== Małe pomocnicze komponenty ===== */
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
