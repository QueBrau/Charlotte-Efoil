import Link from "next/link";

import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { StoreImage } from "@/components/ui/StoreImage";
import type { ProductSummary } from "@/types/commerce";

interface ProductCardProps {
  product: ProductSummary;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const href = product.isConfigurable
    ? `/configure/${product.slug}`
    : `/products/${product.slug}`;

  return (
    <Link
      href={href}
      className="group card-surface flex flex-col overflow-hidden transition-shadow hover:shadow-lg hover:shadow-brand/5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-surface">
        {product.primaryImageUrl ? (
          <StoreImage
            src={product.primaryImageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-brand-muted">
            {product.name}
          </div>
        )}
        {product.isConfigurable ? (
          <span className="absolute left-4 top-4 rounded-full bg-brand px-3 py-1 text-xs font-medium text-white">
            Configurable
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-brand-muted">
            {product.productType.replace(/_/g, " ")}
          </p>
          <h3 className="mt-1 font-display text-lg text-brand">{product.name}</h3>
        </div>
        {product.shortDescription ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-brand-muted">
            {product.shortDescription}
          </p>
        ) : null}
        <div className="mt-auto pt-2">
          <PriceDisplay cents={product.basePriceCents} compareAtCents={product.compareAtPriceCents} size="sm" />
        </div>
      </div>
    </Link>
  );
}
