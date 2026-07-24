import { Reveal } from "@/components/motion/Reveal";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getProducts } from "@/lib/catalog/queries";

export default async function CheckoutPage() {
  const recommended = await getProducts({ productType: "safety", limit: 3 });

  return (
    <div className="section-padding">
      <div className="container-wide">
        <Reveal>
          <h1 className="font-display text-4xl text-brand">Checkout</h1>
          <p className="mt-3 max-w-2xl text-brand-muted">
            Complete your details to place your order. Charlotte eFoil will review
            your configuration and send an invoice with ACH or wire payment
            instructions after approval.
          </p>
        </Reveal>

        <div className="mt-10">
          <CheckoutForm recommended={recommended} />
        </div>
      </div>
    </div>
  );
}
