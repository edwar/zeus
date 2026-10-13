import type { NextRequest } from "next/server";
import { authorize } from "@/lib/session";
import { loadFieldProjects } from "@/lib/field-server";

/** Proyectos para trabajar en campo (la app los guarda en el teléfono para usarlos sin señal). */
export async function GET(req: NextRequest) {
  const a = await authorize(req, "projects.progress");
  if (a.denied) return a.denied;
  const lang = req.nextUrl.searchParams.get("lang") === "en" ? "en" : "es";
  const only = req.nextUrl.searchParams.get("project") ?? undefined;
  const projects = await loadFieldProjects(a, lang, only && /^[A-Za-z0-9_-]{1,40}$/.test(only) ? only : undefined);
  return Response.json({ userId: a.userId, name: a.name, fetchedAt: new Date().toISOString(), projects }, { headers: { "Cache-Control": "no-store" } });
}
