"use client";

import {
  MapContainer as RLMapContainer,
  TileLayer as RLTileLayer,
  CircleMarker as RLCircleMarker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import { useMemo, useState } from "react";

// Bezpieczne casty – unikają problemów z d.ts
const MapAny = RLMapContainer as any;
const TileAny = RLTileLayer as any;
const CircleAny = RLCircleMarker as any;

function ClickCatcher({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: any) {
      const { lat, lng } = e.latlng || {};
      if (typeof lat === "number" && typeof lng === "number") onClick(lat, lng);
    },
  });
  return null;
}

export default function MapPickerInner({
  initialLat,
  initialLng,
  onPick,
  onClose,
  title,
}: {
  initialLat: number | null;
  initialLng: number | null;
  onPick: (lat: number, lng: number) => void;
  onClose: () => void;
  title: string;
}) {
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
  );
  const center = useMemo<[number, number]>(
    () => (point ? [point.lat, point.lng] : [52.2297, 21.0122]), // Warszawa
    [point]
  );
  const zoom = point ? 13 : 6;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* modal */}
      <div className="absolute inset-x-0 top-10 mx-auto w-[95%] max-w-3xl rounded-xl bg-white shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-sm px-2 py-1 rounded-md hover:bg-gray-100">
            Zamknij
          </button>
        </div>

        <div className="p-4 grid gap-3">
          <div className="text-sm text-gray-600">
            Kliknij w mapę, aby wskazać punkt. Potem naciśnij „Zapisz”.
          </div>

          <div className="rounded-xl overflow-hidden border border-gray-200">
            <MapAny
              center={center}
              zoom={zoom}
              style={{ height: 360, width: "100%" }}
              scrollWheelZoom
            >
              <TileAny
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <ClickCatcher onClick={(lat, lng) => setPoint({ lat, lng })} />
              {point && (
                <CircleAny
                  center={[point.lat, point.lng]}
                  radius={10}
                  pathOptions={{ color: "#8d0b0b", fillOpacity: 0.9 }}
                >
                  <Popup>
                    <div className="text-sm">
                      <div>
                        <b>Lat:</b> {point.lat.toFixed(6)}
                      </div>
                      <div>
                        <b>Lng:</b> {point.lng.toFixed(6)}
                      </div>
                    </div>
                  </Popup>
                </CircleAny>
              )}
            </MapAny>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn btn-primary"
              disabled={!point}
              onClick={() => {
                if (point) onPick(point.lat, point.lng);
              }}
            >
              Zapisz
            </button>
            <button className="btn btn-ghost" onClick={onClose}>
              Anuluj
            </button>
            {point && (
              <span className="ml-auto text-xs text-gray-600">
                Wybrane: {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
