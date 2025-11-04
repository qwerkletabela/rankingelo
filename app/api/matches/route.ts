// app/api/matches/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { res: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: me } = await supabase.from("users").select("ranga").eq("id", user.id).maybeSingle();
  if (me?.ranga !== "admin") return { res: Response.json({ error: "Forbidden" }, { status: 403 }) };
  return { supabase, user };
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("res" in gate) return gate.res;
  const { supabase, user } = gate;

  const b = await req.json().catch(() => ({} as any));
  const turniej_id = String(b.turniej_id || "");
  const liczba_graczy = Number(b.liczba_graczy || 0);
  const liczba_partii = Number(b.liczba_partii || 0);
  const players: string[] = Array.isArray(b.players) ? b.players : [];

  if (!turniej_id || !(liczba_graczy >= 2 && liczba_graczy <= 4) || !(liczba_partii >= 1 && liczba_partii <= 5))
    return Response.json({ error: "Brak lub złe parametry" }, { status: 400 });
  if (players.length !== liczba_graczy)
    return Response.json({ error: "Liczba graczy niezgodna z wybranym ustawieniem" }, { status: 400 });

  // utwórz stolik
  const { data: st, error: e1 } = await supabase
    .from("stolik")
    .insert({
      turniej_id,
      liczba_graczy,
      liczba_partii,
      created_by: user.id,
    })
    .select("*")
    .maybeSingle();

  if (e1 || !st) return Response.json({ error: e1?.message || "Błąd tworzenia stołu" }, { status: 400 });

  // dodaj uczestników w kolejności
  const rows = players.map((pid: string, i: number) => ({
    stolik_id: st.id,
    gracz_id: pid,
    pozycja: i + 1,
  }));
  const { error: e2 } = await supabase.from("stolik_gracz").insert(rows);
  if (e2) return Response.json({ error: e2.message }, { status: 400 });

  return Response.json({ data: { stolik_id: st.id } }, { status: 201 });
}
