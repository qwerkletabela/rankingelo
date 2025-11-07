"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { CalendarDays, MapPin, Loader2 } from "lucide-react";

type TurniejRow = {
  id: string;
  nazwa: string;
  data_turnieju: string | null;
  godzina_turnieju: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

export default function TurniejePage() {
  const [rows, setRows] = useState<TurniejRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabaseBrowser
      .from("turniej")
      .select("id,nazwa,data_turnieju, godzina_turnieju, lat, lng, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setErr(error.message);
      setRows([]);
    } else {
      setRows((data || []) as TurniejRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main>
      <div className="max-w-6xl mx-auto px-4 py-6 grid gap-4">
        <h1 className="text-xl font-semibold">Turnieje</h1>

        {err && (
          <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
            {err}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-gray-600 inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Ładowanie…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-600">Brak turniejów do wyświetlenia.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {rows.map((t) => {
              const date = t.data_turnieju ?? "";
              const time = t.godzina_turnieju ? t.godzina_turnieju.slice(0, 5) : "";
              const hasGeo = typeof t.lat === "number" && typeof t.lng === "number";
              return (
                <div key={t.id} className="card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{t.nazwa}</div>
                      <div className="mt-1 flex items-center gap-3 text-[13px] text-gray-700">
                        {(date || time) && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="w-4 h-4" />
                            {date}{time ? ` ${time}` : ""}
                          </span>
                        )}
                        {hasGeo && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {t.lat!.toFixed(4)}, {t.lng!.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {/* Publiczny podgląd listy partii możesz zrobić pod /turnieje/[id] jeśli chcesz,
                       a jeśli na razie masz tylko panel admina – linkuj do adminowego widoku: */}
                    <Link href={`/admin/turnieje/${t.id}`} className="btn btn-outline">
                      Podgląd / edycja
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
