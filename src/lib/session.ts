import { cache } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { can, normalizeRole, type Perm, type Role } from "./roles";
import type { Prisma } from "@/generated/prisma/client";

/** Sesión de la petición actual en Server Components (una sola consulta por render). */
export const getSession = cache(async () => {
  // La sesión depende de la petición: nunca debe evaluarse al prerenderizar (la validación usa Date).
  await connection();
  return auth.api.getSession({ headers: await headers() });
});

/**
 * Defensa contra CSRF para peticiones que cambian datos y se autentican con cookie. `SameSite=Lax` no basta: la cookie
 * también viaja en peticiones del *mismo sitio* (p. ej. otro subdominio del mismo dominio). Los navegadores siempre
 * mandan `Sec-Fetch-Site`/`Origin` en estas peticiones; clientes sin ellos (curl, scripts) no usan la cookie del navegador.
 */
function sameOriginOk(req: Request): boolean {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return true;
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  return true;
}

export type Access = { denied: Response } | { denied: null; userId: string; name: string; role: Role };

/**
 * Autoriza una petición a la API: misma-origen, sesión válida y (si se pide) el permiso del rol.
 * `getSession` valida contra la base (a diferencia de la cookie que revisa el proxy).
 */
export async function authorize(req: Request, perm?: Perm): Promise<Access> {
  if (!sameOriginOk(req)) return { denied: Response.json({ error: "Forbidden" }, { status: 403 }) };
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return { denied: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  // Con contraseña temporal solo se puede cambiarla (eso va por /api/auth): ninguna otra API responde.
  if (session.user.mustChangePassword) return { denied: Response.json({ error: "PasswordChangeRequired" }, { status: 403 }) };
  const role = normalizeRole(session.user.role);
  if (perm && !can(role, perm)) return { denied: Response.json({ error: "Forbidden" }, { status: 403 }) };
  return { denied: null, userId: session.user.id, name: session.user.name, role };
}

/** Compatibilidad: devuelve la Response de rechazo o null. `admin` equivale al permiso de gestionar usuarios. */
export async function guardApi(req: Request, opts: { admin?: boolean; perm?: Perm } = {}) {
  const a = await authorize(req, opts.perm ?? (opts.admin ? "users" : undefined));
  return a.denied;
}

/** ¿Este usuario puede ver/operar el proyecto? (admin y gestión, siempre; equipo, solo el de su equipo). */
export async function projectVisible(a: { role: Role; userId: string }, projectId: string): Promise<boolean> {
  return Boolean(await prisma.project.findFirst({ where: { id: projectId, ...projectScope(a.role, a.userId) }, select: { id: true } }));
}

/**
 * Qué proyectos puede ver cada rol: admin y gestión, todos; el rol equipo, solo los de los equipos a los que pertenece.
 * Se usa como filtro de Prisma, así un proyecto ajeno simplemente "no existe" para quien no lo puede ver.
 */
export function projectScope(role: Role, userId: string): Prisma.ProjectWhereInput {
  return role === "equipo" ? { team: { members: { some: { userId } } } } : {};
}
