import { createClient } from "@/lib/supabase/server";
import AdminShell from "./shell";

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main>
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-200 px-4 py-3">
            Nie jesteś zalogowany. <a className="underline" href="/login">Przejdź do logowania</a>.
          </div>
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
      <div className="max-w-6xl mx-auto px-4 py-6 grid gap-6">
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
              Poproś o nadanie uprawnień albo w SQL ustaw:{" "}
              <code>update public.users set ranga='admin' where id = '&lt;Twoje UUID&gt;';</code>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
