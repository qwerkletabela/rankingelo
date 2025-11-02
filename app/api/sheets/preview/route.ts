// app/api/sheets/preview/route.ts
export const runtime = "nodejs";         // googleapis wymaga Node
export const revalidate = 0;             // bez ISR
export const dynamic = "force-dynamic";  // wyłącz cache na Vercel

import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";

export async function GET(req: Request) {
  try {
    const supabase = createClient();

    // autoryzacja: tylko admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: me, error: meErr } = await supabase
      .from("users").select("ranga").eq("id", user.id).maybeSingle();
    if (meErr) return json({ error: `users select: ${meErr.message}` }, 500);
    if (me?.ranga !== "admin") return json({ error: "Forbidden" }, 403);

    // parametry
    const url = new URL(req.url);
    const turniejId = url.searchParams.get("turniej_id");
    const limit = Number(url.searchParams.get("limit") || 50);
    if (!turniejId) return json({ error: "turniej_id required" }, 400);

    // === KLUCZOWE: czytamy KONFIG z DB ===
    const { data: t, error: tErr } = await supabase
      .from("turniej")
      .select("*")
      .eq("id", turniejId)
      .maybeSingle();

    if (tErr) return json({ error: `turniej select: ${tErr.message}` }, 500);
    if (!t) return json({ error: "Turniej nie znaleziony" }, 404);

    const spreadsheetId = t.gsheet_id || extractIdFromUrl(t.gsheet_url);
    const col = String(t.kolumna_nazwisk).toUpperCase();
    const from = Number(t.pierwszy_wiersz_z_nazwiskiem || 2);
    const range = `${t.arkusz_nazwa}!${col}${from}:${col}`;

    // Google Auth (env muszą być ustawione na Vercel)
    const email = process.env.GOOGLE_CLIENT_EMAIL;
    let key = process.env.GOOGLE_PRIVATE_KEY || "";
    if (!email || !key || !spreadsheetId) {
      return json({ error: "Brak GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY lub gsheet_id" }, 500);
    }
    key = key.replace(/\\n/g, "\n");

    const auth = new google.auth.JWT(email, undefined, key, [
      "https://www.googleapis.com/auth/spreadsheets.readonly",
    ]);
    const sheets = google.sheets({ version: "v4", auth });

    const { data: sheetData } = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    let names: string[] =
      (sheetData.values || [])
        .flat()
        .map((v) => String(v).trim())
        .filter(Boolean);

    if (limit && names.length > limit) names = names.slice(0, limit);

    // Zwracamy TYLKO podgląd + meta (żadnego zapisu do DB)
    return json(
      {
        names,
        meta: {
          spreadsheetId,
          arkusz_nazwa: t.arkusz_nazwa,
          range,                // np. "Gracze!B2:B"
          kolumna: col,
          start: from,
          source: "db",
        },
      },
      200,
      { "Cache-Control": "no-store" }
    );
  } catch (e: any) {
    return json({ error: e?.message || "Unknown error" }, 500);
  }
}

function extractIdFromUrl(url: string): string | null {
  const m = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

// pomocniczy Response.json z nagłówkami
function json(body: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
