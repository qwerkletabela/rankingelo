import { createClient } from "@/lib/supabase/server";
import AdminShell from "./shell";

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Niezalogowany: tylko skrót do logowania / dodawania turnieju
  if (!user) {
    return (
      <main>
        <div className="max-w-6xl mx-auto px-4 -mt-12 py-6">
          <a href="/login" className="btn btn-primary">Dodaj turniej</a>
        </div>
      </main>
    );
  }

  const { data: me } = await supabase
    .from("users")
    .select("ranga")
    .eq("id", user.id)
    .maybeSingle();

  const role = me?.ranga ?? "user";
  const isAdmin = role === "admin";

  return (
    <main>
      <div className="max-w-6xl mx-auto px-4 -mt-12 grid gap-6 pb-6">
        {isAdmin ? (
          // ⬇️ Bez zielonego banera – od razu panel
          <AdminShell email={user.email ?? ""} role={role} />
        ) : (
          // Dla zalogowanego bez roli admin możesz zostawić komunikat...
          <div className="card">
            <h3 className="font-semibold mb-2">Dostęp wymaga roli ADMIN</h3>
            <p className="text-sm text-gray-600">
              Poproś o nadanie uprawnień w tabeli <code>users</code>.
            </p>
          </div>
          // ...albo też go usunąć — wtedy zwróć np. pustą sekcję.
        )}
      </div>
    </main>
  );
}
