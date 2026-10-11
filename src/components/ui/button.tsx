import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-transparent font-(family-name:--font-ui) font-bold whitespace-nowrap no-underline transition-[background-color,color,border-color,transform] duration-150 ease-out active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Acción principal (antes .btn--emerald)
        default: "bg-primary text-primary-foreground hover:bg-[var(--emerald-deep)]",
        // Llamada a la acción sobre fondo oscuro (antes .btn--sun)
        sun: "bg-sun text-sun-foreground hover:bg-[#ffc94d]",
        // Secundario con contorno (antes .btn--ghost)
        outline: "border-border bg-background text-foreground hover:border-primary",
        // Secundario sobre fondo oscuro (antes .btn--ghost-dark)
        "outline-dark": "border-canopy-line bg-transparent text-on-canopy hover:border-leaf",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        // Sin contorno ni fondo (calendario, acciones discretas)
        ghost: "bg-transparent text-foreground hover:bg-[var(--mist)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[2.9rem] px-[1.4rem] py-[0.7rem] text-base leading-none",
        sm: "min-h-10 px-4 py-2 text-[0.9rem] leading-none",
        icon: "size-9 p-0 text-[0.9rem] leading-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
