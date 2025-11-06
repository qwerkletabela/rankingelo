// app/api/gracze/check/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { names } = await req.json().catch(() => ({ names: [] }));
    if (!Array.isArray(names) || names.length === 0) {
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    const { data, error } = await supabase.rpc("gracz_exists_by_names", {
      _names: names,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rows: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
