import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/session";

/** Usuarios de la plataforma que se pueden asignar a un equipo (solo nombre y correo). */
export async function GET(req: Request) {
  const denied = await guardApi(req, { perm: "teams.edit" });
  if (denied) return denied;
  const users = await prisma.user.findMany({ where: { banned: { not: true } }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" }, take: 200 });
  return Response.json(users);
}
