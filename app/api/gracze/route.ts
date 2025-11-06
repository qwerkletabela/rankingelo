// app/api/gracze/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function splitName(fullname: string) {
  const clean = fullname.replace(/\u00A0/g, " ").trim().replace(/\s+/g, " ");
  const parts = clean.split(" ");
  if (parts.length === 1) return { imie: parts[0], nazwisko: "" };
  const nazwisko = parts.pop() as string;
  const imie = parts.join(" ");
  return { imie, nazwisko };
}

export async function POST(req: Request) {
  const supabase = createClient();
  const body = await req.json().catch(() => ({}));

  async function upsertOne(fullname: string) {
    // 1) sprawdź czy istnieje (po stronie SQL: norm_txt/unaccent)
    const { data: g, error: gErr } = await supabase
      .rpc("gracz_get_by_name", { _name: fullname })
      .maybeSingle();
    if (gErr) throw gErr;
    if (g) return { existed: true, id: g.id, fullname };

    // 2) rozbij i wstaw
    const { imie, nazwisko } = splitName(fullname);
    const { data: ins, error: insErr } = await supabase
      .from("gracz")
      .insert({ imie, nazwisko })
      .select("id")
      .maybeSingle();
    if (insErr) throw insErr;
    return { existed: false, id: ins?.id, fullname };
  }

  try {
    if (Array.isArray(body.fullnames)) {
      const results = [];
      for (const f of body.fullnames) {
        results.push(await upsertOne(String(f)));
      }
      return NextResponse.json({ results });
    }
    if (typeof body.fullname === "string") {
      const r = await upsertOne(body.fullname);
      return NextResponse.json(r);
    }
    return NextResponse.json({ error: "fullname lub fullnames wymagane" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Błąd dodawania" }, { status: 500 });
  }
}
