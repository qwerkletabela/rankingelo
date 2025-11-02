import { supabase } from "@/lib/supabaseClient";

import Image from "next/image";

export default async function Home() {
  const { data, error } = await supabase.from('_test').select('*');
  console.log("Supabase test:", { data, error });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Supabase Połączone ✅</h1>
      <p>Sprawdź konsolę (F12 → Console)</p>
    </main>
  );
}

