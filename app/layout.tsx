// app/layout.tsx
import "./globals.css";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import NavBarShell from "@/components/NavBarShell";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("ranga")
      .eq("id", user.id)
      .single();
    isAdmin = data?.ranga === "admin";
  }

  return (
    <html lang="pl">
      <body>
        <NavBarShell userEmail={user?.email ?? undefined} isAdmin={isAdmin} />
        {children}
      </body>
    </html>
  );
}
