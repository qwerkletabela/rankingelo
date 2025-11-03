import NavBar from "@/components/NavBar";
import Hero from "@/components/Hero";
import HeroGlobal from "@/components/HeroGlobal";
import StatCard from "@/components/StatCard";
import RankingTable from "@/components/RankingTable";
import RecentMatchesTable from "@/components/RecentMatchesTable";
import AvgEloChart from "@/components/AvgEloChart";
import { players, matches } from "@/lib/mockData";

export default function Page() {
  const totalPlayers = players.length;
  const totalMatches = matches.length;
  const avgElo = Math.round(players.reduce((a, p) => a + p.elo, 0) / players.length);

  return (
    <main>
      <NavBar />
      <HeroGlobal />

      <div className="max-w-6xl mx-auto px-4 -mt-12 grid gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard title="Liczba graczy" value={totalPlayers} hint="aktywnych w rankingu" />
          <StatCard title="Mecze w systemie" value={totalMatches} hint="ostatnio dodane" />
          <StatCard title="Średni ELO" value={avgElo} hint="dla wszystkich graczy" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><AvgEloChart /></div>
          <div><RankingTable /></div>
        </div>

        <RecentMatchesTable />
      </div>
    </main>
  );
}
