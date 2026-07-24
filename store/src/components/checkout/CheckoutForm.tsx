"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { submitOrderAction } from "@/actions/submit-order";
import { CartSummary } from "@/components/cart/CartSummary";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { DEFAULT_SHIPPING_ESTIMATE_CENTS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { useCartStore } from "@/lib/cart/store";
import { estimateTax } from "@/lib/tax/estimate";
import type { ProductSummary } from "@/types/commerce";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

interface CheckoutFormProps {
  recommended?: ProductSummary[];
}

export function CheckoutForm({ recommended = [] }: CheckoutFormProps) {
  const router = useRouter();
  const lines = useCartStore((state) => state.lines);
  const subtotalCents = useCartStore((state) => state.subtotalCents);
  const clearCart = useCartStore((state) => state.clearCart);
  const [step, setStep] = useState<"details" | "review">("details");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    shippingLine1: "",
    shippingLine2: "",
    shippingCity: "",
    shippingState: "NC",
    shippingPostalCode: "",
    billingSameAsShipping: true,
    billingLine1: "",
    billingLine2: "",
    billingCity: "",
    billingState: "NC",
    billingPostalCode: "",
    specialRequests: "",
    preferredDeliveryMethod: "Standard freight / dealer delivery",
    dealerNotes: "",
  });

  const taxEstimate = useMemo(
    () => estimateTax(subtotalCents, form.shippingState),
    [subtotalCents, form.shippingState],
  );

  const totalCents =
    subtotalCents + taxEstimate.taxCents + DEFAULT_SHIPPING_ESTIMATE_CENTS;

  function updateField(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmitDetails(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmitOrder() {
    setError(null);
    startTransition(async () => {
      const result = await submitOrderAction({
        customer: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          companyName: form.companyName || undefined,
        },
        shippingAddress: {
          line1: form.shippingLine1,
          line2: form.shippingLine2 || undefined,
          city: form.shippingCity,
          state: form.shippingState,
          postalCode: form.shippingPostalCode,
        },
        billingAddress: form.billingSameAsShipping
          ? undefined
          : {
              line1: form.billingLine1,
              line2: form.billingLine2 || undefined,
              city: form.billingCity,
              state: form.billingState,
              postalCode: form.billingPostalCode,
            },
        billingSameAsShipping: form.billingSameAsShipping,
        lines,
        specialRequests: form.specialRequests || undefined,
        preferredDeliveryMethod: form.preferredDeliveryMethod || undefined,
        dealerNotes: form.dealerNotes || undefined,
        taxEstimate,
        shippingEstimateCents: DEFAULT_SHIPPING_ESTIMATE_CENTS,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      clearCart();
      router.push(`/order/${result.orderNumber}?submitted=1`);
    });
  }

  if (!lines.length) {
    return (
      <div className="card-surface px-6 py-16 text-center">
        <p className="font-display text-2xl text-brand">Nothing to submit yet</p>
        <p className="mt-3 text-brand-muted">Add products to your cart before checkout.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <div>
        {step === "details" ? (
          <form onSubmit={handleSubmitDetails} className="space-y-10">
            <section className="card-surface space-y-4 p-6">
              <h2 className="font-display text-xl text-brand">Contact information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  required
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className="input-field"
                />
                <input
                  required
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className="input-field"
                />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="input-field sm:col-span-2"
                />
                <input
                  required
                  type="tel"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="input-field"
                />
                <input
                  placeholder="Company (optional)"
                  value={form.companyName}
                  onChange={(e) => updateField("companyName", e.target.value)}
                  className="input-field"
                />
              </div>
            </section>

            <section className="card-surface space-y-4 p-6">
              <h2 className="font-display text-xl text-brand">Shipping address</h2>
              <div className="grid gap-4">
                <input
                  required
                  placeholder="Address line 1"
                  value={form.shippingLine1}
                  onChange={(e) => updateField("shippingLine1", e.target.value)}
                  className="input-field"
                />
                <input
                  placeholder="Address line 2 (optional)"
                  value={form.shippingLine2}
                  onChange={(e) => updateField("shippingLine2", e.target.value)}
                  className="input-field"
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  <input
                    required
                    placeholder="City"
                    value={form.shippingCity}
                    onChange={(e) => updateField("shippingCity", e.target.value)}
                    className="input-field sm:col-span-1"
                  />
                  <select
                    required
                    value={form.shippingState}
                    onChange={(e) => updateField("shippingState", e.target.value)}
                    className="input-field"
                  >
                    {US_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    placeholder="ZIP"
                    value={form.shippingPostalCode}
                    onChange={(e) => updateField("shippingPostalCode", e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </section>

            <section className="card-surface space-y-4 p-6">
              <label className="flex items-center gap-3 text-sm text-brand">
                <input
                  type="checkbox"
                  checked={form.billingSameAsShipping}
                  onChange={(e) =>
                    updateField("billingSameAsShipping", e.target.checked)
                  }
                />
                Billing address same as shipping
              </label>

              {!form.billingSameAsShipping ? (
                <div className="grid gap-4">
                  <input
                    required
                    placeholder="Billing address line 1"
                    value={form.billingLine1}
                    onChange={(e) => updateField("billingLine1", e.target.value)}
                    className="input-field"
                  />
                  <input
                    placeholder="Billing address line 2"
                    value={form.billingLine2}
                    onChange={(e) => updateField("billingLine2", e.target.value)}
                    className="input-field"
                  />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <input
                      required
                      placeholder="City"
                      value={form.billingCity}
                      onChange={(e) => updateField("billingCity", e.target.value)}
                      className="input-field"
                    />
                    <select
                      required
                      value={form.billingState}
                      onChange={(e) => updateField("billingState", e.target.value)}
                      className="input-field"
                    >
                      {US_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    <input
                      required
                      placeholder="ZIP"
                      value={form.billingPostalCode}
                      onChange={(e) => updateField("billingPostalCode", e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              ) : null}
            </section>

            <section className="card-surface space-y-4 p-6">
              <h2 className="font-display text-xl text-brand">Order details</h2>
              <textarea
                placeholder="Special requests"
                value={form.specialRequests}
                onChange={(e) => updateField("specialRequests", e.target.value)}
                className="input-field min-h-24 resize-y"
              />
              <input
                placeholder="Preferred delivery method"
                value={form.preferredDeliveryMethod}
                onChange={(e) => updateField("preferredDeliveryMethod", e.target.value)}
                className="input-field"
              />
              <textarea
                placeholder="Notes for Charlotte eFoil (optional)"
                value={form.dealerNotes}
                onChange={(e) => updateField("dealerNotes", e.target.value)}
                className="input-field min-h-24 resize-y"
              />
            </section>

            <button type="submit" className="btn-primary">
              Review order
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <section className="card-surface space-y-4 p-6">
              <h2 className="font-display text-xl text-brand">Review your order</h2>
              <p className="text-sm text-brand-muted">
                No payment is collected on this site. After submission, Charlotte eFoil
                will review your order and send an invoice with ACH/wire instructions
                upon approval.
              </p>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-brand-muted">
                    Customer
                  </p>
                  <p className="mt-2 text-brand">
                    {form.firstName} {form.lastName}
                  </p>
                  <p className="text-sm text-brand-muted">{form.email}</p>
                  <p className="text-sm text-brand-muted">{form.phone}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-brand-muted">
                    Ship to
                  </p>
                  <p className="mt-2 text-sm text-brand">
                    {form.shippingLine1}
                    {form.shippingLine2 ? `, ${form.shippingLine2}` : ""}
                    <br />
                    {form.shippingCity}, {form.shippingState} {form.shippingPostalCode}
                  </p>
                </div>
              </div>

              <ul className="divide-y divide-brand-border border-t border-brand-border">
                {lines.map((line) => (
                  <li key={line.id} className="flex justify-between py-4 text-sm">
                    <span>
                      {line.quantity}× {line.configuration.productName}
                    </span>
                    <span className="price-display">{formatMoney(line.lineTotalCents)}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-2 border-t border-brand-border pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-brand-muted">Subtotal</span>
                  <span>{formatMoney(subtotalCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-muted">{taxEstimate.label}</span>
                  <span>{formatMoney(taxEstimate.taxCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-muted">Estimated shipping</span>
                  <span>TBD</span>
                </div>
                <div className="flex justify-between text-base font-medium text-brand">
                  <span>Estimated total</span>
                  <PriceDisplay cents={totalCents} size="sm" />
                </div>
              </div>
            </section>

            {error ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep("details")}
                disabled={pending}
              >
                Edit details
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSubmitOrder}
                disabled={pending}
              >
                {pending ? "Submitting…" : "Place order"}
              </button>
            </div>
          </div>
        )}
      </div>

      <CartSummary
        shippingState={form.shippingState}
        showCheckoutLink={false}
        recommended={recommended}
      />
    </div>
  );
}
