import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";

/**
 * Un administrador restablece la contraseña de otra cuenta con una temporal: se cierran sus sesiones y, al volver a
 * entrar, la persona tiene que elegir una propia. (La propia contraseña se cambia con /change-password de Better Auth.)
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/users/[id]/password">) {
  const a = await authorize(req, "users");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  if (id === a.userId) return Response.json({ error: "self" }, { status: 400 });
  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (password.length < 10 || password.length > 128) return Response.json({ error: "invalid_password" }, { status: 400 });
  if (!(await prisma.user.findUnique({ where: { id }, select: { id: true } }))) return Response.json({ error: "not_found" }, { status: 404 });

  await auth.api.setUserPassword({ body: { userId: id, newPassword: password }, headers: req.headers });
  await prisma.user.update({ where: { id }, data: { mustChangePassword: true } });
  await auth.api.revokeUserSessions({ body: { userId: id }, headers: req.headers });
  return Response.json({ ok: true });
}
