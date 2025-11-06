// app/api/gracze/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Prosty split "Imię Nazwisko" -> { imie, nazwisko } */
function splitName(full: string): { imie: string; nazwisko: string } {
  const s = String(full || "").replace(/\u00A0/g, " ").trim().replace(/\s+/g, " ");
  if (!s) return { imie: "", nazwisko: "" };
  const parts = s.split(" ");
  if (parts.length === 1) return { imie: parts[0], nazwisko: "" };
  return { imie: parts.slice(0, -1).join(" "), nazwisko: parts[parts.length - 1] };
}

type Gracz = {
  id: string;
  imie: string;
  nazwisko: string;
  ranking: number;
  fullname_norm: string;
};

type ExistsRow = {
  input_name: string;
  normalized: string;
  gracz_id: string | null;
  found: boolean;
  imie: string | null;
  nazwisko: string | null;
};

/** POST /api/gracze
 * Body wariant A: { fullname: "Imię Nazwisko" }
 * Body wariant B: { fullnames: ["Imię Nazwisko", ...] }
 */
export async function POST(req: Request) {
  const supabase = createClient();

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fullname, fullnames } = payload ?? {};

  // === BULK: wiele nazwisk naraz ===
  if (Array.isArray(fullnames)) {
    const raw = fullnames
      .map((x: any) => String(x ?? "").replace(/\u00A0/g, " ").trim())
      .filter(Boolean);

    const uniq = Array.from(new Set(raw));
    if (uniq.length === 0) {
      return NextResponse.json({ added: 0, existed: 0, rows: [] });
    }

    // sprawdź istniejące po stronie bazy (z normalizacją)
    const { data: existsRows, error: exErr } = await supabase.rpc("gracz_exists_by_names", {
      _names: uniq,
    });
    if (exErr) {
      return NextResponse.json({ error: exErr.message }, { status: 500 });
    }

    const exists = (existsRows as ExistsRow[]) || [];
    const missingNames = exists.filter((r) => !r.found).map((r) => r.input_name);

    if (missingNames.length === 0) {
      return NextResponse.json({
        added: 0,
        existed: uniq.length,
        rows: exists.filter((r) => r.found).map((r) => ({ id: r.gracz_id, fullname: `${r.imie} ${r.nazwisko}`.trim() })),
      });
    }

    const toInsert = missingNames.map((n) => {
      const { imie, nazwisko } = splitName(n);
      return { imie, nazwisko };
    });

    const { data: inserted, error: insErr } = await supabase
      .from("gracz")
      .insert(toInsert)
      .select("id, imie, nazwisko");

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({
      added: inserted?.length ?? 0,
      existed: uniq.length - (inserted?.length ?? 0),
      rows: [
        // już istniejący
        ...exists
          .filter((r) => r.found)
          .map((r) => ({ id: r.gracz_id, fullname: `${r.imie ?? ""} ${r.nazwisko ?? ""}`.trim(), existed: true })),
        // nowo dodani
        ...(inserted || []).map((r) => ({
          id: r.id,
          fullname: `${r.imie} ${r.nazwisko}`.trim(),
          existed: false,
        })),
      ],
    });
  }

  // === SINGLE: jedno nazwisko ===
  if (typeof fullname === "string" && fullname.trim().length > 0) {
    const clean = fullname.replace(/\u00A0/g, " ").trim();

    // najpierw spróbuj znaleźć w bazie po RPC (norm_txt po stronie SQL)
    const { data: got, error: gErr } = await supabase.rpc("gracz_get_by_name", {
      _name: clean,
    });

    if (gErr) {
      return NextResponse.json({ error: gErr.message }, { status: 500 });
    }

    const existing = (got as Gracz | null) || null;
    if (existing) {
      return NextResponse.json({ existed: true, id: existing.id, fullname: clean });
    }

    // brak — wstaw nowego
    const { imie, nazwisko } = splitName(clean);
    if (!imie || !nazwisko) {
      // jeżeli chcesz twardo wymagać nazwiska — zwróć 400
      // można też pozwolić na nazwisko puste: baza ma NOT NULL, ale puste "" jest OK
    }

    const { data: ins, error: insErr } = await supabase
      .from("gracz")
      .insert({ imie, nazwisko })
      .select("id")
      .maybeSingle();

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ existed: false, id: ins?.id, fullname: clean });
  }

  return NextResponse.json(
    { error: 'Podaj "fullname" (string) albo "fullnames" (string[]) w body.' },
    { status: 400 }
  );
}
