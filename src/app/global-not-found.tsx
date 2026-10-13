import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";
import { notFoundCopy } from "@/lib/not-found-copy";
import { fontClasses } from "./fonts";
import "./tailwind.css";

export const metadata: Metadata = { title: "404 · Zeus", robots: { index: false, follow: false } };

/**
 * URLs que no coinciden con ninguna ruta (p. ej. /es/foo). Como el layout raíz depende del idioma, Next no puede
 * componer el 404 con él: esta página trae su propio <html>. El idioma de la interfaz sale de la URL (ver NotFoundView).
 */
export default function GlobalNotFound() {
  return (
    <html lang="es" className={fontClasses}>
      <body><main className="wrap"><NotFoundView copy={notFoundCopy()} variant="site" /></main></body>
    </html>
  );
}
