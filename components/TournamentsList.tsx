"use client";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

type Item = {
  id: string;
  nazwa: string;
  data_turnieju: string | null;     // YYYY-MM-DD
  godzina_turnieju: string | null;  // HH:MM:SS lub HH:MM
  gsheet_url: string;
};

function hhmm(s?: string | null) {
  return s ? s.slice(0, 5) : null; // "HH:MM:SS" -> "HH:MM"
}

function toLocalDate(dateStr?: string | null, timeStr?: string | null): Date | null {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [H, M] = timeStr.slice(0, 5).split(":").map(Number);
  // Date w lokalnej strefie (np. Europa/Warszawa w przeglądarce)
  return new Date(y, (m || 1) - 1, d || 1, H || 0, M || 0, 0, 0);
}

function useNow(tickMs = 60_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(t);
  }, [tickMs]);
  return now;
}

export default function TournamentsList({ items }: { items: Item[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const now = useNow(); // odśwież co minutę

  if (items.length === 0) {
    return <div className="text-sm text-gray-500">Brak turniejów.</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <table className="table w-full">
        <thead className="bg-gray-50/70">
          <tr>
            <th className="w-[48px]"></th>
            <th>Nazwa</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => {
            const open = openId === t.id;
            const datePart = t.data_turnieju || null;
            const timePart = hhmm(t.godzina_turnieju);
            const start = toLocalDate(datePart, timePart);
            const finished =
              start ? now >= start.getTime() + 4 * 60 * 60 * 1000 : false;

            return (
              <>
                <tr
                  key={t.id}
                  className="border-t border-gray-100 hover:bg-brand-50/60 transition-colors cursor-pointer group"
                  onClick={() => setOpenId((prev) => (prev === t.id ? null : t.id))}
                >
                  <td className="py-2 pl-3 pr-1 align-middle">
                    {open ? (
                      <ChevronDown className="w-4 h-4 text-brand-700" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-brand-700" />
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="font-medium group-hover:text-brand-700 group-hover:underline underline-offset-4">
                      {t.nazwa}
                    </span>
                    <span className="ml-3 inline-flex items-center gap-2">
                      {datePart && (
                        <span className="inline-block rounded-full bg-gray-100 text-gray-700 text-[11px] px-2 py-0.5">
                          {datePart}
                        </span>
                      )}
                      {timePart && (
                        <span className="inline-block rounded-full bg-gray-100 text-gray-700 text-[11px] px-2 py-0.5">
                          {timePart}
                        </span>
                      )}
                      {finished && (
                        <span className="inline-block rounded-full bg-green-100 text-green-700 text-[11px] px-2 py-0.5">
                          Zakończony
                        </span>
                      )}
                    </span>
                  </td>
                </tr>

                {open && (
                  <tr className="border-t border-gray-100">
                    <td colSpan={2} className="p-0">
                      <div className="px-4 py-4 bg-white">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <Info label="Nazwa" value={t.nazwa} />
                          <Info label="Data" value={datePart ?? "—"} />
                          <Info label="Godzina" value={timePart ?? "—"} />
                          <Info
                            label="Status"
                            value={finished ? "Zakończony" : "W trakcie / oczekuje"}
                          />
                        </div>

                        <div className="mt-4">
                          <a
                            href={t.gsheet_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline inline-flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                            Otwórz tabelę
                          </a>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="text-[11px] uppercase text-gray-500 tracking-wide">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
