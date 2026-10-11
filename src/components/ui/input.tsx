import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-h-12 w-full min-w-0 rounded-md border-[1.5px] border-input bg-background px-[0.85rem] py-[0.65rem] font-(family-name:--font-ui) text-base leading-[1.3] font-medium text-foreground tabular-nums transition-colors outline-none placeholder:text-muted-foreground hover:border-primary disabled:cursor-not-allowed disabled:opacity-55",
        "focus-visible:border-ring focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-ring/30",
        "aria-invalid:border-destructive",
        "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className
      )}
      {...props}
    />
  )
}

export { Input }
