import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, projectVisible } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { checklistComplete } from "@/lib/field-checklist";
import { clampAt, shouldApply, syncBody, type Op } from "@/lib/field-sync";
import { syncMaterialStock } from "@/lib/stock";

type Result = { id: string; ok: boolean; error?: string; stale?: boolean };

/**
 * Recibe lo que el equipo hizo sin señal. Cada operación es idempotente (reenviarla no duplica nada) y se aplica con la hora
 * del teléfono: si ya hay algo más reciente sobre lo mismo, gana lo más reciente. Una operación que falla no detiene a las demás.
 */
export async function POST(req: NextRequest) {
  const big = tooLarge(req, 600_000);
  if (big) return big;
  const a = await authorize(req, "projects.progress");
  if (a.denied) return a.denied;
  const parsed = syncBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });

  const now = new Date();
  const visible = new Map<string, boolean>();
  const canSee = async (id: string) => visible.get(id) ?? (visible.set(id, await projectVisible(a, id)), visible.get(id)!);
  // En el orden en que se hicieron (la cola ya viene ordenada; esto solo protege de un cliente desordenado).
  const ops = [...parsed.data.ops].sort((x, y) => Date.parse(x.at) - Date.parse(y.at));
  const results: Result[] = [];
  for (const op of ops) {
    try {
      results.push(!(await canSee(op.projectId)) ? { id: op.id, ok: false, error: "not_found" } : await apply(op, a.name, now));
    } catch (e) {
      console.error("field sync", op.type, e);
      results.push({ id: op.id, ok: false, error: "server_error" });
    }
  }
  return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
}

async function apply(op: Op, who: string, now: Date): Promise<Result> {
  const at = clampAt(new Date(op.at), now);
  switch (op.type) {
    case "check": {
      const c = await prisma.installCheck.findUnique({ where: { projectId_key: { projectId: op.projectId, key: op.key } }, select: { id: true, clientAt: true } });
      if (!c) return { id: op.id, ok: false, error: "unknown_check" };
      if (!shouldApply(c.clientAt, at)) return { id: op.id, ok: true, stale: true }; // ya hay algo más reciente
      await prisma.installCheck.update({
        where: { id: c.id },
        data: { done: op.done, doneAt: op.done ? at : null, doneBy: op.done ? who : null, clientAt: at, ...(op.note !== undefined && { note: op.note || null }) },
      });
      return { id: op.id, ok: true };
    }
    case "material": {
      const r = await prisma.material.updateMany({ where: { id: op.mid, projectId: op.projectId }, data: { ready: op.ready } });
      if (r.count) await syncMaterialStock(op.mid, who).catch((e) => console.error("stock sync", e));
      return r.count ? { id: op.id, ok: true } : { id: op.id, ok: false, error: "not_found" };
    }
    case "progress": {
      const r = await prisma.milestone.updateMany({ where: { id: op.mid, projectId: op.projectId }, data: { done: op.done } });
      return r.count ? { id: op.id, ok: true } : { id: op.id, ok: false, error: "not_found" };
    }
    case "handover": {
      const checks = await prisma.installCheck.findMany({ where: { projectId: op.projectId }, select: { done: true } });
      if (checks.length === 0) return { id: op.id, ok: false, error: "no_checklist" };
      if (!checklistComplete(checks)) return { id: op.id, ok: false, error: "checklist_incomplete" };
      const have = await prisma.handover.findUnique({ where: { projectId: op.projectId }, select: { signedAt: true } });
      // Reenviar la misma firma no es un error; firmar otra vez sobre una ya firmada, sí (la corrige la oficina).
      if (have) return have.signedAt.getTime() === at.getTime() ? { id: op.id, ok: true } : { id: op.id, ok: false, error: "already_signed" };
      await prisma.handover.create({ data: { projectId: op.projectId, signerName: op.signerName, signature: op.signature, notes: op.notes || null, signedAt: at, collectedBy: who } });
      return { id: op.id, ok: true };
    }
  }
}
