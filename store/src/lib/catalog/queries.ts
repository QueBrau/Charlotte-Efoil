import type {
  Category,
  CompatibilityRule,
  InventoryRecord,
  Product,
  ProductMedia,
  ProductOptionGroup,
  ProductOptionValue,
  ProductSummary,
  ProductType,
  ProductVariant,
  ProductWithDetails,
  RecommendedProduct,
} from "@/types/commerce";

import {
  getDemoCategories,
  getDemoProductBySlug,
  getDemoProductWithDetails,
  getDemoProducts,
} from "@/lib/catalog/fallback";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type DbCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type DbProduct = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  product_type: ProductType;
  base_price_cents: number;
  compare_at_price_cents: number | null;
  is_active: boolean;
  is_configurable: boolean;
  specs: Record<string, string | number | boolean | string[]> | null;
  features: string[] | null;
  whats_included: string[] | null;
  faqs: { question: string; answer: string }[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type DbProductMedia = {
  id: string;
  product_id: string;
  media_type: "image" | "video";
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
};

type DbProductVariant = {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  is_default: boolean;
  is_active: boolean;
  attributes: Record<string, string | number | boolean> | null;
  created_at: string;
  updated_at: string;
};

type DbOptionGroup = {
  id: string;
  product_id: string;
  slug: string;
  name: string;
  description: string | null;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  sort_order: number;
  product_option_values: DbOptionValue[] | DbOptionValue | null;
};

type DbOptionValue = {
  id: string;
  option_group_id: string;
  slug: string;
  label: string;
  description: string | null;
  price_delta_cents: number;
  image_url: string | null;
  is_default: boolean;
  sort_order: number;
  metadata: Record<string, unknown> | null;
};

type DbCompatibilityRule = {
  id: string;
  product_id: string;
  source_option_value_id: string;
  target_option_group_id: string;
  allowed_option_value_ids: string[];
  rule_type: "requires" | "excludes" | "allows";
};

type DbInventory = {
  id: string;
  product_variant_id: string;
  quantity_available: number;
  quantity_reserved: number;
  low_stock_threshold: number | null;
};

type DbRecommendedProduct = {
  id: string;
  product_id: string;
  recommended_product_id: string;
  sort_order: number;
  label: string | null;
  recommended_product: DbProduct | null;
};

function mapCategory(row: DbCategory): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOptionValue(row: DbOptionValue): ProductOptionValue {
  return {
    id: row.id,
    optionGroupId: row.option_group_id,
    slug: row.slug,
    label: row.label,
    description: row.description,
    priceDeltaCents: row.price_delta_cents,
    imageUrl: row.image_url,
    isDefault: row.is_default,
    sortOrder: row.sort_order,
    metadata: row.metadata ?? {},
  };
}

function mapOptionGroup(row: DbOptionGroup): ProductOptionGroup {
  const values = asArray(row.product_option_values)
    .map(mapOptionValue)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    id: row.id,
    productId: row.product_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    isRequired: row.is_required,
    minSelections: row.min_selections,
    maxSelections: row.max_selections,
    sortOrder: row.sort_order,
    values,
  };
}

function mapProductSummary(
  row: DbProduct,
  primaryImageUrl: string | null = null,
): ProductSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    productType: row.product_type,
    basePriceCents: row.base_price_cents,
    compareAtPriceCents: row.compare_at_price_cents,
    isActive: row.is_active,
    isConfigurable: row.is_configurable,
    primaryImageUrl,
  };
}

function mapProduct(row: DbProduct, primaryImageUrl: string | null = null): Product {
  return {
    ...mapProductSummary(row, primaryImageUrl),
    description: row.description,
    specs: row.specs ?? {},
    features: row.features ?? [],
    whatsIncluded: row.whats_included ?? [],
    faqs: row.faqs ?? [],
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMedia(row: DbProductMedia): ProductMedia {
  return {
    id: row.id,
    productId: row.product_id,
    mediaType: row.media_type,
    url: row.url,
    altText: row.alt_text,
    sortOrder: row.sort_order,
    isPrimary: row.is_primary,
  };
}

function mapVariant(row: DbProductVariant): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    name: row.name,
    priceCents: row.price_cents,
    compareAtPriceCents: row.compare_at_price_cents,
    isDefault: row.is_default,
    isActive: row.is_active,
    attributes: row.attributes ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCompatibilityRule(row: DbCompatibilityRule): CompatibilityRule {
  return {
    id: row.id,
    productId: row.product_id,
    sourceOptionValueId: row.source_option_value_id,
    targetOptionGroupId: row.target_option_group_id,
    allowedOptionValueIds: row.allowed_option_value_ids,
    ruleType: row.rule_type,
  };
}

function mapInventory(row: DbInventory): InventoryRecord {
  return {
    id: row.id,
    productVariantId: row.product_variant_id,
    quantityAvailable: row.quantity_available,
    quantityReserved: row.quantity_reserved,
    lowStockThreshold: row.low_stock_threshold,
  };
}

function mapRecommendedProduct(row: DbRecommendedProduct): RecommendedProduct {
  return {
    id: row.id,
    productId: row.product_id,
    recommendedProductId: row.recommended_product_id,
    sortOrder: row.sort_order,
    label: row.label,
    recommendedProduct: row.recommended_product
      ? mapProductSummary(row.recommended_product)
      : undefined,
  };
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getPrimaryImageUrl(media: DbProductMedia[] | DbProductMedia | null | undefined): string | null {
  const items = asArray(media);
  if (!items.length) return null;
  const primary = items.find((item) => item.is_primary) ?? items[0];
  return primary?.url ?? null;
}

/** Fetch all active categories ordered for navigation. */
export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) {
    return getDemoCategories();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  return (data as DbCategory[]).map(mapCategory);
}

export interface GetProductsOptions {
  categorySlug?: string;
  productType?: ProductType;
  limit?: number;
}

/** Fetch active product summaries, optionally filtered by category or type. */
export async function getProducts(
  options: GetProductsOptions = {},
): Promise<ProductSummary[]> {
  if (!isSupabaseConfigured()) {
    return getDemoProducts(options);
  }

  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(
      `
        *,
        product_media ( id, product_id, media_type, url, alt_text, sort_order, is_primary )
      `,
    )
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (options.productType) {
    query = query.eq("product_type", options.productType);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load products: ${error.message}`);

  let rows = (data ?? []) as unknown as Array<
    DbProduct & { product_media: DbProductMedia[] | DbProductMedia | null }
  >;

  if (options.categorySlug) {
    const { data: categoryRow, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", options.categorySlug)
      .eq("is_active", true)
      .maybeSingle();

    if (categoryError) {
      throw new Error(`Failed to resolve category: ${categoryError.message}`);
    }
    if (!categoryRow) return [];

    const { data: links, error: linksError } = await supabase
      .from("product_categories")
      .select("product_id")
      .eq("category_id", categoryRow.id);

    if (linksError) {
      throw new Error(`Failed to load category products: ${linksError.message}`);
    }

    const allowedIds = new Set((links ?? []).map((link) => link.product_id));
    rows = rows.filter((row) => allowedIds.has(row.id));
  }

  return rows.map((row) =>
    mapProductSummary(row, getPrimaryImageUrl(row.product_media)),
  );
}

/** Fetch a single active product by slug. */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) {
    return getDemoProductBySlug(slug);
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
        *,
        product_media ( id, product_id, media_type, url, alt_text, sort_order, is_primary )
      `,
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`Failed to load product: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as DbProduct & {
    product_media: DbProductMedia[] | DbProductMedia | null;
  };
  return mapProduct(row, getPrimaryImageUrl(row.product_media));
}

/** Fetch a product with full configurator and catalog relations. */
export async function getProductWithDetails(
  slug: string,
): Promise<ProductWithDetails | null> {
  if (!isSupabaseConfigured()) {
    return getDemoProductWithDetails(slug);
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
        *,
        product_media ( id, product_id, media_type, url, alt_text, sort_order, is_primary ),
        product_variants ( id, product_id, sku, name, price_cents, compare_at_price_cents, is_default, is_active, attributes, created_at, updated_at ),
        product_option_groups (
          id, product_id, slug, name, description, is_required, min_selections, max_selections, sort_order,
          product_option_values ( id, option_group_id, slug, label, description, price_delta_cents, image_url, is_default, sort_order, metadata )
        ),
        compatibility_rules ( id, product_id, source_option_value_id, target_option_group_id, allowed_option_value_ids, rule_type ),
        recommended_products (
          id, product_id, recommended_product_id, sort_order, label,
          recommended_product:products!recommended_products_recommended_product_id_fkey (
            id, slug, name, short_description, product_type, base_price_cents, compare_at_price_cents, is_active, is_configurable, description, specs, features, whats_included, faqs, metadata, created_at, updated_at
          )
        ),
        product_categories (
          categories ( id, slug, name, description, parent_id, sort_order, is_active, created_at, updated_at )
        )
      `,
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`Failed to load product details: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as DbProduct & {
    product_media: DbProductMedia[] | DbProductMedia | null;
    product_variants: DbProductVariant[] | DbProductVariant | null;
    product_option_groups: DbOptionGroup[] | DbOptionGroup | null;
    compatibility_rules: DbCompatibilityRule[] | DbCompatibilityRule | null;
    recommended_products: DbRecommendedProduct[] | DbRecommendedProduct | null;
    product_categories:
      | Array<{ categories: DbCategory | null }>
      | { categories: DbCategory | null }
      | null;
  };

  const variants = asArray(row.product_variants).map(mapVariant);
  const variantIds = variants.map((variant) => variant.id);

  let inventory: InventoryRecord[] = [];
  if (variantIds.length > 0) {
    const { data: inventoryRows, error: inventoryError } = await supabase
      .from("inventory")
      .select("*")
      .in("product_variant_id", variantIds);

    if (inventoryError) {
      throw new Error(`Failed to load inventory: ${inventoryError.message}`);
    }

    inventory = (inventoryRows as DbInventory[]).map(mapInventory);
  }

  const media = asArray(row.product_media)
    .map(mapMedia)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const optionGroups = asArray(row.product_option_groups)
    .map(mapOptionGroup)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const categories = asArray(row.product_categories)
    .map((link) => link.categories)
    .filter((category): category is DbCategory => Boolean(category))
    .map(mapCategory);

  const recommendedProducts = asArray(row.recommended_products)
    .map(mapRecommendedProduct)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    ...mapProduct(row, getPrimaryImageUrl(row.product_media)),
    categories,
    media,
    variants,
    optionGroups,
    compatibilityRules: asArray(row.compatibility_rules).map(mapCompatibilityRule),
    inventory,
    recommendedProducts,
  };
}
