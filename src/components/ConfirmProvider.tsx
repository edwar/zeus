"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export type ConfirmOptions = {
  /**
   * La pregunta y, si la hay, lo que pasa al confirmar: «¿Retirar la autorización? El caso dejará de verse en el sitio.». Se separa
   * sola: lo que llega hasta el signo de cierre de la pregunta es el título y el resto, la descripción.
   */
  message: string;
  /** Lo que se va a afectar (el nombre del equipo, del producto…), resaltado bajo el título. */
  subject?: string;
  /** Sustituye la descripción que venía en `message`. Si no hay ninguna, se usa «Esta acción no se puede deshacer». */
  description?: string;
  /** Lo que dice el botón que confirma: «Eliminar», «Anular acta»… (un verbo, no «Aceptar»). */
  confirmLabel: string;
  /** `danger` (por defecto) pinta el botón de rojo; `default` para cambios que no borran nada. */
  tone?: "danger" | "default";
};
export type ConfirmLabels = { cancel: string; irreversible: string };

/** «¿Eliminar esto? No se puede deshacer.» → título «¿Eliminar esto?» y descripción «No se puede deshacer.». */
export function splitMessage(message: string): { title: string; rest: string } {
  const i = message.indexOf("?");
  return i < 0 ? { title: message.trim(), rest: "" } : { title: message.slice(0, i + 1).trim(), rest: message.slice(i + 1).trim() };
}

const Ctx = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

/**
 * Reemplaza a `window.confirm`: `if (await confirm({ title, confirmLabel })) borrar()`. Muestra un diálogo con el diseño de la
 * plataforma, abre con el foco en «Cancelar» y responde `false` si se cancela, se pulsa Escape o se cierra de cualquier otra forma.
 */
export function ConfirmProvider({ children, labels }: { children: React.ReactNode; labels: ConfirmLabels }) {
  const [open, setOpen] = useState(false);
  // Se conservan las últimas opciones para que el texto no desaparezca durante la animación de cierre.
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    // Si ya había una pregunta abierta, esa se cancela: nunca quedan dos promesas colgadas.
    resolver.current?.(false);
    setOpts(o);
    setOpen(true);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  const settle = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpen(false);
  };

  const danger = (opts?.tone ?? "danger") === "danger";
  const text = opts ? splitMessage(opts.message) : { title: "", rest: "" };
  return (
    <Ctx.Provider value={confirm}>
      {children}
      <AlertDialog open={open} onOpenChange={(o) => { if (!o) settle(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            {danger && <span className="confirm__icon" aria-hidden="true"><TriangleAlert /></span>}
            <AlertDialogTitle>{text.title}</AlertDialogTitle>
            {opts?.subject && <p className="confirm__subject">{opts.subject}</p>}
            <AlertDialogDescription>{opts?.description ?? (text.rest || labels.irreversible)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{labels.cancel}</AlertDialogCancel>
            <AlertDialogAction variant={danger ? "destructive" : "default"} onClick={() => settle(true)}>{opts?.confirmLabel}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConfirm necesita <ConfirmProvider> (está en Providers).");
  return c;
}
