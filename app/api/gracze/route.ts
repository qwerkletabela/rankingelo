// app/api/gracze/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

/** Prosty gate: wymaga zalogowanego admina */
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

/** "Jan Paweł Kowalski" -> { imie: "Jan Paweł", nazwisko: "Kowalski" } */
function splitFullname(fullname: string): { imie: string; nazwisko: string } | null {
  const s = String(fullname || "").trim().replace(/\s+/g, " ");
  if (!s) return null;
  const parts = s.split(" ");
  if (parts.length < 2) return null; // wymagamy co najmniej imię + nazwisko
  const nazwisko = parts.pop()!;
  const imie = parts.join(" ");
  return { imie, nazwisko };
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("res" in gate) return gate.res;
  const { supabase } = gate;

  const body = await req.json().catch(() => ({} as any));

  let names: string[] = [];
  if (Array.isArray(body.fullnames)) {
    names = body.fullnames;
  } else if (typeof body.fullname === "string") {
    names = [body.fullname];
  }

  names = names.map((n) => String(n || "").trim()).filter(Boolean);
  if (names.length === 0) {
    return Response.json({ error: "Brak danych (fullname / fullnames)." }, { status: 400 });
  }

  const rows: { imie: string; nazwisko: string }[] = [];
  for (const raw of names) {
    const p = splitFullname(raw);
    if (!p) {
      return Response.json(
        { error: `Nieprawidłowe imię i nazwisko: "${raw}" (wymagane min. 2 wyrazy)` },
        { status: 400 }
      );
    }
    rows.push({ imie: p.imie, nazwisko: p.nazwisko }); // ranking = 1200 z DEFAULT w DB
  }

  // Upsert po unikalnym fullname_norm (kolumna generowana w tabeli gracz)
  const { data, error } = await supabase
    .from("gracz")
    .upsert(rows, { onConflict: "fullname_norm" })
    .select("id, imie, nazwisko, ranking, fullname_norm");

  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ data }, { status: 201 });
}
