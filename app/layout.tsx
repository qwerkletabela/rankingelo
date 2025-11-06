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
      <body className={inter.className}>
        {/* 1) ZAWSZE na górze */}
        <NavBar />
        {/* 2) Odstęp równy wysokości paska (h-14 ≈ 56px); dałem lekki zapas na desktopie */}
        <div className="pt-14 md:pt-16">
          {children}
        </div>
      </body>
    </html>
  );
}
