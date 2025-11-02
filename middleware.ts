// middleware.ts (katalog główny projektu)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export default async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Upewnij się, że te zmienne masz w .env.local
  // NEXT_PUBLIC_SUPABASE_URL=...
  // NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // To wywołanie synchronizuje/odświeża sesję i ustawia brakujące cookies
  await supabase.auth.getSession();

  return res;
}

// Wyklucz statyczne zasoby, żeby middleware nie spowalniał assetów
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
