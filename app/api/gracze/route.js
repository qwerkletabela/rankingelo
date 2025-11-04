// app/api/gracze/route.ts
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

// normalizacja jak w fullname_norm (lower, bez znaków diakrytycznych, 1 spacja)
function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    // @ts-ignore (unicode property escape)
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// "Jan Maria Kowalski" -> imie: "Jan Maria", nazwisko: "Kowalski"
function splitName(fullname: string) {
  const s = fullname.trim().replace(/\s+/g, " ");
  const parts = s.split(" ");
  if (parts.length < 2) return null;
  const nazwisko = parts.pop()!;
  const imie = parts.join(" ");
  return { imie, nazwisko };
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("res" in gate) return gate.res;
  const { supabase } = gate;

  const b = await req.json().catch(() => ({}));
  let imie = (b.imie ? String(b.imie) : "").trim();
  let nazwisko = (b.nazwisko ? String(b.nazwisko) : "").trim();
  const fullname = String(b.fullname || "").trim();

  if (!imie || !nazwisko) {
    const split = splitName(fullname);
    if (!split) return Response.json({ error: "Podaj pełne imię i nazwisko" }, { status: 400 });
    imie = split.imie; nazwisko = split.nazwisko;
  }

  const fullnameNorm = norm(`${imie} ${nazwisko}`);

  // 1) jeśli istnieje — zwróć istniejącego
  const { data: existing } = await supabase
    .from("gracz")
    .select("id,imie,nazwisko,ranking,fullname_norm")
    .eq("fullname_norm", fullnameNorm)
    .maybeSingle();
  if (existing) return Response.json({ data: existing }, { status: 200 });

  // 2) utwórz nowego (ranking ma default 1200 w DB)
  const { data, error } = await supabase
    .from("gracz")
    .insert({ imie, nazwisko }) // ranking = default 1200
    .select("id,imie,nazwisko,ranking,fullname_norm")
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data }, { status: 201 });
}
