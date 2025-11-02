"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AdminStatus() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? null);
      const { data } = await supabaseBrowser
        .from("users")
        .select("ranga")
        .eq("id", user.id)
        .maybeSingle();
      setRole(data?.ranga ?? null);
    })();
  }, []);

  if (!email) return null;
  return (
    <span className="text-xs rounded-full bg-gray-100 border border-gray-200 px-2 py-1">
      {email}{role === "admin" ? " · ADMIN" : ""}
    </span>
  );
}
