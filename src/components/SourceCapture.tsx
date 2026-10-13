"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isPublicSource } from "@/lib/crm";

const KEY = "zeus.src";

/**
 * Recuerda por dónde llegó el visitante (`?src=catalog`…) mientras navega, para anotar el origen cuando pida su cotización.
 * Solo guarda orígenes de una lista fija; cualquier otro valor se ignora. No guarda nada si no hay `?src=`.
 */
export function SourceCapture() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const s = new URLSearchParams(window.location.search).get("src");
      if (isPublicSource(s) && s !== "simulator") sessionStorage.setItem(KEY, s);
    } catch {
      /* sin sessionStorage (modo privado estricto): se anota «simulador» */
    }
  }, [pathname]);
  return null;
}

/** Origen para anotar en la solicitud: el recordado o, si no hay, el simulador. */
export function readSource(): "simulator" | "catalog" | "referral" | "social" {
  try {
    const s = sessionStorage.getItem(KEY);
    return isPublicSource(s) ? s : "simulator";
  } catch {
    return "simulator";
  }
}
