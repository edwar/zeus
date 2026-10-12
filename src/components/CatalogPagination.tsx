"use client";

import { useRouter } from "next/navigation";
import { DataPagination, type PaginationLabels } from "@/components/DataPagination";
import { CATALOG_PAGE_SIZE, CATALOG_PAGE_SIZES } from "@/lib/catalog-page";

type Props = {
  lang: string;
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  filters: { q: string; category: string; maker: string };
  labels: PaginationLabels;
};

/** Paginador del catálogo: la URL manda (`?page=`, `?size=`) y los números son enlaces que los buscadores pueden seguir. */
export function CatalogPagination({ lang, page, pages, total, pageSize, filters, labels }: Props) {
  const router = useRouter();
  const href = (p: number, size = pageSize) => {
    const u = new URLSearchParams();
    if (filters.q) u.set("q", filters.q);
    if (filters.category) u.set("category", filters.category);
    if (filters.maker) u.set("maker", filters.maker);
    if (size !== CATALOG_PAGE_SIZE) u.set("size", String(size));
    if (p > 1) u.set("page", String(p));
    return `/${lang}/products${u.size ? `?${u}` : ""}`;
  };
  return (
    <DataPagination
      page={page}
      pages={pages}
      total={total}
      pageSize={pageSize}
      pageSizes={CATALOG_PAGE_SIZES}
      labels={labels}
      lang={lang}
      hrefFor={(p) => href(p)}
      onPageSizeChange={(size) => router.push(href(1, size), { scroll: false })}
    />
  );
}
