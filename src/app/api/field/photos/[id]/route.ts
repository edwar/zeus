import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, projectVisible } from "@/lib/session";
import { deletePrivate, getPrivate, storageConfigured } from "@/lib/storage";

/** Entrega una foto de obra solo a quien puede ver ese proyecto. Nunca hay una URL pública de estas fotos. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/field/photos/[id]">) {
  const a = await authorize(req, "projects.view");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const p = await prisma.projectPhoto.findUnique({ where: { id } });
  // Una foto de un proyecto ajeno responde igual que una que no existe.
  if (!p || !(await projectVisible(a, p.projectId))) return Response.json({ error: "not_found" }, { status: 404 });
  const file = p.data ? { bytes: new Uint8Array(p.data), type: p.contentType } : p.storageKey ? await getPrivate(p.storageKey) : null;
  if (!file) return Response.json({ error: "not_found" }, { status: 404 });
  return new Response(new Uint8Array(file.bytes), { headers: { "Content-Type": p.contentType, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" } });
}

/** Solo gestión puede borrar una foto de obra (es evidencia). */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/field/photos/[id]">) {
  const a = await authorize(req, "projects.manage");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const p = await prisma.projectPhoto.findUnique({ where: { id }, select: { storageKey: true } });
  if (!p) return Response.json({ error: "not_found" }, { status: 404 });
  await prisma.projectPhoto.delete({ where: { id } });
  if (p.storageKey && storageConfigured()) await deletePrivate(p.storageKey).catch((e) => console.error("field photo delete", e));
  return new Response(null, { status: 204 });
}
