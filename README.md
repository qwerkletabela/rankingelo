# Ranking + Admin (Supabase Auth & Turnieje)

Funkcje:
- Logowanie (Supabase) i **guard admina** (`users.ranga='admin'`).
- Panel **/admin** z zakładką **Turnieje**:
  - Formularz dodawania turnieju (nazwa, link, arkusz, kolumna, pierwszy wiersz).
  - Podgląd nazwisk z Google Sheets wg ustawień turnieju (pierwsze 50).

## Konfiguracja

### 1) Env
Utwórz `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GOOGLE_CLIENT_EMAIL=...@...gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 2) Supabase
- W bazie mają istnieć tabele: `users (id uuid primary key, ranga text)`, `turniej` (z Twojego SQL).
- Wstaw do `users` rekord dla siebie z `id = auth.uid()` i `ranga = 'admin'`.

### 3) Uprawnienia (RLS — skrót)
Przykładowe polityki (w SQL):
```sql
alter table public.turniej enable row level security;

-- każdy może czytać (jeśli chcesz publiczny podgląd listy, inaczej zawęź):
create policy "turniej_select_all" on public.turniej
for select using (true);

-- tylko admin może insert/update/delete
create policy "turniej_admin_write" on public.turniej
for all
to authenticated
using (exists (select 1 from users u where u.id = auth.uid() and u.ranga = 'admin'))
with check (exists (select 1 from users u where u.id = auth.uid() and u.ranga = 'admin'));
```

## Uruchomienie
```
npm install
npm run dev
# http://localhost:3000
# logowanie: http://localhost:3000/login
# panel: http://localhost:3000/admin
```

## Notatki
- Podgląd arkusza wymaga udostępnienia pliku **serwisowemu kontu Google** (`GOOGLE_CLIENT_EMAIL`) jako **Viewer**.
- `gsheet_id` jest wyciągane automatycznie z linku podczas zapisu.
