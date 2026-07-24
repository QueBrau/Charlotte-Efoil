import { Reveal } from "@/components/motion/Reveal";
import { CartSummary } from "@/components/cart/CartSummary";
import { CartView } from "@/components/cart/CartView";
import { getProducts } from "@/lib/catalog/queries";

export default async function CartPage() {
  const recommended = await getProducts({ productType: "accessory", limit: 3 });

  return (
    <div className="section-padding">
      <div className="container-wide">
        <Reveal>
          <h1 className="font-display text-4xl text-brand">Your cart</h1>
          <p className="mt-3 text-brand-muted">
            Review your configured builds and accessories before checkout.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
          <CartView />
          <CartSummary recommended={recommended} />
        </div>
      </div>
    </div>
  );
}
