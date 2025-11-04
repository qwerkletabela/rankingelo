// app/api/wyniki/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("v_wyniki")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data }, { status: 200 });
}
