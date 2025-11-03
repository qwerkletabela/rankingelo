"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

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
  const [previewNames, setPreviewNames] = useState<string[]>([]);
  const [selectedTurniej, setSelectedTurniej] = useState<string | null>(null);

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
  useEffect(() => { loadList(); }, []);

  async function addTurniej(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null); setLoading(true);
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
    if (!res.ok) { setErr(j.error || "Błąd zapisu"); return; }
    setOk("Dodano turniej.");
    setNazwa(""); setGsheetUrl("");
    await loadList();
  }

  async function preview(id: string) {
    setSelectedTurniej(id);
    setPreviewNames([]); setErr(null);
    const r = await fetch(`/api/sheets/preview?turniej_id=${id}&limit=50`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || "Błąd podglądu arkusza"); return; }
    setPreviewNames(j.names || []);
  }

  // ====== Edycja ======
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
    setOk(null); setErr(null);
  }
  function cancelEdit() {
    setEditingId(null);
    setEditRow({});
  }
  async function saveEdit(id: string) {
    setErr(null); setOk(null);
    const body: any = { ...editRow };
    if (body.gsheet_url && !body.gsheet_id) body.gsheet_id = extractIdFromUrl(body.gsheet_url);
    const res = await fetch(`/api/turnieje/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(j.error || "Błąd aktualizacji"); return; }
    setOk("Zapisano zmiany.");
    setEditingId(null);
    setEditRow({});
    await loadList();
  }

  // ====== Usuwanie ======
  function askDelete(id: string) {
    setConfirmDel(id);
    setErr(null); setOk(null);
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
    await loadList();
  }

  const canSaveNew = nazwa.trim() && gsheetUrl.trim() && arkuszNazwa.trim() && kolumnaNazwisk.trim();

  return (
    <div className="grid gap-6">
      {/* Dodawanie */}
      <div className="card">
        <h3 className="font-semibold mb-4">Dodaj turniej</h3>
        <form onSubmit={addTurniej} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Nazwa</div>
            <input value={nazwa} onChange={(e)=>setNazwa(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2" required />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="text-gray-600 mb-1">Link do Google Sheets</div>
            <input value={gsheetUrl} onChange={(e)=>setGsheetUrl(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="https://docs.google.com/spreadsheets/d/..." required />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Nazwa arkusza (karta)</div>
            <input value={arkuszNazwa} onChange={(e)=>setArkuszNazwa(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2" required />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Kolumna z nazwiskami</div>
            <input value={kolumnaNazwisk} onChange={(e)=>setKolumnaNazwisk(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-gray-300 px-3 py-2" pattern="[A-Za-z]{1,3}" required />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Pierwszy wiersz z nazwiskiem</div>
            <input type="number" min={1} value={pierwszyWiersz}
              onChange={(e)=>setPierwszyWiersz(parseInt(e.target.value||"1"))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2" required />
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

      {/* Lista + akcje */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Twoje turnieje</h3>
          <span className="text-xs text-gray-500">Podgląd czyta nazwiska z arkusza</span>
        </div>

        <div className="overflow-auto">
          <table className="table min-w-[900px]">
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Arkusz</th>
                <th>Kolumna</th>
                <th>Start</th>
                <th>Link</th>
                <th className="text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => {
                const isEdit = editingId === t.id;
                return (
                  <tr key={t.id} className="border-t border-gray-100 align-top">
                    <td className="py-2 pr-3">
                      {isEdit ? (
                        <input
                          className="w-48 rounded-md border border-gray-300 px-2 py-1"
                          value={editRow.nazwa ?? ""}
                          onChange={(e) => setEditRow((s) => ({ ...s, nazwa: e.target.value }))}
                        />
                      ) : t.nazwa}
                    </td>
                    <td className="py-2 pr-3">
                      {isEdit ? (
                        <div className="grid gap-1">
                          <input
                            className="w-44 rounded-md border border-gray-300 px-2 py-1"
                            value={editRow.arkusz_nazwa ?? ""}
                            onChange={(e) => setEditRow((s) => ({ ...s, arkusz_nazwa: e.target.value }))}
                            placeholder="Nazwa karty"
                          />
                          <div className="text-[11px] text-gray-500">ID: {editRow.gsheet_id || t.gsheet_id || "—"}</div>
                        </div>
                      ) : (
                        <>{t.arkusz_nazwa}</>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {isEdit ? (
                        <input
                          className="w-20 rounded-md border border-gray-300 px-2 py-1"
                          value={editRow.kolumna_nazwisk ?? ""}
                          onChange={(e) => setEditRow((s) => ({ ...s, kolumna_nazwisk: e.target.value.toUpperCase() }))}
                          placeholder="B"
                        />
                      ) : t.kolumna_nazwisk}
                    </td>
                    <td className="py-2 pr-3">
                      {isEdit ? (
                        <input
                          type="number"
                          className="w-20 rounded-md border border-gray-300 px-2 py-1"
                          value={editRow.pierwszy_wiersz_z_nazwiskiem ?? 2}
                          onChange={(e) => setEditRow((s) => ({ ...s, pierwszy_wiersz_z_nazwiskiem: Number(e.target.value || 2) }))}
                        />
                      ) : t.pierwszy_wiersz_z_nazwiskiem}
                    </td>
                    <td className="py-2 pr-3">
                      {isEdit ? (
                        <input
                          className="w-[380px] rounded-md border border-gray-300 px-2 py-1"
                          value={editRow.gsheet_url ?? ""}
                          onChange={(e) =>
                            setEditRow((s) => ({
                              ...s,
                              gsheet_url: e.target.value,
                              gsheet_id: extractIdFromUrl(e.target.value) || null,
                            }))
                          }
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                        />
                      ) : (
                        <a className="underline text-sm" href={t.gsheet_url} target="_blank" rel="noreferrer">
                          Otwórz arkusz
                        </a>
                      )}
                    </td>
                    <td className="py-2 pr-0 text-right">
                      {isEdit ? (
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => saveEdit(t.id)} className="btn btn-primary text-sm px-3 py-1.5">Zapisz</button>
                          <button onClick={cancelEdit} className="btn btn-ghost text-sm px-3 py-1.5">Anuluj</button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => preview(t.id)} className="text-sm rounded-md bg-gray-900 text-white px-3 py-1.5">Podgląd</button>
                          <button onClick={() => startEdit(t)} className="text-sm rounded-md bg-white border px-3 py-1.5">Edytuj</button>
                          <button onClick={() => askDelete(t.id)} className="text-sm rounded-md bg-red-600 text-white px-3 py-1.5">Usuń</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Podgląd nazwisk */}
        {selectedTurniej && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Podgląd nazwisk (pierwsze 50)</h4>
            {previewNames.length === 0 ? (
              <div className="text-sm text-gray-500">Brak danych albo błąd dostępu do arkusza.</div>
            ) : (
              <ul className="list-disc list-inside text-sm">
                {previewNames.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            )}
          </div>
        )}

        {/* Potwierdzenie usunięcia */}
        {confirmDel && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3">
            Usunąć ten turniej? Tej operacji nie można cofnąć.
            <div className="mt-2 flex gap-2">
              <button onClick={() => doDelete(confirmDel)} className="btn btn-primary bg-red-600 hover:bg-red-700">Usuń</button>
              <button onClick={() => setConfirmDel(null)} className="btn btn-ghost">Anuluj</button>
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
    </div>
  );
}
