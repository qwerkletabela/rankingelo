import NavBarShell from "@/components/NavBarShell";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <NavBarShell />
        {children}
      </body>
    </html>
  );
}
