import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Loser = { id: string; male: number };
type Round = { nr?: number; played_at?: string; winner_id: string; losers: Loser[] };

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const stolik_id: string = body?.stolik_id;
    const rounds: Round[] = body?.rounds || [];

    if (!stolik_id || !Array.isArray(rounds) || rounds.length === 0) {
      return NextResponse.json({ error: "stolik_id i rounds wymagane" }, { status: 400 });
    }

    const supabase = createClient();

    for (const [idx, r] of rounds.entries()) {
      if (!r.winner_id) return NextResponse.json({ error: "winner_id wymagane" }, { status: 400 });
      if (!Array.isArray(r.losers) || r.losers.length === 0) {
        return NextResponse.json({ error: "losers wymagane" }, { status: 400 });
      }
      if (r.losers.some(l => !(Number.isFinite(l.male) && l.male < 0))) {
        return NextResponse.json({ error: "male u przegranych muszą być ujemne" }, { status: 400 });
      }

      // wstaw partia
      const nr = r.nr ?? (idx + 1);
      const played_at = r.played_at ?? new Date().toISOString();

      const { data: partia, error: e1 } = await supabase
        .from("partia")
        .insert({
          stolik_id,
          nr,
          played_at,
          zwyciezca_gracz_id: r.winner_id,
        })
        .select("id")
        .maybeSingle();

      if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

      // wstaw przegranych z małymi punktami
      const rows = r.losers.map((l) => ({ partia_id: partia!.id, gracz_id: l.id, punkty: l.male }));
      const { error: e2 } = await supabase.from("partia_male").insert(rows);
      if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Błąd serwera" }, { status: 500 });
  }
}
