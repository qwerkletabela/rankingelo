"use client";
import { usePathname } from "next/navigation";
import Hero from "./Hero";

const HIDE_ON = ["/admin", "/login", "/register"];

export default function HeroGlobal() {
  const p = usePathname() || "/";
  if (HIDE_ON.some((base) => p.startsWith(base))) return null;
  return <Hero />;
}
