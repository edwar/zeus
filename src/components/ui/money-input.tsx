"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { formatMoney, moneyDigits } from "@/lib/money-mask"

type Props = Omit<React.ComponentProps<"input">, "value" | "defaultValue" | "onChange" | "type" | "name"> & {
  /** Controlado: solo dígitos ("1200000"). */
  value?: string
  /** No controlado: valor inicial. */
  defaultValue?: string | number | null
  /** Recibe solo dígitos, sin la máscara. */
  onValueChange?: (raw: string) => void
  /** Si se pasa, un campo oculto lleva el valor sin máscara en el formulario. */
  name?: string
}

/** Campo de pesos con máscara mientras se escribe (1200000 → 1'200.000). Entrega siempre dígitos limpios. */
function MoneyInput({ value, defaultValue, onValueChange, name, ...props }: Props) {
  const [inner, setInner] = React.useState(() => moneyDigits(defaultValue))
  const raw = value !== undefined ? moneyDigits(value) : inner
  const ref = React.useRef<HTMLInputElement>(null)
  const caret = React.useRef<number | null>(null) // cuántos dígitos había antes del cursor

  // Tras reformatear, el cursor vuelve junto al mismo dígito (si no, saltaría al final).
  React.useLayoutEffect(() => {
    const el = ref.current
    if (caret.current == null || !el || document.activeElement !== el) return
    let seen = 0, pos = 0
    while (pos < el.value.length && seen < caret.current) { if (/\d/.test(el.value[pos])) seen++; pos++ }
    el.setSelectionRange(pos, pos)
    caret.current = null
  })

  return (
    <>
      <Input
        {...props}
        ref={ref as never}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formatMoney(raw)}
        onChange={(e) => {
          const el = e.target
          caret.current = moneyDigits(el.value.slice(0, el.selectionStart ?? el.value.length)).length
          const next = moneyDigits(el.value)
          if (value === undefined) setInner(next)
          onValueChange?.(next)
        }}
      />
      {name && <input type="hidden" name={name} value={raw} />}
    </>
  )
}

export { MoneyInput }
