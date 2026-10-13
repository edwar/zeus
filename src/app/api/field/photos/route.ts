import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, projectVisible } from "@/lib/session";
import { sniffImage } from "@/lib/cases";
import { clampAt } from "@/lib/field-sync";
import { putPrivate, storageConfigured } from "@/lib/storage";

const MAX_BYTES = 2_000_000; // el teléfono las reduce antes (≈ 300-600 KB); Vercel corta los cuerpos de más de 4,5 MB
const MAX_PER_PROJECT = 80;
const ID = /^[A-Za-z0-9_-]{8,64}$/;
const KEY = /^[a-z][a-z0-9_]{1,30}$/;

/**
 * Sube una foto de obra. El id lo generó el teléfono: si ya existe, no se duplica (reintentar es seguro). El tipo se decide por
 * los bytes. Va al almacenamiento privado; sin él se guarda en la base (provisional) y nunca se entrega una URL pública.
 */
export async function POST(req: NextRequest) {
  const a = await authorize(req, "projects.progress");
  if (a.denied) return a.denied;
  const len = Number(req.headers.get("content-length"));
  if (Number.isFinite(len) && len > MAX_BYTES + 100_000) return Response.json({ error: "too_large" }, { status: 413 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const id = String(form?.get("id") ?? "");
  const projectId = String(form?.get("projectId") ?? "");
  const checkKey = String(form?.get("checkKey") ?? "") || null;
  const taken = new Date(String(form?.get("takenAt") ?? ""));
  if (!(file instanceof File) || !ID.test(id) || !projectId || Number.isNaN(taken.getTime()) || (checkKey && !KEY.test(checkKey))) return Response.json({ error: "invalid_body" }, { status: 400 });
  if (!(await projectVisible(a, projectId))) return Response.json({ error: "not_found" }, { status: 404 });
  if (file.size > MAX_BYTES) return Response.json({ error: "too_large" }, { status: 413 });

  const existing = await prisma.projectPhoto.findUnique({ where: { id }, select: { projectId: true } });
  if (existing) return existing.projectId === projectId ? Response.json({ id, duplicate: true }) : Response.json({ error: "conflict" }, { status: 409 });
  if ((await prisma.projectPhoto.count({ where: { projectId } })) >= MAX_PER_PROJECT) return Response.json({ error: "too_many" }, { status: 409 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return Response.json({ error: "unsupported_type" }, { status: 415 });
  const storageKey = storageConfigured() ? `private/projects/${projectId}/${id}.${kind.ext}` : null;
  if (storageKey) await putPrivate(storageKey, bytes, kind.type);
  await prisma.projectPhoto.create({
    data: { id, projectId, checkKey, contentType: kind.type, size: bytes.length, storageKey, data: storageKey ? null : Buffer.from(bytes), takenAt: clampAt(taken, new Date()), uploadedBy: a.name },
  });
  return Response.json({ id }, { status: 201 });
}
