"use client";

import { useEffect } from "react";

/**
 * Deja la app lista para abrir sin señal: registra el service worker y le avisa qué archivos de la aplicación ya cargó esta
 * página. En desarrollo no se registra (interferiría con la recarga en caliente) salvo que se pida con NEXT_PUBLIC_FIELD_SW=1.
 */
export function FieldBoot() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_FIELD_SW !== "1") return;
    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        if (cancelled) return;
        const urls = performance.getEntriesByType("resource").map((e) => e.name).filter((u) => u.includes("/_next/static/"));
        reg.active?.postMessage({ type: "precache", urls });
      })
      .catch(() => {
        /* sin service worker la app sigue funcionando con señal */
      });
    return () => { cancelled = true; };
  }, []);
  return null;
}
