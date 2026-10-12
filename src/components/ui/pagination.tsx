import * as React from "react"
import { Slot } from "radix-ui"
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants, type Button } from "@/components/ui/button"

// shadcn/ui · Pagination. Adaptado: `asChild` (para usar next/link), textos recibidos por props en vez de fijos en
// inglés, y la página activa en la variante principal del proyecto.

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("m-0 flex list-none flex-row items-center gap-1 p-0", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
  asChild?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">

function PaginationLink({
  className,
  isActive,
  size = "icon",
  asChild = false,
  ...props
}: PaginationLinkProps) {
  const Comp = asChild ? Slot.Root : "a"
  return (
    <Comp
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? "default" : "ghost",
          size,
        }),
        isActive && "shadow-none",
        className
      )}
      {...props}
    />
  )
}

type PaginationStepProps = React.ComponentProps<typeof PaginationLink> & {
  /** Texto visible (en pantallas pequeñas solo queda el icono) */
  label: string
}

// Con `asChild`, quien llama aporta el elemento (enlace o botón) con su propio contenido.
function PaginationPrevious({ className, label, asChild, children, ...props }: PaginationStepProps) {
  return (
    <PaginationLink
      aria-label={label}
      size="sm"
      asChild={asChild}
      className={cn("gap-1 px-3", className)}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          <ChevronLeftIcon />
          <span className="hidden sm:block">{label}</span>
        </>
      )}
    </PaginationLink>
  )
}

function PaginationNext({ className, label, asChild, children, ...props }: PaginationStepProps) {
  return (
    <PaginationLink
      aria-label={label}
      size="sm"
      asChild={asChild}
      className={cn("gap-1 px-3", className)}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          <span className="hidden sm:block">{label}</span>
          <ChevronRightIcon />
        </>
      )}
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  label,
  ...props
}: React.ComponentProps<"span"> & { label?: string }) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
