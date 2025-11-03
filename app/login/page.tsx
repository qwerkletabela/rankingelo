import LoginForm from "./ui";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const nextParam = searchParams?.next ?? null;

  return (
    <main>
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="card">
          <h1 className="text-xl font-semibold mb-4">Logowanie</h1>
          <LoginForm nextParam={nextParam} />
        </div>
      </div>
    </main>
  );
}
