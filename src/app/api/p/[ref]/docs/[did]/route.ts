import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { findPortalProjectId } from "@/lib/portal";
import { documentResponse } from "@/lib/documents-server";
import { hitLimit, ipHashOf } from "@/lib/ratelimit";

/** Documento compartido con el cliente, desde su portal. Solo los marcados como visibles; mismo límite por conexión que los demás PDF. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/p/[ref]/docs/[did]">) {
  const limit = await hitLimit("quote-pdf", ipHashOf(req), 20, 3_600_000);
  if (!limit.ok) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  const { ref, did } = await ctx.params;
  const projectId = await findPortalProjectId(ref);
  const d = projectId ? await prisma.projectDocument.findFirst({ where: { id: did, projectId, visibleToClient: true } }) : null;
  if (!d) return Response.json({ error: "not_found" }, { status: 404 });
  return documentResponse(d, "private, no-store");
}
