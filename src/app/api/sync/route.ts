import { guardApi } from "@/lib/session";
import { syncStep } from "@/lib/sync/autosolar";
import { invalidateCatalog } from "@/lib/catalog-cache";

export const maxDuration = 300;

/** Procesa un lote de la sincronización con Autosolar. El cliente repite hasta `done`. */
export async function POST(req: Request) {
  const denied = await guardApi(req, { perm: "catalog" });
  if (denied) return denied;
  try {
    const step = await syncStep({ size: 15, budgetMs: 240_000 });
    invalidateCatalog();
    return Response.json(step);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
