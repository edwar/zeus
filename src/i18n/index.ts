import { es, type Dict } from "./es";
import { en } from "./en";
import type { Locale } from "./config";

const dicts: Record<Locale, Dict> = { es, en };
export const getDict = (l: Locale): Dict => dicts[l];
export type { Dict };
