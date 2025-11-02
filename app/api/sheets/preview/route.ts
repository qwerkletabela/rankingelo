// app/api/sheets/preview/route.ts
export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

// Czyta listę nazwisk z publicznego CSV (gviz) na podstawie rekordu "turniej"
export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: me } = await supabase.from("users").select("ranga").eq("id", user.id).maybeSingle();
    if (me?.ranga !== "admin") return json({ error: "Forbidden" }, 403);

    const url = new URL(req.url);
    const turniejId = url.searchParams.get("turniej_id");
    const limit = Number(url.searchParams.get("limit") || 50);
    if (!turniejId) return json({ error: "turniej_id required" }, 400);

    const { data: t, error: tErr } = await supabase
      .from("turniej")
      .select("*")
      .eq("id", turniejId)
      .maybeSingle();

    if (tErr) return json({ error: `turniej select: ${tErr.message}` }, 500);
    if (!t) return json({ error: "Turniej nie znaleziony" }, 404);

    const sheetId = extractSheetId(t.gsheet_url);
    if (!sheetId) return json({ error: "Nieprawidłowy link do arkusza (brak /spreadsheets/d/{ID})" }, 400);

    const gid = extractGid(t.gsheet_url); // opcjonalny
    const col = String(t.kolumna_nazwisk).toUpperCase();
    const from = Number(t.pierwszy_wiersz_z_nazwiskiem || 2);
    const range = `${col}${from}:${col}`;

    // Budujemy publiczny CSV URL przez gviz (bez OAuth, bez kluczy)
    // Preferujemy nazwę arkusza, ale gdyby była nietypowa – użyjemy gid.
    const params = new URLSearchParams({ tqx: "out:csv", range });
    if (t.arkusz_nazwa) params.set("sheet", t.arkusz_nazwa);
    else if (gid) params.set("gid", gid);

    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?${params.toString()}`;

    // Serwerowy fetch omija CORS przeglądarki
    const res = await fetch(csvUrl, { method: "GET", headers: { "Cache-Control": "no-cache" } });

    if (!res.ok) {
      // Typowe przyczyny: arkusz nie jest publiczny dla "każdy z linkiem"
      // albo nazwa karty/zakres są błędne.
      const txt = await res.text();
      return json(
        { error: `Google zwróciło ${res.status}. Upewnij się, że arkusz jest publiczny (Anyone with the link) lub opublikowany.`, details: txt.slice(0, 500) },
        502
      );
    }

    const csv = await res.text();
    const names = parseCsvSingleColumn(csv).filter(Boolean).slice(0, limit);

    return json({
      names,
      meta: {
        sheetId,
        arkusz_nazwa: t.arkusz_nazwa || null,
        range,
        used: t.arkusz_nazwa ? "sheet+range" : (gid ? "gid+range" : "range-only"),
        url: csvUrl
      }
    }, 200, { "Cache-Control": "no-store" });

  } catch (e: any) {
    return json({ error: e?.message || "Unknown error" }, 500);
  }
}

function extractSheetId(u: string): string | null {
  const m = u.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}
function extractGid(u: string): string | null {
  const m = u.match(/[#&?]gid=(\d+)/);
  return m ? m[1] : null;
}

// Bardzo prosty parser CSV (jedna kolumna), uwzględnia cudzysłowy i \n
function parseCsvSingleColumn(csv: string): string[] {
  // Najpierw rozbij po liniach, potem zdejmij cudzysłowy i escape'y.
  return csv
    .split(/\r?\n/)
    .map(l => l.trim())
    .map(l => {
      if (!l) return "";
      if (l.startsWith('"') && l.endsWith('"')) {
        // unescape podwójnych cudzysłowów CSV
        return l.slice(1, -1).replace(/""/g, '"').trim();
      }
      return l;
    });
}

function json(body: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
