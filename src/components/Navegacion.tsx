const enlaces = [
  { href: "#", texto: "Cotizador", activo: true },
  { href: "#", texto: "Visualizador", activo: false },
  { href: "#", texto: "Materiales", activo: false },
];

export function Navegacion() {
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <a href="#" className="flex items-center gap-3">
        <span className="neu-chip grid h-11 w-11 place-items-center rounded-2xl font-mono text-base font-bold text-[var(--cian)]">
          CS
        </span>
        <span>
          <span className="block text-lg font-semibold leading-tight text-foreground">
            CotizaSticker
          </span>
          <span className="block font-mono text-[0.65rem] uppercase tracking-[0.2em] text-foreground/50">
            Taller de stickers · Colombia
          </span>
        </span>
      </a>

      <nav className="neu-inset flex gap-1 rounded-2xl p-1.5">
        {enlaces.map((e) => (
          <a
            key={e.texto}
            href={e.href}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              e.activo
                ? "neu-raised text-[var(--cian)] font-semibold"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {e.texto}
          </a>
        ))}
      </nav>
    </header>
  );
}