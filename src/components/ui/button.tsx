import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Botón "tapa": píldora con contorno de tinta y sombra dura que se hunde al presionar.
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-ink font-(family-name:--font-ui) font-extrabold whitespace-nowrap no-underline transition-[background-color,color,border-color,transform,box-shadow] duration-150 ease-out active:translate-y-[3px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Acción principal: maracuyá
        default: "bg-sun text-ink shadow-[var(--shadow-hard-sm)] hover:bg-[#ffd04d]",
        // Igual que la principal (nombre heredado)
        sun: "bg-sun text-ink shadow-[var(--shadow-hard-sm)] hover:bg-[#ffd04d]",
        // Sobre campos de color (amarillo, lima): tinta sólida
        ink: "bg-ink text-white shadow-[0_3px_0_rgb(11_31_24/0.35)] hover:bg-canopy",
        // Secundario: blanco con contorno de tinta
        outline: "bg-background text-foreground shadow-[var(--shadow-hard-sm)] hover:bg-lima",
        // Secundario sobre fondo oscuro
        "outline-dark": "border-on-canopy/50 bg-transparent text-on-canopy hover:border-lima hover:text-lima",
        destructive: "bg-destructive text-white shadow-[var(--shadow-hard-sm)] hover:bg-destructive/90",
        // Sin contorno ni fondo (calendario, acciones discretas)
        ghost: "border-transparent bg-transparent text-foreground hover:bg-[var(--mist)]",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[3.1rem] px-[1.6rem] py-[0.7rem] text-base leading-none",
        sm: "min-h-10 px-4 py-2 text-[0.9rem] leading-none shadow-none",
        icon: "size-10 p-0 text-[0.9rem] leading-none shadow-none",
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
