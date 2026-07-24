"use client";

import { resolveStoreMediaUrl } from "@/lib/constants";
import { useCartStore } from "@/lib/cart/store";
import type { ProductWithDetails } from "@/types/commerce";

interface AddToCartButtonProps {
  product: ProductWithDetails;
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const defaultVariant = product.variants.find((variant) => variant.isDefault);

  return (
    <button
      type="button"
      className="btn-primary"
      onClick={() =>
        addItem({
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          variantId: defaultVariant?.id ?? null,
          variantSku: defaultVariant?.sku ?? product.slug.toUpperCase(),
          selections: [],
          unitPriceCents: defaultVariant?.priceCents ?? product.basePriceCents,
          imageUrl: resolveStoreMediaUrl(product.primaryImageUrl),
        })
      }
    >
      Add to cart
    </button>
  );
}
