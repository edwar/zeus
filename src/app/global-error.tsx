"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Último recurso: errores del layout raíz. Reemplaza al documento entero, por eso lleva <html> y <body>.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <h1>Algo salió mal / Something went wrong</h1>
        <p>Ya recibimos el aviso. Recarga la página para intentarlo de nuevo.</p>
        <button type="button" onClick={() => window.location.reload()}>Recargar / Reload</button>
      </body>
    </html>
  );
}
