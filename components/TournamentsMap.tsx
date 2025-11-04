"use client";

// Deprecated: mapa zbiorcza została zastąpiona mapą w szczegółach turnieju (InlineMap).
// Ten komponent pozostaje tylko po to, by nie psuć buildów jeśli gdzieś jest jeszcze import.

type Item = {
  id: string;
  nazwa: string;
  lat: number | null;
  lng: number | null;
};

export default function TournamentsMap(_props: { items: Item[] }) {
  return null; // nic nie renderujemy
}
