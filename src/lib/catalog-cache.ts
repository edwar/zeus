import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "./catalog";

/** Marca el catálogo público como desactualizado (se sirve lo anterior mientras se regenera). */
export const invalidateCatalog = () => revalidateTag(CATALOG_TAG, "max");
