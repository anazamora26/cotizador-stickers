import { useSyncExternalStore } from "react";

export interface Material {
  id: string;
  nombre: string;
  anchoCm: number;
  altoCm: number;
  costoPliego: number;
};

export type Cotizacion = {
  referencia: string;
  materialId: string;
  anchoPieza: number;
  altoPieza: number;
  cantidad: number;
  sangriaMm: number;
  margen: number;
  forma: "rectangulo" | "circulo";
};

export interface ResultadoCotizacion {
  cabe: boolean;
  piezasPorPliego: number;
  columnas: number;
  filas: number;
  orientacion: "normal" | "rotado";
  pliegos: number;
  desperdicio: number;
  costoTotal: number;
  costoUnitario: number;
  precioFinal: number;
  precioUnitario: number;
}

export const materialesIniciales: Material[] = [
  { id: "vinilo-mate", nombre: "Vinilo Adhesivo Mate 33x48cm", anchoCm: 33, altoCm: 48, costoPliego: 2500 },
  { id: "papel-brillo", nombre: "Papel Adhesivo Brillo 33x48cm", anchoCm: 33, altoCm: 48, costoPliego: 2200 },
  { id: "vinilo-transparente", nombre: "Vinilo Transparente 33x48cm", anchoCm: 33, altoCm: 48, costoPliego: 2800 },
];

export const cotizacionInicial: Cotizacion = {
  referencia: "Sticker circular Panadería",
  materialId: "vinilo-mate",
  anchoPieza: 5,
  altoPieza: 5,
  cantidad: 100,
  sangriaMm: 2,
  margen: 50,
  forma: "circulo",
};

const STORAGE_MATS_KEY = "cotizasticker_mats_v2";
const STORAGE_COT_KEY = "cotizasticker_cot_v2";

function cargarMateriales(): Material[] {
  if (typeof window === "undefined") return materialesIniciales;
  try {
    const guardado = localStorage.getItem(STORAGE_MATS_KEY);
    if (!guardado) return materialesIniciales;
    const datos = JSON.parse(guardado);
    return Array.isArray(datos) && datos.length > 0 ? datos : materialesIniciales;
  } catch {
    return materialesIniciales;
  }
}

function cargarCotizacion(): Cotizacion {
  if (typeof window === "undefined") return cotizacionInicial;
  try {
    const guardado = localStorage.getItem(STORAGE_COT_KEY);
    if (!guardado) return cotizacionInicial;
    return { ...cotizacionInicial, ...JSON.parse(guardado) };
  } catch {
    return cotizacionInicial;
  }
}

let materialesMemoria: Material[] = cargarMateriales();
let cotizacionMemoria: Cotizacion = cargarCotizacion();

let estadoCache = { materiales: materialesMemoria, cotizacion: cotizacionMemoria };

const listeners = new Set<() => void>();
function notify() {
  estadoCache = { materiales: materialesMemoria, cotizacion: cotizacionMemoria };
  listeners.forEach((listener) => listener());
}

export function getEstado() {
  return estadoCache;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const estadoServidor = {
  materiales: materialesIniciales,
  cotizacion: cotizacionInicial,
};

function getEstadoServidor() {
  return estadoServidor;
}

export function useTaller() {
  return useSyncExternalStore(subscribe, getEstado, getEstadoServidor);
}

export function actualizarCotizacion(cambiosCotizacion: Partial<Cotizacion>) {
  cotizacionMemoria = { ...cotizacionMemoria, ...cambiosCotizacion };
  try {
    localStorage.setItem(STORAGE_COT_KEY, JSON.stringify(cotizacionMemoria));
  } catch (error) {
    console.warn("No se pudo guardar la cotización en el almacenamiento local:", error);
  }
  notify();
}

export function guardarMateriales(materialesActualizados: Material[]) {
  materialesMemoria = materialesActualizados;
  try {
    localStorage.setItem(STORAGE_MATS_KEY, JSON.stringify(materialesActualizados));
  } catch (error) {
    console.warn("No se pudieron guardar los materiales en el almacenamiento local:", error);
  }
  notify();
}

export function materialActivo(materiales: Material[], materialId: string): Material {
  if (!Array.isArray(materiales) || materiales.length === 0) return materialesIniciales[0];
  return materiales.find((material) => material.id === materialId) || materiales[0];
}

export function cop(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor || 0);
}

export function calcular(cotizacion: Cotizacion, material: Material): ResultadoCotizacion {
  if (!material || !cotizacion) {
    return {
      cabe: false,
      piezasPorPliego: 0,
      columnas: 0,
      filas: 0,
      orientacion: "normal" as const,
      pliegos: 0,
      desperdicio: 100,
      costoTotal: 0,
      costoUnitario: 0,
      precioFinal: 0,
      precioUnitario: 0,
    };
  }

  const sangriaCm = (Number(cotizacion.sangriaMm) || 0) / 10;
  const anchoPiezaCm = Math.max(0.5, Number(cotizacion.anchoPieza) || 1);
  const altoPiezaCm = Math.max(0.5, Number(cotizacion.altoPieza) || 1);

  const anchoEfectivoCm = anchoPiezaCm + sangriaCm * 2;
  const altoEfectivoCm = altoPiezaCm + sangriaCm * 2;

  const anchoMaterialCm = Number(material.anchoCm) || 33;
  const altoMaterialCm = Number(material.altoCm) || 48;

  const columnasOrientacionNormal = Math.floor(anchoMaterialCm / anchoEfectivoCm);
  const filasOrientacionNormal = Math.floor(altoMaterialCm / altoEfectivoCm);
  const piezasOrientacionNormal = Math.max(0, columnasOrientacionNormal * filasOrientacionNormal);

  const columnasOrientacionRotada = Math.floor(anchoMaterialCm / altoEfectivoCm);
  const filasOrientacionRotada = Math.floor(altoMaterialCm / anchoEfectivoCm);
  const piezasOrientacionRotada = Math.max(0, columnasOrientacionRotada * filasOrientacionRotada);

  const orientacionRotada = piezasOrientacionRotada > piezasOrientacionNormal;
  const piezasPorPliego = orientacionRotada ? piezasOrientacionRotada : piezasOrientacionNormal;
  const columnas = orientacionRotada ? columnasOrientacionRotada : columnasOrientacionNormal;
  const filas = orientacionRotada ? filasOrientacionRotada : filasOrientacionNormal;
  const cabe = piezasPorPliego > 0;

  const cantidad = Math.max(1, Number(cotizacion.cantidad) || 1);
  const pliegos = cabe ? Math.ceil(cantidad / piezasPorPliego) : 0;
  const costoTotal = pliegos * (Number(material.costoPliego) || 0);
  const costoUnitario = cantidad > 0 ? costoTotal / cantidad : 0;

  const margen = Number(cotizacion.margen) || 0;
  const precioFinal = costoTotal * (1 + margen / 100);
  const precioUnitario = cantidad > 0 ? precioFinal / cantidad : 0;

  const areaTotalMaterial = anchoMaterialCm * altoMaterialCm;
  const areaOcupadaPorPiezas = anchoEfectivoCm * altoEfectivoCm * piezasPorPliego;
  const desperdicio = areaTotalMaterial > 0 && cabe
    ? Math.max(0, ((areaTotalMaterial - areaOcupadaPorPiezas) / areaTotalMaterial) * 100)
    : 100;

  return {
    cabe,
    piezasPorPliego,
    columnas,
    filas,
    orientacion: orientacionRotada ? ("rotado" as const) : ("normal" as const),
    pliegos,
    desperdicio,
    costoTotal,
    costoUnitario,
    precioFinal,
    precioUnitario,
  };
}