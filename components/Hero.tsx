export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* czerwone tło w stylu Rummikub */}
      <div className="absolute inset-0 -z-10">
        <div className="h-64 bg-gradient-to-b from-brand-700 via-brand-700 to-brand-800" />
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-10 pb-20 text-white">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          Ranking Rummikub & Qwirkle
        </h1>
        <p className="mt-3 text-white/90 max-w-2xl">
          Administruj turniejami, podglądaj listy z Google Sheets i śledź formę graczy w czasie.
        </p>

        <div className="mt-6 flex gap-3">
          <a href="/admin" className="btn btn-ghost bg-white/15 text-white ring-1 ring-white/20">
            Panel Admina
          </a>
          <a href="/matches" className="btn btn-ghost bg-white text-brand-800">
            Zobacz mecze
          </a>
        </div>
      </div>
    </section>
  );
}
