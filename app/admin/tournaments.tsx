"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Pencil,
  Save,
  X,
  Trash2,
} from "lucide-react";

type Turniej = {
  id: string;
  nazwa: string;
  gsheet_url: string;
  gsheet_id: string | null;
  arkusz_nazwa: string;
  kolumna_nazwisk: string;
  pierwszy_wiersz_z_nazwiskiem: number;
  created_at?: string;
};

function extractIdFromUrl(url: string): string | null {
  const m = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

export default function AdminTournamentPanel() {
  // formularz dodawania
  const [nazwa, setNazwa] = useState("");
  const [gsheetUrl, setGsheetUrl] = useState("");
  const [arkuszNazwa, setArkuszNazwa] = useState("Gracze");
  const [kolumnaNazwisk, setKolumnaNazwisk] = useState("B");
  const [pierwszyWiersz, setPierwszyWiersz] = useState(2);

  // lista + podgląd
  const [list, setList] = useState<Turniej[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewNames, setPreviewNames] = useState<string[]>([]);

  // edycja / kasowanie
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<Turniej>>({});
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  // statusy
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadList() {
    const { data, error } = await supabaseBrowser
      .from("turniej")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    else setList((data || []) as Turniej[]);
  }
  useEffect(() => {
    loadList();
  }, []);

  async function addTurniej(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setLoading(true);
    const gsheet_id = extractIdFromUrl(gsheetUrl);
    const res = await fetch("/api/turnieje", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nazwa,
        gsheet_url: gsheetUrl,
        gsheet_id,
        arkusz_nazwa: arkuszNazwa,
        kolumna_nazwisk: kolumnaNazwisk.toUpperCase(),
        pierwszy_wiersz_z_nazwiskiem: Number(pierwszyWiersz),
      }),
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
    await loadList();
  }

  function toggleExpand(id: string) {
    setPreviewNames([]);
    setErr(null);
    setOk(null);
    setExpandedId((curr) => (curr === id ? null : id));
    setEditingId(null);
    setEditRow({});
  }

  function startEdit(t: Turniej) {
    setEditingId(t.id);
    setEditRow({
      nazwa: t.nazwa,
      gsheet_url: t.gsheet_url,
      gsheet_id: t.gsheet_id,
      arkusz_nazwa: t.arkusz_nazwa,
      kolumna_nazwisk: t.kolumna_nazwisk,
      pierwszy_wiersz_z_nazwiskiem: t.pierwszy_wiersz_z_nazwiskiem,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditRow({});
  }

  async function saveEdit(id: string) {
    setErr(null);
    setOk(null);
    const body: any = { ...editRow };
    if (body.gsheet_url && !body.gsheet_id)
      body.gsheet_id = extractIdFromUrl(body.gsheet_url);
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
    setEditingId(null);
    setEditRow({});
    await loadList();
  }

  function askDelete(id: string) {
    setConfirmDel(id);
    setErr(null);
    setOk(null);
  }

  async function doDelete(id: string) {
    const res = await fetch(`/api/turnieje/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Nie udało się usunąć");
      return;
    }
    setOk("Usunięto.");
    setConfirmDel(null);
    if (expandedId === id) setExpandedId(null);
    await loadList();
  }

  async function preview(id: string) {
    setPreviewNames([]);
    const r = await fetch(`/api/sheets/preview?turniej_id=${id}&limit=50`, {
      cache: "no-store",
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(j.error || "Błąd podglądu arkusza");
      return;
    }
    setPreviewNames(j.names || []);
  }

  const canSaveNew =
    nazwa.trim() && gsheetUrl.trim() && arkuszNazwa.trim() && kolumnaNazwisk.trim();

  return (
    <div className="grid gap-6">
      {/* Dodawanie */}
      <div className="card">
        <h3 className="font-semibold mb-4">Dodaj turniej</h3>
        <form
          onSubmit={addTurniej}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Nazwa</div>
            <input
              value={nazwa}
              onChange={(e) => setNazwa(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="text-gray-600 mb-1">Link do Google Sheets</div>
            <input
              value={gsheetUrl}
              onChange={(e) => setGsheetUrl(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              required
            />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Nazwa arkusza (karta)</div>
            <input
              value={arkuszNazwa}
              onChange={(e) => setArkuszNazwa(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Kolumna z nazwiskami</div>
            <input
              value={kolumnaNazwisk}
              onChange={(e) =>
                setKolumnaNazwisk(e.target.value.toUpperCase())
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              pattern="[A-Za-z]{1,3}"
              required
            />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Pierwszy wiersz z nazwiskiem</div>
            <input
              type="number"
              min={1}
              value={pierwszyWiersz}
              onChange={(e) =>
                setPierwszyWiersz(parseInt(e.target.value || "1"))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </label>
          <div className="md:col-span-2">
            {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
            {ok && <div className="text-green-700 text-sm mb-2">{ok}</div>}
            <button disabled={!canSaveNew || loading} className="btn btn-primary">
              {loading ? "Zapisywanie..." : "Zapisz turniej"}
            </button>
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Twoje turnieje</h3>
          <span className="text-xs text-gray-500">
            Kliknij nazwę, aby rozwinąć szczegóły
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="table w-full">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="w-[48px]"></th>
                <th>Nazwa</th>
                <th className="hidden md:table-cell">Arkusz</th>
                <th className="hidden sm:table-cell">Kolumna</th>
                <th className="hidden sm:table-cell">Start</th>
                <th className="text-right pr-4">Podgląd</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => {
                const open = expandedId === t.id;
                const isEdit = editingId === t.id;

                return (
                  <>
                    {/* wiersz główny */}
                    <tr
                      key={t.id}
                      className={`border-t border-gray-100 hover:bg-brand-50/60 transition-colors cursor-pointer group`}
                      onClick={() => toggleExpand(t.id)}
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
                      </td>
                      <td className="py-2 pr-3 hidden md:table-cell">{t.arkusz_nazwa}</td>
                      <td className="py-2 pr-3 hidden sm:table-cell">{t.kolumna_nazwisk}</td>
                      <td className="py-2 pr-3 hidden sm:table-cell">{t.pierwszy_wiersz_z_nazwiskiem}</td>
                      <td className="py-2 pr-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(t.id);
                            preview(t.id);
                          }}
                          className="btn btn-outline text-sm inline-flex items-center gap-1"
                          title="Pokaż nazwiska"
                        >
                          <Eye className="w-4 h-4" />
                          Podgląd
                        </button>
                      </td>
                    </tr>

                    {/* wiersz rozwijany */}
                    {open && (
                      <tr className="border-t border-gray-100">
                        <td colSpan={6} className="p-0">
                          <div className="px-4 py-4 bg-white">
                            {/* Tryb odczyt/edycji */}
                            {!isEdit ? (
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <Info label="Arkusz" value={t.arkusz_nazwa} />
                                  <Info label="Kolumna" value={t.kolumna_nazwisk} />
                                  <Info label="Start" value={String(t.pierwszy_wiersz_z_nazwiskiem)} />
                                  <Info
                                    label="Link"
                                    value={
                                      <a
                                        className="underline"
                                        href={t.gsheet_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Otwórz arkusz
                                      </a>
                                    }
                                  />
                                </div>
                                <div className="flex gap-2 self-start">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEdit(t);
                                    }}
                                    className="btn btn-primary inline-flex items-center gap-2"
                                  >
                                    <Pencil className="w-4 h-4" />
                                    Edytuj
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      askDelete(t.id);
                                    }}
                                    className="btn btn-danger inline-flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Usuń
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="grid gap-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <Field
                                    label="Nazwa"
                                    value={editRow.nazwa ?? ""}
                                    onChange={(v) =>
                                      setEditRow((s) => ({ ...s, nazwa: v }))
                                    }
                                  />
                                  <Field
                                    label="Arkusz (nazwa karty)"
                                    value={editRow.arkusz_nazwa ?? ""}
                                    onChange={(v) =>
                                      setEditRow((s) => ({ ...s, arkusz_nazwa: v }))
                                    }
                                  />
                                  <Field
                                    label="Kolumna z nazwiskami"
                                    value={editRow.kolumna_nazwisk ?? ""}
                                    onChange={(v) =>
                                      setEditRow((s) => ({
                                        ...s,
                                        kolumna_nazwisk: v.toUpperCase(),
                                      }))
                                    }
                                  />
                                  <Field
                                    label="Pierwszy wiersz z nazwiskiem"
                                    type="number"
                                    value={String(
                                      editRow.pierwszy_wiersz_z_nazwiskiem ?? 2
                                    )}
                                    onChange={(v) =>
                                      setEditRow((s) => ({
                                        ...s,
                                        pierwszy_wiersz_z_nazwiskiem: Number(v || 2),
                                      }))
                                    }
                                  />
                                  <Field
                                    label="Link do Google Sheets"
                                    value={editRow.gsheet_url ?? ""}
                                    onChange={(v) =>
                                      setEditRow((s) => ({
                                        ...s,
                                        gsheet_url: v,
                                        gsheet_id: extractIdFromUrl(v) || null,
                                      }))
                                    }
                                  />
                                </div>
                                <div className="flex gap-2">
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
                                      cancelEdit();
                                    }}
                                    className="btn btn-ghost inline-flex items-center gap-2"
                                  >
                                    <X className="w-4 h-4" />
                                    Anuluj
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Podgląd nazwisk */}
                            {previewNames.length > 0 && expandedId === t.id && (
                              <div className="mt-4">
                                <h4 className="font-medium mb-2">
                                  Podgląd nazwisk (pierwsze 50)
                                </h4>
                                <ul className="list-disc list-inside text-sm grid sm:grid-cols-2 gap-x-8">
                                  {previewNames.map((n, i) => (
                                    <li key={i}>{n}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Potwierdzenie usunięcia */}
                            {confirmDel === t.id && (
                              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3">
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

        {(err || ok) && (
          <div className="mt-3">
            {err && <div className="text-red-600 text-sm">{err}</div>}
            {ok && <div className="text-green-700 text-sm">{ok}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

/* —————— drobne pomocnicze komponenty —————— */
function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="text-[11px] uppercase text-gray-500 tracking-wide">
        {label}
      </div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
}) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-gray-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2"
      />
    </label>
  );
}
