export type Player = {
  id: string;
  name: string;
  elo: number;
  country?: string;
  played: number;
  wins: number;
  losses: number;
};

export type Match = {
  id: string;
  date: string; // ISO
  tournament: string;
  players: string[]; // player names
  winner: string;
  score: string; // e.g., "+25 / -12 / -8 / -5"
};

export const players: Player[] = [
  { id: "p1", name: "A. Kowalski", elo: 1520, country: "PL", played: 42, wins: 25, losses: 17 },
  { id: "p2", name: "B. Nowak", elo: 1495, country: "PL", played: 30, wins: 18, losses: 12 },
  { id: "p3", name: "C. Wiśniewski", elo: 1472, country: "PL", played: 26, wins: 14, losses: 12 },
  { id: "p4", name: "D. Jankowska", elo: 1458, country: "PL", played: 33, wins: 17, losses: 16 },
  { id: "p5", name: "E. Zielińska", elo: 1430, country: "PL", played: 22, wins: 12, losses: 10 }
];

export const matches: Match[] = [
  { id: "m1", date: new Date().toISOString(), tournament: "Liga Jesienna", players: ["A. Kowalski", "B. Nowak", "C. Wiśniewski", "D. Jankowska"], winner: "A. Kowalski", score: "+25 / -10 / -8 / -7" },
  { id: "m2", date: new Date(Date.now()-86400000).toISOString(), tournament: "Liga Jesienna", players: ["E. Zielińska", "B. Nowak", "A. Kowalski", "C. Wiśniewski"], winner: "B. Nowak", score: "+24 / -9 / -8 / -7" },
  { id: "m3", date: new Date(Date.now()-86400000*2).toISOString(), tournament: "Turniej Miesięczny", players: ["A. Kowalski", "E. Zielińska", "D. Jankowska", "C. Wiśniewski"], winner: "E. Zielińska", score: "+21 / -11 / -6 / -4" }
];

export const eloHistory = [
  { date: "2025-09-01", avgElo: 1400 },
  { date: "2025-09-15", avgElo: 1415 },
  { date: "2025-10-01", avgElo: 1430 },
  { date: "2025-10-15", avgElo: 1442 },
  { date: "2025-11-01", avgElo: 1450 }
];
