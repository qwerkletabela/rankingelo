"use client";

import {
  MapContainer as RLMapContainer,
  TileLayer as RLTileLayer,
  CircleMarker as RLCircleMarker,
  Popup,
} from "react-leaflet";

// Bezpieczne casty – omijają konflikty d.ts na Vercel/TS
const MapAny = RLMapContainer as any;
const TileAny = RLTileLayer as any;
const CircleAny = RLCircleMarker as any;

export default function InlineMapInner({
  lat,
  lng,
  title,
}: {
  lat: number;
  lng: number;
  title?: string;
}) {
  const center = [lat, lng] as [number, number];

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">
      <MapAny center={center} zoom={13} style={{ height: 220, width: "100%" }} scrollWheelZoom>
        <TileAny
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <CircleAny
          center={center}
          radius={10}
          pathOptions={{ color: "#8d0b0b", fillOpacity: 0.9 }}
        >
          {title ? <Popup>{title}</Popup> : null}
        </CircleAny>
      </MapAny>
    </div>
  );
}
