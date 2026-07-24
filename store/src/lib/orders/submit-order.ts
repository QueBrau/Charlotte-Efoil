import "server-only";

import {
  BRAND,
  DEFAULT_COUNTRY,
  DEFAULT_SHIPPING_ESTIMATE_CENTS,
  INVOICE_STORAGE_BUCKET,
  ORDER_TERMS,
} from "@/lib/constants";
import { sendAdminOrderNotification } from "@/lib/email/send-invoice";
import { formatCustomerName } from "@/lib/format";
import { generateInvoicePdf } from "@/lib/invoice/generate-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimateTax } from "@/lib/tax/estimate";
import type {
  AddressInput,
  CartLineConfiguration,
  InvoiceData,
  InvoiceItem,
  OrderRequestPayload,
  SubmitOrderResult,
  TaxEstimate,
} from "@/types/commerce";
import type { Json } from "@/types/database";

function normalizeAddress(address: AddressInput) {
  return {
    line1: address.line1.trim(),
    line2: address.line2?.trim() || null,
    city: address.city.trim(),
    state: address.state.trim().toUpperCase(),
    postal_code: address.postalCode.trim(),
    country: (address.country ?? DEFAULT_COUNTRY).trim().toUpperCase(),
  };
}

function buildLineDescription(name: string, selections: { label: string }[]): string {
  if (!selections.length) return name;
  const options = selections.map((selection) => selection.label).join(", ");
  return `${name} (${options})`;
}

function computeTotals(
  payload: OrderRequestPayload,
  taxEstimate: TaxEstimate,
): {
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
} {
  const subtotalCents = payload.lines.reduce(
    (sum, line) => sum + line.lineTotalCents,
    0,
  );
  const taxCents = payload.taxEstimate?.taxCents ?? taxEstimate.taxCents;
  const shippingCents =
    payload.shippingEstimateCents ?? DEFAULT_SHIPPING_ESTIMATE_CENTS;
  const discountCents = 0;
  const totalCents = subtotalCents + taxCents + shippingCents - discountCents;

  return { subtotalCents, taxCents, shippingCents, discountCents, totalCents };
}

async function fetchPaymentInstructions(supabase: ReturnType<typeof createAdminClient>) {
  const { data, error } = await supabase
    .from("payment_instructions")
    .select("title, body")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load payment instructions: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{ title: string; body: string }>;

  if (!rows.length) {
    return [
      "Charlotte eFoil accepts ACH and domestic wire transfer only.",
      "Contact hello@charlotteefoil.com for banking details after your order is approved.",
    ].join("\n\n");
  }

  return rows.map((row) => `${row.title}\n${row.body}`).join("\n\n");
}

async function generateOrderNumber(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<string> {
  const { data, error } = await supabase.rpc("generate_order_number");
  if (error) throw new Error(`Failed to generate order number: ${error.message}`);
  return String(data);
}

async function generateInvoiceNumber(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<string> {
  const { data, error } = await supabase.rpc("generate_invoice_number");
  if (error) throw new Error(`Failed to generate invoice number: ${error.message}`);
  return String(data);
}

/**
 * Persist a full order: customer, addresses, order, invoice, PDF, and admin email.
 * Uses the Supabase service role — call only from trusted server code.
 */
export async function submitOrderRequest(
  payload: OrderRequestPayload,
): Promise<SubmitOrderResult> {
  if (!payload.lines.length) {
    throw new Error("Cannot submit an empty order.");
  }

  const supabase = createAdminClient();
  const shipping = normalizeAddress(payload.shippingAddress);
  const billing = payload.billingSameAsShipping
    ? shipping
    : normalizeAddress(payload.billingAddress ?? payload.shippingAddress);

  const subtotalCents = payload.lines.reduce(
    (sum, line) => sum + line.lineTotalCents,
    0,
  );
  const taxEstimate =
    payload.taxEstimate ?? estimateTax(subtotalCents, shipping.state);
  const totals = computeTotals(payload, taxEstimate);

  const orderNumber = await generateOrderNumber(supabase);
  const invoiceNumber = await generateInvoiceNumber(supabase);
  const paymentInstructions = await fetchPaymentInstructions(supabase);
  const customerName = formatCustomerName(
    payload.customer.firstName,
    payload.customer.lastName,
  );

  const { data: customerRow, error: customerError } = await supabase
    .from("customers")
    .insert({
      email: payload.customer.email.trim().toLowerCase(),
      first_name: payload.customer.firstName.trim(),
      last_name: payload.customer.lastName.trim(),
      phone: payload.customer.phone.trim(),
      company_name: payload.customer.companyName?.trim() || null,
    })
    .select("id")
    .single();

  if (customerError || !customerRow) {
    throw new Error(`Failed to create customer: ${customerError?.message ?? "Unknown error"}`);
  }

  const customerId = (customerRow as { id: string }).id;

  const addressRows = [
    {
      customer_id: customerId,
      address_type: "shipping" as const,
      ...shipping,
      is_default: true,
    },
    ...(payload.billingSameAsShipping
      ? []
      : [
          {
            customer_id: customerId,
            address_type: "billing" as const,
            ...billing,
            is_default: false,
          },
        ]),
  ];

  const { data: addressData, error: addressError } = await supabase
    .from("addresses")
    .insert(addressRows)
    .select("id, address_type");

  if (addressError || !addressData?.length) {
    throw new Error(`Failed to create addresses: ${addressError?.message ?? "Unknown error"}`);
  }

  const addressRowsTyped = addressData as Array<{
    id: string;
    address_type: "shipping" | "billing";
  }>;

  const shippingAddressId = addressRowsTyped.find(
    (row) => row.address_type === "shipping",
  )?.id;
  const billingAddressId = payload.billingSameAsShipping
    ? shippingAddressId
    : addressRowsTyped.find((row) => row.address_type === "billing")?.id;

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_id: customerId,
      shipping_address_id: shippingAddressId,
      billing_address_id: billingAddressId,
      status: "pending_review",
      subtotal_cents: totals.subtotalCents,
      tax_cents: totals.taxCents,
      shipping_cents: totals.shippingCents,
      discount_cents: totals.discountCents,
      total_cents: totals.totalCents,
      special_requests: payload.specialRequests?.trim() || null,
      preferred_delivery_method: payload.preferredDeliveryMethod?.trim() || null,
      dealer_notes_customer: payload.dealerNotes?.trim() || null,
      billing_same_as_shipping: payload.billingSameAsShipping,
    })
    .select("id, created_at")
    .single();

  if (orderError || !orderRow) {
    throw new Error(`Failed to create order: ${orderError?.message ?? "Unknown error"}`);
  }

  const orderId = (orderRow as { id: string }).id;

  const orderItemsPayload = payload.lines.map((line) => ({
    order_id: orderId,
    product_id: line.configuration.productId,
    product_variant_id: line.configuration.variantId,
    sku: line.configuration.variantSku ?? "CONFIG",
    name: line.configuration.productName,
    quantity: line.quantity,
    unit_price_cents: line.configuration.unitPriceCents,
    line_total_cents: line.lineTotalCents,
    configuration: line.configuration as unknown as Json,
    metadata: {} as Json,
  }));

  const { data: orderItems, error: orderItemsError } = await supabase
    .from("order_items")
    .insert(orderItemsPayload)
    .select("id, name, quantity, unit_price_cents, line_total_cents, configuration");

  if (orderItemsError || !orderItems?.length) {
    throw new Error(`Failed to create order items: ${orderItemsError?.message ?? "Unknown error"}`);
  }

  type CreatedOrderItem = {
    id: string;
    name: string;
    quantity: number;
    unit_price_cents: number;
    line_total_cents: number;
    configuration: CartLineConfiguration;
  };

  const createdOrderItems = orderItems.map((item) => ({
    ...item,
    configuration: item.configuration as unknown as CartLineConfiguration,
  }));

  const invoiceItems: InvoiceItem[] = createdOrderItems.map((item) => ({
    id: item.id,
    description: buildLineDescription(
      item.name,
      item.configuration?.selections ?? [],
    ),
    quantity: item.quantity,
    unitPriceCents: item.unit_price_cents,
    lineTotalCents: item.line_total_cents,
    metadata: {},
  }));

  const issuedAt = new Date().toISOString();

  const invoiceData: InvoiceData = {
    invoiceNumber,
    orderNumber,
    issuedAt,
    dueAt: null,
    status: "draft",
    customer: {
      name: customerName,
      email: payload.customer.email.trim().toLowerCase(),
      phone: payload.customer.phone.trim(),
      companyName: payload.customer.companyName?.trim() || null,
    },
    shippingAddress: {
      line1: shipping.line1,
      line2: shipping.line2 ?? undefined,
      city: shipping.city,
      state: shipping.state,
      postalCode: shipping.postal_code,
      country: shipping.country,
    },
    billingAddress: {
      line1: billing.line1,
      line2: billing.line2 ?? undefined,
      city: billing.city,
      state: billing.state,
      postalCode: billing.postal_code,
      country: billing.country,
    },
    items: invoiceItems,
    totals,
    taxEstimate,
    specialRequests: payload.specialRequests?.trim() || null,
    preferredDeliveryMethod: payload.preferredDeliveryMethod?.trim() || null,
    dealerNotes: payload.dealerNotes?.trim() || null,
    paymentInstructions,
    termsAndConditions: ORDER_TERMS,
  };

  const pdfBuffer = await generateInvoicePdf(invoiceData);
  const storagePath = `${orderNumber}/${invoiceNumber}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(INVOICE_STORAGE_BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload invoice PDF: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(INVOICE_STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  const pdfUrl = publicUrlData.publicUrl;

  const { data: invoiceRow, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      order_id: orderId,
      invoice_number: invoiceNumber,
      status: "draft",
      subtotal_cents: totals.subtotalCents,
      tax_cents: totals.taxCents,
      shipping_cents: totals.shippingCents,
      discount_cents: totals.discountCents,
      total_cents: totals.totalCents,
      pdf_url: pdfUrl,
      pdf_storage_path: storagePath,
      issued_at: issuedAt,
      due_at: null,
    })
    .select("id")
    .single();

  if (invoiceError || !invoiceRow) {
    throw new Error(`Failed to create invoice: ${invoiceError?.message ?? "Unknown error"}`);
  }

  const invoiceId = (invoiceRow as { id: string }).id;

  const invoiceItemsPayload = invoiceItems.map((item) => ({
    invoice_id: invoiceId,
    order_item_id: item.id,
    description: item.description,
    quantity: item.quantity,
    unit_price_cents: item.unitPriceCents,
    line_total_cents: item.lineTotalCents,
    metadata: item.metadata as Json,
  }));

  const { error: invoiceItemsError } = await supabase
    .from("invoice_items")
    .insert(invoiceItemsPayload);

  if (invoiceItemsError) {
    throw new Error(`Failed to create invoice items: ${invoiceItemsError.message}`);
  }

  const { error: historyError } = await supabase.from("order_status_history").insert({
    order_id: orderId,
    from_status: null,
    to_status: "pending_review",
    notes: "Order submitted by customer.",
    changed_by: "system",
  });

  if (historyError) {
    throw new Error(`Failed to record order status history: ${historyError.message}`);
  }

  if (payload.dealerNotes?.trim()) {
    await supabase.from("dealer_notes").insert({
      order_id: orderId,
      note: payload.dealerNotes.trim(),
      is_internal: false,
      created_by: "customer",
    });
  }

  await sendAdminOrderNotification({ invoiceData, pdfBuffer });

  return {
    orderId,
    orderNumber,
    invoiceId,
    invoiceNumber,
    pdfUrl,
  };
}
