// app/api/turnieje/[id]/uczestnicy/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

function columnToA1(col: string) {
  return col.toUpperCase();
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  // Bez requireAdmin — to jest tylko odczyt publicznego arkusza
  const supabase = createClient();

  const { data: t, error } = await supabase
    .from("turniej")
    .select("gsheet_url, gsheet_id, arkusz_nazwa, kolumna_nazwisk, pierwszy_wiersz_z_nazwiskiem")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  if (!t) {
    return Response.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const fileId =
    t.gsheet_id ||
    (t.gsheet_url?.match?.(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] ?? null);

  if (!fileId) {
    return Response.json({ error: "Brak ID arkusza" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  // Prosty odczyt CSV z publicznie udostępnionego arkusza (dla osób z linkiem)
  // Uwaga: CORS bywa kapryśny — robimy to na serwerze (API route), więc jest OK.
  const sheetName = encodeURIComponent(t.arkusz_nazwa);
  const col = columnToA1(t.kolumna_nazwisk || "A");
  const startRow = t.pierwszy_wiersz_z_nazwiskiem || 2;

  const url =
    `https://docs.google.com/spreadsheets/d/${fileId}/gviz/tq?tqx=out:csv&sheet=${sheetName}&range=${col}${startRow}:${col}`;

  let names: string[] = [];
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return Response.json({ error: `Google Sheets HTTP ${res.status}` }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    const csv = await res.text();
    names = csv
      .split(/\r?\n/)
      .map((s) => s.replace(/^"|"$/g, "").trim())
      .filter(Boolean);
  } catch (e: any) {
    return Response.json({ error: e?.message || "Błąd pobierania arkusza" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  return Response.json({ names }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
