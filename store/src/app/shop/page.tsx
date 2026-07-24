import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { ProductGrid } from "@/components/product/ProductGrid";
import { getCategories, getProducts } from "@/lib/catalog/queries";

interface ShopPageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const categorySlug = params.category;

  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts(categorySlug ? { categorySlug } : {}),
  ]);

  const activeCategory = categories.find((category) => category.slug === categorySlug);

  return (
    <div className="section-padding">
      <div className="container-wide">
        <Reveal>
          <p className="text-sm uppercase tracking-wider text-brand-muted">Shop</p>
          <h1 className="mt-2 font-display text-4xl text-brand">
            {activeCategory?.name ?? "All Waydoo Products"}
          </h1>
          {activeCategory?.description ? (
            <p className="mt-4 max-w-2xl text-brand-muted">{activeCategory.description}</p>
          ) : (
            <p className="mt-4 max-w-2xl text-brand-muted">
              Browse the complete Charlotte eFoil Waydoo catalog — packages, components,
              accessories, and safety gear.
            </p>
          )}
        </Reveal>

        <div className="mt-8 flex flex-wrap gap-2">
          <Link
            href="/shop"
            className={`rounded-full px-4 py-2 text-sm transition ${
              !categorySlug
                ? "bg-brand text-white"
                : "border border-brand-border text-brand hover:border-brand"
            }`}
          >
            All
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/shop?category=${category.slug}`}
              className={`rounded-full px-4 py-2 text-sm transition ${
                categorySlug === category.slug
                  ? "bg-brand text-white"
                  : "border border-brand-border text-brand hover:border-brand"
              }`}
            >
              {category.name}
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <ProductGrid products={products} />
        </div>
      </div>
    </div>
  );
}
