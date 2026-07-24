import Link from "next/link";
import { notFound } from "next/navigation";

import { Reveal } from "@/components/motion/Reveal";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductGrid } from "@/components/product/ProductGrid";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { getProductWithDetails, getProducts } from "@/lib/catalog/queries";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductWithDetails(slug);

  if (!product) notFound();

  const relatedProducts = (
    product.recommendedProducts
      .map((item) => item.recommendedProduct)
      .filter(Boolean) as NonNullable<
      (typeof product.recommendedProducts)[number]["recommendedProduct"]
    >[]
  ).slice(0, 3);

  const fallbackRelated = relatedProducts.length
    ? relatedProducts
    : (await getProducts({ productType: product.productType, limit: 3 })).filter(
        (item) => item.slug !== product.slug,
      );

  return (
    <div className="section-padding">
      <div className="container-wide space-y-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <ProductGallery media={product.media} productName={product.name} />
          </Reveal>

          <Reveal delay={80}>
            <div className="space-y-6">
              <div>
                <p className="text-sm uppercase tracking-wider text-brand-muted">
                  {product.productType.replace(/_/g, " ")}
                </p>
                <h1 className="mt-2 font-display text-4xl text-brand">{product.name}</h1>
                {product.shortDescription ? (
                  <p className="mt-4 text-lg text-brand-muted">{product.shortDescription}</p>
                ) : null}
              </div>

              <PriceDisplay
                cents={product.basePriceCents}
                compareAtCents={product.compareAtPriceCents}
                size="lg"
              />

              <div className="flex flex-wrap gap-3">
                {product.isConfigurable ? (
                  <Link href={`/configure/${product.slug}`} className="btn-primary">
                    Configure this product
                  </Link>
                ) : (
                  <AddToCartButton product={product} />
                )}
                <Link href="/cart" className="btn-secondary">
                  View cart
                </Link>
              </div>

              {product.description ? (
                <p className="leading-relaxed text-brand-muted">{product.description}</p>
              ) : null}
            </div>
          </Reveal>
        </div>

        {product.features.length > 0 ? (
          <Reveal>
            <section>
              <h2 className="font-display text-2xl text-brand">Features</h2>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {product.features.map((feature) => (
                  <li
                    key={feature}
                    className="rounded-2xl border border-brand-border px-4 py-3 text-sm text-brand"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        ) : null}

        {Object.keys(product.specs).length > 0 ? (
          <Reveal>
            <section>
              <h2 className="font-display text-2xl text-brand">Specifications</h2>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} className="card-surface p-4">
                    <dt className="text-xs uppercase tracking-wider text-brand-muted">
                      {key.replace(/_/g, " ")}
                    </dt>
                    <dd className="mt-2 font-medium text-brand">
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </Reveal>
        ) : null}

        {product.whatsIncluded.length > 0 ? (
          <Reveal>
            <section>
              <h2 className="font-display text-2xl text-brand">What&apos;s included</h2>
              <ul className="mt-6 list-disc space-y-2 pl-5 text-brand-muted">
                {product.whatsIncluded.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </Reveal>
        ) : null}

        {product.faqs.length > 0 ? (
          <Reveal>
            <section>
              <h2 className="font-display text-2xl text-brand">FAQs</h2>
              <div className="mt-6 space-y-4">
                {product.faqs.map((faq) => (
                  <details key={faq.question} className="card-surface p-5">
                    <summary className="cursor-pointer font-medium text-brand">
                      {faq.question}
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-brand-muted">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          </Reveal>
        ) : null}

        {fallbackRelated.length > 0 ? (
          <Reveal>
            <section>
              <h2 className="font-display text-2xl text-brand">Related products</h2>
              <div className="mt-8">
                <ProductGrid products={fallbackRelated} />
              </div>
            </section>
          </Reveal>
        ) : null}
      </div>
    </div>
  );
}
