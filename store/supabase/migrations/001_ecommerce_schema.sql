-- Charlotte eFoil / Waydoo dealer e-commerce schema
-- Supabase Postgres migration 001
-- Money is stored in integer cents (USD).

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE order_status AS ENUM (
  'pending_review',
  'approved',
  'invoice_sent',
  'awaiting_payment',
  'payment_received',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'cancelled'
);

CREATE TYPE address_type AS ENUM (
  'billing',
  'shipping',
  'both'
);

CREATE TYPE media_type AS ENUM (
  'image',
  'video',
  'document'
);

CREATE TYPE product_type AS ENUM (
  'package',
  'board',
  'battery',
  'charger',
  'mast',
  'front_wing',
  'rear_wing',
  'propulsion',
  'controller',
  'bag',
  'cover',
  'safety',
  'part',
  'accessory'
);

-- ---------------------------------------------------------------------------
-- Shared trigger helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  parent_id uuid REFERENCES public.categories (id) ON DELETE SET NULL,
  product_type product_type,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT categories_slug_unique UNIQUE (slug)
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  sku text,
  name text NOT NULL,
  short_description text,
  description text,
  product_type product_type NOT NULL,
  base_price_cents integer NOT NULL DEFAULT 0 CHECK (base_price_cents >= 0),
  compare_at_price_cents integer CHECK (compare_at_price_cents IS NULL OR compare_at_price_cents >= 0),
  is_active boolean NOT NULL DEFAULT true,
  is_configurable boolean NOT NULL DEFAULT false,
  requires_dealer_review boolean NOT NULL DEFAULT false,
  weight_grams integer CHECK (weight_grams IS NULL OR weight_grams >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT products_slug_unique UNIQUE (slug),
  CONSTRAINT products_sku_unique UNIQUE (sku)
);

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  compare_at_price_cents integer CHECK (compare_at_price_cents IS NULL OR compare_at_price_cents >= 0),
  option_signature jsonb NOT NULL DEFAULT '{}'::jsonb,
  barcode text,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT product_variants_sku_unique UNIQUE (sku)
);

CREATE TABLE public.product_categories (
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories (id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE public.product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants (id) ON DELETE CASCADE,
  media_type media_type NOT NULL DEFAULT 'image',
  url text NOT NULL,
  alt_text text,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.product_option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  min_selections integer NOT NULL DEFAULT 1 CHECK (min_selections >= 0),
  max_selections integer NOT NULL DEFAULT 1 CHECK (max_selections >= 1),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT product_option_groups_product_slug_unique UNIQUE (product_id, slug)
);

CREATE TABLE public.product_option_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_group_id uuid NOT NULL REFERENCES public.product_option_groups (id) ON DELETE CASCADE,
  linked_product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  linked_variant_id uuid REFERENCES public.product_variants (id) ON DELETE SET NULL,
  label text NOT NULL,
  value_slug text NOT NULL,
  price_adjustment_cents integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT product_option_values_group_slug_unique UNIQUE (option_group_id, value_slug)
);

CREATE TABLE public.compatibility_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  source_option_value_id uuid NOT NULL REFERENCES public.product_option_values (id) ON DELETE CASCADE,
  target_option_group_id uuid NOT NULL REFERENCES public.product_option_groups (id) ON DELETE CASCADE,
  rule_type text NOT NULL CHECK (rule_type IN ('requires', 'excludes', 'allows_only')),
  allowed_option_value_ids uuid[],
  excluded_option_value_ids uuid[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants (id) ON DELETE CASCADE,
  quantity_on_hand integer NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  quantity_reserved integer NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  reorder_point integer NOT NULL DEFAULT 0 CHECK (reorder_point >= 0),
  warehouse_location text,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT inventory_variant_unique UNIQUE (variant_id),
  CONSTRAINT inventory_reserved_lte_on_hand CHECK (quantity_reserved <= quantity_on_hand)
);

CREATE TABLE public.recommended_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  recommended_product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  recommendation_type text NOT NULL DEFAULT 'cross_sell'
    CHECK (recommendation_type IN ('upsell', 'cross_sell', 'accessory', 'spare', 'bundle_addon')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT recommended_products_unique UNIQUE (product_id, recommended_product_id),
  CONSTRAINT recommended_products_not_self CHECK (product_id <> recommended_product_id)
);

-- ---------------------------------------------------------------------------
-- Customers & addresses
-- ---------------------------------------------------------------------------
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE,
  email text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  company_name text,
  tax_exempt boolean NOT NULL DEFAULT false,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT customers_email_unique UNIQUE (email)
);

CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  address_type address_type NOT NULL DEFAULT 'shipping',
  label text,
  first_name text,
  last_name text,
  company_name text,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  phone text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Orders & invoicing
-- ---------------------------------------------------------------------------
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  status order_status NOT NULL DEFAULT 'pending_review',
  currency text NOT NULL DEFAULT 'USD',
  subtotal_cents integer NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  tax_cents integer NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  shipping_cents integer NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  discount_cents integer NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents integer NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  shipping_address_id uuid REFERENCES public.addresses (id) ON DELETE SET NULL,
  billing_address_id uuid REFERENCES public.addresses (id) ON DELETE SET NULL,
  customer_notes text,
  internal_notes text,
  payment_method text,
  payment_reference text,
  reviewed_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT orders_order_number_unique UNIQUE (order_number)
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants (id) ON DELETE SET NULL,
  sku text NOT NULL,
  product_name text NOT NULL,
  variant_name text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  total_price_cents integer NOT NULL CHECK (total_price_cents >= 0),
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'void')),
  currency text NOT NULL DEFAULT 'USD',
  subtotal_cents integer NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  tax_cents integer NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  shipping_cents integer NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  discount_cents integer NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents integer NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  pdf_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number)
);

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices (id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items (id) ON DELETE SET NULL,
  sku text NOT NULL,
  description text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  total_price_cents integer NOT NULL CHECK (total_price_cents >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  changed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.dealer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders (id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers (id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  author_id uuid,
  note text NOT NULL,
  is_internal boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT dealer_notes_has_subject CHECK (
    order_id IS NOT NULL OR customer_id IS NOT NULL OR product_id IS NOT NULL
  )
);

CREATE TABLE public.payment_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  method text NOT NULL CHECK (method IN ('ach', 'wire', 'check', 'other')),
  instructions text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.store_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Number generators
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_seq bigint;
BEGIN
  SELECT COALESCE(
    MAX(CAST(substring(order_number FROM 5) AS bigint)),
    0
  ) + 1
  INTO next_seq
  FROM public.orders
  WHERE order_number ~ '^CEF-[0-9]+$';

  RETURN 'CEF-' || lpad(next_seq::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_seq bigint;
  year_suffix text := to_char(timezone('utc', now()), 'YY');
BEGIN
  SELECT COALESCE(
    MAX(CAST(substring(invoice_number FROM 9) AS bigint)),
    0
  ) + 1
  INTO next_seq
  FROM public.invoices
  WHERE invoice_number ~ ('^INV-' || year_suffix || '-[0-9]+$');

  RETURN 'INV-' || year_suffix || '-' || lpad(next_seq::text, 5, '0');
END;
$$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_categories_slug ON public.categories (slug);
CREATE INDEX idx_categories_parent_id ON public.categories (parent_id);
CREATE INDEX idx_categories_product_type ON public.categories (product_type);
CREATE INDEX idx_categories_is_active ON public.categories (is_active);

CREATE INDEX idx_products_slug ON public.products (slug);
CREATE INDEX idx_products_sku ON public.products (sku);
CREATE INDEX idx_products_product_type ON public.products (product_type);
CREATE INDEX idx_products_is_active ON public.products (is_active);

CREATE INDEX idx_product_variants_product_id ON public.product_variants (product_id);
CREATE INDEX idx_product_variants_sku ON public.product_variants (sku);
CREATE INDEX idx_product_variants_is_active ON public.product_variants (is_active);

CREATE INDEX idx_product_categories_category_id ON public.product_categories (category_id);
CREATE INDEX idx_product_categories_product_id ON public.product_categories (product_id);

CREATE INDEX idx_product_media_product_id ON public.product_media (product_id);
CREATE INDEX idx_product_media_variant_id ON public.product_media (variant_id);

CREATE INDEX idx_product_option_groups_product_id ON public.product_option_groups (product_id);
CREATE INDEX idx_product_option_values_option_group_id ON public.product_option_values (option_group_id);
CREATE INDEX idx_product_option_values_linked_product_id ON public.product_option_values (linked_product_id);
CREATE INDEX idx_product_option_values_linked_variant_id ON public.product_option_values (linked_variant_id);

CREATE INDEX idx_compatibility_rules_product_id ON public.compatibility_rules (product_id);
CREATE INDEX idx_compatibility_rules_source_option_value_id ON public.compatibility_rules (source_option_value_id);
CREATE INDEX idx_compatibility_rules_target_option_group_id ON public.compatibility_rules (target_option_group_id);

CREATE INDEX idx_inventory_variant_id ON public.inventory (variant_id);

CREATE INDEX idx_recommended_products_product_id ON public.recommended_products (product_id);
CREATE INDEX idx_recommended_products_recommended_product_id ON public.recommended_products (recommended_product_id);

CREATE INDEX idx_customers_email ON public.customers (email);
CREATE INDEX idx_customers_auth_user_id ON public.customers (auth_user_id);

CREATE INDEX idx_addresses_customer_id ON public.addresses (customer_id);

CREATE INDEX idx_orders_customer_id ON public.orders (customer_id);
CREATE INDEX idx_orders_status ON public.orders (status);
CREATE INDEX idx_orders_order_number ON public.orders (order_number);
CREATE INDEX idx_orders_created_at ON public.orders (created_at DESC);

CREATE INDEX idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items (product_id);
CREATE INDEX idx_order_items_variant_id ON public.order_items (variant_id);

CREATE INDEX idx_invoices_order_id ON public.invoices (order_id);
CREATE INDEX idx_invoices_invoice_number ON public.invoices (invoice_number);
CREATE INDEX idx_invoices_status ON public.invoices (status);

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items (invoice_id);

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history (order_id);
CREATE INDEX idx_order_status_history_created_at ON public.order_status_history (created_at DESC);

CREATE INDEX idx_dealer_notes_order_id ON public.dealer_notes (order_id);
CREATE INDEX idx_dealer_notes_customer_id ON public.dealer_notes (customer_id);
CREATE INDEX idx_dealer_notes_product_id ON public.dealer_notes (product_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_product_media_updated_at
  BEFORE UPDATE ON public.product_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_product_option_groups_updated_at
  BEFORE UPDATE ON public.product_option_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_product_option_values_updated_at
  BEFORE UPDATE ON public.product_option_values
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_compatibility_rules_updated_at
  BEFORE UPDATE ON public.compatibility_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_dealer_notes_updated_at
  BEFORE UPDATE ON public.dealer_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_payment_instructions_updated_at
  BEFORE UPDATE ON public.payment_instructions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Public read: active catalog surfaces only.
-- Orders and PII: no anon/authenticated policies (service role bypasses RLS).
-- ---------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compatibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommended_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY categories_public_read
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY products_public_read
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY product_variants_public_read
  ON public.product_variants
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.is_active = true
    )
  );

CREATE POLICY product_categories_public_read
  ON public.product_categories
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_categories.product_id
        AND p.is_active = true
    )
    AND EXISTS (
      SELECT 1
      FROM public.categories c
      WHERE c.id = product_categories.category_id
        AND c.is_active = true
    )
  );

CREATE POLICY product_media_public_read
  ON public.product_media
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_media.product_id
        AND p.is_active = true
    )
  );

CREATE POLICY product_option_groups_public_read
  ON public.product_option_groups
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_option_groups.product_id
        AND p.is_active = true
    )
  );

CREATE POLICY product_option_values_public_read
  ON public.product_option_values
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.product_option_groups g
      JOIN public.products p ON p.id = g.product_id
      WHERE g.id = product_option_values.option_group_id
        AND p.is_active = true
    )
  );

CREATE POLICY compatibility_rules_public_read
  ON public.compatibility_rules
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = compatibility_rules.product_id
        AND p.is_active = true
    )
  );

CREATE POLICY recommended_products_public_read
  ON public.recommended_products
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = recommended_products.product_id
        AND p.is_active = true
    )
    AND EXISTS (
      SELECT 1
      FROM public.products rp
      WHERE rp.id = recommended_products.recommended_product_id
        AND rp.is_active = true
    )
  );

CREATE POLICY payment_instructions_public_read
  ON public.payment_instructions
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY store_settings_public_read
  ON public.store_settings
  FOR SELECT
  TO anon, authenticated
  USING (key IN ('store_name', 'store_email', 'store_phone', 'tax_rate_bps', 'currency', 'dealer_disclaimer'));

COMMIT;
