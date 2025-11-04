import RecentMatchesTable from "@/components/RecentMatchesTable";

export default function MatchesPage() {
  return (
    <main>
      {/* NavBar i (opcjonalnie) Hero są w app/layout.tsx */}
      <div className="max-w-6xl mx-auto px-4 -mt-12 grid gap-6">
        <RecentMatchesTable />
      </div>
    </main>
  );
}
