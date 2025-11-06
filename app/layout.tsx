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
      <body className={`${inter.className} bg-rose-100 min-h-screen`}>
        <NavBar />
        <div className="pt-14 md:pt-16">   {/* odstęp pod navbar */}
          {children}
        </div>
      </body>
    </html>
  );
}
