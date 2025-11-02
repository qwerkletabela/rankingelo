import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { data: me } = await supabase.from("users").select("ranga").eq("id", user.id).maybeSingle();
    if (me?.ranga !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const turniejId = url.searchParams.get("turniej_id");
    const limit = Number(url.searchParams.get("limit") || 50);

    if (!turniejId) return Response.json({ error: "turniej_id required" }, { status: 400 });

    const { data: t, error } = await supabase
      .from("turniej")
      .select("*")
      .eq("id", turniejId)
      .maybeSingle();

    if (error || !t) return Response.json({ error: "Turniej nie znaleziony" }, { status: 404 });

    const email = process.env.GOOGLE_CLIENT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = t.gsheet_id || extractIdFromUrl(t.gsheet_url);
    if (!email || !key || !spreadsheetId) {
      return Response.json({ error: "Brak konfiguracji Google API lub ID arkusza" }, { status: 500 });
    }

    const auth = new google.auth.JWT(
      email,
      undefined,
      (key || "").replace(/\\n/g, "\n").replace(/\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    );
    const sheets = google.sheets({ version: "v4", auth });

    const col = String(t.kolumna_nazwisk).toUpperCase();
    const from = Number(t.pierwszy_wiersz_z_nazwiskiem || 2);
    const range = `${t.arkusz_nazwa}!${col}${from}:${col}`;

    const { data: sheetData } = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    let values: string[] = (sheetData.values || []).flat().map(v => (v ?? "").toString().trim()).filter(Boolean);
    if (limit && values.length > limit) values = values.slice(0, limit);

    return Response.json({ names: values }, { status: 200 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

function extractIdFromUrl(url: string): string | null {
  const m = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? (m[1] as string) : null;
}
