/** Tamaños de página del catálogo público (múltiplos de 4 y de 3, para que la rejilla no quede con huecos). */
export const CATALOG_PAGE_SIZES = [12, 24, 48] as const;
export const CATALOG_PAGE_SIZE = CATALOG_PAGE_SIZES[0];

/** Lee `?size=` y lo limita a los tamaños permitidos. */
export function parseCatalogSize(v: string): number {
  const n = Number(v);
  return (CATALOG_PAGE_SIZES as readonly number[]).includes(n) ? n : CATALOG_PAGE_SIZE;
}
