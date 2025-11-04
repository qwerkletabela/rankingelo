"use client";

import dynamic from "next/dynamic";

const Inner = dynamic(() => import("./MapPickerInner"), { ssr: false });

export default function MapPicker({
  open,
  initialLat,
  initialLng,
  onPick,
  onClose,
  title = "Wybierz miejsce",
}: {
  open: boolean;
  initialLat?: number | null;
  initialLng?: number | null;
  onPick: (lat: number, lng: number) => void;
  onClose: () => void;
  title?: string;
}) {
  if (!open) return null;
  return (
    <Inner
      initialLat={initialLat ?? null}
      initialLng={initialLng ?? null}
      onPick={onPick}
      onClose={onClose}
      title={title}
    />
  );
}
