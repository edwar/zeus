import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 font-(family-name:--font-ui) text-xs font-bold whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-[var(--lima-soft)] text-[var(--emerald-deep)]",
        secondary: "bg-secondary text-secondary-foreground",
        // Atención (stock agotado, sin precio…) con tokens de la marca
        warning: "bg-[var(--sun-soft)] text-[var(--sun-ink)]",
        destructive: "bg-[var(--alert-soft)] text-destructive",
        outline: "border border-border bg-background text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
