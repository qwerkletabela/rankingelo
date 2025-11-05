// app/admin/page.tsx
import { supabaseServerRSC } from "@/lib/supabase/server-rsc";
import AdminShell from "./shell";

export default async function AdminPage() {
  // UWAGA: w RSC używamy klienta RSC (no-op dla cookies)
  const supabase = supabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main>
        <div className="max-w-6xl mx-auto px-4 -mt-12 py-6">
          <a href="/login" className="btn btn-primary">Zaloguj, aby zarządzać</a>
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
