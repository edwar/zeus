import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";
import { notFoundCopy } from "@/lib/not-found-copy";

export const metadata: Metadata = { title: "404" };

/** Páginas públicas (producto, enlace de cotización…): se muestra dentro de la cabecera y el pie del sitio. */
export default function NotFound() {
  return <div className="wrap"><NotFoundView copy={notFoundCopy()} variant="site" /></div>;
}
