// app/api/turnieje/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { res: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: me } = await supabase.from("users").select("ranga").eq("id", user.id).maybeSingle();
  if (me?.ranga !== "admin") return { res: Response.json({ error: "Forbidden" }, { status: 403 }) };
  return { supabase };
}

function extractIdFromUrl(u: string): string | null {
  const m = u?.match?.(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

function normalizeTime(t: string): string | null {
  // Akceptuj "HH:MM" lub "HH:MM:SS"; zwróć "HH:MM:SS"
  const v = (t ?? "").trim();
  if (!v) return null;
  if (/^\d{2}:\d{2}$/.test(v)) return v + ":00";
  if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v;
  return null;
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("res" in gate) return gate.res;
  const { supabase } = gate;

  const b = await req.json().catch(() => ({} as any));
  const payload: any = {
    nazwa: String(b.nazwa || "").trim(),
    gsheet_url: String(b.gsheet_url || "").trim(),
    gsheet_id: b.gsheet_id ?? extractIdFromUrl(String(b.gsheet_url || "")),
    arkusz_nazwa: String(b.arkusz_nazwa || "").trim(),
    kolumna_nazwisk: String(b.kolumna_nazwisk || "").toUpperCase().trim(),
    pierwszy_wiersz_z_nazwiskiem: Number(b.pierwszy_wiersz_z_nazwiskiem || 2),
  };

  // data (YYYY-MM-DD) opcjonalna
  if (typeof b.data_turnieju !== "undefined") {
    const v = (b.data_turnieju ?? "").toString().trim();
    if (v === "") payload.data_turnieju = null;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(v)) payload.data_turnieju = v;
    else return Response.json({ error: "Nieprawidłowa data (YYYY-MM-DD)" }, { status: 400 });
  }

  // godzina (HH:MM lub HH:MM:SS) opcjonalna
  if (typeof b.godzina_turnieju !== "undefined") {
    const norm = normalizeTime(String(b.godzina_turnieju));
    if (norm === null && String(b.godzina_turnieju).trim() !== "") {
      return Response.json({ error: "Nieprawidłowa godzina (HH:MM lub HH:MM:SS)" }, { status: 400 });
    }
    payload.godzina_turnieju = norm; // null lub "HH:MM:SS"
  }

  if (!payload.nazwa || !payload.gsheet_url || !payload.arkusz_nazwa || !payload.kolumna_nazwisk) {
    return Response.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }

  const { data, error } = await supabase.from("turniej").insert(payload).select("*").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data }, { status: 201 });
}
