// app/api/matches/[id]/partie/route.ts
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

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireAdmin();
  if ("res" in gate) return gate.res;
  const { supabase } = gate;

  const b = await req.json().catch(() => ({} as any));
  const winners: Array<{ nr: number; zwyciezca_gracz_id: string }> = Array.isArray(b?.winners) ? b.winners : [];

  if (!winners.length) return Response.json({ error: "Brak danych" }, { status: 400 });

  // weryfikacja stołu i zakresu partii
  const { data: st } = await supabase.from("stolik").select("*").eq("id", params.id).maybeSingle();
  if (!st) return Response.json({ error: "Stół nie istnieje" }, { status: 404 });

  for (const w of winners) {
    if (!(w.nr >= 1 && w.nr <= st.liczba_partii) || !w.zwyciezca_gracz_id) {
      return Response.json({ error: "Nieprawidłowy numer partii lub zwycięzca" }, { status: 400 });
    }
  }

  // UPSERT (unique(stolik_id, nr))
  const rows = winners.map((w) => ({
    stolik_id: params.id,
    nr: w.nr,
    zwyciezca_gracz_id: w.zwyciezca_gracz_id,
  }));

  // Postgrest: brak natywnego UPSERT wielu -> spróbujemy insert i on conflict
  const { error } = await supabase.from("partia").upsert(rows, {
    onConflict: "stolik_id,nr",
    ignoreDuplicates: false,
  });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ ok: true }, { status: 200 });
}
