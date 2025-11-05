import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const turniej_id: string = body?.turniej_id;
    if (!turniej_id) return NextResponse.json({ error: "turniej_id wymagane" }, { status: 400 });

    const supabase = createClient();
    const { data, error } = await supabase
      .from("stolik")
      .insert({ turniej_id })
      .select("id")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Błąd serwera" }, { status: 500 });
  }
}
