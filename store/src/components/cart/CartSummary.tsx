"use client";

import Link from "next/link";

import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { StoreImage } from "@/components/ui/StoreImage";
import { DEFAULT_SHIPPING_ESTIMATE_CENTS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { useCartStore } from "@/lib/cart/store";
import { estimateTax } from "@/lib/tax/estimate";
import type { ProductSummary } from "@/types/commerce";

interface CartSummaryProps {
  shippingState?: string;
  showCheckoutLink?: boolean;
  recommended?: ProductSummary[];
}

export function CartSummary({
  shippingState = "NC",
  showCheckoutLink = true,
  recommended = [],
}: CartSummaryProps) {
  const lines = useCartStore((state) => state.lines);
  const subtotalCents = useCartStore((state) => state.subtotalCents);
  const tax = estimateTax(subtotalCents, shippingState);
  const totalCents = subtotalCents + tax.taxCents + DEFAULT_SHIPPING_ESTIMATE_CENTS;

  return (
    <aside className="card-surface h-fit space-y-6 p-6 lg:sticky lg:top-24">
      <h2 className="font-display text-xl text-brand">Order summary</h2>

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-brand-muted">Subtotal</dt>
          <dd className="price-display font-medium">{formatMoney(subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-brand-muted">{tax.label}</dt>
          <dd className="price-display">{formatMoney(tax.taxCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-brand-muted">Estimated shipping</dt>
          <dd className="price-display">
            {DEFAULT_SHIPPING_ESTIMATE_CENTS === 0
              ? "TBD"
              : formatMoney(DEFAULT_SHIPPING_ESTIMATE_CENTS)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-brand-border pt-3 text-base">
          <dt className="font-medium text-brand">Estimated total</dt>
          <dd className="price-display font-semibold text-brand">
            {formatMoney(totalCents)}
          </dd>
        </div>
      </dl>

      <p className="text-xs leading-relaxed text-brand-muted">
        Tax and shipping are estimates. Final amounts are confirmed on your approved
        invoice. Payment via ACH or wire transfer only.
      </p>

      {showCheckoutLink ? (
        <Link
          href="/checkout"
          className={`btn-primary w-full ${lines.length === 0 ? "pointer-events-none opacity-50" : ""}`}
          aria-disabled={lines.length === 0}
        >
          Continue to checkout
        </Link>
      ) : null}

      {recommended.length > 0 ? (
        <div className="border-t border-brand-border pt-6">
          <p className="text-sm font-medium text-brand">Recommended</p>
          <ul className="mt-4 space-y-3">
            {recommended.slice(0, 3).map((product) => (
              <li key={product.id}>
                <Link
                  href={`/products/${product.slug}`}
                  className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-brand-surface"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-brand-surface">
                    {product.primaryImageUrl ? (
                      <StoreImage
                        src={product.primaryImageUrl}
                        alt={product.name}
                        fill
                        sizes="48px"
                        className="object-contain p-1"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-brand">
                      {product.name}
                    </p>
                    <PriceDisplay cents={product.basePriceCents} size="sm" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
