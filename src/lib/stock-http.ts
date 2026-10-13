import { StockError } from "@/lib/stock";

/** Traduce los errores del inventario a respuestas HTTP; lo desconocido sigue su camino. */
export function stockErrorResponse(e: unknown): Response {
  if (e instanceof StockError) {
    const status = e.code === "not_found" || e.code === "not_tracked" ? 404 : 409;
    return Response.json({ error: e.code }, { status });
  }
  throw e;
}
