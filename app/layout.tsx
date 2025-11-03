import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import Hero from "@/components/Hero";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ranking Elo",
  description: "Panel i ranking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <NavBar />
        <Hero mode="auto" /> {/* ukryje się na /admin, /login, /register */}
        {children}
      </body>
    </html>
  );
}
