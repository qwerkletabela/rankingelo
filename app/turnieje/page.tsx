// app/turnieje/page.tsx
export const revalidate = 60; // ISR: odśwież co 60s na Vercel

type Turniej = {
  id: string;
  nazwa: string | null;
  data_turnieju: string | null;
  godzina_turnieju: string | null;
  gsheet_url: string | null;
};

async function getTurnieje(): Promise<Turniej[]> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/turniej`
    + `?select=id,nazwa,data_turnieju,goszina_turnieju:godzina_turnieju,gsheet_url`
    + `&order=data_turnieju.desc`; // PostgREST sort

  const res = await fetch(url, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    },
    // ISR cachuje w Vercel; nie potrzebujemy dynamic
    next: { revalidate: 60 },
  });

  if (!res.ok) throw new Error(`REST error: ${res.status} ${await res.text()}`);
  return res.json();
}

export default async function Page() {
  const data = await getTurnieje();

  if (!data?.length) {
    return <div className="p-6 text-gray-500">Brak turniejów do wyświetlenia.</div>;
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Turnieje</h1>
      <ul className="space-y-2">
        {data.map((t) => (
          <li key={t.id} className="rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{t.nazwa ?? "Bez nazwy"}</span>
              <span className="text-sm text-gray-500">
                {t.data_turnieju ?? "—"}{t.godzina_turnieju ? `, ${t.godzina_turnieju}` : ""}
              </span>
            </div>
            {t.gsheet_url && (
              <a href={t.gsheet_url} target="_blank" rel="noreferrer" className="underline">
                Arkusz Google
              </a>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
