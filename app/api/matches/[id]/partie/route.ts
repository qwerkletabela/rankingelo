// app/api/matches/[id]/partie/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

/** tylko admin */
async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { res: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: me } = await supabase.from("users").select("ranga").eq("id", user.id).maybeSingle();
  if (me?.ranga !== "admin") return { res: Response.json({ error: "Forbidden" }, { status: 403 }) };
  return { supabase };
}

/** sprawdź czy wszyscy gracze należą do stolika */
async function assertPlayersBelong(
  supabase: ReturnType<typeof createClient>,
  stolikId: string,
  playerIds: string[]
) {
  if (!playerIds.length) return;
  const { data } = await supabase
    .from("stolik_gracz")
    .select("gracz_id")
    .eq("stolik_id", stolikId);
  const set = new Set((data || []).map((r: any) => r.gracz_id));
  for (const id of playerIds) {
    if (!set.has(id)) {
      throw new Error("Gracz nie należy do tego stolika");
    }
  }
}

/**
 * BODY – tryb prosty:
 * { mode: "simple", winners: [{ nr, zwyciezca_gracz_id }, ...] }
 *
 * BODY – tryb szczegółowy (małe punkty):
 * {
 *   mode: "detailed",
 *   rounds: [
 *     {
 *       nr: number,
 *       winner_id: string,
 *       losers: [{ gracz_id: string, punkty: number /* ujemne */ }]
 *     }
 *   ]
 * }
 * Zasada: zwycięzca dostaje +sum(|ujemne|), przegrani mają punkty ujemne.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireAdmin();
  if ("res" in gate) return gate.res;
  const { supabase } = gate;

  const stolikId = params.id;
  const body = await req.json().catch(() => ({} as any));
  const mode = body?.mode;

  if (mode !== "simple" && mode !== "detailed") {
    return Response.json({ error: "Nieprawidłowy tryb (simple|detailed)" }, { status: 400 });
  }

  if (mode === "simple") {
    const winners = Array.isArray(body?.winners) ? body.winners : [];
    if (!winners.length) return Response.json({ error: "Brak danych zwycięzców" }, { status: 400 });

    await assertPlayersBelong(supabase, stolikId, winners.map((w: any) => w.zwyciezca_gracz_id));

    // upsert partii po (stolik_id,nr)
    for (const w of winners) {
      const nr = Number(w.nr);
      const zwyciezca = String(w.zwyciezca_gracz_id);
      if (!nr || !zwyciezca) continue;

      // upsert partia
      const { data: p } = await supabase
        .from("partia")
        .upsert(
          { stolik_id: stolikId, nr, zwyciezca_gracz_id: zwyciezca },
          { onConflict: "stolik_id,nr" }
        )
        .select("id")
        .maybeSingle();

      if (!p) continue;

      // małe punkty w trybie prostym: nie zapisujemy (same big points)
      await supabase.from("partia_wynik").delete().eq("partia_id", p.id);
    }

    return Response.json({ ok: true }, { status: 200 });
  }

  // detailed
  const rounds = Array.isArray(body?.rounds) ? body.rounds : [];
  if (!rounds.length) return Response.json({ error: "Brak danych partii" }, { status: 400 });

  // zbierz wszystkich graczy z rund (winner + losers) i sprawdź przynależność
  const allPlayers = new Set<string>();
  for (const r of rounds) {
    if (r?.winner_id) allPlayers.add(String(r.winner_id));
    for (const l of (r?.losers || [])) allPlayers.add(String(l.gracz_id));
  }
  await assertPlayersBelong(supabase, stolikId, Array.from(allPlayers));

  for (const r of rounds) {
    const nr = Number(r.nr);
    const winnerId = String(r.winner_id || "");
    const losers = Array.isArray(r.losers) ? r.losers : [];

    if (!nr || !winnerId) continue;

    // sumuj bezwzględne ujemne
    let sumAbs = 0;
    for (const l of losers) {
      const val = Number(l.punkty);
      if (!Number.isFinite(val) || val >= 0) {
        return Response.json({ error: `Partia ${nr}: małe punkty przegranych muszą być ujemne` }, { status: 400 });
      }
      sumAbs += Math.abs(val);
    }

    // upsert partia
    const { data: p, error: perr } = await supabase
      .from("partia")
      .upsert(
        { stolik_id: stolikId, nr, zwyciezca_gracz_id: winnerId },
        { onConflict: "stolik_id,nr" }
      )
      .select("id")
      .maybeSingle();

    if (perr || !p) return Response.json({ error: perr?.message || "Nie udało się zapisać partii" }, { status: 400 });

    // oczyść stare wiersze małych punktów
    await supabase.from("partia_wynik").delete().eq("partia_id", p.id);

    // wstaw wiersze losers (ujemne)
    if (losers.length) {
      const rows = losers.map((l: any) => ({
        partia_id: p.id,
        gracz_id: String(l.gracz_id),
        punkty_male: Number(l.punkty),
      }));
      const { error: werr } = await supabase.from("partia_wynik").insert(rows);
      if (werr) return Response.json({ error: werr.message }, { status: 400 });
    }

    // wstaw zwycięzcę (+sumAbs)
    const { error: werr2 } = await supabase.from("partia_wynik").insert({
      partia_id: p.id,
      gracz_id: winnerId,
      punkty_male: sumAbs,
    });
    if (werr2) return Response.json({ error: werr2.message }, { status: 400 });
  }

  return Response.json({ ok: true }, { status: 200 });
}
