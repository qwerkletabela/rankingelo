import { players } from "@/lib/mockData";

export default function RankingTable() {
  const sorted = [...players].sort((a, b) => b.elo - a.elo);
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Ranking (Top 10)</h3>
        <span className="text-xs text-gray-500">Mock data</span>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Gracz</th>
            <th>ELO</th>
            <th>Rozegrane</th>
            <th>Bilans</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, idx) => (
            <tr key={p.id} className="border-t border-gray-100">
              <td className="pr-2 py-3">{idx + 1}</td>
              <td className="pr-4">{p.name}</td>
              <td className="pr-4">{p.elo}</td>
              <td className="pr-4">{p.played}</td>
              <td className="pr-4">{p.wins}–{p.losses}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
