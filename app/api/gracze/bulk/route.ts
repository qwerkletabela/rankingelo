export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

// normalizacja jak w kliencie
function norm(s: string) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitFullname(raw: string): { imie: string; nazwisko: string } {
  const p = raw.trim().split(/\s+/);
  if (p.length <= 1) return { imie: p[0] || "", nazwisko: "" };
  return { imie: p[0], nazwisko: p.slice(1).join(" ") };
}

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

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("res" in gate) return gate.res;
  const { supabase } = gate;

  const b = await req.json().catch(() => ({} as any));
  const fullnames: string[] = Array.isArray(b?.fullnames) ? b.fullnames : [];

  const cleaned = fullnames
    .map((s) => String(s || "").trim())
    .filter((s) => s.length > 0);

  if (!cleaned.length) {
    return Response.json({ error: "Brak listy fullnames" }, { status: 400 });
  }

  // przygotuj strukturę
  const wanted = cleaned.map((raw) => {
    const n = norm(raw);
    const { imie, nazwisko } = splitFullname(raw);
    return { raw, norm: n, imie, nazwisko };
  });

  const norms = Array.from(new Set(wanted.map((w) => w.norm)));

  // sprawdź istniejących
  const { data: found, error: qErr } = await supabase
    .from("gracz")
    .select("id,imie,nazwisko,ranking,fullname_norm")
    .in("fullname_norm", norms);

  if (qErr) return Response.json({ error: qErr.message }, { status: 400 });

  const byNorm = new Map<string, any>();
  (found || []).forEach((g: any) => byNorm.set(g.fullname_norm, g));

  // znajdź brakujących
  const missing = wanted.filter((w) => !byNorm.has(w.norm));

  let inserted: any[] = [];
  if (missing.length) {
    const toInsert = missing.map((m) => ({
      imie: m.imie,
      nazwisko: m.nazwisko,
      ranking: 1200,
      // fullname_norm to kolumna generated — nie ustawiamy jej ręcznie
    }));
    const { data: ins, error: iErr } = await supabase
      .from("gracz")
      .insert(toInsert)
      .select("id,imie,nazwisko,ranking,fullname_norm");
    if (iErr) return Response.json({ error: iErr.message }, { status: 400 });
    inserted = ins || [];
    inserted.forEach((g: any) =>
      byNorm.set(g.fullname_norm || norm(`${g.imie} ${g.nazwisko}`), g)
    );
  }

  // wynik w kolejności żądań (duplikaty możliwe: ta sama osoba połączona do kilku slotów)
  const result = cleaned.map((raw) => {
    const g = byNorm.get(norm(raw));
    return g || null;
  });

  if (result.some((x) => x === null)) {
    return Response.json({ error: "Nie udało się zmapować wszystkich graczy" }, { status: 500 });
  }

  return Response.json({ data: result }, { status: 200 });
}
