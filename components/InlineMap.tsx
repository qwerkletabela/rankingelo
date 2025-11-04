"use client";
import dynamic from "next/dynamic";

const Inner = dynamic(() => import("./InlineMapInner"), { ssr: false });

export default function InlineMap({
  lat,
  lng,
  title,
}: {
  lat: number;
  lng: number;
  title?: string;
}) {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return <Inner lat={lat} lng={lng} title={title} />;
}
