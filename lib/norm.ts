// lib/norm.ts
// Normalizacja 1:1 z tym co robi Postgres (unaccent + lower + pojedyncze spacje).
// Dodatkowo mapujemy litery, które nie rozkładają się w NFD (np. ł/Ł).
export function normDb(input: string): string {
  return String(input ?? "")
    .replace(/\u00A0/g, " ")             // twarde spacje -> zwykłe
    .replace(/[–—-]+/g, " ")             // myślniki (różne) -> spacja
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")     // znaki łączące (akcenty)
    .replace(/[łŁ]/g, "l")               // nie rozkładają się
    .replace(/[đĐ]/g, "d")
    .replace(/\s+/g, " ")                // zbicie spacji
    .trim();
}
