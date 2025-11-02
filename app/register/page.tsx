import NavBar from "@/components/NavBar";
import RegisterForm from "./ui";

export default function RegisterPage() {
  return (
    <main>
      <NavBar />
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="card">
          <h1 className="text-xl font-semibold mb-4">Załóż konto</h1>
          <RegisterForm />
          <p className="text-xs text-gray-500 mt-4">
            Po rejestracji sprawdź skrzynkę e-mail (potwierdzenie), a następnie zaloguj się.
          </p>
          <p className="text-sm text-gray-600 mt-3">
  Nie masz konta? <a href="/register" className="underline">Zarejestruj się</a>
</p>

        </div>
      </div>
    </main>
  );
}
