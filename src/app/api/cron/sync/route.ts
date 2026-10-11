import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { syncStep } from "@/lib/sync/autosolar";
import { invalidateCatalog } from "@/lib/catalog-cache";

export const maxDuration = 300;

/** Compara en tiempo constante para no filtrar el secreto por diferencias de tiempo. */
function validBearer(header: string | null, secret: string) {
  const a = Buffer.from(header ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

const MAX_HOPS = 60; // tope de seguridad del encadenamiento (≈ varias horas)

/**
 * Cron diario (vercel.ts). Vercel envía `Authorization: Bearer $CRON_SECRET`.
 * Una invocación solo dura unos minutos, así que procesa un lote y, si queda trabajo, se
 * vuelve a invocar a sí misma para continuar donde quedó (SyncRun.cursor).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16 || !validBearer(req.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const hop = Number(url.searchParams.get("hop") ?? 0);
  const limit = Number(url.searchParams.get("limit")) || undefined; // solo para pruebas manuales

  try {
    const step = await syncStep({ size: 500, limit, budgetMs: 240_000 });
    invalidateCatalog();
    if (!step.done && hop < MAX_HOPS) {
      const next = new URL(url);
      next.searchParams.set("hop", String(hop + 1));
      after(() => fetch(next, { headers: { authorization: `Bearer ${secret}` } }).catch(() => {}));
    }
    return Response.json({ ...step, hop });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
