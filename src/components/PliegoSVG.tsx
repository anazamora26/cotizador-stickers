export function PliegoSVG({
  material,
  cotizacion,
  resultado,
  piezasVisibles = 0,
}: {
  material: any;
  cotizacion: any;
  resultado: any;
  piezasVisibles?: number;
}) {
  if (!material || !cotizacion || !resultado || !resultado.cabe) {
    return (
      <div className="grid h-full place-items-center text-xs text-foreground/50">
        Sin distribución para previsualizar
      </div>
    );
  }

  const W = Number(material.anchoCm) || 33;
  const H = Number(material.altoCm) || 48;
  const sangria = (Number(cotizacion.sangriaMm) || 0) / 10;

  const cols = Math.max(1, Number(resultado.columnas) || 1);
  const fils = Math.max(1, Number(resultado.filas) || 1);

  const esRotado = resultado.orientacion === "rotado";
  const pAncho = esRotado ? (Number(cotizacion.altoPieza) || 5) : (Number(cotizacion.anchoPieza) || 5);
  const pAlto = esRotado ? (Number(cotizacion.anchoPieza) || 5) : (Number(cotizacion.altoPieza) || 5);

  const usadoX = cols * pAncho + Math.max(0, cols - 1) * sangria;
  const usadoY = fils * pAlto + Math.max(0, fils - 1) * sangria;
  const offsetX = Math.max(0, (W - usadoX) / 2);
  const offsetY = Math.max(0, (H - usadoY) / 2);

  const piezas: Array<{ x: number; y: number; n: number }> = [];
  let n = 0;
  for (let f = 0; f < fils; f++) {
    for (let c = 0; c < cols; c++) {
      n++;
      piezas.push({
        x: offsetX + c * (pAncho + sangria),
        y: offsetY + f * (pAlto + sangria),
        n,
      });
    }
  }

  return (
    <svg
      viewBox={`-2 -2 ${W + 4} ${H + 4}`}
      className="h-full w-full"
      role="img"
    >
      <rect
        x={0}
        y={0}
        width={W}
        height={H}
        fill="#F4F7F9"
        stroke="#1F2937"
        strokeWidth={0.25}
        rx={0.5}
      />
      {piezas.map((p) => {
        const activa = p.n <= (piezasVisibles || 0);
        const relleno = activa ? "rgba(75,156,193,0.25)" : "rgba(31,41,55,0.05)";
        const borde = activa ? "#4B9CC1" : "#B9C4CC";

        return cotizacion.forma === "circulo" ? (
          <ellipse
            key={p.n}
            cx={p.x + pAncho / 2}
            cy={p.y + pAlto / 2}
            rx={pAncho / 2}
            ry={pAlto / 2}
            fill={relleno}
            stroke={borde}
            strokeWidth={0.2}
          />
        ) : (
          <rect
            key={p.n}
            x={p.x}
            y={p.y}
            width={pAncho}
            height={pAlto}
            rx={0.25}
            fill={relleno}
            stroke={borde}
            strokeWidth={0.2}
          />
        );
      })}
      <rect
        x={offsetX}
        y={offsetY}
        width={Math.max(0, usadoX)}
        height={Math.max(0, usadoY)}
        fill="none"
        stroke="#21A07D"
        strokeWidth={0.15}
        strokeDasharray="0.6 0.5"
      />
      <text x={W / 2} y={-0.6} textAnchor="middle" fontSize={1.4} fill="#1F2937" fontFamily="monospace">
        {W} cm
      </text>
      <text
        x={-0.8}
        y={H / 2}
        textAnchor="middle"
        fontSize={1.4}
        fill="#1F2937"
        fontFamily="monospace"
        transform={`rotate(-90 -0.8 ${H / 2})`}
      >
        {H} cm
      </text>
    </svg>
  );
}