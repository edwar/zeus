import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-24 w-full resize-y rounded-md border-[1.5px] border-input bg-background px-[0.85rem] py-[0.65rem] font-(family-name:--font-ui) text-base leading-[1.45] font-medium text-foreground transition-colors outline-none placeholder:text-muted-foreground hover:border-primary disabled:cursor-not-allowed disabled:opacity-55",
        "focus-visible:border-ring focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-ring/30",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
