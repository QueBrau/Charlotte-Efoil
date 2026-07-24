import "server-only";

import PDFDocument from "pdfkit";
import type PDFKit from "pdfkit";

import { BRAND, BRAND_COLORS, ORDER_TERMS } from "@/lib/constants";
import { formatAddressLines, formatMoney } from "@/lib/format";
import type { InvoiceData } from "@/types/commerce";

const PAGE_MARGIN = 48;
const CONTENT_WIDTH = 612 - PAGE_MARGIN * 2;

function collectPdfBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function drawSectionHeading(doc: PDFKit.PDFDocument, title: string): void {
  doc
    .fillColor(BRAND_COLORS.primary)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(title.toUpperCase(), PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.4);
}

function drawMuted(doc: PDFKit.PDFDocument, text: string): void {
  doc.fillColor(BRAND_COLORS.accentMuted).font("Helvetica").fontSize(9).text(text);
}

/** Generate a branded Charlotte eFoil invoice PDF. */
export async function generateInvoicePdf(invoiceData: InvoiceData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: {
      top: PAGE_MARGIN,
      bottom: PAGE_MARGIN,
      left: PAGE_MARGIN,
      right: PAGE_MARGIN,
    },
    info: {
      Title: `Invoice ${invoiceData.invoiceNumber}`,
      Author: BRAND.name,
      Subject: `Order ${invoiceData.orderNumber}`,
    },
  });

  const bufferPromise = collectPdfBuffer(doc);

  // Header band
  doc
    .rect(0, 0, doc.page.width, 88)
    .fill(BRAND_COLORS.primary);

  doc
    .fillColor(BRAND_COLORS.white)
    .font("Helvetica-Bold")
    .fontSize(22)
    .text(BRAND.name, PAGE_MARGIN, 28);

  doc
    .font("Helvetica")
    .fontSize(10)
    .text(BRAND.adminEmail, PAGE_MARGIN, 54)
    .text(BRAND.phone, PAGE_MARGIN + 180, 54);

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("INVOICE", doc.page.width - PAGE_MARGIN - 120, 32, {
      width: 120,
      align: "right",
    });

  doc
    .font("Helvetica")
    .fontSize(10)
    .text(invoiceData.invoiceNumber, doc.page.width - PAGE_MARGIN - 120, 52, {
      width: 120,
      align: "right",
    });

  doc.y = 108;
  doc.fillColor(BRAND_COLORS.black);

  // Meta row
  const metaTop = doc.y;
  drawMuted(doc, `Order: ${invoiceData.orderNumber}`);
  doc.text(`Issued: ${new Date(invoiceData.issuedAt).toLocaleDateString("en-US")}`);
  if (invoiceData.dueAt) {
    doc.text(`Due: ${new Date(invoiceData.dueAt).toLocaleDateString("en-US")}`);
  }

  const rightColumnX = PAGE_MARGIN + CONTENT_WIDTH / 2;
  doc.x = rightColumnX;
  doc.y = metaTop;
  drawSectionHeading(doc, "Bill To");
  doc.fillColor(BRAND_COLORS.black).font("Helvetica-Bold").fontSize(10);
  doc.text(invoiceData.customer.name, rightColumnX, doc.y);
  doc.font("Helvetica").fontSize(9);
  doc.text(invoiceData.customer.email);
  doc.text(invoiceData.customer.phone);
  if (invoiceData.customer.companyName) {
    doc.text(invoiceData.customer.companyName);
  }

  doc.moveDown(1.2);
  doc.x = PAGE_MARGIN;

  // Addresses
  const addressTop = doc.y;
  drawSectionHeading(doc, "Shipping Address");
  doc.fillColor(BRAND_COLORS.black).font("Helvetica").fontSize(9);
  for (const line of formatAddressLines(invoiceData.shippingAddress)) {
    doc.text(line);
  }

  doc.x = rightColumnX;
  doc.y = addressTop;
  drawSectionHeading(doc, "Billing Address");
  doc.fillColor(BRAND_COLORS.black).font("Helvetica").fontSize(9);
  for (const line of formatAddressLines(invoiceData.billingAddress)) {
    doc.text(line);
  }

  doc.moveDown(1.5);
  doc.x = PAGE_MARGIN;

  // Line items table header
  const tableTop = doc.y + 8;
  doc
    .rect(PAGE_MARGIN, tableTop, CONTENT_WIDTH, 22)
    .fill(BRAND_COLORS.surface);

  doc
    .fillColor(BRAND_COLORS.primary)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("Description", PAGE_MARGIN + 8, tableTop + 6, { width: 280 })
    .text("Qty", PAGE_MARGIN + 300, tableTop + 6, { width: 40, align: "right" })
    .text("Unit", PAGE_MARGIN + 350, tableTop + 6, { width: 70, align: "right" })
    .text("Total", PAGE_MARGIN + 430, tableTop + 6, { width: 70, align: "right" });

  let rowY = tableTop + 28;
  doc.font("Helvetica").fontSize(9).fillColor(BRAND_COLORS.black);

  for (const item of invoiceData.items) {
    if (rowY > doc.page.height - PAGE_MARGIN - 180) {
      doc.addPage();
      rowY = PAGE_MARGIN;
    }

    doc.text(item.description, PAGE_MARGIN + 8, rowY, { width: 280 });
    doc.text(String(item.quantity), PAGE_MARGIN + 300, rowY, {
      width: 40,
      align: "right",
    });
    doc.text(formatMoney(item.unitPriceCents), PAGE_MARGIN + 350, rowY, {
      width: 70,
      align: "right",
    });
    doc.text(formatMoney(item.lineTotalCents), PAGE_MARGIN + 430, rowY, {
      width: 70,
      align: "right",
    });

    rowY += 22;
  }

  doc.y = rowY + 12;

  // Totals
  const totalsX = PAGE_MARGIN + CONTENT_WIDTH - 220;
  const totalsValueX = PAGE_MARGIN + CONTENT_WIDTH - 80;

  function drawTotalRow(label: string, value: string, bold = false): void {
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(bold ? 11 : 9)
      .fillColor(bold ? BRAND_COLORS.primary : BRAND_COLORS.black)
      .text(label, totalsX, doc.y, { width: 120 })
      .text(value, totalsValueX, doc.y, { width: 80, align: "right" });
    doc.moveDown(0.5);
  }

  drawTotalRow("Subtotal", formatMoney(invoiceData.totals.subtotalCents));
  drawTotalRow(
    invoiceData.taxEstimate?.label ?? "Estimated Tax",
    formatMoney(invoiceData.totals.taxCents),
  );
  drawTotalRow("Shipping", formatMoney(invoiceData.totals.shippingCents));
  if (invoiceData.totals.discountCents > 0) {
    drawTotalRow("Discount", `-${formatMoney(invoiceData.totals.discountCents)}`);
  }
  drawTotalRow("Grand Total", formatMoney(invoiceData.totals.totalCents), true);

  doc.moveDown(1);

  if (invoiceData.specialRequests) {
    drawSectionHeading(doc, "Special Requests");
    doc.fillColor(BRAND_COLORS.black).font("Helvetica").fontSize(9);
    doc.text(invoiceData.specialRequests, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(0.8);
  }

  if (invoiceData.dealerNotes) {
    drawSectionHeading(doc, "Dealer Notes");
    doc.fillColor(BRAND_COLORS.black).font("Helvetica").fontSize(9);
    doc.text(invoiceData.dealerNotes, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(0.8);
  }

  drawSectionHeading(doc, "Payment Instructions");
  doc.fillColor(BRAND_COLORS.black).font("Helvetica").fontSize(9);
  doc.text(invoiceData.paymentInstructions, PAGE_MARGIN, doc.y, {
    width: CONTENT_WIDTH,
    lineGap: 2,
  });

  doc.moveDown(0.8);
  drawSectionHeading(doc, "Terms & Conditions");
  doc.fillColor(BRAND_COLORS.black).font("Helvetica").fontSize(8);
  doc.text(invoiceData.termsAndConditions || ORDER_TERMS, PAGE_MARGIN, doc.y, {
    width: CONTENT_WIDTH,
    lineGap: 1,
  });

  doc.end();
  return bufferPromise;
}
