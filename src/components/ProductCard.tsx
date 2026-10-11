import Link from "next/link";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { CatalogItem } from "@/lib/catalog";
import { money } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ item, lang, t }: { item: CatalogItem; lang: Locale; t: Dict }) {
  return (
    <article className="pcard">
      <Link href={`/${lang}/products/${item.slug}`} className="pcard__link">
        <div className="pcard__media">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt="" loading="lazy" />
          ) : (
            <span className="pcard__noimg">{t.shop.noImage}</span>
          )}
        </div>
        <p className="pcard__maker">{item.manufacturer}</p>
        <h3 className="pcard__name">{item.name}</h3>
      </Link>
      <div className="pcard__foot">
        <strong className="pcard__price">{money(lang, item.price, item.currency)}</strong>
        <Badge variant={item.inStock ? "default" : "warning"}>{item.inStock ? t.shop.inStock : t.shop.outOfStock}</Badge>
      </div>
    </article>
  );
}
