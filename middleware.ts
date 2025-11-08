// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export const runtime = "edge"; // Vercel Edge: szybciej i taniej

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => res.cookies.set(name, value, options),
        remove: (name, options) =>
          res.cookies.set(name, "", { ...options, maxAge: 0 }),
      },
    }
  );

  // wymusza ewentualny refresh sesji i ustawi cookies w 'res'
  await supabase.auth.getUser();

  return res;
}
