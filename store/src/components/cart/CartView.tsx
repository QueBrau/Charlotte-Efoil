"use client";

import Link from "next/link";

import { StoreImage } from "@/components/ui/StoreImage";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { useCartStore } from "@/lib/cart/store";

export function CartView() {
  const lines = useCartStore((state) => state.lines);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);

  if (!lines.length) {
    return (
      <div className="card-surface px-6 py-16 text-center">
        <p className="font-display text-2xl text-brand">Your cart is empty</p>
        <p className="mt-3 text-brand-muted">
          Configure a Waydoo package or browse components to begin.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/configure/flyer-evo-max-plus-package" className="btn-primary">
            Configure a package
          </Link>
          <Link href="/shop" className="btn-secondary">
            Browse shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lines.map((line) => (
        <article key={line.id} className="card-surface flex gap-4 p-4 md:p-6">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-brand-surface">
            {line.configuration.imageUrl ? (
              <StoreImage
                src={line.configuration.imageUrl}
                alt={line.configuration.productName}
                fill
                sizes="112px"
                className="object-contain p-3"
              />
            ) : null}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium text-brand">{line.configuration.productName}</h3>
                {line.configuration.selections.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-brand-muted">
                    {line.configuration.selections.map((selection) => (
                      <li key={selection.optionValueId}>
                        {selection.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeItem(line.id)}
                className="text-sm text-brand-muted hover:text-brand"
              >
                Remove
              </button>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor={`qty-${line.id}`} className="text-xs text-brand-muted">
                  Qty
                </label>
                <input
                  id={`qty-${line.id}`}
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(event) =>
                    updateQty(line.id, Math.max(1, Number(event.target.value) || 1))
                  }
                  className="input-field w-20 text-center"
                />
              </div>
              <PriceDisplay cents={line.lineTotalCents} />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
