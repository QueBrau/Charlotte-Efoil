import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { BRAND } from "@/lib/constants";
import { formatOrderNumber } from "@/lib/format";

interface OrderConfirmationPageProps {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ submitted?: string }>;
}

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: OrderConfirmationPageProps) {
  const { orderNumber } = await params;
  const query = await searchParams;
  const submitted = query.submitted === "1";

  return (
    <div className="section-padding">
      <div className="container-store">
        <Reveal>
          <div className="card-surface mx-auto max-w-2xl px-8 py-12 text-center">
            <p className="text-sm uppercase tracking-wider text-brand-muted">
              {submitted ? "Order submitted" : "Order"}
            </p>
            <h1 className="mt-3 font-display text-3xl text-brand md:text-4xl">
              Thank you for your order
            </h1>
            <p className="mt-4 text-brand-muted">
              Your order <strong>{formatOrderNumber(orderNumber)}</strong> is now{" "}
              <strong>Pending Review</strong>. {BRAND.name} has received your
              configuration and will contact you after approval with your finalized
              invoice and payment instructions.
            </p>

            <div className="mt-8 rounded-2xl bg-brand-surface p-6 text-left text-sm">
              <p className="font-medium text-brand">What happens next</p>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-brand-muted">
                <li>Charlotte eFoil reviews your order</li>
                <li>You receive an approved invoice via email</li>
                <li>Pay via ACH or domestic wire transfer</li>
                <li>Your order moves to processing and fulfillment</li>
              </ol>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/shop" className="btn-primary">
                Continue shopping
              </Link>
              <a href={`mailto:${BRAND.adminEmail}`} className="btn-secondary">
                Contact dealer
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
