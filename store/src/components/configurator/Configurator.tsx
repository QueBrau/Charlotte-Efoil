"use client";

import { useMemo, useState } from "react";

import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { ProductMediaCarousel } from "@/components/product/ProductMediaCarousel";
import {
  buildConfigurationSummary,
  getCompatibleOptions,
  selectionsFromValueIds,
  validateConfiguration,
} from "@/lib/configurator/engine";
import { resolveStoreMediaUrl } from "@/lib/constants";
import { useCartStore } from "@/lib/cart/store";
import type {
  ConfigurationSelection,
  ProductOptionGroup,
  ProductWithDetails,
} from "@/types/commerce";

interface ConfiguratorProps {
  product: ProductWithDetails;
}

function getDefaultSelections(product: ProductWithDetails): ConfigurationSelection[] {
  const defaultValueIds = product.optionGroups.flatMap((group) => {
    const defaults = group.values.filter((value) => value.isDefault);
    return (defaults.length ? defaults : group.values.slice(0, 1)).map(
      (value) => value.id,
    );
  });
  return selectionsFromValueIds(product, defaultValueIds);
}

function buildSelection(
  group: ProductOptionGroup,
  valueId: string,
): ConfigurationSelection | null {
  const value = group.values.find((item) => item.id === valueId);
  if (!value) return null;
  return {
    optionGroupId: group.id,
    optionGroupSlug: group.slug,
    optionValueId: value.id,
    optionValueSlug: value.slug,
    label: value.label,
    priceDeltaCents: value.priceDeltaCents,
  };
}

export function Configurator({ product }: ConfiguratorProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [selections, setSelections] = useState<ConfigurationSelection[]>(() =>
    getDefaultSelections(product),
  );
  const [quantity, setQuantity] = useState(1);

  const summary = useMemo(
    () => buildConfigurationSummary(product, selections),
    [product, selections],
  );

  const validation = useMemo(
    () => validateConfiguration(product, selections),
    [product, selections],
  );

  const previewImage =
    selections
      .map((selection) => {
        for (const group of product.optionGroups) {
          const value = group.values.find(
            (item) => item.id === selection.optionValueId,
          );
          if (value?.imageUrl) return value.imageUrl;
        }
        return null;
      })
      .find(Boolean) ??
    product.media.find((item) => item.isPrimary)?.url ??
    product.media[0]?.url ??
    null;

  function selectOption(groupId: string, valueId: string) {
    const group = product.optionGroups.find((item) => item.id === groupId);
    if (!group) return;

    const nextSelection = buildSelection(group, valueId);
    if (!nextSelection) return;

    setSelections((current) => {
      const withoutGroup = current.filter(
        (selection) => selection.optionGroupId !== groupId,
      );
      return [...withoutGroup, nextSelection];
    });
  }

  function handleAddToCart() {
    if (!validation.isValid) return;

    const defaultVariant = product.variants.find((variant) => variant.isDefault);

    addItem(
      {
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        variantId: defaultVariant?.id ?? null,
        variantSku: defaultVariant?.sku ?? null,
        selections: summary.selections,
        unitPriceCents: summary.unitPriceCents,
        imageUrl: resolveStoreMediaUrl(previewImage),
      },
      quantity,
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
      <div className="space-y-6">
        <ProductMediaCarousel media={product.media} productName={product.name} spacious={false} />

        <div className="card-surface p-6">
          <h2 className="font-display text-xl text-brand">Your build</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {summary.selections.map((selection) => (
              <li
                key={selection.optionValueId}
                className="flex items-start justify-between gap-4 border-b border-brand-border/60 pb-2 last:border-0"
              >
                <span className="text-brand-muted">{selection.optionGroupSlug.replace(/-/g, " ")}</span>
                <span className="text-right text-brand">{selection.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <p className="text-sm uppercase tracking-wider text-brand-muted">Configure</p>
          <h1 className="mt-2 font-display text-3xl text-brand md:text-4xl">
            {product.name}
          </h1>
          <div className="mt-4">
            <PriceDisplay cents={summary.unitPriceCents} size="lg" />
            <p className="mt-2 text-sm text-brand-muted">
              Starting at {product.name.includes("Package") ? "package price" : "base price"} plus selected options
            </p>
          </div>
        </div>

        {product.optionGroups.map((group) => {
          const compatible = getCompatibleOptions(product, group.id, selections);
          const selected = selections.find(
            (selection) => selection.optionGroupId === group.id,
          );

          return (
            <section key={group.id} className="space-y-3">
              <div>
                <h3 className="font-medium text-brand">{group.name}</h3>
                {group.description ? (
                  <p className="mt-1 text-sm text-brand-muted">{group.description}</p>
                ) : null}
              </div>

              <div className="grid gap-2">
                {group.values.map((value) => {
                  const isCompatible = compatible.some((item) => item.id === value.id);
                  const isSelected = selected?.optionValueId === value.id;

                  return (
                    <button
                      key={value.id}
                      type="button"
                      disabled={!isCompatible}
                      onClick={() => selectOption(group.id, value.id)}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? "border-brand bg-brand/5"
                          : isCompatible
                            ? "border-brand-border hover:border-brand/40"
                            : "cursor-not-allowed border-brand-border/50 opacity-40"
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-medium text-brand">
                          {value.label}
                        </span>
                        {value.description ? (
                          <span className="mt-0.5 block text-xs text-brand-muted">
                            {value.description}
                          </span>
                        ) : null}
                      </span>
                      {value.priceDeltaCents !== 0 ? (
                        <span className="text-xs text-brand-muted">
                          {value.priceDeltaCents > 0 ? "+" : ""}
                          ${(value.priceDeltaCents / 100).toLocaleString()}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        {(validation.errors.length > 0 || summary.warnings.length > 0) && (
          <div className="space-y-2">
            {validation.errors.map((error) => (
              <p key={error} className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ))}
            {summary.warnings.map((warning) => (
              <p
                key={warning}
                className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"
              >
                {warning}
              </p>
            ))}
          </div>
        )}

        <div className="card-surface sticky bottom-4 space-y-4 p-6 shadow-lg shadow-brand/10">
          <div className="flex items-center justify-between">
            <label htmlFor="qty" className="text-sm font-medium text-brand">
              Quantity
            </label>
            <input
              id="qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(event) =>
                setQuantity(Math.max(1, Number(event.target.value) || 1))
              }
              className="input-field w-24 text-center"
            />
          </div>

          <PriceDisplay cents={summary.unitPriceCents * quantity} size="lg" />

          <button
            type="button"
            className="btn-primary w-full"
            disabled={!validation.isValid}
            onClick={handleAddToCart}
          >
            Add configured build to cart
          </button>
        </div>
      </div>
    </div>
  );
}
