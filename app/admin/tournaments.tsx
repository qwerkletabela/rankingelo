"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Turniej = {
  id: string;
  nazwa: string;
  gsheet_url: string;
  gsheet_id: string | null;
  arkusz_nazwa: string;
  kolumna_nazwisk: string;
  pierwszy_wiersz_z_nazwiskiem: number;
};

function extractIdFromUrl(url: string): string | null {
  const m = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

export default function AdminTournamentPanel() {
  const [nazwa, setNazwa] = useState("");
  const [gsheetUrl, setGsheetUrl] = useState("");
  const [arkuszNazwa, setArkuszNazwa] = useState("Gracze");
  const [kolumnaNazwisk, setKolumnaNazwisk] = useState("B");
  const [pierwszyWiersz, setPierwszyWiersz] = useState(2);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<Turniej[]>([]);
  const [previewNames, setPreviewNames] = useState<string[]>([]);
  const [selectedTurniej, setSelectedTurniej] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ range?: string; arkusz_nazwa?: string; source?: string } | null>(null);
  
  async function loadList() {
    const { data, error } = await supabaseBrowser.from("turniej").select("*").order("created_at", { ascending: false });
    if (!error && data) setList(data as any);
  }
  useEffect(() => { loadList(); }, []);

  async function addTurniej(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const gsheetId = extractIdFromUrl(gsheetUrl);
    const res = await fetch("/api/turnieje", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nazwa,
        gsheet_url: gsheetUrl,
        gsheet_id: gsheetId,
        arkusz_nazwa: arkuszNazwa,
        kolumna_nazwisk: kolumnaNazwisk.toUpperCase(),
        pierwszy_wiersz_z_nazwiskiem: Number(pierwszyWiersz)
      })
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(()=>({}));
      setErr(j.error || "Błąd zapisu");
    } else {
      setNazwa("");
      setGsheetUrl("");
      await loadList();
    }
  }

  async function preview(id: string) {
  setSelectedTurniej(id);
  setPreviewNames([]);
  setMeta(null);
  setErr(null);

  const r = await fetch(`/api/sheets/preview?turniej_id=${id}&limit=50`, {
    cache: "no-store",           // <- wyłącz cache po stronie klienta
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    setErr(j.error || "Błąd podglądu arkusza");
    return;
  }
  setPreviewNames(j.names || []);
  setMeta(j.meta || null);        // <- pokażemy zakres z DB
}

  const canSave = nazwa.trim() && gsheetUrl.trim() && arkuszNazwa.trim() && kolumnaNazwisk.trim();

  return (
    <div className="grid gap-6">
      <div className="card">
        <h3 className="font-semibold mb-4">Dodaj turniej</h3>
        <form onSubmit={addTurniej} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Nazwa</div>
            <input value={nazwa} onChange={(e)=>setNazwa(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" required />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="text-gray-600 mb-1">Link do Google Sheets</div>
            <input value={gsheetUrl} onChange={(e)=>setGsheetUrl(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="https://docs.google.com/spreadsheets/d/..." required />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Nazwa arkusza (karta)</div>
            <input value={arkuszNazwa} onChange={(e)=>setArkuszNazwa(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" required />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Kolumna z nazwiskami (np. B)</div>
            <input value={kolumnaNazwisk} onChange={(e)=>setKolumnaNazwisk(e.target.value.toUpperCase())} className="w-full rounded-lg border border-gray-300 px-3 py-2" pattern="[A-Za-z]{1,3}" required />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Pierwszy wiersz z nazwiskiem</div>
            <input type="number" value={pierwszyWiersz} min={1} onChange={(e)=>setPierwszyWiersz(parseInt(e.target.value||"1"))} className="w-full rounded-lg border border-gray-300 px-3 py-2" required />
          </label>
          <div className="md:col-span-2">
            {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
            <button disabled={!canSave || loading} className="rounded-lg bg-black text-white px-4 py-2">
              {loading ? "Zapisywanie..." : "Zapisz turniej"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Twoje turnieje</h3>
          <span className="text-xs text-gray-500">Kliknij „Podgląd” by odczytać nazwiska z Arkusza</span>
        </div>
        <div className="overflow-auto">
          <table className="table min-w-[720px]">
            <thead><tr><th>Nazwa</th><th>Arkusz</th><th>Kolumna</th><th>Pierwszy wiersz</th><th></th></tr></thead>
            <tbody>
              {list.map(t => (
                <tr key={t.id} className="border-t border-gray-100">
                  <td className="py-2 pr-4">{t.nazwa}</td>
                  <td className="py-2 pr-4">{t.arkusz_nazwa}</td>
                  <td className="py-2 pr-4">{t.kolumna_nazwisk}</td>
                  <td className="py-2 pr-4">{t.pierwszy_wiersz_z_nazwiskiem}</td>
                  <td className="py-2 pr-4">
                    <button onClick={()=>preview(t.id)} className="text-sm rounded-md bg-gray-900 text-white px-3 py-1.5">Podgląd</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedTurniej && (
  <div className="mt-4">
    <h4 className="font-medium mb-2">Podgląd nazwisk (pierwsze 50)</h4>

    {/* Meta źródła – wprost z DB */}
    {meta && (
      <div className="text-xs text-gray-600 mb-2">
        Źródło: <code>{meta.source}</code> · Arkusz: <code>{meta.arkusz_nazwa}</code> · Zakres: <code>{meta.range}</code>
      </div>
    )}

    {previewNames.length === 0 ? (
      <div className="text-sm text-gray-500">Brak danych albo błąd dostępu do arkusza.</div>
    ) : (
      <ul className="list-disc list-inside text-sm">
        {previewNames.map((n, i) => <li key={i}>{n}</li>)}
      </ul>
    )}
    {err && <div className="text-red-600 text-sm mt-2">{err}</div>}
  </div>
)}
      </div>
    </div>
  );
}
