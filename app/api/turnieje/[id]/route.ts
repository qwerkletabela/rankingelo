// app/api/turnieje/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

function extractIdFromUrl(u: string): string | null {
  const m = u?.match?.(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

/** Zwraca {res} jeśli brak uprawnień, albo {supabase} gdy OK */
async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { res: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: me } = await supabase
    .from("users")
    .select("ranga")
    .eq("id", user.id)
    .maybeSingle();

  if (me?.ranga !== "admin") {
    return { res: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const gate = await requireAdmin();
  if ("res" in gate) return gate.res;
  const { supabase } = gate;

  const { data, error } = await supabase
    .from("turniej")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data }, { status: 200 });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireAdmin();
  if ("res" in gate) return gate.res;
  const { supabase } = gate;

  const body = await req.json().catch(() => ({} as any));
  const payload: Record<string, any> = {};

  if (typeof body.nazwa === "string") payload.nazwa = body.nazwa.trim();
  if (typeof body.gsheet_url === "string") payload.gsheet_url = body.gsheet_url.trim();
  if (typeof body.gsheet_id === "string" || body.gsheet_id === null) {
    payload.gsheet_id = body.gsheet_id ?? null;
  }
  if (!payload.gsheet_id && payload.gsheet_url) {
    payload.gsheet_id = extractIdFromUrl(payload.gsheet_url);
  }
  if (typeof body.arkusz_nazwa === "string") payload.arkusz_nazwa = body.arkusz_nazwa.trim();
  if (typeof body.kolumna_nazwisk === "string") payload.kolumna_nazwisk = body.kolumna_nazwisk.toUpperCase().trim();
  if (typeof body.pierwszy_wiersz_z_nazwiskiem !== "undefined") {
    payload.pierwszy_wiersz_z_nazwiskiem = Number(body.pierwszy_wiersz_z_nazwiskiem || 2);
  }

  if (Object.keys(payload).length === 0) {
    return Response.json({ error: "Nic do zaktualizowania" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("turniej")
    .update(payload)
    .eq("id", params.id)
    .select("*")
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data }, { status: 200 });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const gate = await requireAdmin();
  if ("res" in gate) return gate.res;
  const { supabase } = gate;

  const { error } = await supabase.from("turniej").delete().eq("id", params.id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return new Response(null, { status: 204 });
}
