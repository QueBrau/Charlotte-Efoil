import type { TaxEstimate } from "@/types/commerce";

export interface TaxProvider {
  /** Human-readable provider name for UI display. */
  readonly name: string;
  /** Estimate sales tax for a given subtotal and US state code. */
  estimateTax(subtotalCents: number, state: string): TaxEstimate;
}
