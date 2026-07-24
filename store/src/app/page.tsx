import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { ProductGrid } from "@/components/product/ProductGrid";
import { StoreImage } from "@/components/ui/StoreImage";
import { getCategories, getProducts } from "@/lib/catalog/queries";

export default async function HomePage() {
  const [categories, packages, featured] = await Promise.all([
    getCategories(),
    getProducts({ categorySlug: "complete-packages" }),
    getProducts({ limit: 6 }),
  ]);

  return (
    <>
      <section className="relative overflow-hidden bg-brand text-white">
        <div className="absolute inset-0 opacity-20">
          <StoreImage
            src="/photos/lakenorman.jpg"
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="container-wide relative section-padding grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <p className="text-sm uppercase tracking-[0.2em] text-brand-accent">
              Charlotte eFoil · Authorized Waydoo Dealer
            </p>
            <h1 className="mt-4 max-w-2xl font-display text-4xl leading-tight md:text-6xl">
              Configure your perfect eFoil setup.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/80">
              A premium direct-to-consumer experience. Build your Waydoo package,
              checkout, and receive a professionally managed invoice
              with ACH or wire payment instructions.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/configure/flyer-evo-max-plus-package"
                className="rounded-full bg-white px-6 py-3 text-sm font-medium text-brand transition hover:bg-brand-accent"
              >
                Start configuring
              </Link>
              <Link
                href="/shop"
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Browse catalog
              </Link>
            </div>
          </Reveal>

          <Reveal delay={120} className="relative mx-auto aspect-[4/3] w-full max-w-lg">
            <StoreImage
              src="/products/flyer-evo-max-plus-package/hero.webp"
              alt="Waydoo Flyer EVO Max Plus"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-contain drop-shadow-2xl"
              priority
            />
          </Reveal>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide">
          <Reveal>
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-wider text-brand-muted">
                Complete packages
              </p>
              <h2 className="mt-2 font-display text-3xl text-brand md:text-4xl">
                Choose your Flyer EVO platform
              </h2>
              <p className="mt-4 text-brand-muted">
                Max Plus for stability, Pro Plus for versatility, or Lite for agile
                progression. Every package is fully configurable.
              </p>
            </div>
          </Reveal>
          <div className="mt-10">
            <ProductGrid products={packages} />
          </div>
        </div>
      </section>

      <section className="section-padding bg-brand-surface">
        <div className="container-wide">
          <Reveal>
            <h2 className="font-display text-3xl text-brand">Shop by category</h2>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 8).map((category, index) => (
              <Reveal key={category.id} delay={index * 40}>
                <Link
                  href={`/shop?category=${category.slug}`}
                  className="card-surface block p-5 transition hover:border-brand/30 hover:shadow-md"
                >
                  <p className="font-medium text-brand">{category.name}</p>
                  {category.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-brand-muted">
                      {category.description}
                    </p>
                  ) : null}
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide">
          <Reveal>
            <h2 className="font-display text-3xl text-brand">Featured products</h2>
          </Reveal>
          <div className="mt-10">
            <ProductGrid products={featured} />
          </div>
        </div>
      </section>
    </>
  );
}
