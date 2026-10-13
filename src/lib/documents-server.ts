import { prisma } from "@/lib/prisma";
import { getPrivate } from "@/lib/storage";
import { safeFileName } from "@/lib/documents";

type Stored = { fileName: string; contentType: string; storageKey: string | null; data: Uint8Array | null };

/** Respuesta de descarga de un documento. Siempre como adjunto y sin que el navegador adivine el tipo. */
export async function documentResponse(d: Stored, cache: string): Promise<Response> {
  const file = d.data ? { bytes: new Uint8Array(d.data) } : d.storageKey ? await getPrivate(d.storageKey) : null;
  if (!file) return Response.json({ error: "not_found" }, { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": d.contentType,
      "Content-Disposition": `attachment; filename="${safeFileName(d.fileName, "documento")}"`,
      "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}

/** Lista para la oficina (sin los bytes). */
export async function listDocuments(projectId: string) {
  const rows = await prisma.projectDocument.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, kind: true, title: true, fileName: true, contentType: true, size: true, visibleToClient: true, uploadedBy: true, createdAt: true },
  });
  return rows.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }));
}
