import { TarjetaRetro } from "./TarjetaRetro";
import { cop } from "../lib/cotizador";

export interface CotizacionGuardada {
  id: number | string;
  referencia: string;
  cantidad: number;
  ancho_cm: number;
  alto_cm: number;
  forma?: string | null;
  precio_final: number;
  created_at?: string | null;
  estado?: string | null;
  material_id?: string | null;
  sangria_mm?: number | null;
  detalles_extra?: { margen?: number | null } | null;
}

interface VistaHistorialProps {
  cotizaciones: CotizacionGuardada[];
  cargando: boolean;
  error: string | null;
  onRecargar: () => void;
  onEditar: (cotizacion: CotizacionGuardada) => void;
}

export function VistaHistorial({
  cotizaciones,
  cargando,
  error,
  onRecargar,
  onEditar,
}: VistaHistorialProps) {
  return (
    <div className="mx-auto mt-8 w-full max-w-5xl px-4">
      <TarjetaRetro
        titulo="📁 Historial de cotizaciones"
        acciones={
          <button
            type="button"
            className="btn-neu px-3 py-1 text-xs"
            onClick={onRecargar}
            disabled={cargando}
          >
            {cargando ? "Cargando..." : "Actualizar"}
          </button>
        }
      >
        {error ? (
          <div className="neu-inset rounded-2xl p-4 text-sm text-[var(--coral)]" role="alert">
            <p>No se pudo cargar el historial: {error}</p>
            <button type="button" className="btn-neu mt-3" onClick={onRecargar}>
              Intentar de nuevo
            </button>
          </div>
        ) : cargando && cotizaciones.length === 0 ? (
          <p className="text-sm text-foreground/60" role="status">
            Cargando cotizaciones...
          </p>
        ) : cotizaciones.length === 0 ? (
          <p className="neu-inset rounded-2xl p-4 text-sm text-foreground/60">
            Todavía no hay cotizaciones guardadas.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cotizaciones.map((cotizacion) => (
              <article key={cotizacion.id} className="neu-chip rounded-xl p-4">
                <p className="truncate font-bold">{cotizacion.referencia || "Sin título"}</p>
                <p className="mt-1 text-xs text-foreground/60">
                  {cotizacion.cantidad} piezas · {cotizacion.ancho_cm} × {cotizacion.alto_cm} cm
                  {cotizacion.forma ? ` · ${cotizacion.forma}` : ""}
                </p>
                <p className="mt-3 font-mono text-lg font-bold text-[var(--esmeralda)]">
                  {cop(cotizacion.precio_final)}
                </p>
                {cotizacion.created_at && (
                  <time
                    className="mt-1 block text-xs text-foreground/50"
                    dateTime={cotizacion.created_at}
                  >
                    {new Date(cotizacion.created_at).toLocaleString("es-CO")}
                  </time>
                )}
                <button
                  type="button"
                  className="btn-neu mt-3 w-full"
                  onClick={() => onEditar(cotizacion)}
                  disabled={cotizacion.estado === "eliminada"}
                >
                  {cotizacion.estado === "eliminada" ? "Cotización eliminada" : "Editar"}
                </button>
              </article>
            ))}
          </div>
        )}
      </TarjetaRetro>
    </div>
  );
}
