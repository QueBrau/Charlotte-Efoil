import type { TaxEstimate } from "@/types/commerce";

import type { TaxProvider } from "@/lib/tax/types";

/** Combined state + average local sales tax rates (approximate, for estimates only). */
export const US_STATE_TAX_RATES: Record<string, number> = {
  AL: 0.091,
  AK: 0.0176,
  AZ: 0.084,
  AR: 0.0947,
  CA: 0.0872,
  CO: 0.0786,
  CT: 0.0635,
  DE: 0,
  DC: 0.06,
  FL: 0.0702,
  GA: 0.0744,
  HI: 0.045,
  ID: 0.0603,
  IL: 0.0892,
  IN: 0.07,
  IA: 0.0694,
  KS: 0.0873,
  KY: 0.06,
  LA: 0.0956,
  ME: 0.055,
  MD: 0.06,
  MA: 0.0625,
  MI: 0.06,
  MN: 0.0813,
  MS: 0.0707,
  MO: 0.0841,
  MT: 0,
  NE: 0.0695,
  NV: 0.0823,
  NH: 0,
  NJ: 0.066,
  NM: 0.0767,
  NY: 0.0854,
  NC: 0.0698,
  ND: 0.0696,
  OH: 0.0724,
  OK: 0.0897,
  OR: 0,
  PA: 0.0634,
  RI: 0.07,
  SC: 0.0749,
  SD: 0.0611,
  TN: 0.0955,
  TX: 0.082,
  UT: 0.0719,
  VT: 0.0624,
  VA: 0.0575,
  WA: 0.0947,
  WV: 0.0655,
  WI: 0.0543,
  WY: 0.0556,
};

const DEFAULT_RATE = 0.07;

function normalizeState(state: string): string {
  return state.trim().toUpperCase();
}

export class StateTaxProvider implements TaxProvider {
  readonly name = "Estimated US State Tax";

  estimateTax(subtotalCents: number, state: string): TaxEstimate {
    const normalizedState = normalizeState(state);
    const taxRate = US_STATE_TAX_RATES[normalizedState] ?? DEFAULT_RATE;
    const taxCents = Math.round(subtotalCents * taxRate);

    return {
      subtotalCents,
      taxCents,
      taxRate,
      state: normalizedState,
      label: `${normalizedState} estimated sales tax`,
      isEstimate: true,
    };
  }
}

const defaultProvider = new StateTaxProvider();

/** Estimate sales tax using the default state-based provider. */
export function estimateTax(subtotalCents: number, state: string): TaxEstimate {
  return defaultProvider.estimateTax(subtotalCents, state);
}

export function getTaxRateForState(state: string): number {
  const normalizedState = normalizeState(state);
  return US_STATE_TAX_RATES[normalizedState] ?? DEFAULT_RATE;
}
