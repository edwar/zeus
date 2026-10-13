import { notFound } from "next/navigation";

/**
 * Cualquier URL desconocida bajo /app cae aquí para mostrar el 404 dentro de la plataforma (con su menú lateral)
 * y solo después de comprobar la sesión: quien no ha iniciado sesión va al acceso, no se entera de qué rutas existen.
 */
export default function Page() {
  notFound();
}
