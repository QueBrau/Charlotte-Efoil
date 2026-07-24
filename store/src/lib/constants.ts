/** Charlotte eFoil brand and store constants. */

export const BRAND = {
  name: "Charlotte eFoil",
  legalName: "Charlotte eFoil",
  tagline: "The Charlotte area's premium Waydoo eFoil dealer",
  adminEmail: "hello@charlotteefoil.com",
  phone: "704-421-8778",
  website: "https://www.charlotteefoil.com",
} as const;

export const BRAND_COLORS = {
  /** Primary brand navy — rgb(25, 64, 85) */
  primary: "#194055",
  primaryRgb: "25, 64, 85",
  primaryLight: "#2a5a73",
  primaryDark: "#0f2a38",
  accent: "#c8e4ef",
  accentMuted: "#93a7b0",
  white: "#ffffff",
  black: "#0a0a0a",
  surface: "#f7f9fa",
  border: "#d8e2e8",
} as const;

export const CART_STORAGE_KEY = "charlotte-efoil-cart";

export const DEFAULT_COUNTRY = "US";

export const DEFAULT_SHIPPING_ESTIMATE_CENTS = 0;

export const INVOICE_STORAGE_BUCKET = "invoices";

/** Must match `basePath` in next.config.ts — used for static media URLs outside next/image. */
export const STORE_BASE_PATH = "/waydoo";

/** Prefix local public asset paths so they resolve under the Next.js basePath. */
export function resolveStoreMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith(STORE_BASE_PATH)) return url;
  return `${STORE_BASE_PATH}${url.startsWith("/") ? url : `/${url}`}`;
}

export const ORDER_TERMS = [
  "All prices are estimates until your order is reviewed and approved by Charlotte eFoil.",
  "Payment is due via ACH or domestic wire transfer only. No credit cards are accepted.",
  "Estimated sales tax and shipping may be adjusted on the final invoice.",
  "Orders are fulfilled after payment confirmation and inventory verification.",
  "Contact hello@charlotteefoil.com with questions about your order.",
].join("\n");
