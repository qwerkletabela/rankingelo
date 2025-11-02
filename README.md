# Statsweb-like (Next.js + Tailwind, bez bazy danych)

Gotowa, lekka strona w stylu panelu statystyk (dashboard) dla Rummikub/Qwirkle – **z mock danymi**, bez integracji z bazą.

## Szybki start

```bash
# 1) Zainstaluj zależności
npm install

# 2) Uruchom dev
npm run dev

# 3) Otwórz w przeglądarce
http://localhost:3000
```

## Co jest w środku?

- Next.js (App Router, TS)
- Tailwind CSS
- Proste komponenty UI (karty, tabelki)
- Wykres (Recharts)
- Mock dane w `lib/mockData.ts`

## Gdzie dopisać logikę bazy (Supabase)?

- Docelowo twój kod do pobierania/aktualizacji danych możesz umieścić w `app/(api)` jako Route Handlers lub w server actions (`app/page.tsx`).
- Na razie wszystko czyta z `lib/mockData.ts`. W przyszłości podmień to na zapytania do Supabase.

## Struktura

```
app/
  page.tsx           # Dashboard
  matches/page.tsx   # Lista ostatnich meczów
components/
  NavBar.tsx, StatCard.tsx, RankingTable.tsx, RecentMatchesTable.tsx, AvgEloChart.tsx
lib/
  mockData.ts
```

## Deploy na Vercel

1. Zrób repo na GitHub i wrzuć ten projekt.
2. Połącz repo z Vercel i kliknij Deploy (domyślne ustawienia wystarczą).
3. Po wdrożeniu możesz zacząć podmieniać mock dane na Supabase.

Powodzenia! ✨
