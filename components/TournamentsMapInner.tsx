"use client";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

type Item = {
  id: string;
  nazwa: string;
  data_turnieju: string | null;  // YYYY-MM-DD
  godzina_turnieju: string | null;// HH:MM:SS
  gsheet_url: string;
  lat: number | null;
  lng: number | null;
};

function centerOf(items: Item[]): [number, number] {
  const pts = items.filter(i => typeof i.lat === "number" && typeof i.lng === "number") as Array<
    Item & { lat: number; lng: number }
  >;
  if (pts.length === 0) return [52.2297, 21.0122]; // Warszawa
  const avgLat = pts.reduce((a, b) => a + b.lat, 0) / pts.length;
  const avgLng = pts.reduce((a, b) => a + b.lng, 0) / pts.length;
  return [avgLat, avgLng];
}
function hhmm(s?: string | null) { return s ? s.slice(0,5) : ""; }

export default function TournamentsMapInner({ items }: { items: Item[] }) {
  const hasAny = items.some(i => typeof i.lat === "number" && typeof i.lng === "number");
  if (!hasAny) return null;

  const center = centerOf(items);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">
      <MapContainer
        center={center}
        zoom={6}
        style={{ height: 360, width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OSM</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {items.map((t) => {
          if (typeof t.lat !== "number" || typeof t.lng !== "number") return null;
          return (
            <CircleMarker
              key={t.id}
              center={[t.lat, t.lng]}
              radius={8}
              pathOptions={{ color: "#8d0b0b", fillOpacity: 0.8 }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-medium mb-1">{t.nazwa}</div>
                  <div className="text-gray-600">
                    {t.data_turnieju || "—"} {hhmm(t.godzina_turnieju)}
                  </div>
                  <a
                    href={t.gsheet_url}
                    target="_blank" rel="noreferrer"
                    className="underline text-brand-700"
                  >
                    Tabela
                  </a>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
