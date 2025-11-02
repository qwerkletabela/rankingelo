import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("users").select("ranga").eq("id", user.id).maybeSingle();
  if (me?.ranga !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase.from("turniej").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data }, { status: 200 });
}

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("users").select("ranga").eq("id", user.id).maybeSingle();
  if (me?.ranga !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const payload = {
    nazwa: String(body.nazwa || "").trim(),
    gsheet_url: String(body.gsheet_url || "").trim(),
    gsheet_id: body.gsheet_id ? String(body.gsheet_id) : null,
    arkusz_nazwa: String(body.arkusz_nazwa || "").trim(),
    kolumna_nazwisk: String(body.kolumna_nazwisk || "").toUpperCase().trim(),
    pierwszy_wiersz_z_nazwiskiem: Number(body.pierwszy_wiersz_z_nazwiskiem || 2)
  };

  if (!payload.nazwa || !payload.gsheet_url || !payload.arkusz_nazwa || !payload.kolumna_nazwisk) {
    return Response.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }

  const { data, error } = await supabase.from("turniej").insert(payload).select("id").single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ id: data.id }, { status: 201 });
}
