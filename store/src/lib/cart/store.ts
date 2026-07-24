"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { CART_STORAGE_KEY } from "@/lib/constants";
import type { CartLine, CartLineConfiguration, CartState } from "@/types/commerce";

function computeLineTotal(unitPriceCents: number, quantity: number): number {
  return unitPriceCents * quantity;
}

function createLineId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function configurationKey(configuration: CartLineConfiguration): string {
  const selectionKey = configuration.selections
    .map((selection) => selection.optionValueId)
    .sort()
    .join("|");

  return [
    configuration.productId,
    configuration.variantId ?? "default",
    selectionKey,
  ].join(":");
}

interface CartStore extends CartState {
  subtotalCents: number;
  itemCount: number;
  addItem: (configuration: CartLineConfiguration, quantity?: number) => void;
  updateQty: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      lines: [],
      updatedAt: null,
      subtotalCents: 0,
      itemCount: 0,

      addItem(configuration, quantity = 1) {
        if (quantity < 1) return;

        const key = configurationKey(configuration);
        const existing = get().lines.find(
          (line) => configurationKey(line.configuration) === key,
        );

        let nextLines: CartLine[];

        if (existing) {
          nextLines = get().lines.map((line) =>
            line.id === existing.id
              ? {
                  ...line,
                  quantity: line.quantity + quantity,
                  lineTotalCents: computeLineTotal(
                    line.configuration.unitPriceCents,
                    line.quantity + quantity,
                  ),
                }
              : line,
          );
        } else {
          nextLines = [
            ...get().lines,
            {
              id: createLineId(),
              configuration,
              quantity,
              lineTotalCents: computeLineTotal(
                configuration.unitPriceCents,
                quantity,
              ),
            },
          ];
        }

        set({
          lines: nextLines,
          updatedAt: new Date().toISOString(),
          subtotalCents: nextLines.reduce((sum, line) => sum + line.lineTotalCents, 0),
          itemCount: nextLines.reduce((sum, line) => sum + line.quantity, 0),
        });
      },

      updateQty(lineId, quantity) {
        if (quantity < 1) {
          get().removeItem(lineId);
          return;
        }

        const nextLines = get().lines.map((line) =>
          line.id === lineId
            ? {
                ...line,
                quantity,
                lineTotalCents: computeLineTotal(
                  line.configuration.unitPriceCents,
                  quantity,
                ),
              }
            : line,
        );

        set({
          lines: nextLines,
          updatedAt: new Date().toISOString(),
          subtotalCents: nextLines.reduce((sum, line) => sum + line.lineTotalCents, 0),
          itemCount: nextLines.reduce((sum, line) => sum + line.quantity, 0),
        });
      },

      removeItem(lineId) {
        const nextLines = get().lines.filter((line) => line.id !== lineId);
        set({
          lines: nextLines,
          updatedAt: new Date().toISOString(),
          subtotalCents: nextLines.reduce((sum, line) => sum + line.lineTotalCents, 0),
          itemCount: nextLines.reduce((sum, line) => sum + line.quantity, 0),
        });
      },

      clearCart() {
        set({
          lines: [],
          updatedAt: new Date().toISOString(),
          subtotalCents: 0,
          itemCount: 0,
        });
      },
    }),
    {
      name: CART_STORAGE_KEY,
      partialize: (state) => ({
        lines: state.lines,
        updatedAt: state.updatedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.subtotalCents = state.lines.reduce(
          (sum, line) => sum + line.lineTotalCents,
          0,
        );
        state.itemCount = state.lines.reduce((sum, line) => sum + line.quantity, 0);
      },
    },
  ),
);

/** Non-hook accessor for subtotal in server-safe contexts that read persisted state indirectly. */
export function getCartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
}
