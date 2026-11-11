import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Login } from "./components/Login";
import { Navegacion, type Vista } from "./components/Navegacion";
import { TarjetaRetro } from "./components/TarjetaRetro";
import { PliegoSVG } from "./components/PliegoSVG";
import { VistaHistorial, type CotizacionGuardada } from "./components/VistaHistorial";
import { VistaMateriales } from "./components/VistaMateriales";
import { consultarAsesorTaller } from "./lib/gemini";
import { supabase } from "./lib/supabase";
import {
   actualizarCotizacion,
   calcular,
   cop,
   guardarMateriales,
   materialActivo,
   useTaller,
   type Cotizacion,
   type Material,
} from "./lib/cotizador";

export default function App() {
   const [session, setSession] = useState<Session | null>(null);
   const [cargandoSesion, setCargandoSesion] = useState(true);
   const [errorSesion, setErrorSesion] = useState<string | null>(null);
   const { materiales, cotizacion } = useTaller();
   const [vistaActiva, setVistaActiva] = useState<Vista>("cotizador");
   const material = materialActivo(materiales, cotizacion.materialId);

   // Estado del asesor automático
   const [diagnosticoIA, setDiagnosticoIA] = useState<string | null>(null);
   const [cargandoIA, setCargandoIA] = useState(false);
   const [errorIA, setErrorIA] = useState<string | null>(null);
   const [consultasIA, setConsultasIA] = useState(0);
   const [estadoIA, setEstadoIA] = useState<
     "inicial" | "pendiente" | "analizando" | "listo" | "error" | "incompleto"
   >("inicial");
   const temporizadorIA = useRef<number | null>(null);
   const solicitudIA = useRef(0);
   const ultimaConsultaIA = useRef<string | null>(null);
   const hayCambiosIA = useRef(false);
   const [cotizacionesGuardadas, setCotizacionesGuardadas] = useState<CotizacionGuardada[]>([]);
   const [cargandoHistorial, setCargandoHistorial] = useState(true);
   const [historialSesionId, setHistorialSesionId] = useState<string | null>(null);
   const [errorHistorial, setErrorHistorial] = useState<string | null>(null);
   const [guardandoCotizacion, setGuardandoCotizacion] = useState(false);
   const [mensajeGuardado, setMensajeGuardado] = useState<string | null>(null);
   const [idEdicion, setIdEdicion] = useState<CotizacionGuardada["id"] | null>(null);
   const historialParaIA = useMemo(
     () => session && historialSesionId === session.user.id ? cotizacionesGuardadas : [],
     [session, historialSesionId, cotizacionesGuardadas],
   );

   useEffect(() => {
     let activo = true;
     let recibioEventoAuth = false;
     const { data: { subscription } } = supabase.auth.onAuthStateChange(
       (_evento, nuevaSesion) => {
         recibioEventoAuth = true;
         if (!activo) return;
         setSession(nuevaSesion);
         setCargandoSesion(false);
         setErrorSesion(null);
       },
     );

     void supabase.auth.getSession()
       .then(({ data, error }) => {
         if (!activo || recibioEventoAuth) return;
         if (error) {
           setErrorSesion(error.message);
         } else {
           setSession(data.session);
         }
         setCargandoSesion(false);
       })
       .catch((error: unknown) => {
         if (!activo || recibioEventoAuth) return;
         setErrorSesion(
           error instanceof Error ? error.message : "No se pudo comprobar la sesión.",
         );
         setCargandoSesion(false);
       });

     return () => {
       activo = false;
       subscription.unsubscribe();
     };
   }, []);

   const r = useMemo(() => calcular(cotizacion, material), [cotizacion, material]);
   const datosAsesor = useRef({ cotizacion, material, resultado: r, historial: historialParaIA });

   useEffect(() => {
     datosAsesor.current = { cotizacion, material, resultado: r, historial: historialParaIA };
   }, [cotizacion, material, r, historialParaIA]);

   useEffect(() => () => {
     if (temporizadorIA.current !== null) window.clearTimeout(temporizadorIA.current);
     solicitudIA.current += 1;
   }, []);

   const obtenerHistorial = useCallback(async () => {
     if (!session) return [];

     const { data, error } = await supabase
       .from("cotizaciones")
       .select("id, referencia, cantidad, ancho_cm, alto_cm, precio_final, estado, material_id, forma, sangria_mm, detalles_extra, created_at")
       .eq("user_id", session.user.id)
       .order("created_at", { ascending: false })
       .limit(15)
       .returns<CotizacionGuardada[]>();

     if (error) throw error;
     return data ?? [];
   }, [session]);

   useEffect(() => {
     let activo = true;
     if (cargandoSesion) {
       return () => {
         activo = false;
       };
     }

     if (!session) {
       return () => {
         activo = false;
       };
     }

     void obtenerHistorial()
       .then((cotizaciones) => {
         if (activo) {
           setCotizacionesGuardadas(cotizaciones);
           setErrorHistorial(null);
         }
       })
       .catch((error: unknown) => {
         if (activo) {
           setErrorHistorial(
             error instanceof Error ? error.message : "Ocurrió un error inesperado.",
           );
         }
       })
       .finally(() => {
         if (activo) {
           setHistorialSesionId(session.user.id);
           setCargandoHistorial(false);
         }
       });

     return () => {
       activo = false;
     };
   }, [obtenerHistorial, cargandoSesion, session]);

   const handleRecargarHistorial = async () => {
     setCargandoHistorial(true);
     setErrorHistorial(null);
     try {
       setCotizacionesGuardadas(await obtenerHistorial());
       if (session) setHistorialSesionId(session.user.id);
     } catch (error) {
       setErrorHistorial(
         error instanceof Error ? error.message : "Ocurrió un error inesperado.",
       );
     } finally {
       setCargandoHistorial(false);
     }
   };

   const handleActualizarMaterial = (matActualizado: Material) => {
     guardarMateriales(materiales.map((m) => (m.id === matActualizado.id ? matActualizado : m)));
   };

   const handleGuardarCotizacion = async () => {
     if (!session) {
       setMensajeGuardado("Inicia sesión para guardar una cotización.");
       return;
     }
     if (!r.cabe) return;
     setGuardandoCotizacion(true);
     setMensajeGuardado(null);
     setErrorHistorial(null);
     try {
       const datosGuardados = {
         user_id: session.user.id,
         referencia: cotizacion.referencia || "Sin título",
         material_id: material.id,
         ancho_cm: cotizacion.anchoPieza,
         alto_cm: cotizacion.altoPieza,
         forma: cotizacion.forma,
         cantidad: cotizacion.cantidad,
         sangria_mm: cotizacion.sangriaMm,
         pliegos_requeridos: r.pliegos,
         desperdicio_pct: Number(r.desperdicio.toFixed(1)),
         costo_produccion: r.costoTotal,
         precio_final: r.precioFinal,
         detalles_extra: {
           plataforma: navigator.platform,
           navegador: navigator.userAgent,
           margen: cotizacion.margen,
         },
       };

       if (idEdicion !== null) {
         const { data, error } = await supabase
           .from("cotizaciones")
           .update(datosGuardados)
           .eq("id", idEdicion)
           .eq("user_id", session.user.id)
           .select("id")
           .maybeSingle();

         if (error) throw error;
         if (!data) throw new Error("No se encontró la cotización para actualizar.");
         setIdEdicion(null);
       } else {
         const { error } = await supabase.from("cotizaciones").insert(datosGuardados);
         if (error) throw error;
       }

       setMensajeGuardado(
         idEdicion !== null
           ? "Cotización actualizada correctamente."
           : "Cotización guardada correctamente.",
       );
       await handleRecargarHistorial();
     } catch (error) {
       setMensajeGuardado(
         error instanceof Error
           ? `No se pudo guardar la cotización: ${error.message}`
           : "No se pudo guardar la cotización por un error inesperado.",
       );
     } finally {
       setGuardandoCotizacion(false);
     }
   };

  const set = actualizarCotizacion;
  const actualizarDatos = (cambios: Parameters<typeof set>[0]) => {
    set(cambios);
    solicitudIA.current += 1;
    hayCambiosIA.current = true;
    setCargandoIA(false);
    setDiagnosticoIA(null);
    setErrorIA(null);
    setEstadoIA("pendiente");
  };

  const programarAnalisisIA = () => {
    if (temporizadorIA.current !== null) window.clearTimeout(temporizadorIA.current);
    temporizadorIA.current = window.setTimeout(() => {
      temporizadorIA.current = null;
      if (!hayCambiosIA.current) return;

      const { cotizacion: datos, material: sustrato, resultado, historial } = datosAsesor.current;
      const datosValidos =
        Number.isFinite(datos.anchoPieza) && datos.anchoPieza > 0 &&
        Number.isFinite(datos.altoPieza) && datos.altoPieza > 0 &&
        Number.isFinite(datos.cantidad) && datos.cantidad > 0 &&
        Number.isFinite(datos.sangriaMm) && datos.sangriaMm >= 0 &&
        Number.isFinite(datos.margen) && datos.margen >= 0;

      hayCambiosIA.current = false;
      if (!datosValidos) {
        setEstadoIA("incompleto");
        return;
      }

      const claveConsulta = JSON.stringify({ cotizacion: datos, material: sustrato, resultado, historial });
      if (claveConsulta === ultimaConsultaIA.current) {
        setEstadoIA(diagnosticoIA ? "listo" : "inicial");
        return;
      }

      ultimaConsultaIA.current = claveConsulta;
      const idSolicitud = ++solicitudIA.current;
      setCargandoIA(true);
      setEstadoIA("analizando");
      setErrorIA(null);

      void consultarAsesorTaller(
        datos,
        { ...resultado, material: sustrato },
        historial,
      )
        .then((diagnostico) => {
          if (idSolicitud !== solicitudIA.current) return;
          setDiagnosticoIA(diagnostico || "El análisis no generó un diagnóstico.");
          setConsultasIA((prev) => prev + 1);
          setEstadoIA("listo");
        })
        .catch((error: unknown) => {
          if (idSolicitud !== solicitudIA.current) return;
          ultimaConsultaIA.current = null;
          setErrorIA(error instanceof Error ? error.message : "No se pudo generar el consejo.");
          setEstadoIA("error");
        })
        .finally(() => {
          if (idSolicitud === solicitudIA.current) setCargandoIA(false);
        });
    }, 800);
  };

  const cargarCotizacionEnFormulario = (guardada: CotizacionGuardada) => {
    const materialDisponible = materiales.some((item) => item.id === guardada.material_id)
      ? guardada.material_id!
      : materialActivo(materiales, cotizacion.materialId).id;
    const detalles = guardada.detalles_extra;
    const cambios: Cotizacion = {
      referencia: guardada.referencia || "",
      materialId: materialDisponible,
      anchoPieza: Number(guardada.ancho_cm),
      altoPieza: Number(guardada.alto_cm),
      cantidad: Number(guardada.cantidad),
      sangriaMm: Number(guardada.sangria_mm ?? cotizacion.sangriaMm),
      margen: Number(detalles?.margen ?? cotizacion.margen),
      forma: guardada.forma === "circulo" ? "circulo" : "rectangulo",
    };

    actualizarDatos(cambios);
    setIdEdicion(guardada.id);
    setMensajeGuardado(`Editando: ${guardada.referencia || "Sin título"}`);
    setVistaActiva("cotizador");
  };

  const cancelarEdicion = () => {
    setIdEdicion(null);
    setMensajeGuardado("Edición cancelada. Los valores actuales quedan en el formulario.");
  };

  if (cargandoSesion) {
    return <main className="grid min-h-screen place-items-center">Comprobando sesión...</main>;
  }

  if (errorSesion) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <p className="text-sm text-[var(--coral)]" role="alert">
          No se pudo comprobar la sesión: {errorSesion}
        </p>
      </main>
    );
  }

  if (!session) return <Login />;

  return (
    <main className="min-h-screen pb-16">
      <Navegacion
        vistaActiva={vistaActiva}
        setVistaActiva={setVistaActiva}
        session={session}
      />

      {/* Vista de materiales */}
      {vistaActiva === "materiales" && (
        <VistaMateriales
          materiales={materiales}
          onActualizarMaterial={handleActualizarMaterial}
        />
      )}

      {vistaActiva === "historial" && (
        <VistaHistorial
           cotizaciones={historialSesionId === session.user.id ? cotizacionesGuardadas : []}
           cargando={cargandoHistorial || historialSesionId !== session.user.id}
           error={historialSesionId === session.user.id ? errorHistorial : null}
          onRecargar={() => void handleRecargarHistorial()}
          onEditar={cargarCotizacionEnFormulario}
        />
      )}

      {/* Vista previa ampliada */}
      {vistaActiva === "visualizador" && (
        <div className="mx-auto mt-8 w-full max-w-5xl px-4">
          <TarjetaRetro titulo={`Vista 2D — ${material.nombre}`}>
            <div className="neu-inset mx-auto h-[60vh] min-h-[400px] w-full rounded-2xl p-4">
              <PliegoSVG
                material={material}
                cotizacion={cotizacion}
                resultado={r}
                piezasVisibles={Math.min(r.piezasPorPliego, cotizacion.cantidad)}
              />
            </div>
          </TarjetaRetro>
        </div>
      )}

      {/* Cotizador */}
      {vistaActiva === "cotizador" && (
        <div className="mx-auto mt-8 grid w-full max-w-6xl gap-6 px-4 lg:grid-cols-[1.05fr_0.95fr]">
          <TarjetaRetro titulo="Configuración del Pedido — Taller UTP">
            <div className="grid gap-4">
              <div>
                <label className="etiqueta" htmlFor="ref">Nombre o referencia</label>
                <input
                  id="ref"
                  className="campo"
                  value={cotizacion.referencia}
                  onChange={(e) => actualizarDatos({ referencia: e.target.value })}
                  onBlur={programarAnalisisIA}
                  placeholder="Sticker cliente Panadería El Trigal"
                />
              </div>

              <div>
                <label className="etiqueta" htmlFor="mat">Material del catálogo</label>
                <select
                  id="mat"
                  className="campo"
                  value={material.id}
                  onChange={(e) => actualizarDatos({ materialId: e.target.value })}
                  onBlur={programarAnalisisIA}
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
                  <label className="etiqueta" htmlFor="ancho">Ancho pieza (cm)</label>
                  <input
                    id="ancho"
                    type="number"
                    min={0.5}
                    step={0.1}
                    className="campo font-mono"
                    value={cotizacion.anchoPieza}
                    onChange={(e) => actualizarDatos({ anchoPieza: Number(e.target.value) })}
                    onBlur={programarAnalisisIA}
                  />
                </div>
                <div>
                  <label className="etiqueta" htmlFor="alto">Alto pieza (cm)</label>
                  <input
                    id="alto"
                    type="number"
                    min={0.5}
                    step={0.1}
                    className="campo font-mono"
                    value={cotizacion.altoPieza}
                    onChange={(e) => actualizarDatos({ altoPieza: Number(e.target.value) })}
                    onBlur={programarAnalisisIA}
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
                      onClick={() => {
                        actualizarDatos({ forma: f });
                        programarAnalisisIA();
                      }}
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
                  <label className="etiqueta" htmlFor="cant">Cantidad</label>
                  <input
                    id="cant"
                    type="number"
                    min={1}
                    className="campo font-mono"
                    value={cotizacion.cantidad}
                    onChange={(e) => actualizarDatos({ cantidad: Number(e.target.value) })}
                    onBlur={programarAnalisisIA}
                  />
                </div>
                <div>
                  <label className="etiqueta" htmlFor="sangria">Sangría (mm)</label>
                  <input
                    id="sangria"
                    type="number"
                    min={0}
                    step={0.5}
                    className="campo font-mono"
                    value={cotizacion.sangriaMm}
                    onChange={(e) => actualizarDatos({ sangriaMm: Number(e.target.value) })}
                    onBlur={programarAnalisisIA}
                  />
                </div>
                <div>
                  <label className="etiqueta" htmlFor="margen">Ganancia (%)</label>
                  <input
                    id="margen"
                    type="number"
                    min={0}
                    className="campo font-mono"
                    value={cotizacion.margen}
                    onChange={(e) => actualizarDatos({ margen: Number(e.target.value) })}
                    onBlur={programarAnalisisIA}
                  />
                </div>
              </div>
            </div>
          </TarjetaRetro>

          <div className="grid content-start gap-6">
            <TarjetaRetro titulo="Asesor automático de producción">
              <div aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-foreground/60">
                    Revisa medidas, material, sangría, aprovechamiento y costos al salir de un campo editado.
                  </p>
                  <span className="shrink-0 font-mono text-[0.65rem] text-foreground/50">
                    {consultasIA} análisis
                  </span>
                </div>
                <p className={`mt-2 text-xs ${
                  estadoIA === "error" ? "text-[var(--coral)]" : "text-foreground/60"
                }`}>
                  {cargandoIA
                    ? "Revisando el proyecto..."
                    : estadoIA === "pendiente"
                    ? "Cambios detectados. El análisis se iniciará al salir del campo."
                    : estadoIA === "incompleto"
                    ? "Completa medidas y cantidad válidas para recibir recomendaciones."
                    : estadoIA === "error"
                    ? errorIA
                    : estadoIA === "listo"
                    ? "Consejo actualizado para los datos actuales."
                    : "Ajusta un dato y sal del campo para solicitar un análisis."}
                </p>
                {diagnosticoIA && (
                  <div className="mt-3 whitespace-pre-wrap rounded-xl bg-black/10 p-3 text-xs leading-relaxed text-foreground/80">
                    {diagnosticoIA}
                  </div>
                )}
              </div>
            </TarjetaRetro>

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
                  La pieza no cabe en este pliego. Reduce el tamaño o elige otro material.
                </p>
              ) : (
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Dato titulo="Piezas por pliego" valor={`${r.piezasPorPliego}`} nota={`${r.columnas} col × ${r.filas} fil`} />
                    <Dato titulo="Pliegos requeridos" valor={`${r.pliegos}`} nota="láminas a cortar" />
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
                      <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] opacity-80">Precio final</p>
                      <p className="font-mono text-xl font-bold">{cop(r.precioFinal)}</p>
                      <p className="mt-1 text-xs opacity-85">{cop(r.precioUnitario)} c/u</p>
                    </div>
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

            <TarjetaRetro titulo={idEdicion === null ? "Guardar cotización" : "Editar cotización"}>
              <button
                type="button"
                className="btn-neu btn-cian w-full"
                onClick={handleGuardarCotizacion}
                disabled={!r.cabe || guardandoCotizacion}
              >
                {guardandoCotizacion
                  ? idEdicion === null ? "Guardando..." : "Actualizando..."
                  : idEdicion === null ? "Guardar en el historial" : "Actualizar cotización"}
              </button>
              {idEdicion !== null && (
                <button
                  type="button"
                  className="btn-neu mt-2 w-full"
                  onClick={cancelarEdicion}
                  disabled={guardandoCotizacion}
                >
                  Cancelar edición
                </button>
              )}
              {mensajeGuardado && (
                <p className="mt-3 text-sm text-foreground/70" role="status">
                  {mensajeGuardado}
                </p>
              )}
            </TarjetaRetro>
          </div>
        </div>
      )}
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