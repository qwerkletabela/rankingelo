export type Player = {
  id: string;
  name: string;
  elo: number;
  played: number;
  wins: number;
  losses: number;
  region?: string;
};
export type Match = {
  id: string;
  date: string;
  tournament: string;
  players: string[];
  winner: string;
  score: string;
};
export const players: Player[] = [
  { id: "p1", name: "A. Kowalski", elo: 1520, played: 42, wins: 25, losses: 17 },
  { id: "p2", name: "B. Nowak", elo: 1495, played: 30, wins: 18, losses: 12 },
  { id: "p3", name: "C. Wiśniewski", elo: 1472, played: 26, wins: 14, losses: 12 }
];
export const matches: Match[] = [
  { id: "m1", date: new Date().toISOString(), tournament: "Liga Jesienna", players: ["A","B","C","D"], winner: "A", score: "+25 / -10 / -8 / -7" }
];
export const eloHistory = [
  { date: "2025-09-01", avgElo: 1400 },
  { date: "2025-10-01", avgElo: 1430 },
  { date: "2025-11-01", avgElo: 1450 }
];


