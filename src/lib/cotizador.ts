import { useState, useEffect } from "react";

export type Material = {
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

function leerLocalStorage<T>(key: string, valorDefecto: T): T {
  if (typeof window === "undefined") return valorDefecto;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : valorDefecto;
  } catch {
    return valorDefecto;
  }
}

let estadoGlobal = {
  materiales: leerLocalStorage<Material[]>(STORAGE_MATS_KEY, materialesIniciales),
  cotizacion: leerLocalStorage<Cotizacion>(STORAGE_COT_KEY, cotizacionInicial),
};

const listeners = new Set<() => void>();

function emitirCambio() {
  listeners.forEach((l) => l());
}

export function useTaller() {
  const [estado, setEstado] = useState(estadoGlobal);

  useEffect(() => {
    const listener = () => setEstado({ ...estadoGlobal });
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return estado;
}

export function actualizarCotizacion(parcial: Partial<Cotizacion>) {
  estadoGlobal.cotizacion = { ...estadoGlobal.cotizacion, ...parcial };
  try {
    localStorage.setItem(STORAGE_COT_KEY, JSON.stringify(estadoGlobal.cotizacion));
  } catch {}
  emitirCambio();
}

export function guardarMateriales(nuevos: Material[]) {
  estadoGlobal.materiales = nuevos;
  try {
    localStorage.setItem(STORAGE_MATS_KEY, JSON.stringify(nuevos));
  } catch {}
  emitirCambio();
}

export function materialActivo(materiales: Material[], id: string): Material {
  if (!Array.isArray(materiales) || materiales.length === 0) return materialesIniciales[0];
  return materiales.find((m) => m.id === id) || materiales[0];
}

export function cop(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor || 0);
}

export function calcular(input: Cotizacion, material: Material) {
  if (!material || !input) {
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
      piezaAncho: 5,
      piezaAlto: 5,
    };
  }

  const sangria = (Number(input.sangriaMm) || 0) / 10;
  const anchoPieza = Math.max(0.5, Number(input.anchoPieza) || 1);
  const altoPieza = Math.max(0.5, Number(input.altoPieza) || 1);

  const anchoEfectivo = anchoPieza + sangria * 2;
  const altoEfectivo = altoPieza + sangria * 2;

  const matAncho = Number(material.anchoCm) || 33;
  const matAlto = Number(material.altoCm) || 48;

  const colsN = Math.floor(matAncho / anchoEfectivo);
  const filasN = Math.floor(matAlto / altoEfectivo);
  const totalN = Math.max(0, colsN * filasN);

  const colsR = Math.floor(matAncho / altoEfectivo);
  const filasR = Math.floor(matAlto / anchoEfectivo);
  const totalR = Math.max(0, colsR * filasR);

  const esRotado = totalR > totalN;
  const piezasPorPliego = esRotado ? totalR : totalN;
  const columnas = esRotado ? colsR : colsN;
  const filas = esRotado ? filasR : filasN;
  const cabe = piezasPorPliego > 0;

  const cantidad = Math.max(1, Number(input.cantidad) || 1);
  const pliegos = cabe ? Math.ceil(cantidad / piezasPorPliego) : 0;
  const costoTotal = pliegos * (Number(material.costoPliego) || 0);
  const costoUnitario = cantidad > 0 ? costoTotal / cantidad : 0;

  const margen = Number(input.margen) || 0;
  const precioFinal = costoTotal * (1 + margen / 100);
  const precioUnitario = cantidad > 0 ? precioFinal / cantidad : 0;

  const areaTotal = matAncho * matAlto;
  const areaUsada = anchoEfectivo * altoEfectivo * piezasPorPliego;
  const desperdicio = areaTotal > 0 && cabe ? Math.max(0, ((areaTotal - areaUsada) / areaTotal) * 100) : 100;

  return {
    cabe,
    piezasPorPliego,
    columnas,
    filas,
    orientacion: esRotado ? ("rotado" as const) : ("normal" as const),
    pliegos,
    desperdicio,
    costoTotal,
    costoUnitario,
    precioFinal,
    precioUnitario,
    piezaAncho: esRotado ? altoPieza : anchoPieza,
    piezaAlto: esRotado ? anchoPieza : altoPieza,
  };
}