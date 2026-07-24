import "server-only";

import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
} from "@aws-sdk/client-sesv2";

import { BRAND } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { getServerEnv } from "@/lib/env";
import type { InvoiceData } from "@/types/commerce";

let sesClient: SESv2Client | null = null;

function getSesClient(): SESv2Client {
  if (sesClient) return sesClient;

  const env = getServerEnv();
  sesClient = new SESv2Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });

  return sesClient;
}

function buildRawEmailWithAttachment(input: {
  from: string;
  to: string[];
  subject: string;
  textBody: string;
  htmlBody: string;
  attachmentFilename: string;
  attachment: Buffer;
}): Uint8Array {
  const boundary = `----=_Part_${Date.now()}`;
  const attachmentBase64 = input.attachment.toString("base64");

  const raw = [
    `From: ${input.from}`,
    `To: ${input.to.join(", ")}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: multipart/alternative; boundary=\"alt-boundary\"",
    "",
    "--alt-boundary",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    input.textBody,
    "",
    "--alt-boundary",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    input.htmlBody,
    "",
    "--alt-boundary--",
    "",
    `--${boundary}`,
    `Content-Type: application/pdf; name="${input.attachmentFilename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${input.attachmentFilename}"`,
    "",
    attachmentBase64,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  return new TextEncoder().encode(raw);
}

async function sendRawEmail(input: SendEmailCommandInput): Promise<void> {
  const client = getSesClient();
  await client.send(new SendEmailCommand(input));
}

export interface AdminOrderNotificationInput {
  invoiceData: InvoiceData;
  pdfBuffer: Buffer;
}

/** Notify Charlotte eFoil admin of a new order with invoice PDF attached. */
export async function sendAdminOrderNotification(
  input: AdminOrderNotificationInput,
): Promise<void> {
  const env = getServerEnv();
  const { invoiceData, pdfBuffer } = input;

  const subject = `New Order - Invoice ${invoiceData.invoiceNumber}`;
  const textBody = [
    `A new order was submitted.`,
    "",
    `Customer: ${invoiceData.customer.name}`,
    `Email: ${invoiceData.customer.email}`,
    `Phone: ${invoiceData.customer.phone}`,
    `Order: ${invoiceData.orderNumber}`,
    `Estimated Total: ${formatMoney(invoiceData.totals.totalCents)}`,
    `Submitted: ${new Date(invoiceData.issuedAt).toLocaleString("en-US")}`,
    "",
    "The invoice PDF is attached for review.",
  ].join("\n");

  const htmlBody = `
    <div style="font-family:Helvetica,Arial,sans-serif;color:#194055;max-width:560px">
      <h2 style="margin:0 0 12px">New Order</h2>
      <p style="margin:0 0 16px">A customer submitted a new order for review.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#5a6d78">Customer</td><td style="padding:6px 0">${invoiceData.customer.name}</td></tr>
        <tr><td style="padding:6px 0;color:#5a6d78">Email</td><td style="padding:6px 0">${invoiceData.customer.email}</td></tr>
        <tr><td style="padding:6px 0;color:#5a6d78">Phone</td><td style="padding:6px 0">${invoiceData.customer.phone}</td></tr>
        <tr><td style="padding:6px 0;color:#5a6d78">Order</td><td style="padding:6px 0">${invoiceData.orderNumber}</td></tr>
        <tr><td style="padding:6px 0;color:#5a6d78">Estimated Total</td><td style="padding:6px 0">${formatMoney(invoiceData.totals.totalCents)}</td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:13px;color:#5a6d78">Invoice PDF attached.</p>
    </div>
  `;

  const rawContent = buildRawEmailWithAttachment({
    from: env.SES_FROM_EMAIL,
    to: [env.SES_ADMIN_EMAIL],
    subject,
    textBody,
    htmlBody,
    attachmentFilename: `${invoiceData.invoiceNumber}.pdf`,
    attachment: pdfBuffer,
  });

  await sendRawEmail({
    FromEmailAddress: env.SES_FROM_EMAIL,
    Destination: { ToAddresses: [env.SES_ADMIN_EMAIL] },
    Content: { Raw: { Data: rawContent } },
  });
}

export interface CustomerInvoiceEmailInput {
  invoiceData: InvoiceData;
  pdfBuffer: Buffer;
}

/** Send finalized invoice to customer after admin approval. */
export async function sendCustomerInvoice(
  input: CustomerInvoiceEmailInput,
): Promise<void> {
  const env = getServerEnv();
  const { invoiceData, pdfBuffer } = input;

  const subject = `Your Charlotte eFoil Invoice ${invoiceData.invoiceNumber}`;
  const textBody = [
    `Hello ${invoiceData.customer.name},`,
    "",
    `Thank you for your order with ${BRAND.name}.`,
    `Your invoice ${invoiceData.invoiceNumber} for order ${invoiceData.orderNumber} is attached.`,
    "",
    `Total due: ${formatMoney(invoiceData.totals.totalCents)}`,
    "",
    "Payment is accepted via ACH or domestic wire transfer only. Instructions are included on the invoice.",
    "",
    `Questions? Contact us at ${BRAND.adminEmail} or ${BRAND.phone}.`,
  ].join("\n");

  const htmlBody = `
    <div style="font-family:Helvetica,Arial,sans-serif;color:#194055;max-width:560px">
      <h2 style="margin:0 0 12px">Your Invoice from ${BRAND.name}</h2>
      <p style="margin:0 0 16px">Hello ${invoiceData.customer.name},</p>
      <p style="margin:0 0 16px">Thank you for your order. Invoice <strong>${invoiceData.invoiceNumber}</strong> for order <strong>${invoiceData.orderNumber}</strong> is attached.</p>
      <p style="margin:0 0 16px">Total due: <strong>${formatMoney(invoiceData.totals.totalCents)}</strong></p>
      <p style="margin:0 0 16px;font-size:14px;color:#5a6d78">Payment is accepted via ACH or domestic wire transfer only. Full instructions are on the attached PDF.</p>
      <p style="margin:0;font-size:13px;color:#5a6d78">Questions? ${BRAND.adminEmail} · ${BRAND.phone}</p>
    </div>
  `;

  const rawContent = buildRawEmailWithAttachment({
    from: env.SES_FROM_EMAIL,
    to: [invoiceData.customer.email],
    subject,
    textBody,
    htmlBody,
    attachmentFilename: `${invoiceData.invoiceNumber}.pdf`,
    attachment: pdfBuffer,
  });

  await sendRawEmail({
    FromEmailAddress: env.SES_FROM_EMAIL,
    Destination: { ToAddresses: [invoiceData.customer.email] },
    Content: { Raw: { Data: rawContent } },
  });
}
