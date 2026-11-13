import { useState, type FormEvent } from "react";
import { TarjetaRetro } from "./TarjetaRetro";
import { cop, type Material } from "../lib/cotizador";

interface VistaMaterialesProps {
  materiales: Material[];
  onGuardarMateriales: (materiales: Material[]) => void;
}

interface FormularioMaterial {
  nombre: string;
  anchoCm: string;
  altoCm: string;
  costoPliego: string;
}

const formularioVacio: FormularioMaterial = {
  nombre: "",
  anchoCm: "",
  altoCm: "",
  costoPliego: "",
};

export function VistaMateriales({
  materiales,
  onGuardarMateriales,
}: VistaMaterialesProps) {
  const [formulario, setFormulario] = useState<FormularioMaterial>(formularioVacio);
  const [idEdicion, setIdEdicion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cambiarCampo = (campo: keyof FormularioMaterial, valor: string) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  };

  const limpiarFormulario = () => {
    setFormulario(formularioVacio);
    setIdEdicion(null);
  };

  const editarMaterial = (material: Material) => {
    setFormulario({
      nombre: material.nombre,
      anchoCm: String(material.anchoCm),
      altoCm: String(material.altoCm),
      costoPliego: String(material.costoPliego),
    });
    setIdEdicion(material.id);
    setError(null);
    setMensaje(null);
  };

  const guardarMaterial = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMensaje(null);

    const nombre = formulario.nombre.trim();
    const anchoCm = Number(formulario.anchoCm);
    const altoCm = Number(formulario.altoCm);
    const costoPliego = Number(formulario.costoPliego);

    if (!nombre) {
      setError("Escribe el nombre del material.");
      return;
    }

    if (
      !Number.isFinite(anchoCm) || anchoCm <= 0 ||
      !Number.isFinite(altoCm) || altoCm <= 0 ||
      !Number.isFinite(costoPliego) || costoPliego <= 0
    ) {
      setError("El ancho, alto y costo deben ser valores mayores a cero.");
      return;
    }

    const material: Material = {
      id: idEdicion ?? `material-${crypto.randomUUID()}`,
      nombre,
      anchoCm,
      altoCm,
      costoPliego,
    };

    if (idEdicion) {
      onGuardarMateriales(
        materiales.map((actual) => actual.id === idEdicion ? material : actual),
      );
      setMensaje("Material actualizado correctamente.");
    } else {
      onGuardarMateriales([...materiales, material]);
      setMensaje("Material agregado al catálogo.");
    }

    limpiarFormulario();
  };

  const borrarMaterial = (material: Material) => {
    if (materiales.length <= 1) {
      setError("Debe quedar al menos un material en el catálogo.");
      return;
    }

    if (!window.confirm(`¿Seguro que deseas borrar "${material.nombre}" del catálogo?`)) {
      return;
    }

    onGuardarMateriales(materiales.filter((actual) => actual.id !== material.id));
    if (idEdicion === material.id) limpiarFormulario();
    setError(null);
    setMensaje(`Se eliminó "${material.nombre}" del catálogo.`);
  };

  return (
    <div className="mx-auto mt-8 grid w-full max-w-6xl gap-6 px-4 lg:grid-cols-[1.55fr_0.95fr]">
      <TarjetaRetro
        titulo="Catálogo del taller"
        acciones={
          <span className="font-mono text-[0.62rem] uppercase tracking-widest text-foreground/45">
            {materiales.length} {materiales.length === 1 ? "material" : "materiales"}
          </span>
        }
      >
        {materiales.length === 0 ? (
          <p className="neu-inset rounded-xl p-4 text-sm text-foreground/60">
            El catálogo está vacío. Agrega un material para comenzar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="etiqueta px-2 py-3">Material</th>
                  <th className="etiqueta px-2 py-3">Pliego</th>
                  <th className="etiqueta px-2 py-3">Costo</th>
                  <th className="etiqueta px-2 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {materiales.map((material) => (
                  <tr key={material.id} className="border-b border-foreground/10 last:border-0">
                    <td className="px-2 py-4 font-medium">{material.nombre}</td>
                    <td className="whitespace-nowrap px-2 py-4 font-mono text-sm text-foreground/70">
                      {material.anchoCm} × {material.altoCm} cm
                    </td>
                    <td className="whitespace-nowrap px-2 py-4 font-mono text-sm font-semibold text-[var(--esmeralda)]">
                      {cop(material.costoPliego)}
                    </td>
                    <td className="px-2 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn-neu px-3 py-2 text-xs"
                          onClick={() => editarMaterial(material)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn-neu btn-coral bg-[var(--coral)] px-3 py-2 text-xs text-white"
                          onClick={() => borrarMaterial(material)}
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TarjetaRetro>

      <TarjetaRetro titulo={idEdicion ? "Editar material" : "Agregar material"}>
        <form onSubmit={guardarMaterial} className="grid gap-4">
          <div>
            <label className="etiqueta" htmlFor="material-nombre">Nombre del material</label>
            <input
              id="material-nombre"
              className="campo"
              value={formulario.nombre}
              onChange={(event) => cambiarCampo("nombre", event.target.value)}
              placeholder="Vinilo Adhesivo Brillante 33x48cm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="etiqueta" htmlFor="material-ancho">Ancho pliego (cm)</label>
              <input
                id="material-ancho"
                className="campo font-mono"
                type="number"
                min="0.1"
                step="0.1"
                value={formulario.anchoCm}
                onChange={(event) => cambiarCampo("anchoCm", event.target.value)}
                required
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor="material-alto">Alto pliego (cm)</label>
              <input
                id="material-alto"
                className="campo font-mono"
                type="number"
                min="0.1"
                step="0.1"
                value={formulario.altoCm}
                onChange={(event) => cambiarCampo("altoCm", event.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="etiqueta" htmlFor="material-costo">Costo por pliego (COP)</label>
            <input
              id="material-costo"
              className="campo font-mono"
              type="number"
              min="1"
              step="100"
              value={formulario.costoPliego}
              onChange={(event) => cambiarCampo("costoPliego", event.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-[var(--coral)]" role="alert">{error}</p>}
          {mensaje && <p className="text-sm text-[var(--esmeralda)]" role="status">{mensaje}</p>}

          <button type="submit" className="btn-neu btn-cian mt-1 w-full">
            {idEdicion ? "Guardar cambios" : "Agregar al catálogo"}
          </button>
          {idEdicion && (
            <button type="button" className="btn-neu w-full" onClick={limpiarFormulario}>
              Cancelar edición
            </button>
          )}
        </form>
      </TarjetaRetro>
    </div>
  );
}
