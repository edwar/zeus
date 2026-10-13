import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorize, projectVisible } from "@/lib/session";
import { DOC_KINDS } from "@/lib/documents";
import { documentResponse } from "@/lib/documents-server";
import { deletePrivate, storageConfigured } from "@/lib/storage";

const patch = z.object({ title: z.string().trim().min(2).max(120).optional(), kind: z.enum(DOC_KINDS).optional(), visibleToClient: z.boolean().optional() }).strict()
  .refine((v) => Object.keys(v).length > 0);

/** Descarga un documento solo si quien lo pide puede ver ese proyecto. Un documento de otro proyecto responde igual que uno inexistente. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/projects/[id]/documents/[did]">) {
  const a = await authorize(req, "projects.view");
  if (a.denied) return a.denied;
  const { id, did } = await ctx.params;
  const d = await prisma.projectDocument.findFirst({ where: { id: did, projectId: id } });
  if (!d || !(await projectVisible(a, id))) return Response.json({ error: "not_found" }, { status: 404 });
  return documentResponse(d, "private, no-store");
}

/** Cambia el título, el tipo o si el cliente lo ve en su portal. Solo gestión. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/projects/[id]/documents/[did]">) {
  const a = await authorize(req, "projects.manage");
  if (a.denied) return a.denied;
  const { id, did } = await ctx.params;
  const parsed = patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const r = await prisma.projectDocument.updateMany({ where: { id: did, projectId: id }, data: parsed.data });
  return r.count ? new Response(null, { status: 204 }) : Response.json({ error: "not_found" }, { status: 404 });
}

/** Borra el documento y su archivo. Solo gestión. */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/projects/[id]/documents/[did]">) {
  const a = await authorize(req, "projects.manage");
  if (a.denied) return a.denied;
  const { id, did } = await ctx.params;
  const d = await prisma.projectDocument.findFirst({ where: { id: did, projectId: id }, select: { storageKey: true } });
  if (!d) return Response.json({ error: "not_found" }, { status: 404 });
  await prisma.projectDocument.delete({ where: { id: did } });
  if (d.storageKey && storageConfigured()) await deletePrivate(d.storageKey).catch((e) => console.error("document delete", e));
  return new Response(null, { status: 204 });
}
