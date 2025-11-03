import NavBar from "@/components/NavBar";
import LoginForm from "./ui";

// opcjonalnie wyłącz cache dla /login
export const dynamic = "force-dynamic";
// lub: export const revalidate = 0;

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const nextParam = searchParams?.next ?? null;

  return (
    <main>
      <NavBar />
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="card">
          <h1 className="text-xl font-semibold mb-4">Logowanie administratora</h1>
          {/* LoginForm to komponent kliencki, ale nextParam przekazujemy z serwera */}
          <LoginForm nextParam={nextParam} />
        </div>
      </div>
    </main>
  );
}
