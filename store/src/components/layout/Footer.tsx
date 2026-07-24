import Link from "next/link";

import { BRAND } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-brand-border bg-brand-surface">
      <div className="container-wide section-padding grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="font-display text-xl text-brand">{BRAND.name}</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-brand-muted">
            {BRAND.tagline}. Configure your Waydoo eFoil, checkout,
            and receive a professionally managed purchasing experience.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Shop
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/shop" className="text-brand hover:underline">
                All Products
              </Link>
            </li>
            <li>
              <Link
                href="/configure/flyer-evo-max-plus-package"
                className="text-brand hover:underline"
              >
                Build Your Package
              </Link>
            </li>
            <li>
              <Link href="/cart" className="text-brand hover:underline">
                Cart
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Contact
          </p>
          <ul className="mt-4 space-y-2 text-sm text-brand">
            <li>
              <a href={`mailto:${BRAND.adminEmail}`}>{BRAND.adminEmail}</a>
            </li>
            <li>
              <a href={`tel:${BRAND.phone.replace(/-/g, "")}`}>{BRAND.phone}</a>
            </li>
            <li>
              <a
                href={BRAND.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-muted hover:text-brand"
              >
                charlotteefoil.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-border py-6">
        <p className="container-wide text-center text-xs text-brand-muted">
          © {new Date().getFullYear()} {BRAND.name}. Payment via ACH or wire transfer
          only — no online card processing.
        </p>
      </div>
    </footer>
  );
}
