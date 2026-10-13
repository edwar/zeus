"use client";

import Link from "next/link";
import { DropdownMenu } from "radix-ui";

export type MoreItem = { key: string; href: string; label: string; active: boolean; icon: React.ReactNode };

/**
 * Último icono de la barra inferior del móvil: abre un menú con las secciones que no caben. Si la sección actual está dentro del
 * menú, el botón la muestra (su icono y su nombre) como seleccionada, para que se sepa dónde estás.
 */
export function MoreMenu({ label, items }: { label: string; items: MoreItem[] }) {
  const current = items.find((i) => i.active);
  return (
    // modal={false}: la página no se bloquea y el menú se cierra al navegar.
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="app__tab" aria-label={label} aria-current={current ? "page" : undefined} title={label}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
            {current ? current.icon : <><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>}
          </svg>
          <span>{current ? current.label : label}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="app__menu" side="top" align="end" sideOffset={12} collisionPadding={10}>
          {items.map((i) => (
            <DropdownMenu.Item key={i.key} asChild>
              <Link href={i.href} className="app__menu-item" aria-current={i.active ? "page" : undefined}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">{i.icon}</svg>
                {i.label}
              </Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
