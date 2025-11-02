import NavBar from "@/components/NavBar";
import LoginForm from "./ui";
export default function LoginPage() {
  return (
    <main>
      <NavBar />
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="card">
          <h1 className="text-xl font-semibold mb-4">Logowanie administratora</h1>
          <LoginForm />
          <p className="text-xs text-gray-500 mt-4">
            Zaloguj się kontem Supabase. Aby uzyskać dostęp do panelu, Twoje konto musi mieć <code>ranga='admin'</code> w tabeli <code>users</code>.
          </p>
        </div>
      </div>
    </main>
  );
}
