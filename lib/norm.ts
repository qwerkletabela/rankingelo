// Wspólne utils do normalizacji imion/nazwisk

/** Usuwa diakrytyki (ł→l, ą→a, itp.) */
export function stripDiacritics(s: string): string {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Jedna spacja, trim */
export function normalizeSpaces(s: string): string {
  return String(s).replace(/\s+/g, " ").trim();
}

/** Pełna normalizacja: lower + bez znaków + 1 spacja */
export function normalizeFullname(input: string): string {
  return normalizeSpaces(stripDiacritics(String(input).toLowerCase()));
}

/** Rozdziela „Imie Imie2 Nazwisko” → { imie: "Imie Imie2", nazwisko: "Nazwisko" } */
export function splitFullname(raw: string): { imie: string; nazwisko: string } {
  const cleaned = normalizeSpaces(raw);
  const parts = cleaned.split(" ");
  if (parts.length === 1) {
    // Brak nazwiska – zapisujemy wszystko jako imię, nazwisko = "-"
    return { imie: parts[0], nazwisko: "-" };
  }
  const nazwisko = parts.pop() as string;
  const imie = parts.join(" ");
  return { imie, nazwisko };
}
