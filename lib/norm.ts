// lib/norm.ts
/** Spójna normalizacja: lower + NFKD + usunięcie łączników + mapowanie 'ł'→'l' + 1 spacja */
export function normalizeFullname(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    // ujednolicamy myślniki/długie pauzy do zwykłego
    .replace(/[–—]/g, "-")
    // NFKD: rozbije więcej znaków (np. „ø”, „ß” itd. — jeśli kiedyś się pojawią)
    .normalize("NFKD")
    // usuń znaki łączące (akcenty, ogonki)
    .replace(/[\u0300-\u036f]/g, "")
    // krytyczne dla PL: ł/Ł -> l
    .replace(/ł/g, "l")
    // opcjonalnie ujednolić inne rzadkie warianty (tu nie potrzebne, ale zostawiam hook):
    // .replace(/đ/g, "d").replace(/ß/g, "ss")
    // zamień myślniki/underscore na spacje
    .replace(/[-_]+/g, " ")
    // tylko jedna spacja
    .replace(/\s+/g, " ")
    .trim();
}
