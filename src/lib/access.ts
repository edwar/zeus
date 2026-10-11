import { notFound, redirect } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getSession } from "./session";
import { can, homeFor, type Perm } from "./roles";

/**
 * Protege una sección del panel en el servidor: sin sesión va al login; con sesión pero sin el permiso, a la pantalla
 * de inicio de su rol. Se llama dentro de <Suspense> porque la sesión depende de la petición.
 */
export async function requirePerm(lang: string, perm: Perm) {
  if (!hasLocale(lang)) notFound();
  const session = await getSession();
  if (!session) redirect(`/${lang}/login`);
  if (!can(session.user.role, perm)) redirect(homeFor(session.user.role, lang));
  return session;
}
