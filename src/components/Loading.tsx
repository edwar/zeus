import { cn } from "@/lib/utils";

type Props = {
  /** Texto para lector de pantalla (el de siempre: «Cargando proyectos…»). No se ve. */
  label: string;
  /**
   * Forma del contenido que va a aparecer, para que al cargar no se mueva el diseño:
   * - `table`: tabla de listados (solicitudes, usuarios, productos…).
   * - `board`: tablero de proyectos por etapa.
   * - `detail`: página de detalle o formulario (un panel con título y campos).
   * - `block`: unas pocas líneas, para secciones pequeñas o listas dentro de un formulario.
   */
  variant?: "table" | "board" | "detail" | "block";
  /** Filas de la tabla o líneas del bloque. */
  rows?: number;
  /** Columnas de la tabla. */
  cols?: number;
  className?: string;
};

// Anchos fijos (no aleatorios) para que el servidor y el navegador pinten lo mismo.
const WIDTHS = ["62%", "40%", "78%", "54%", "70%", "46%", "58%", "84%"];
const w = (i: number) => ({ width: WIDTHS[i % WIDTHS.length] });

function Bar({ i = 0, className }: { i?: number; className?: string }) {
  return <span className={cn("sk", className)} style={w(i)} />;
}

function Table({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            {Array.from({ length: cols }, (_, c) => (
              <th key={c} scope="col"><Bar i={c + 2} className="sk--head" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }, (_, c) => (
                <td key={c}><Bar i={r + c * 3} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Board() {
  return (
    <div className="kan">
      {[2, 1, 2, 1].map((cards, c) => (
        <div key={c} className="kan__col">
          <div className="kan__head"><Bar i={c} className="sk--head" /></div>
          <div className="kan__cards">
            {Array.from({ length: cards }, (_, k) => (
              <div key={k} className="pc">
                <Bar i={c + k} className="sk--title" />
                <Bar i={c + k + 3} />
                <Bar i={c + k + 5} className="sk--bar" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Detail() {
  return (
    <div className="panel">
      <Bar i={1} className="sk--title" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="loading__field">
          <Bar i={i + 4} className="sk--head" />
          <span className="sk sk--input" />
        </div>
      ))}
    </div>
  );
}

function Block({ rows }: { rows: number }) {
  return (
    <div className="loading__block">
      {Array.from({ length: rows }, (_, i) => <Bar key={i} i={i} />)}
    </div>
  );
}

/**
 * Estado de carga: marcadores con la forma del contenido en vez de un texto suelto, que descuadra el diseño.
 * El texto sigue estando para lectores de pantalla (`role="status"`). Aparece con un pequeño retraso para que una
 * carga rápida no parpadee, y sin animación si el usuario pidió menos movimiento.
 */
export function Loading({ label, variant = "block", rows, cols = 5, className }: Props) {
  return (
    <div role="status" aria-busy="true" className={cn("loading", className)}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">
        {variant === "table" && <Table rows={rows ?? 5} cols={cols} />}
        {variant === "board" && <Board />}
        {variant === "detail" && <Detail />}
        {variant === "block" && <Block rows={rows ?? 3} />}
      </div>
    </div>
  );
}
