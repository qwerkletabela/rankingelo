"use client";
import dynamic from "next/dynamic";

type Item = {
  id: string;
  nazwa: string;
  data_turnieju: string | null;
  godzina_turnieju: string | null; // "HH:MM:SS"
  gsheet_url: string;
  lat: number | null;
  lng: number | null;
};

// SSR off, bo Leaflet wymaga window
const Inner = dynamic(() => import("./TournamentsMapInner"), { ssr: false });

export default function TournamentsMap({ items }: { items: Item[] }) {
  return <Inner items={items} />;
}
