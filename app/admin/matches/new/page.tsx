import NewMatchWizard from "./wizard";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="card">
          <h1 className="text-lg font-semibold mb-4">Nowy mecz</h1>
          <NewMatchWizard />
        </div>
      </div>
    </main>
  );
}
