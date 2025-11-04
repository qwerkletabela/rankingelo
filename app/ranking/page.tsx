import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = {
  id: string;
  imie: string;
  nazwisko: string;
  ranking: number;
  wins: number;
  games: number;
};

export default async function RankingPage() {
  const supabase = createClient();

  // pobieramy graczy z agregatami
  // games: ile partii zagrał (join przez stolik_gracz)
  // wins: ile partii wygrał (partia.zwyciezca_gracz_id = g.id)
  const { data: games } = await supabase.rpc("ranking_games_wins").select();

  const rows = (games as any as Row[])?.sort((a,b)=> b.wins - a.wins || (b.ranking - a.ranking)) ?? [];

  return (
    <main>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="card">
          <h1 className="text-lg font-semibold mb-4">Ranking</h1>
          <div className="overflow-hidden rounded-xl border">
            <table className="table w-full">
              <thead className="bg-gray-50/70">
                <tr>
                  <th>#</th>
                  <th>Gracz</th>
                  <th className="text-right">Wygrane</th>
                  <th className="text-right">Partie</th>
                  <th className="text-right">ELO</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={r.id} className="border-t">
                    <td className="w-10">{i+1}</td>
                    <td>{r.imie} {r.nazwisko}</td>
                    <td className="text-right">{r.wins}</td>
                    <td className="text-right">{r.games}</td>
                    <td className="text-right">{r.ranking}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-500">Brak danych.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-3">*ELO na razie nie jest automatycznie przeliczane — dojdzie później.</p>
        </div>
      </div>
    </main>
  );
}
