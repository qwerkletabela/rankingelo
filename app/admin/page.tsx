import { createClient } from "@/lib/supabase/server";
import AdminShell from "./shell";

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ⬇️ Niezalogowany: tylko link "Dodaj turniej"
  if (!user) {
    return (
      <main>
        <div className="max-w-6xl mx-auto px-4 -mt-12 py-6">
          <a href="/login" className="btn btn-primary">Dodaj turniej</a>
        </div>
      </main>
    );
  }

  // Zalogowany: sprawdź rolę i pokaż panel
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
        <div
          className={`rounded-lg px-4 py-3 border ${
            isAdmin
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          Jesteś zalogowany jako <span className="font-medium">{user.email}</span> —{" "}
          <strong>{isAdmin ? "ADMIN" : "BRAK UPRAWNIEŃ ADMIN"}</strong>.
        </div>

        {isAdmin ? (
          <AdminShell email={user.email ?? ""} role={role} />
        ) : (
          <div className="card">
            <h3 className="font-semibold mb-2">Dostęp wymaga roli ADMIN</h3>
            <p className="text-sm text-gray-600">
              Poproś o nadanie uprawnień w tabeli <code>users</code>.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
