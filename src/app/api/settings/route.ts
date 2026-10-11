import { z } from "zod";
import { guardApi } from "@/lib/session";
import { getGlobalCommission, setGlobalCommission } from "@/lib/settings";
import { recalculatePrices } from "@/lib/sync/autosolar";
import { invalidateCatalog } from "@/lib/catalog-cache";

export async function GET(req: Request) {
  const denied = await guardApi(req, { perm: "catalog" });
  if (denied) return denied;
  return Response.json({ commissionPct: await getGlobalCommission() });
}

const body = z.object({ commissionPct: z.number().min(0).max(1000) });

/** Cambia la comisión global y recalcula al instante el precio de los productos importados. */
export async function PATCH(req: Request) {
  const denied = await guardApi(req, { perm: "catalog" });
  if (denied) return denied;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid body" }, { status: 400 });
  const commissionPct = await setGlobalCommission(parsed.data.commissionPct);
  const repriced = await recalculatePrices();
  invalidateCatalog();
  return Response.json({ commissionPct, repriced });
}
