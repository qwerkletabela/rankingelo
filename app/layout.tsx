import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
//import Hero from "@/components/Hero";
import "leaflet/dist/leaflet.css";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ranking Elo",
  description: "Panel i ranking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        {/* 1) ZAWSZE na górze */}
        <NavBar />
        {/* 2) Hero pod spodem; ukryje się automatycznie na /admin, /login, /register */}
        //<Hero mode="auto" />
        {/* 3) Dopiero treść strony */}
        {children}
      </body>
    </html>
  );
}
