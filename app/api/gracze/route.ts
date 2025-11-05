import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeFullname, splitFullname } from "@/lib/norm";

/**
 * POST /api/gracze
 * Body warianty:
 *  - { fullname: "Jan Kowalski" }
 *  - { fullnames: ["Jan Kowalski", "Anna Łuczak", ...] }
 *
 * Zasady:
 *  - fullname_norm = lower + bez polskich znaków + pojedyncze spacje (spójne z SQL)
 *  - jeżeli istnieje wiersz o takim fullname_norm → zwracamy istniejącego (id, imie, nazwisko, ranking)
 *  - jeżeli nie istnieje → tworzymy nowego z rankingiem 1200.0000
 *  - deduplikacja odporna na równoległe żądania (po konflikcie ponownie SELECT)
 */
export async function POST(req: Request) {
  const supabase = createClient();

  // (opcjonalny) gate: wymaga zalogowania
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as any));
  const list: string[] = Array.isArray(body.fullnames)
    ? body.fullnames
    : body.fullname
    ? [body.fullname]
    : [];

  if (list.length === 0) {
    return NextResponse.json({ error: "Brak 'fullname' lub 'fullnames' w body" }, { status: 400 });
  }

  async function ensurePlayer(raw: string) {
    const norm = normalizeFullname(raw);
    // 1) Czy już istnieje (po fullname_norm)?
    const { data: exists } = await supabase
      .from("gracz")
      .select("id, imie, nazwisko, ranking, fullname_norm")
      .eq("fullname_norm", norm)
      .maybeSingle();

    if (exists) return exists;

    // 2) Nie ma — spróbuj wstawić
    const { imie, nazwisko } = splitFullname(raw);

    // Uwaga: kolumna fullname_norm jest GENERATED ALWAYS w SQL, więc nie podajemy jej w INSERT.
    // Unikalność zapewnia constraint uniq_gracz_fullname_norm.
    const ins = await supabase
      .from("gracz")
      .insert([{ imie, nazwisko }])
      .select("id, imie, nazwisko, ranking, fullname_norm")
      .maybeSingle();

    if (ins.data) return ins.data;

    // 3) Jeżeli konflikt równoległy — ponowne odczytanie
    const { data: again } = await supabase
      .from("gracz")
      .select("id, imie, nazwisko, ranking, fullname_norm")
      .eq("fullname_norm", norm)
      .maybeSingle();

    if (again) return again;

    throw new Error(`Nie udało się utworzyć gracza: ${raw}`);
  }

  try {
    const out = [];
    for (const raw of list) {
      // pomiń puste
      const cleaned = normalizeFullname(raw);
      if (!cleaned) continue;
      // wykonaj
      const one = await ensurePlayer(raw);
      out.push(one);
    }
    // Zwróć spójną odpowiedź
    return NextResponse.json({ data: out }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Błąd dodawania gracza" }, { status: 500 });
  }
}
