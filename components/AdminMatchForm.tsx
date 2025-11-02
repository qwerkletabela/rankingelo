"use client";

import { useEffect, useMemo, useState } from "react";
import type { Match } from "@/lib/mockData";
import { players as mockPlayers } from "@/lib/mockData";

type Suggest = { name: string; external_id?: string | null; email?: string | null };

function PlayerInput({
  value,
  onChange,
  suggests
}: {
  value: string;
  onChange: (v: string) => void;
  suggests: Suggest[];
}) {
  return (
    <>
      <input
        list="players_datalist"
        className="w-full rounded-md border border-gray-300 px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Wpisz nazwisko gracza"
      />
      <datalist id="players_datalist">
        {suggests.map((p) => (
          <option key={(p.external_id ?? p.name) + p.name} value={p.name}>
            {p.email ? `${p.name} (${p.email})` : p.name}
          </option>
        ))}
      </datalist>
    </>
  );
}

const LS_KEY_MATCHES = "admin_matches";

export default function AdminMatchForm() {
  const [mode, setMode] = useState<3 | 4 | 6>(4);
  const [tournament, setTournament] = useState("Liga Demo");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [players, setPlayers] = useState<string[]>(["", "", "", ""]);
  const [scores, setScores] = useState<string[]>(["", "", "", ""]);
  const [suggests, setSuggests] = useState<Suggest[]>([]);
  const [table, setTable] = useState<Match[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY_MATCHES);
      if (raw) setTable(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY_MATCHES, JSON.stringify(table));
    } catch {}
  }, [table]);

  useEffect(() => {
    fetch("/api/sheets/players")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.players) && d.players.length) setSuggests(d.players);
        else setSuggests(mockPlayers.map((p) => ({ name: p.name })));
      })
      .catch(() => setSuggests(mockPlayers.map((p) => ({ name: p.name }))));
  }, []);

  useEffect(() => {
    setPlayers((prev) => {
      const desired = mode;
      if (prev.length === desired) return prev;
      if (prev.length > desired) return prev.slice(0, desired);
      return [...prev, ...Array(desired - prev.length).fill("")];
    });
    setScores((prev) => {
      const desired = mode;
      if (prev.length === desired) return prev;
      if (prev.length > desired) return prev.slice(0, desired);
      return [...prev, ...Array(desired - prev.length).fill("")];
    });
  }, [mode]);

  const winner = useMemo(() => {
    const idxPlus = scores.findIndex((s) => s.trim().startsWith("+"));
    if (idxPlus >= 0) return players[idxPlus] || "";
    const idxNonEmpty = players.findIndex((p) => p.trim());
    return idxNonEmpty >= 0 ? players[idxNonEmpty] : "";
  }, [players, scores]);

  const add = () => {
    const cleanPlayers = players.filter(Boolean);
    if (cleanPlayers.length !== mode) {
      alert(`Wpisz ${mode} graczy.`);
      return;
    }
    const m: Match = {
      id: "m" + Math.random().toString(36).slice(2, 8),
      date: new Date(date).toISOString(),
      tournament,
      players: cleanPlayers,
      winner: winner || cleanPlayers[0],
      score: scores.join(" / ")
    };
    setTable((prev) => [m, ...prev]);
  };

  const remove = (id: string) => setTable((prev) => prev.filter((m) => m.id !== id));

  return (
    <div className="card">
      <h3 className="font-semibold mb-4">Dodaj partię (demo)</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-sm">
          <div className="text-gray-600 mb-1">Turniej</div>
          <input
            value={tournament}
            onChange={(e) => setTournament(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="text-sm">
          <div className="text-gray-600 mb-1">Data i godzina</div>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="text-sm">
          <div className="text-gray-600 mb-1">Tryb</div>
          <select
            value={mode}
            onChange={(e) => setMode(Number(e.target.value) as any)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white"
          >
            <option value={3}>3 graczy</option>
            <option value={4}>4 graczy</option>
            <option value={6}>6 graczy</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {players.map((p, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-10 text-sm text-gray-600">G{idx + 1}</div>
            <div className="flex-1">
              <PlayerInput value={p} onChange={(v) => {
                setPlayers((prev) => prev.map((x, i) => (i === idx ? v : x)));
              }} suggests={suggests} />
            </div>
            <input
              value={scores[idx]}
              onChange={(e) => setScores((prev) => prev.map((x, i) => (i === idx ? e.target.value : x)))}
              placeholder="+25 / -10"
              className="w-32 rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <button onClick={add} className="rounded-lg bg-black text-white text-sm px-4 py-2">Zapisz partię</button>
      </div>

      <div className="mt-6">
        <h4 className="font-medium mb-2">Ostatnio dodane (localStorage)</h4>
        <div className="overflow-auto">
          <table className="table min-w-[720px]">
            <thead>
              <tr>
                <th>Data</th>
                <th>Turniej</th>
                <th>Gracze</th>
                <th>Zwycięzca</th>
                <th>Wynik</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {table.map((m) => (
                <tr key={m.id} className="border-t border-gray-100 align-top">
                  <td className="pr-4 py-3">{new Date(m.date).toLocaleString("pl-PL")}</td>
                  <td className="pr-4">{m.tournament}</td>
                  <td className="pr-4">
                    <ul className="list-disc list-inside">
                      {m.players.map((p) => <li key={p}>{p}</li>)}
                    </ul>
                  </td>
                  <td className="pr-4">{m.winner}</td>
                  <td className="pr-4">{m.score}</td>
                  <td className="pr-4">
                    <button onClick={() => remove(m.id)} className="text-red-600 text-sm hover:underline">Usuń</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Demo: zapis w <code>localStorage</code>. Po podłączeniu Supabase endpoint <code>POST /api/matches</code> utworzy graczy (jeśli nie istnieją), zapisze partię i policzy ELO.
      </p>
    </div>
  );
}
