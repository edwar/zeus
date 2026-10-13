import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorize, projectVisible } from "@/lib/session";
import { can } from "@/lib/roles";
import { StockError, setMaterialSource, syncMaterialStock } from "@/lib/stock";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; mid: string }> }) {
  const a = await authorize(req, "projects.progress");
  if (a.denied) return a.denied;
  const { id, mid } = await ctx.params;
  if (!(await projectVisible(a, id))) return Response.json({ error: "not_found" }, { status: 404 });
  const parsed = z.union([z.object({ ready: z.boolean() }).strict(), z.object({ source: z.enum(["stock", "supplier"]) }).strict()]).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  if ("source" in parsed.data) {
    // De dónde sale el material (inventario propio o proveedor) lo decide quien maneja el inventario.
    if (!can(a.role, "stock")) return Response.json({ error: "forbidden" }, { status: 403 });
    try {
      await setMaterialSource(id, mid, parsed.data.source, a.name);
    } catch (e) {
      if (e instanceof StockError) return Response.json({ error: e.code }, { status: e.code === "not_found" ? 404 : 409 });
      throw e;
    }
    return Response.json({ id: mid });
  }
  const r = await prisma.material.updateMany({ where: { id: mid, projectId: id }, data: { ready: parsed.data.ready } });
  if (!r.count) return Response.json({ error: "not_found" }, { status: 404 });
  await syncMaterialStock(mid, a.name).catch((e) => console.error("stock sync", e));
  return Response.json({ id: mid });
}
