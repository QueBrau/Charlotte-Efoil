/** Charlotte eFoil commerce domain types — aligned with Supabase schema. */

export type OrderStatus =
  | "pending_review"
  | "approved"
  | "invoice_sent"
  | "awaiting_payment"
  | "payment_received"
  | "processing"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled";

export type AddressType = "shipping" | "billing";

export type MediaType = "image" | "video";

export type ProductType =
  | "package"
  | "board"
  | "battery"
  | "charger"
  | "mast"
  | "front_wing"
  | "rear_wing"
  | "propulsion"
  | "controller"
  | "bag"
  | "cover"
  | "safety"
  | "part"
  | "accessory";

export type CompatibilityRuleType = "requires" | "excludes" | "allows";

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductMedia {
  id: string;
  productId: string;
  mediaType: MediaType;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  isDefault: boolean;
  isActive: boolean;
  attributes: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductOptionValue {
  id: string;
  optionGroupId: string;
  slug: string;
  label: string;
  description: string | null;
  priceDeltaCents: number;
  imageUrl: string | null;
  isDefault: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
}

export interface ProductOptionGroup {
  id: string;
  productId: string;
  slug: string;
  name: string;
  description: string | null;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  sortOrder: number;
  values: ProductOptionValue[];
}

export interface CompatibilityRule {
  id: string;
  productId: string;
  sourceOptionValueId: string;
  targetOptionGroupId: string;
  allowedOptionValueIds: string[];
  ruleType: CompatibilityRuleType;
}

export interface InventoryRecord {
  id: string;
  productVariantId: string;
  quantityAvailable: number;
  quantityReserved: number;
  lowStockThreshold: number | null;
}

export interface RecommendedProduct {
  id: string;
  productId: string;
  recommendedProductId: string;
  sortOrder: number;
  label: string | null;
  recommendedProduct?: ProductSummary;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  productType: ProductType;
  basePriceCents: number;
  compareAtPriceCents: number | null;
  isActive: boolean;
  isConfigurable: boolean;
  primaryImageUrl: string | null;
}

export interface Product extends ProductSummary {
  description: string | null;
  specs: Record<string, string | number | boolean | string[]>;
  features: string[];
  whatsIncluded: string[];
  faqs: ProductFaq[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFaq {
  question: string;
  answer: string;
}

export interface ProductWithDetails extends Product {
  categories: Category[];
  media: ProductMedia[];
  variants: ProductVariant[];
  optionGroups: ProductOptionGroup[];
  compatibilityRules: CompatibilityRule[];
  inventory: InventoryRecord[];
  recommendedProducts: RecommendedProduct[];
}

export interface ConfigurationSelection {
  optionGroupId: string;
  optionGroupSlug: string;
  optionValueId: string;
  optionValueSlug: string;
  label: string;
  priceDeltaCents: number;
}

export interface ConfigurationSummary {
  productId: string;
  productSlug: string;
  productName: string;
  selections: ConfigurationSelection[];
  basePriceCents: number;
  optionsTotalCents: number;
  unitPriceCents: number;
  warnings: string[];
}

export interface ConfigurationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CartLineConfiguration {
  productId: string;
  productSlug: string;
  productName: string;
  variantId: string | null;
  variantSku: string | null;
  selections: ConfigurationSelection[];
  unitPriceCents: number;
  imageUrl: string | null;
}

export interface CartLine {
  id: string;
  configuration: CartLineConfiguration;
  quantity: number;
  lineTotalCents: number;
}

export interface CartState {
  lines: CartLine[];
  updatedAt: string | null;
}

export interface AddressInput {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface CustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName?: string;
}

export interface OrderRequestPayload {
  customer: CustomerInput;
  shippingAddress: AddressInput;
  billingAddress?: AddressInput;
  billingSameAsShipping: boolean;
  lines: CartLine[];
  specialRequests?: string;
  preferredDeliveryMethod?: string;
  dealerNotes?: string;
  taxEstimate?: TaxEstimate;
  shippingEstimateCents?: number;
}

export interface TaxEstimate {
  subtotalCents: number;
  taxCents: number;
  taxRate: number;
  state: string;
  label: string;
  isEstimate: boolean;
}

export interface OrderTotals {
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
}

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  customerId: string;
  addressType: AddressType;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  specialRequests: string | null;
  preferredDeliveryMethod: string | null;
  dealerNotesCustomer: string | null;
  billingSameAsShipping: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productVariantId: string | null;
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  configuration: CartLineConfiguration;
  metadata: Record<string, unknown>;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  metadata: Record<string, unknown>;
}

export interface InvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  issuedAt: string;
  dueAt: string | null;
  status: InvoiceStatus;
  customer: {
    name: string;
    email: string;
    phone: string;
    companyName: string | null;
  };
  shippingAddress: AddressInput & { country: string };
  billingAddress: AddressInput & { country: string };
  items: InvoiceItem[];
  totals: OrderTotals;
  taxEstimate: TaxEstimate | null;
  specialRequests: string | null;
  preferredDeliveryMethod: string | null;
  dealerNotes: string | null;
  paymentInstructions: string;
  termsAndConditions: string;
}

export interface PaymentInstructions {
  id: string;
  title: string;
  body: string;
  isActive: boolean;
  sortOrder: number;
}

export interface OrderStatusHistoryEntry {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  notes: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface SubmitOrderResult {
  orderId: string;
  orderNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  pdfUrl: string;
}
