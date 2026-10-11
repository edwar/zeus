"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { Facets } from "@/lib/catalog";
import { Input } from "@/components/ui/input";
import { CATALOG_PAGE_SIZE } from "@/lib/catalog-page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "all"; // Radix no admite value="" en un ítem

type Value = { q: string; category: string; manufacturer: string; size?: number };

export function ProductFilters({ t, lang, facets, initial }: { t: Dict; lang: Locale; facets: Facets; initial: Value }) {
  const s = t.shop;
  const uid = useId().replace(/:/g, "");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState(initial.category || ALL);
  const [manufacturer, setManufacturer] = useState(initial.manufacturer || ALL);

  // La URL es la fuente de verdad: cada cambio de filtro navega (y vuelve a la página 1).
  useEffect(() => {
    const id = setTimeout(() => {
      const p = new URLSearchParams();
      if (q.trim()) p.set("q", q.trim());
      if (category !== ALL) p.set("category", category);
      if (manufacturer !== ALL) p.set("maker", manufacturer);
      if (initial.size && initial.size !== CATALOG_PAGE_SIZE) p.set("size", String(initial.size)); // al filtrar se conserva el tamaño de página
      const next = `/${lang}/products${p.size ? `?${p}` : ""}`;
      const current = `${window.location.pathname}${window.location.search}`;
      if (next !== current) startTransition(() => router.replace(next, { scroll: false }));
    }, 300);
    return () => clearTimeout(id);
  }, [q, category, manufacturer, initial.size, lang, router]);

  return (
    <div className="shopfilters">
      <div className="field">
        <label htmlFor={`${uid}q`} className="sr-only">{s.search}</label>
        <Input id={`${uid}q`} type="search" placeholder={s.search} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={`${uid}c`} className="sr-only">{s.allCategories}</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id={`${uid}c`}><SelectValue>{category === ALL ? s.allCategories : category}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{s.allCategories}</SelectItem>
            {facets.categories.map((c) => <SelectItem key={c.name} value={c.name}>{c.name} ({c.count})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="field">
        <label htmlFor={`${uid}m`} className="sr-only">{s.allMakers}</label>
        <Select value={manufacturer} onValueChange={setManufacturer}>
          <SelectTrigger id={`${uid}m`}>
            <SelectValue>{manufacturer === ALL ? s.allMakers : facets.manufacturers.find((m) => m.slug === manufacturer)?.name}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{s.allMakers}</SelectItem>
            {facets.manufacturers.map((m) => <SelectItem key={m.slug} value={m.slug}>{m.name} ({m.count})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
