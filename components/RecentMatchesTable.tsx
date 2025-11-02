import { matches } from "@/lib/mockData";

export default function RecentMatchesTable() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Ostatnie mecze</h3>
        <span className="text-xs text-gray-500">Mock data</span>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Turniej</th>
            <th>Gracze</th>
            <th>Zwycięzca</th>
            <th>Wynik</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => (
            <tr key={m.id} className="border-t border-gray-100 align-top">
              <td className="pr-4 py-3">{new Date(m.date).toLocaleDateString("pl-PL")}</td>
              <td className="pr-4">{m.tournament}</td>
              <td className="pr-4">
                <ul className="list-disc list-inside">
                  {m.players.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </td>
              <td className="pr-4"><span className="badge badge-win">{m.winner}</span></td>
              <td className="pr-4">{m.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
