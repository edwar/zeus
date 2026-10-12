"use client"

import * as React from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  /** Nombre accesible del botón cuando la contraseña está oculta («Mostrar contraseña») */
  showLabel: string
  /** Nombre accesible del botón cuando la contraseña está visible («Ocultar contraseña») */
  hideLabel: string
}

/** Campo de contraseña con un botón de ojo para mostrarla u ocultarla. */
function PasswordInput({ className, showLabel, hideLabel, ...props }: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-12", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        title={visible ? hideLabel : showLabel}
        className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-(--ink-soft) transition-colors hover:bg-(--mist) hover:text-(--ink)"
      >
        {visible ? <EyeOffIcon className="size-5" aria-hidden="true" /> : <EyeIcon className="size-5" aria-hidden="true" />}
      </button>
    </div>
  )
}

export { PasswordInput }
