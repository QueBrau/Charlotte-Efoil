"use client";

import Link from "next/link";

import { useCartStore } from "@/lib/cart/store";

export function CartButton() {
  const itemCount = useCartStore((state) => state.itemCount);

  return (
    <Link
      href="/cart"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-border text-brand transition-colors hover:border-brand hover:bg-brand-surface"
      aria-label={`Cart, ${itemCount} items`}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden
      >
        <path d="M6 6h15l-1.5 9h-12z" />
        <path d="M6 6 5 3H2" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </svg>
      {itemCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
          {itemCount}
        </span>
      ) : null}
    </Link>
  );
}
