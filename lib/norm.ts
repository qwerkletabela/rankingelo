// Utils do normalizacji nazw (spójne z kolumną SQL fullname_norm):
// - lower
// - usunięcie diakrytyków (ł→l, ą→a, …)
// - pojedyncze spacje, trim

/** Usuwa diakrytyki (ł→l, ą→a itd.) */
export function stripDiacritics(s: string): string {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Redukuje do pojedynczych spacji + trim */
export function normalizeSpaces(s: string): string {
  return String(s).replace(/\s+/g, " ").trim();
}

/** Pełna normalizacja: lower + bez znaków diakrytycznych + pojedyncze spacje */
export function normalizeFullname(input: string): string {
  return normalizeSpaces(stripDiacritics(String(input).toLowerCase()));
}

/** Alias używany przez kod frontu jako „DB-normalizacja” (zgodna z fullname_norm w SQL) */
export function normDb(input: string): string {
  return normalizeFullname(input);
}

/** Pomocniczo: rozbijanie "Imie Imie2 Nazwisko" → { imie, nazwisko } */
export function splitFullname(raw: string): { imie: string; nazwisko: string } {
  const cleaned = normalizeSpaces(raw);
  const parts = cleaned.split(" ");
  if (parts.length === 1) {
    return { imie: parts[0], nazwisko: "-" };
  }
  const nazwisko = parts.pop() as string;
  const imie = parts.join(" ");
  return { imie, nazwisko };
}

/** Porównanie dwóch nazw po normalizacji (przydaje się do antyduplikacji) */
export function equalNames(a: string, b: string): boolean {
  return normDb(a) === normDb(b);
}
