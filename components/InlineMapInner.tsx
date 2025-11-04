"use client";

import { MapContainer as RLMapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

// Bezpieczny cast – omija dziwne typy w niektórych buildach Vercela
const MapAny = RLMapContainer as any;

export default function InlineMapInner({
  lat,
  lng,
  title,
}: {
  lat: number;
  lng: number;
  title?: string;
}) {
  // zamiast importu LatLngExpression użyj prostego tupla + cast
  const center = [lat, lng] as [number, number];

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">
      <MapAny center={center} zoom={13} style={{ height: 220, width: "100%" }} scrollWheelZoom={true}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OSM contributors"
        />
        <CircleMarker
          center={center as any}
          radius={10}
          pathOptions={{ color: "#8d0b0b", fillOpacity: 0.9 }}
        >
          {title ? <Popup>{title}</Popup> : null}
        </CircleMarker>
      </MapAny>
    </div>
  );
}
