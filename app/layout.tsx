import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Statsweb-like Dashboard",
  description: "Lightweight stats dashboard (no DB, mock data).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className={inter.className}>
        <div className="container-outer">
          {children}
        </div>
      </body>
    </html>
  );
}
