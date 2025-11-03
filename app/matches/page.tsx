import NavBar from "@/components/NavBar";
import RecentMatchesTable from "@/components/RecentMatchesTable";
import HeroGlobal from "@/components/HeroGlobal";

export default function MatchesPage() {
  return (
    <main>
      <NavBar />
      <HeroGlobal />
      <div className="max-w-6xl mx-auto px-4 py-6 grid gap-6">
        <RecentMatchesTable />
      </div>
    </main>
  );
}
