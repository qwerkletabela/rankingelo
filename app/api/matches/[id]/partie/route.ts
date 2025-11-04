// app/api/matches/[id]/partie/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

/**
 * Payloady:
 *
 * SIMPLE
 * {
 *   mode: "simple",
 *   winners: [
 *     { nr: number, zwyciezca_gracz_id: string }
 *   ]
 * }
 *
 * DETAILED
 * {
 *   mode: "detailed",
 *   rounds: [
 *     {
 *       nr: number,
 *       winner_id: string,
 *       // losers: tablica obiektów { gracz_id: string, punkty: number } gdzie punkty są ujemne
 *       losers: [{ gracz_id: string, punkty: number }]
 *     }
 *   ]
 * }
 */

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { res: Response.json({ error: "Unauthorized" }, { status: 401 }) };

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

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireAdmin();
  if ("res" in gate) return gate.res;
  // const { supabase } = gate; // <- użyj, jeśli dopiszesz zapisy do DB

  const stolikId = params.id;
  if (!stolikId) {
    return Response.json({ error: "Brak ID stolika w adresie" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as any));
  const mode = body?.mode;

  if (mode === "simple") {
    const winners = body?.winners;
    if (!Array.isArray(winners) || winners.length === 0) {
      return Response.json({ error: "W trybie 'simple' wymagane jest winners[]" }, { status: 400 });
    }

    for (const w of winners) {
      if (!(typeof w?.nr === "number" && w.nr >= 1)) {
        return Response.json({ error: "Każdy zwycięzca musi mieć numer partii (nr >= 1)" }, { status: 400 });
      }
      if (typeof w?.zwyciezca_gracz_id !== "string" || !w.zwyciezca_gracz_id) {
        return Response.json({ error: `Partia ${w?.nr}: brak zwyciezca_gracz_id` }, { status: 400 });
      }
    }

    // TODO: zapisz do DB (stolikId, winners)
    // Przykład (dopasuj do własnego schematu):
    // await supabase.from("partia").insert(
    //   winners.map((w: any) => ({
    //     stolik_id: stolikId,
    //     nr: w.nr,
    //     zwyciezca_gracz_id: w.zwyciezca_gracz_id,
    //   }))
    // );

    return Response.json({ ok: true, saved: winners.length }, { status: 200 });
  }

  if (mode === "detailed") {
    const rounds = body?.rounds;
    if (!Array.isArray(rounds) || rounds.length === 0) {
      return Response.json({ error: "W trybie 'detailed' wymagane jest rounds[]" }, { status: 400 });
    }

    for (const r of rounds) {
      if (!(typeof r?.nr === "number" && r.nr >= 1)) {
        return Response.json({ error: "Każda partia musi mieć numer (nr >= 1)" }, { status: 400 });
      }
      if (typeof r?.winner_id !== "string" || !r.winner_id) {
        return Response.json({ error: `Partia ${r?.nr}: brak winner_id` }, { status: 400 });
      }
      if (!Array.isArray(r?.losers)) {
        return Response.json({ error: `Partia ${r?.nr}: losers musi być tablicą` }, { status: 400 });
      }
      // losers: punkty muszą być liczbą ujemną
      for (const l of r.losers) {
        if (typeof l?.gracz_id !== "string" || !l.gracz_id) {
          return Response.json({ error: `Partia ${r.nr}: każdy przegrany musi mieć gracz_id` }, { status: 400 });
        }
        if (!(typeof l?.punkty === "number" && l.punkty < 0)) {
          return Response.json({ error: `Partia ${r.nr}: małe punkty przegranych muszą być ujemne` }, { status: 400 });
        }
      }
    }

    // TODO: zapisz do DB (stolikId, rounds + rozbicie losers)
    // Przykład (dopasuj do własnego schematu):
    // const inserts = [];
    // for (const r of rounds) {
    //   inserts.push({ stolik_id: stolikId, nr: r.nr, zwyciezca_gracz_id: r.winner_id });
    //   for (const l of r.losers) {
    //     inserts.push({ stolik_id: stolikId, nr: r.nr, przegrany_gracz_id: l.gracz_id, male_punkty: l.punkty });
    //   }
    // }
    // await supabase.from("partia_szczegoly").insert(inserts);

    return Response.json({ ok: true, saved: rounds.length }, { status: 200 });
  }

  return Response.json({ error: "Nieprawidłowy tryb (mode)" }, { status: 400 });
}
