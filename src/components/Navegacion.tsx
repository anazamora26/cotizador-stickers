import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export type Vista = "cotizador" | "visualizador" | "materiales" | "historial";

interface NavegacionProps {
  vistaActiva: Vista;
  setVistaActiva: (vista: Vista) => void;
  session: Session;
}

export function Navegacion({ vistaActiva, setVistaActiva, session }: NavegacionProps) {
  const cerrarSesion = async () => {
    if (!window.confirm("¿Seguro que deseas cerrar sesión?")) return;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: unknown) {
      alert(
        `No se pudo cerrar sesión: ${
          error instanceof Error ? error.message : "Error inesperado."
        }`,
      );
    }
  };

  const menu: Array<{ id: Vista; label: string }> = [
    { id: "cotizador", label: "🧮 Cotizador" },
    { id: "visualizador", label: "👁️ Vista 2D" },
    { id: "materiales", label: "📦 Materiales" },
    { id: "historial", label: "📁 Historial" },
  ];

  return (
    <header className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="neu-chip grid h-11 w-11 place-items-center rounded-2xl font-mono text-base font-bold text-[var(--cian)]">
          CS
        </span>
        <div>
          <span className="block text-lg font-semibold leading-tight text-foreground">
            CotizaSticker
          </span>
          <span className="block font-mono text-[0.65rem] uppercase tracking-[0.2em] text-foreground/50">
            Taller de stickers · Colombia
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:items-end">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <span className="max-w-56 truncate text-xs text-foreground/60" title={session.user.email ?? ""}>
            {session.user.email}
          </span>
          <button
            type="button"
            className="btn-neu px-3 py-2 text-xs font-semibold"
            onClick={() => void cerrarSesion()}
          >
            SALIR 🚪
          </button>
        </div>
        <nav className="neu-inset flex gap-1 rounded-2xl p-1.5">
          {menu.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setVistaActiva(item.id)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                vistaActiva === item.id
                  ? "neu-raised text-[var(--cian)] font-semibold"
                  : "text-foreground/60 hover:text-foreground/80"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}