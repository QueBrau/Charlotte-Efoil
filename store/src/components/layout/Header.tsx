import Link from "next/link";

import { BRAND } from "@/lib/constants";
import { CartButton } from "@/components/cart/CartButton";
import { StoreImage } from "@/components/ui/StoreImage";

const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/configure/flyer-evo-max-plus-package", label: "Configure" },
  { href: "/shop?category=complete-packages", label: "Packages" },
  { href: "/cart", label: "Cart" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-border/80 bg-white/90 backdrop-blur-md">
      <div className="container-wide flex h-16 items-center justify-between gap-6">
        <a href="/" className="flex items-center gap-3 shrink-0">
          <StoreImage
            src="/photos/CharlotteEfoil.png"
            alt={BRAND.name}
            width={140}
            height={36}
            className="h-8 w-auto"
            priority
          />
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-brand-muted transition-colors hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/checkout"
            className="hidden rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-light sm:inline-flex"
          >
            Checkout
          </Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
