import type { LucideIcon } from "lucide-react";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Acción principal (botón o enlace) y cualquier contenido extra, como un formulario corto. */
  children?: React.ReactNode;
  /** Más compacto, para dentro de tarjetas o pestañas. */
  compact?: boolean;
  /** Deja que el contenido (p. ej. un formulario corto en fila) use todo el ancho en vez de una columna estrecha. */
  wide?: boolean;
};

/** Estado vacío: se usa cuando una lista o sección todavía no tiene datos. Dice qué falta y qué hacer. */
export function EmptyState({ icon: Icon, title, description, children, compact, wide }: Props) {
  return (
    <Empty
      role="status"
      className={`border border-dashed border-(--line) bg-white ${compact ? "p-6 md:p-8" : "p-8 md:p-14"}`}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-12 rounded-full bg-(--mist) text-(--emerald-deep)">
          <Icon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle className="font-(family-name:--font-display) text-xl font-bold text-(--ink)">{title}</EmptyTitle>
        {description && <EmptyDescription className="text-base text-(--ink-soft)">{description}</EmptyDescription>}
      </EmptyHeader>
      {children && <EmptyContent className={wide ? "max-w-none" : undefined}>{children}</EmptyContent>}
    </Empty>
  );
}
