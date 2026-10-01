import { useMemo, useState } from "react";
import { Navegacion } from "./components/Navegacion";
import { TarjetaRetro } from "./components/TarjetaRetro";
import { PliegoSVG } from "./components/PliegoSVG";
import {
  actualizarCotizacion,
  calcular,
  cop,
  materialActivo,
  useTaller,
} from "./lib/cotizador";

export default function App() {
  const { materiales, cotizacion } = useTaller();
  const [copiado, setCopiado] = useState(false);

  const material = materialActivo(materiales, cotizacion.materialId);
  const r = useMemo(() => calcular(cotizacion, material), [cotizacion, material]);

  const resumen = [
    `*Cotización CotizaSticker*`,
    `Trabajo: ${cotizacion.referencia}`,
    `Material: ${material.nombre} (${material.anchoCm}x${material.altoCm} cm)`,
    `Pieza: ${cotizacion.anchoPieza} x ${cotizacion.altoPieza} cm · Sangría ${cotizacion.sangriaMm} mm`,
    `Cantidad: ${cotizacion.cantidad} piezas`,
    `Distribución: ${r.columnas} x ${r.filas} = ${r.piezasPorPliego} piezas por pliego`,
    `Pliegos requeridos: ${r.pliegos}`,
    `Desperdicio estimado: ${r.desperdicio.toFixed(1)}%`,
    `Costo de producción: ${cop(r.costoTotal)}`,
    `*Precio final: ${cop(r.precioFinal)}* (${cop(r.precioUnitario)} c/u)`,
  ].join("\n");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(resumen);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      setCopiado(false);
    }
  }

  const set = actualizarCotizacion;

  return (
    <main className="min-h-screen pb-16">
      <Navegacion />

      <div className="mx-auto mt-8 grid w-full max-w-6xl gap-6 px-4 lg:grid-cols-[1.05fr_0.95fr]">
        <TarjetaRetro titulo="Datos del trabajo">
          <div className="grid gap-4">
            <div>
              <label className="etiqueta" htmlFor="ref">
                Nombre o referencia
              </label>
              <input
                id="ref"
                className="campo"
                value={cotizacion.referencia}
                onChange={(e) => set({ referencia: e.target.value })}
                placeholder="Sticker circular cliente Panadería El Trigal"
              />
            </div>

            <div>
              <label className="etiqueta" htmlFor="mat">
                Material del catálogo
              </label>
              <select
                id="mat"
                className="campo"
                value={material.id}
                onChange={(e) => set({ materialId: e.target.value })}
              >
                {materiales.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} — {cop(m.costoPliego)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="etiqueta" htmlFor="ancho">
                  Ancho pieza (cm)
                </label>
                <input
                  id="ancho"
                  type="number"
                  min={0.5}
                  step={0.1}
                  className="campo font-mono"
                  value={cotizacion.anchoPieza}
                  onChange={(e) => set({ anchoPieza: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="etiqueta" htmlFor="alto">
                  Alto pieza (cm)
                </label>
                <input
                  id="alto"
                  type="number"
                  min={0.5}
                  step={0.1}
                  className="campo font-mono"
                  value={cotizacion.altoPieza}
                  onChange={(e) => set({ altoPieza: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <span className="etiqueta">Forma de la pieza</span>
              <div className="neu-inset grid grid-cols-2 gap-1 rounded-2xl p-1.5">
                {(["rectangulo", "circulo"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => set({ forma: f })}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                      cotizacion.forma === f
                        ? "neu-raised text-[var(--cian)]"
                        : "text-foreground/55"
                    }`}
                  >
                    {f === "rectangulo" ? "Rectangular" : "Circular"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="etiqueta" htmlFor="cant">
                  Cantidad
                </label>
                <input
                  id="cant"
                  type="number"
                  min={1}
                  className="campo font-mono"
                  value={cotizacion.cantidad}
                  onChange={(e) => set({ cantidad: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="etiqueta" htmlFor="sangria">
                  Sangría (mm)
                </label>
                <input
                  id="sangria"
                  type="number"
                  min={0}
                  step={0.5}
                  className="campo font-mono"
                  value={cotizacion.sangriaMm}
                  onChange={(e) => set({ sangriaMm: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="etiqueta" htmlFor="margen">
                  Ganancia (%)
                </label>
                <input
                  id="margen"
                  type="number"
                  min={0}
                  className="campo font-mono"
                  value={cotizacion.margen}
                  onChange={(e) => set({ margen: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
        </TarjetaRetro>

        <div className="grid content-start gap-6">
          <TarjetaRetro
            titulo="Resultados inmediatos"
            acciones={
              <span className="font-mono text-[0.62rem] uppercase tracking-widest text-foreground/45">
                {material.anchoCm}×{material.altoCm} cm
              </span>
            }
          >
            {!r.cabe ? (
              <p className="neu-inset rounded-2xl p-4 text-sm font-medium text-[var(--coral)]">
                La pieza de {cotizacion.anchoPieza}×{cotizacion.altoPieza} cm no cabe en este
                pliego. Reduce el tamaño o elige otro material.
              </p>
            ) : (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Dato
                    titulo="Piezas por pliego"
                    valor={`${r.piezasPorPliego}`}
                    nota={`${r.columnas} col × ${r.filas} fil · ${r.orientacion}`}
                  />
                  <Dato titulo="Pliegos requeridos" valor={`${r.pliegos}`} nota="láminas a cortar" />
                </div>

                <div className="neu-inset rounded-2xl p-4">
                  <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-foreground/55">
                    <span>Desperdicio estimado</span>
                    <span
                      style={{
                        color: r.desperdicio > 30 ? "var(--coral)" : "var(--esmeralda)",
                      }}
                    >
                      {r.desperdicio.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--foreground)_10%,transparent)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, r.desperdicio)}%`,
                        background: r.desperdicio > 30 ? "var(--coral)" : "var(--esmeralda)",
                      }}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="neu-chip rounded-2xl p-4">
                    <p className="etiqueta">Costo producción</p>
                    <p className="font-mono text-xl font-semibold">{cop(r.costoTotal)}</p>
                    <p className="mt-1 text-xs text-foreground/50">{cop(r.costoUnitario)} c/u</p>
                  </div>
                  <div
                    className="rounded-2xl p-4 text-white"
                    style={{
                      background: "linear-gradient(145deg,#28b78e,#1b8a6b)",
                      boxShadow: "6px 6px 14px var(--sombra), -6px -6px 14px var(--luz)",
                    }}
                  >
                    <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] opacity-80">
                      Precio final
                    </p>
                    <p className="font-mono text-xl font-bold">{cop(r.precioFinal)}</p>
                    <p className="mt-1 text-xs opacity-85">{cop(r.precioUnitario)} c/u</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 print:hidden">
                  <button className="btn-neu btn-cian flex-1" onClick={copiar}>
                    {copiado ? "¡Resumen copiado!" : "Copiar resumen para WhatsApp"}
                  </button>
                  <button className="btn-neu" onClick={() => window.print()}>
                    Descargar PDF / Imprimir
                  </button>
                </div>
              </div>
            )}
          </TarjetaRetro>

          <TarjetaRetro titulo="Vista previa del pliego">
            <div className="neu-inset mx-auto h-[280px] rounded-2xl p-4">
              {r.cabe ? (
                <PliegoSVG
                  material={material}
                  cotizacion={cotizacion}
                  resultado={r}
                  piezasVisibles={Math.min(r.piezasPorPliego, cotizacion.cantidad)}
                />
              ) : (
                <p className="grid h-full place-items-center text-sm text-foreground/50">
                  Sin distribución disponible
                </p>
              )}
            </div>
          </TarjetaRetro>
        </div>
      </div>
    </main>
  );
}

function Dato({ titulo, valor, nota }: { titulo: string; valor: string; nota: string }) {
  return (
    <div className="neu-chip rounded-2xl p-4">
      <p className="etiqueta">{titulo}</p>
      <p className="font-mono text-2xl font-bold text-[var(--cian)]">{valor}</p>
      <p className="mt-1 text-xs text-foreground/50">{nota}</p>
    </div>
  );
}