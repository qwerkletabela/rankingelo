import { createClient } from "@/lib/supabase/server";
import NavBar from "./NavBar";

export default async function NavBarShell() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user?.id) {
    // RPC, które zwraca boolean; działa z RLS, bo używa auth.uid()
    const { data } = await supabase.rpc("is_admin");
    isAdmin = !!data;
  }

  return (
    <NavBar
      initialUserEmail={user?.email ?? null}
      initialIsAdmin={isAdmin}
    />
  );
}
