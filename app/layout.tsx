import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import HeroGlobal from "@/components/HeroGlobal";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ranking Rummikub & Qwirkle",
  description: "Panel i ranking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <div className="container-outer">
          <NavBar />
          <HeroGlobal />   {/* <- hero w całej aplikacji, ale ukryty na admin/login */}
          {children}
        </div>
      </body>
    </html>
  );
}
