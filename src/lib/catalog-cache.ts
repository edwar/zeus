import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "./catalog";

/** Marca el catálogo público como desactualizado (se sirve lo anterior mientras se regenera). */
export const invalidateCatalog = () => revalidateTag(CATALOG_TAG, "max");

/** Para cambios de inventario: la disponibilidad que ve el público tiene que reflejarlos de inmediato, no en la próxima revalidación. */
export const expireCatalog = () => revalidateTag(CATALOG_TAG, { expire: 0 });
