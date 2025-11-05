// app/api/matches/[id]/partie/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

/**
 * Dostęp tylko dla ADMINA — tak jak w innych panelach /api/turnieje.
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

/**
 * ELO – parametry i pomocnicze.
 * K_BASE: bazowy współczynnik. Dla pierwszych 20 gier gracza dokładamy +8.
 * Skalowanie dla stołów N-osobowych: mnożnik 3/(N-1), żeby 3- i 4-osobowe miały zbliżoną „moc” rundy.
 */
const K_BASE = 16;

function expectedScore(rA: number, rB: number) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

/**
 * Pobierz skład stołu i aktualne ELO.
 */
async function getTableAndElo(
  supabase: ReturnType<typeof createClient>,
  stolikId: string
) {
  const { data: stolik, error: eStolik } = await supabase
    .from("stolik")
    .select("id, turniej_id, liczba_graczy")
    .eq("id", stolikId)
    .maybeSingle();

  if (eStolik) throw new Error(eStolik.message);
  if (!stolik) throw new Error("Nie znaleziono stołu");

  const { data: sklad, error: eSklad } = await supabase
    .from("stolik_gracz")
    .select("gracz_id")
    .eq("stolik_id", stolikId);

  if (eSklad) throw new Error(eSklad.message);
  const playerIds = (sklad || []).map((r: any) => r.gracz_id);

  if (playerIds.length === 0) throw new Error("Stół nie ma przypisanych graczy");

  const { data: gracze, error: eGracze } = await supabase
    .from("gracz")
    .select("id, ranking")
    .in("id", playerIds);

  if (eGracze) throw new Error(eGracze.message);

  const eloMap = new Map<string, number>();
  (gracze || []).forEach((g: any) => eloMap.set(g.id, g.ranking));

  return { stolik, playerIds, eloMap };
}

/**
 * Policz dotychczasowe liczby gier dla graczy (ile wpisów w elo_event).
 * Robimy to per gracz (HEAD + count), bo PostgREST nie ma tu prostego group by.
 */
async function getGamesCountMap(
  supabase: ReturnType<typeof createClient>,
  playerIds: string[]
) {
  const counts = new Map<string, number>();
  for (const id of playerIds) {
    const { count, error } = await supabase
      .from("elo_event")
      .select("id", { count: "exact", head: true })
      .eq("gracz_id", id);

    if (error) throw new Error(error.message);
    counts.set(id, count ?? 0);
  }
  return counts;
}

/**
 * Wylicz delty ELO dla zwycięzcy i przegranych (pairwise winner vs each loser),
 * z premią K + 8 dla pierwszych 20 gier i skalowaniem 3/(N-1).
 * Zwraca zaokrąglone delty całkowite i zbilansowane do sumy 0 (korekta na zwycięzcy).
 */
function computeEloDeltas(
  allPlayerIds: string[],
  winnerId: string,
  eloMap: Map<string, number>,
  gamesCount: Map<string, number>,
  N: number
) {
  const tableFactor = N > 1 ? (3 / (N - 1)) : 1; // np. N=4 => 3/3=1; N=3 => 3/2=1.5

  // przygotuj mapę delta (float)
  const deltaFloat = new Map<string, number>();
  allPlayerIds.forEach((id) => deltaFloat.set(id, 0));

  // dwukierunkowo, ale tylko para zwycięzca–przegrany; przegrani między sobą pomijamy
  for (const pid of allPlayerIds) {
    if (pid === winnerId) continue;
    const rW = eloMap.get(winnerId)!;
    const rL = eloMap.get(pid)!;

    const expW = expectedScore(rW, rL);
    const expL = 1 - expW;

    const kW =
      (K_BASE + ((gamesCount.get(winnerId) ?? 0) < 20 ? 8 : 0)) * tableFactor;
    const kL =
      (K_BASE + ((gamesCount.get(pid) ?? 0) < 20 ? 8 : 0)) * tableFactor;

    // zwycięzca: S=1
    deltaFloat.set(winnerId, deltaFloat.get(winnerId)! + kW * (1 - expW));
    // przegrany: S=0
    deltaFloat.set(pid,       deltaFloat.get(pid)!       + kL * (0 - expL));
  }

  // zaokrąglenie do całych
  const rounded = new Map<string, number>();
  let sum = 0;
  deltaFloat.forEach((v, id) => {
    const r = Math.round(v);
    rounded.set(id, r);
    sum += r;
  });

  // bilans 0 — skoryguj na zwycięzcy
  if (sum !== 0) {
    rounded.set(winnerId, (rounded.get(winnerId) ?? 0) - sum);
  }

  return rounded;
}

/**
 * Walidacja "detailed": małe punkty przegranych muszą być ujemne.
 */
function validateDetailedLosers(losers: { gracz_id: string; punkty: number }[]) {
  for (const l of losers) {
    const n = Number(l.punkty);
    if (!Number.isFinite(n) || n >= 0) {
      return `Małe punkty muszą być ujemne (dla gracza ${l.gracz_id})`;
    }
  }
  return null;
}

/**
 * POST /api/matches/[stolikId]/partie
 * Body (JSON):
 *  - tryb prosty:
 *    { mode: "simple", winners: [{ nr: number, zwyciezca_gracz_id: string }] }
 *  - tryb szczegółowy:
 *    {
 *      mode: "detailed",
 *      rounds: [
 *        { nr: number, winner_id: string, losers: [{ gracz_id: string, punkty: number }] }
 *      ]
 *    }
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireAdmin();
  if ("res" in gate) return gate.res;
  const { supabase } = gate;

  const stolikId = params.id;
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Nieprawidłowy JSON" }, { status: 400 });
  }

  const mode = String(body.mode || "simple");
  if (mode !== "simple" && mode !== "detailed") {
    return Response.json({ error: "mode musi być 'simple' lub 'detailed'" }, { status: 400 });
  }

  // Dane stołu, skład i ELO
  let tableInfo;
  try {
    tableInfo = await getTableAndElo(supabase, stolikId);
  } catch (e: any) {
    return Response.json({ error: e.message || "Błąd stołu" }, { status: 400 });
  }
  const { stolik, playerIds, eloMap } = tableInfo;

  // policz dotychczasowe liczby gier
  let gamesCount: Map<string, number>;
  try {
    gamesCount = await getGamesCountMap(supabase, playerIds);
  } catch (e: any) {
    return Response.json({ error: e.message || "Błąd pobierania liczby gier" }, { status: 400 });
  }

  // sprawdź istniejące numery partii, żeby nie dublować w tym samym stoliku
  const { data: existingParts, error: eParts } = await supabase
    .from("partia")
    .select("nr")
    .eq("stolik_id", stolikId);

  if (eParts) {
    return Response.json({ error: eParts.message }, { status: 400 });
  }
  const taken = new Set((existingParts || []).map((r: any) => Number(r.nr)));

  // zebrane wpisy do wykonania
  type NewRound =
    | { nr: number; winner: string; losers?: { gracz_id: string; punkty: number }[] }
  ;
  const toInsert: NewRound[] = [];

  if (mode === "simple") {
    const winners = Array.isArray(body.winners) ? body.winners : [];
    for (const w of winners) {
      const nr = Number(w.nr);
      const wid = String(w.zwyciezca_gracz_id || w.winner_id || "");
      if (!nr || !wid) return Response.json({ error: "Brak nr lub zwycięzcy" }, { status: 400 });
      if (taken.has(nr)) return Response.json({ error: `Partia nr ${nr} już istnieje` }, { status: 409 });
      if (!playerIds.includes(wid)) return Response.json({ error: `Zwycięzca nie jest w składzie stołu (nr ${nr})` }, { status: 400 });
      toInsert.push({ nr, winner: wid });
    }
  } else {
    const rounds = Array.isArray(body.rounds) ? body.rounds : [];
    for (const r of rounds) {
      const nr = Number(r.nr);
      const wid = String(r.winner_id || r.zwyciezca_gracz_id || "");
      if (!nr || !wid) return Response.json({ error: "Brak nr lub zwycięzcy" }, { status: 400 });
      if (taken.has(nr)) return Response.json({ error: `Partia nr ${nr} już istnieje` }, { status: 409 });
      if (!playerIds.includes(wid)) return Response.json({ error: `Zwycięzca nie jest w składzie stołu (nr ${nr})` }, { status: 400 });

      const losers = Array.isArray(r.losers) ? r.losers.map((x: any) => ({
        gracz_id: String(x.gracz_id),
        punkty: Number(x.punkty)
      })) : [];

      // przegrani muszą należeć do składu i mieć ujemne "małe punkty"
      for (const l of losers) {
        if (!playerIds.includes(l.gracz_id)) {
          return Response.json({ error: `Przegrany nie jest w składzie stołu (nr ${nr})` }, { status: 400 });
        }
      }
      const bad = validateDetailedLosers(losers);
      if (bad) return Response.json({ error: `Partia ${nr}: ${bad}` }, { status: 400 });

      toInsert.push({ nr, winner: wid, losers });
    }
  }

  // sort rosnąco po nr (niekonieczne, ale porządkuje)
  toInsert.sort((a, b) => a.nr - b.nr);

  // Przetwarzaj po kolei: wstaw partia, ewentualnie partia_male, policz ELO, zaktualizuj graczy i elo_event
  const saved: { nr: number; partia_id: string }[] = [];

  for (const r of toInsert) {
    // insert partia
    const { data: pRow, error: eP } = await supabase
      .from("partia")
      .insert({
        stolik_id: stolikId,
        nr: r.nr,
        zwyciezca_gracz_id: r.winner,
      })
      .select("id")
      .maybeSingle();

    if (eP) return Response.json({ error: `Partia ${r.nr}: ${eP.message}` }, { status: 400 });
    if (!pRow) return Response.json({ error: `Partia ${r.nr}: brak ID nowej partii` }, { status: 500 });
    const partiaId = pRow.id as string;

    // detailed: zapisz małe punkty przegranych (ujemne)
    if (r.losers && r.losers.length) {
      const rows = r.losers.map((l) => ({
        partia_id: partiaId,
        gracz_id: l.gracz_id,
        punkty: l.punkty, // ujemne; walidowane wyżej
      }));
      const { error: ePM } = await supabase.from("partia_male").insert(rows);
      if (ePM) return Response.json({ error: `Partia ${r.nr}: ${ePM.message}` }, { status: 400 });
    }

    // ELO – policz delty dla wszystkich graczy ze stołu
    const deltas = computeEloDeltas(
      playerIds,
      r.winner,
      eloMap,
      gamesCount,
      stolik.liczba_graczy || playerIds.length
    );

    // zapisz elo_event + zaktualizuj graczy
    for (const pid of playerIds) {
      const eloPrzed = eloMap.get(pid)!;
      const d = deltas.get(pid) ?? 0;
      const eloPo = eloPrzed + d;

      // update gracz.ranking
      const { error: eG } = await supabase
        .from("gracz")
        .update({ ranking: eloPo })
        .eq("id", pid);

      if (eG) return Response.json({ error: `Partia ${r.nr}: ${eG.message}` }, { status: 400 });

      // insert elo_event
      const { error: eE } = await supabase
        .from("elo_event")
        .insert({
          partia_id: partiaId,
          gracz_id: pid,
          elo_przed: eloPrzed,
          elo_po: eloPo,
        });

      if (eE) return Response.json({ error: `Partia ${r.nr}: ${eE.message}` }, { status: 400 });

      // zaktualizuj „stan bieżący” dla kolejnych partii w tej samej paczce
      eloMap.set(pid, eloPo);
      // zaktualizuj licznik gier – po tej partii gracz ma już +1
      gamesCount.set(pid, (gamesCount.get(pid) ?? 0) + 1);
    }

    saved.push({ nr: r.nr, partia_id: partiaId });
  }

  return Response.json({ ok: true, saved }, { status: 201 });
}
