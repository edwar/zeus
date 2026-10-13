import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";
import { notFoundCopy } from "@/lib/not-found-copy";

export const metadata: Metadata = { title: "404" };

/** Dentro de la plataforma interna: se ve con la barra lateral, para que el equipo no pierda su sitio. */
export default function NotFound() {
  return <NotFoundView copy={notFoundCopy()} variant="app" />;
}
