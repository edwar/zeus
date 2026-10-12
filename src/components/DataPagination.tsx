"use client";

import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { fill } from "@/lib/format";

export type PaginationLabels = {
  /** «Filas por página» */
  rowsPerPage: string;
  prev: string;
  next: string;
  /** «Página {page} de {pages}» (admite {total}) */
  pageOf: string;
  /** «Ir a la página {page}» */
  goTo: string;
  /** Nombre del bloque de navegación para lectores de pantalla */
  nav: string;
};

type Props = {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  pageSizes: readonly number[];
  labels: PaginationLabels;
  onPageChange?: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Si se da, los números y los botones de página son enlaces (rastreables, para listados del servidor). */
  hrefFor?: (page: number) => string;
};

/** Las tres páginas que se muestran: la actual y sus vecinas, sin salirse del rango. */
export function pageWindow(page: number, pages: number, size = 3): number[] {
  const count = Math.min(size, pages);
  const start = Math.min(Math.max(1, page - Math.floor(count / 2)), pages - count + 1);
  return Array.from({ length: count }, (_, i) => start + i);
}

/**
 * Paginador de listados: filas por página, anterior/siguiente y tres páginas intermedias (shadcn/ui Pagination).
 * Sirve para listados del cliente (`onPageChange`) y del servidor (`hrefFor`, con enlaces reales).
 */
export function DataPagination({ page, pages, total, pageSize, pageSizes, labels, onPageChange, onPageSizeChange, hrefFor }: Props) {
  const go = (n: number) => onPageChange?.(n);
  const control = (n: number, content: React.ReactNode, props: { disabled?: boolean } = {}) =>
    hrefFor && !props.disabled ? (
      <Link href={hrefFor(n)} scroll={false} onClick={() => go(n)}>{content}</Link>
    ) : (
      <button type="button" disabled={props.disabled} onClick={() => go(n)}>{content}</button>
    );

  const prevDisabled = page <= 1;
  const nextDisabled = page >= pages;

  return (
    <div className="dp">
      <div className="dp__rows">
        <label id="dp-rows" className="dp__label">{labels.rowsPerPage}</label>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger size="sm" aria-labelledby="dp-rows" className="dp__select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizes.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="dp__summary" role="status">{fill(labels.pageOf, { page, pages, total })}</p>

      <Pagination aria-label={labels.nav} className="dp__nav mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious asChild label={labels.prev}>
              {control(page - 1, <><ChevronLeftIcon /><span className="hidden sm:block">{labels.prev}</span></>, { disabled: prevDisabled })}
            </PaginationPrevious>
          </PaginationItem>
          {pageWindow(page, pages).map((n) => (
            <PaginationItem key={n}>
              <PaginationLink asChild isActive={n === page} aria-label={fill(labels.goTo, { page: n })}>
                {control(n, n)}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext asChild label={labels.next}>
              {control(page + 1, <><span className="hidden sm:block">{labels.next}</span><ChevronRightIcon /></>, { disabled: nextDisabled })}
            </PaginationNext>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
