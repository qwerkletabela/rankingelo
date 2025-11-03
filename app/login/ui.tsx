// fragment onSubmit w LoginForm (client component)
const router = useRouter();

const onSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setErr(null);

  const { data, error } = await supabaseBrowser.auth.signInWithPassword({
    email,
    password,
  });
  if (error) { setErr(error.message); return; }

  // wczytaj rangę i przekieruj
  const user = data.user;
  if (user) {
    const { data: me } = await supabaseBrowser
      .from("users")
      .select("ranga")
      .eq("id", user.id)
      .maybeSingle();

    if (me?.ranga === "admin") {
      router.replace("/admin"); // ⬅️ admin trafia prosto do panelu
    } else {
      router.replace("/");      // zwykły użytkownik na stronę główną
    }
  }
};
