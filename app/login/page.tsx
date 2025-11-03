import NavBar from "@/components/NavBar";
import LoginForm from "./ui";
import { Suspense } from "react";

export const dynamic = "force-dynamic"; // opcjonalnie, żeby login nie był cachowany

export default function LoginPage() {
  return (
    <main>
      <NavBar />
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="card">
          <h1 className="text-xl font-semibold mb-4">Logowanie administratora</h1>
          <Suspense fallback={<div className="text-sm text-gray-500">Ładowanie…</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
