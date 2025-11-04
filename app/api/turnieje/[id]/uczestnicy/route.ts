// app/api/turnieje/[id]/uczestnicy/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

function extractIdFromUrl(u: string): string | null {
  const m = u?.match?.(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

// proste czyszczenie CSV (1 kolumna)
function parseCsvSingleCol(csv: string): string[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // usuwamy otaczające cudzysłowy
    const val = trimmed.replace(/^"(.*)"$/, "$1").trim();
    if (val) out.push(val);
  }
  return out;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  // pobierz konfigurację turnieju
  const { data: t, error } = await supabase
    .from("turniej")
    .select("gsheet_url, gsheet_id, arkusz_nazwa, kolumna_nazwisk, pierwszy_wiersz_z_nazwiskiem")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!t) return Response.json({ error: "Turniej nie istnieje" }, { status: 404 });

  const sheetId = t.gsheet_id || extractIdFromUrl(t.gsheet_url || "");
  if (!sheetId) {
    return Response.json({ error: "Brak ID pliku Google Sheets" }, { status: 400 });
  }

  const sheetName = t.arkusz_nazwa;
  const col = String(t.kolumna_nazwisk || "A").toUpperCase();
  const start = Number(t.pierwszy_wiersz_z_nazwiskiem || 2);

  // GViz CSV: pozwala wskazać sheet po nazwie i range w notacji A1
  // Przykład: .../gviz/tq?tqx=out:csv&sheet=Gracze&range=B2:B
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`;
  const paramsQS = new URLSearchParams({
    tqx: "out:csv",
    sheet: sheetName,
    range: `${col}${start}:${col}`,
  });

  // pobieramy CSV po stronie serwera (brak problemów z CORS)
  const url = `${base}?${paramsQS.toString()}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    return Response.json(
      {
        error:
          "Nie udało się pobrać arkusza. Upewnij się, że plik ma udostępnianie „każdy z linkiem (viewer)” i że nazwa karty/kolumna są poprawne.",
        status: resp.status,
      },
      { status: 502 }
    );
  }

  const text = await resp.text();
  const names = parseCsvSingleCol(text)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 500); // safety limit

  return Response.json({ names }, { status: 200 });
}
