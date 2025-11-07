"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AdminShell from "./shell";

type Role = "admin" | "user";

export default function AdminPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("user");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      setEmail(user?.email ?? null);

      if (user?.id) {
        const { data } = await supabaseBrowser
          .from("users")
          .select("ranga")
          .eq("id", user.id)
          .maybeSingle();
        setRole((data?.ranga as Role) ?? "user");
      }

      const sub = supabaseBrowser.auth.onAuthStateChange(async (_evt, session) => {
        const u = session?.user ?? null;
        setEmail(u?.email ?? null);
        if (u?.id) {
          const { data } = await supabaseBrowser
            .from("users")
            .select("ranga")
            .eq("id", u.id)
            .maybeSingle();
          setRole((data?.ranga as Role) ?? "user");
        } else {
          setRole("user");
        }
      });
      unsub = () => sub.data.subscription.unsubscribe();
      setChecking(false);
    })();

    return () => { unsub?.(); };
  }, []);

  if (checking) {
    return (
      <main>
        <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-gray-600">
          Ładowanie…
        </div>
      </main>
    );
  }

  if (!email) {
    return (
      <main>
        <div className="max-w-6xl mx-auto px-4 py-6">
          <a href="/login" className="btn btn-primary">Zaloguj, aby  zarządzać</a>
        </div>
      </main>
    );
  }

  const isAdmin = role === "admin";

  return (
    <main>
      <div className="max-w-6xl mx-auto px-4 -mt-12 grid gap-6 pb-6">
        {isAdmin ? (
          <AdminShell email={email} role={role} />
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
