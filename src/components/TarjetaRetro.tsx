import type { ReactNode } from "react";

export function TarjetaRetro({
  titulo,
  acciones,
  children,
  className = "",
}: {
  titulo: string;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`neu-card ${className}`}>
      <header className="barra-titulo">
        <span className="flex gap-1.5">
          <i className="punto" style={{ background: "var(--coral)" }} />
          <i className="punto" style={{ background: "var(--ambar)" }} />
          <i className="punto" style={{ background: "var(--esmeralda)" }} />
        </span>
        <h2 className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-foreground/70">
          {titulo}
        </h2>
        <span className="ml-auto flex items-center gap-2">{acciones}</span>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}