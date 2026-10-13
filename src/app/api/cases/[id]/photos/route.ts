import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { MAX_PHOTOS, sniffImage, type CasePhoto } from "@/lib/cases";
import { adminDto } from "@/lib/cases-server";
import { invalidateCases } from "@/lib/cases-data";
import { deletePublic, putPublic, storageConfigured } from "@/lib/storage";

const MAX_BYTES = 4_200_000; // Vercel rechaza cuerpos de más de 4,5 MB: el navegador reduce las fotos antes de enviarlas

/** Sube una foto del caso (jpg, png o webp). El tipo se decide por los bytes, no por lo que declara el navegador. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/cases/[id]/photos">) {
  const a = await authorize(req, "cases");
  if (a.denied) return a.denied;
  if (!storageConfigured()) return Response.json({ error: "storage_not_configured" }, { status: 503 });
  const { id } = await ctx.params;
  const len = Number(req.headers.get("content-length"));
  if (Number.isFinite(len) && len > MAX_BYTES + 50_000) return Response.json({ error: "too_large" }, { status: 413 });
  const c = await prisma.caseStudy.findUnique({ where: { id } });
  if (!c) return Response.json({ error: "not_found" }, { status: 404 });
  const photos = (c.photos as CasePhoto[] | null) ?? [];
  if (photos.length >= MAX_PHOTOS) return Response.json({ error: "too_many" }, { status: 409 });

  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "invalid_body" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "too_large" }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return Response.json({ error: "unsupported_type" }, { status: 415 });

  const url = await putPublic(`cases/${id}/${randomUUID()}.${kind.ext}`, bytes, kind.type);
  const saved = await prisma.caseStudy.update({ where: { id }, data: { photos: [...photos, { url, alt: c.titleEs }] } });
  if (saved.status === "published") invalidateCases();
  return Response.json(adminDto(saved), { status: 201 });
}

/** Quita una foto del caso (y la borra del almacenamiento). */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/cases/[id]/photos">) {
  const a = await authorize(req, "cases");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const url = req.nextUrl.searchParams.get("url") ?? "";
  const c = await prisma.caseStudy.findUnique({ where: { id } });
  if (!c) return Response.json({ error: "not_found" }, { status: 404 });
  const photos = (c.photos as CasePhoto[] | null) ?? [];
  if (!photos.some((p) => p.url === url)) return Response.json({ error: "not_found" }, { status: 404 });
  const saved = await prisma.caseStudy.update({ where: { id }, data: { photos: photos.filter((p) => p.url !== url) } });
  if (storageConfigured()) await deletePublic(url).catch((e) => console.error("case photo delete", e));
  if (saved.status === "published") invalidateCases();
  return Response.json(adminDto(saved));
}
