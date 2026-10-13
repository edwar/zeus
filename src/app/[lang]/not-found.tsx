import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";
import { notFoundCopy } from "@/lib/not-found-copy";

export const metadata: Metadata = { title: "404" };

/** Resto de rutas con idioma (acceso, recuperar contraseña…): sin cabecera propia. */
export default function NotFound() {
  return <main className="wrap"><NotFoundView copy={notFoundCopy()} variant="site" /></main>;
}
