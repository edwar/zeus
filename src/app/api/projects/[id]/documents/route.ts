import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorize, projectVisible } from "@/lib/session";
import { DOC_KINDS, DOC_MAX_BYTES, DOC_MAX_PER_PROJECT, safeFileName, sniffDocument } from "@/lib/documents";
import { listDocuments } from "@/lib/documents-server";
import { putPrivate, storageConfigured } from "@/lib/storage";

const fields = z.object({
  kind: z.enum(DOC_KINDS),
  title: z.string().trim().min(2).max(120),
  visibleToClient: z.enum(["true", "false"]).default("false"),
});

/** Documentos del proyecto (sin los archivos). Quien ve el proyecto ve la lista; el rol equipo, solo los de su equipo. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/projects/[id]/documents">) {
  const a = await authorize(req, "projects.view");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  if (!(await projectVisible(a, id))) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(await listDocuments(id));
}

/** Sube un documento (PDF o imagen). Solo gestión. El tipo se decide por los bytes; va al almacenamiento privado (o a la base si no hay). */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/projects/[id]/documents">) {
  const a = await authorize(req, "projects.manage");
  if (a.denied) return a.denied;
  const { id: projectId } = await ctx.params;
  const len = Number(req.headers.get("content-length"));
  if (Number.isFinite(len) && len > DOC_MAX_BYTES + 100_000) return Response.json({ error: "too_large" }, { status: 413 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const parsed = fields.safeParse({ kind: form?.get("kind"), title: form?.get("title"), visibleToClient: form?.get("visibleToClient") ?? "false" });
  if (!(file instanceof File) || !parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  if (!(await projectVisible(a, projectId))) return Response.json({ error: "not_found" }, { status: 404 });
  if (file.size > DOC_MAX_BYTES) return Response.json({ error: "too_large" }, { status: 413 });
  if ((await prisma.projectDocument.count({ where: { projectId } })) >= DOC_MAX_PER_PROJECT) return Response.json({ error: "too_many" }, { status: 409 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffDocument(bytes);
  if (!kind) return Response.json({ error: "unsupported_type" }, { status: 415 });
  const id = crypto.randomUUID();
  const storageKey = storageConfigured() ? `private/projects/${projectId}/docs/${id}.${kind.ext}` : null;
  if (storageKey) await putPrivate(storageKey, bytes, kind.type);
  const f = parsed.data;
  await prisma.projectDocument.create({
    data: {
      id, projectId, kind: f.kind, title: f.title, fileName: safeFileName(file.name, `documento.${kind.ext}`), contentType: kind.type, size: bytes.length,
      storageKey, data: storageKey ? null : Buffer.from(bytes), visibleToClient: f.visibleToClient === "true", uploadedBy: a.name,
    },
  });
  return Response.json({ id }, { status: 201 });
}
