import { createClient } from "@/lib/supabase/server";
import TournamentsList from "@/components/TournamentsList";

export default async function TournamentsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("turniej")
    .select("id, nazwa, data_turnieju, godzina_turnieju, gsheet_url")
    .order("data_turnieju", { ascending: true });

  const items = data ?? [];

  return (
    <main>
      <div className="max-w-6xl mx-auto px-4 -mt-12 grid gap-6">
        <div className="card">
          <h2 className="font-semibold mb-4">Turnieje</h2>
          <TournamentsList items={items} />
        </div>
      </div>
    </main>
  );
}
