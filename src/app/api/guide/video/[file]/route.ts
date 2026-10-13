import type { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { authorize } from "@/lib/session";
import { GUIDE_VIDEO_FILE, GUIDE_VIDEO_TYPES, parseRange } from "@/lib/guide-video";

// Carpeta fija con segmentos estáticos: así el empaquetado incluye solo esos archivos (ver next.config.ts) y no todo el proyecto.
const DIR = join(process.cwd(), "docs", "guia-equipo", "videos");

/**
 * Video de la guía del equipo. Solo con sesión (cualquier rol del panel) y solo archivos de esa carpeta, por nombre exacto.
 * Responde rangos de bytes (206): sin ellos Safari no reproduce video y nadie puede saltar a la mitad.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/guide/video/[file]">) {
  const a = await authorize(req, "projects.view");
  if (a.denied) return a.denied;
  const { file } = await ctx.params;
  if (!GUIDE_VIDEO_FILE.test(file)) return Response.json({ error: "not_found" }, { status: 404 });
  const bytes = await readFile(join(DIR, file)).catch(() => null);
  if (!bytes) return Response.json({ error: "not_found" }, { status: 404 });
  const type = GUIDE_VIDEO_TYPES[file.split(".").pop()!];
  const headers: Record<string, string> = { "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" };
  const range = parseRange(req.headers.get("range"), bytes.length);
  if (range === "invalid") return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${bytes.length}` } });
  if (range) {
    const part = bytes.subarray(range.start, range.end + 1);
    return new Response(new Uint8Array(part), { status: 206, headers: { ...headers, "Content-Range": `bytes ${range.start}-${range.end}/${bytes.length}`, "Content-Length": String(part.length) } });
  }
  return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Length": String(bytes.length) } });
}
