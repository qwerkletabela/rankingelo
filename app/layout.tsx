// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import "leaflet/dist/leaflet.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ranking Elo",
  description: "Panel i ranking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      {/* tło także jako klasa Tailwinda, plus fallback w globals.css */}
      <body className="bg-rose-50">
        <NavBar />
        {/* odstęp pod sticky navbarem (dostosuj wysokość, jeśli trzeba) */}
        <div className="pt-16 md:pt-20">
          {children}
        </div>
      </body>
    </html>
  );
}
