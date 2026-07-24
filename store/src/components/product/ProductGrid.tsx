import { ProductCard } from "@/components/product/ProductCard";
import type { ProductSummary } from "@/types/commerce";

interface ProductGridProps {
  products: ProductSummary[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (!products.length) {
    return (
      <p className="rounded-2xl border border-dashed border-brand-border px-6 py-16 text-center text-brand-muted">
        No products found in this category.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index === 0} />
      ))}
    </div>
  );
}
