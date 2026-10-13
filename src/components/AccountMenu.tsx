"use client";

import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import type { Dict } from "@/i18n";
import { ExitIcon, GuideIcon, KeyIcon } from "@/components/AppIcons";

/**
 * Menú de la cuenta en la barra superior del móvil: un solo botón (la inicial de quien está dentro) que despliega
 * guía, cambiar contraseña y cerrar sesión, cada uno con su icono y su nombre.
 */
export function AccountMenu({ t, name, guideHref, onChangePassword, onSignOut }: { t: Dict; name: string; guideHref: string; onChangePassword: () => void; onSignOut: () => void }) {
  return (
    // modal={false}: el menú no bloquea la página, así el diálogo de contraseña se abre sin pelear por el foco.
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="app__me" aria-label={t.app.account} title={t.app.account}>
          <span aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="app__menu" align="end" sideOffset={8} collisionPadding={10}>
          <DropdownMenu.Label className="app__menu-who">{name}</DropdownMenu.Label>
          <DropdownMenu.Item asChild>
            <Link href={guideHref} className="app__menu-item"><GuideIcon />{t.app.nav.guide}</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="app__menu-item" onSelect={onChangePassword}><KeyIcon />{t.auth.changeTitle}</DropdownMenu.Item>
          <DropdownMenu.Separator className="app__menu-sep" />
          <DropdownMenu.Item className="app__menu-item" onSelect={onSignOut}><ExitIcon />{t.auth.signOut}</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
