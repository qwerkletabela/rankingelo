"use client";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

export default function InlineMapInner({
  lat,
  lng,
  title,
}: {
  lat: number;
  lng: number;
  title?: string;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">
      <MapContainer
        center={[lat, lng]}
        zoom={13}
        style={{ height: 220, width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OSM contributors'
        />
        <CircleMarker
          center={[lat, lng]}
          radius={10}
          pathOptions={{ color: "#8d0b0b", fillOpacity: 0.9 }}
        >
          {title ? <Popup>{title}</Popup> : null}
        </CircleMarker>
      </MapContainer>
    </div>
  );
}
