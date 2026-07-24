const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format integer cents as USD currency string. */
export function formatMoney(cents: number): string {
  return moneyFormatter.format(cents / 100);
}

/** Format an order or invoice number for display (e.g. CE-20260722-0042). */
export function formatOrderNumber(value: string): string {
  return value.trim().toUpperCase();
}

/** Format a full customer name from parts. */
export function formatCustomerName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

/** Format a multi-line postal address. */
export function formatAddressLines(input: {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}): string[] {
  const lines = [input.line1.trim()];
  if (input.line2?.trim()) lines.push(input.line2.trim());
  lines.push(
    `${input.city.trim()}, ${input.state.trim()} ${input.postalCode.trim()}`.trim(),
  );
  if (input.country && input.country !== "US") {
    lines.push(input.country.trim());
  }
  return lines;
}
