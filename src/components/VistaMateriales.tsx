import { useState } from "react";
import { TarjetaRetro } from "./TarjetaRetro";
import { cop, type Material } from "../lib/cotizador";

interface VistaMaterialesProps {
  materiales: Material[];
  onActualizarMaterial: (mat: Material) => void;
}

export function VistaMateriales({ materiales, onActualizarMaterial }: VistaMaterialesProps) {
  const [seleccionado, setSeleccionado] = useState<Material>(materiales[0]);
  const [costo, setCosto] = useState<number>(materiales[0]?.costoPliego || 0);

  const guardarCambio = (e: React.FormEvent) => {
    e.preventDefault();
    if (costo <= 0) return alert("El costo debe ser mayor a 0 COP.");
    onActualizarMaterial({ ...seleccionado, costoPliego: costo });
    alert(`Costo de ${seleccionado.nombre} actualizado a ${cop(costo)}`);
  };

  return (
    <div className="mx-auto mt-8 grid w-full max-w-5xl gap-6 px-4 md:grid-cols-[1.2fr_0.8fr]">
      <TarjetaRetro titulo="📦 Catálogo de Materiales">
        <div className="grid gap-3">
          {materiales.map((m) => (
            <div
              key={m.id}
              onClick={() => {
                setSeleccionado(m);
                setCosto(m.costoPliego);
              }}
              className={`neu-chip flex cursor-pointer items-center justify-between rounded-2xl p-4 transition-all ${
                seleccionado.id === m.id ? "border border-[var(--cian)]" : ""
              }`}
            >
              <div>
                <p className="font-semibold text-foreground">{m.nombre}</p>
                <p className="font-mono text-xs text-foreground/50">
                  Pliego: {m.anchoCm} x {m.altoCm} cm
                </p>
              </div>
              <p className="font-mono text-sm font-bold text-[var(--esmeralda)]">
                {cop(m.costoPliego)}
              </p>
            </div>
          ))}
        </div>
      </TarjetaRetro>

      <TarjetaRetro titulo="✏️ Editar Tarifa de Pliego">
        <form onSubmit={guardarCambio} className="grid gap-4">
          <div>
            <label className="etiqueta">Material seleccionado</label>
            <p className="campo font-semibold text-foreground/70">{seleccionado.nombre}</p>
          </div>
          <div>
            <label className="etiqueta">Nuevo costo por pliego (COP)</label>
            <input
              type="number"
              min={1}
              step={100}
              className="campo font-mono"
              value={costo}
              onChange={(e) => setCosto(Number(e.target.value))}
            />
          </div>
          <button type="submit" className="btn-neu btn-cian mt-2">
            Guardar Cambio de Precio
          </button>
        </form>
      </TarjetaRetro>
    </div>
  );
}