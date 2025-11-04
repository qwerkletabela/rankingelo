"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

export default function InlineMapInner({
  lat,
  lng,
  title,
}: {
  lat: number;
  lng: number;
  title?: string;
}) {
  // jawny typ dla center — usuwa błąd TS
  const center: LatLngExpression = [lat, lng];

  // Fallback na niektórych buildach Vercel (typed routes / dziwne d.ts):
  // Jeśli nadal zobaczysz błąd o 'center', odkomentuj linie z MapAny poniżej i użyj <MapAny ...>
  const MapAny = MapContainer as any;

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">
      <MapAny center={center} zoom={13} style={{ height: 220, width: "100%" }} scrollWheelZoom>
      <MapContainer center={center} zoom={13} style={{ height: 220, width: "100%" }} scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OSM contributors'
        />
        <CircleMarker
          center={center}
          radius={10}
          pathOptions={{ color: "#8d0b0b", fillOpacity: 0.9 }}
        >
          {title ? <Popup>{title}</Popup> : null}
        </CircleMarker>
      </MapContainer>
      </MapAny>
    </div>
  );
}
