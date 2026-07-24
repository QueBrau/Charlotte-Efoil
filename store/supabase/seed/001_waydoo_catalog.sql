-- Charlotte eFoil Waydoo dealer catalog seed
-- Run after migrations/001_ecommerce_schema.sql
-- Prices are in USD cents. Uses deterministic UUIDs for idempotent upserts.

BEGIN;

-- ---------------------------------------------------------------------------
-- Categories (one per product_type plus complete packages)
-- ---------------------------------------------------------------------------
INSERT INTO public.categories (id, slug, name, description, product_type, sort_order, is_active)
VALUES
  ('c1000000-0000-4000-8000-000000000001', 'complete-packages', 'Complete Packages', 'Fully configured Waydoo Flyer EVO packages ready to ride.', 'package', 10, true),
  ('c1000000-0000-4000-8000-000000000002', 'boards', 'Boards', 'Flyer EVO board decks for every rider profile.', 'board', 20, true),
  ('c1000000-0000-4000-8000-000000000003', 'batteries', 'Batteries & Power', 'PowerFlight smart batteries and power modules.', 'battery', 30, true),
  ('c1000000-0000-4000-8000-000000000004', 'chargers', 'Chargers', 'Fast chargers and charging accessories for PowerFlight batteries.', 'charger', 40, true),
  ('c1000000-0000-4000-8000-000000000005', 'masts', 'Masts', 'Carbon fiber masts in multiple lengths.', 'mast', 50, true),
  ('c1000000-0000-4000-8000-000000000006', 'front-wings', 'Front Wings', 'Front wing foils for lift, stability, and progression.', 'front_wing', 60, true),
  ('c1000000-0000-4000-8000-000000000007', 'rear-wings', 'Rear Wings', 'Stabilizer rear wings for pitch control.', 'rear_wing', 70, true),
  ('c1000000-0000-4000-8000-000000000008', 'propulsion', 'Propulsion Units', 'Waydoo propulsion modules and motor assemblies.', 'propulsion', 80, true),
  ('c1000000-0000-4000-8000-000000000009', 'controllers', 'Controllers', 'Hand controllers and wireless remotes.', 'controller', 90, true),
  ('c1000000-0000-4000-8000-000000000010', 'bags', 'Bags & Transport', 'Board bags, battery bags, and travel kits.', 'bag', 100, true),
  ('c1000000-0000-4000-8000-000000000011', 'covers', 'Covers & Protection', 'Board covers, wing covers, and protective sleeves.', 'cover', 110, true),
  ('c1000000-0000-4000-8000-000000000012', 'safety', 'Safety Equipment', 'Impact vests, helmets, leashes, and safety kits.', 'safety', 120, true),
  ('c1000000-0000-4000-8000-000000000013', 'parts', 'Parts', 'Replacement hardware, seals, and service parts.', 'part', 130, true),
  ('c1000000-0000-4000-8000-000000000014', 'accessories', 'Accessories', 'Fins, adapters, tools, and ride accessories.', 'accessory', 140, true)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  product_type = EXCLUDED.product_type,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- Complete packages (configurable)
-- ---------------------------------------------------------------------------
INSERT INTO public.products (
  id, slug, sku, name, short_description, description, product_type,
  base_price_cents, compare_at_price_cents, is_active, is_configurable, requires_dealer_review, metadata
)
VALUES
  (
    'a1000000-0000-4000-8000-000000000001',
    'flyer-evo-max-plus-package',
    'PKG-EVO-MAX-PLUS',
    'Flyer EVO Max Plus Complete Package',
    '130L stability-focused package with Smart Flight Assistance for first flights and family riders.',
    'The Max Plus package pairs the 130L Flyer EVO board with 6000W propulsion, PowerFlight battery, and tuned wing set for smooth takeoffs and up to 135 minutes of ride time.',
    'package',
    899900,
    949900,
    true,
    true,
    true,
    '{"board_volume_l":130,"propulsion_w":6000,"ride_time_min":135}'::jsonb
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'flyer-evo-pro-plus-package',
    'PKG-EVO-PRO-PLUS',
    'Flyer EVO Pro Plus Complete Package',
    'Balanced 90L package for all skill levels with responsive handling and Smart Flight Assistance.',
    'The Pro Plus package delivers the versatile 90L board platform, 6000W propulsion, and modular wing options for progression up to 32 mph.',
    'package',
    799900,
    849900,
    true,
    true,
    true,
    '{"board_volume_l":90,"propulsion_w":6000,"top_speed_mph":32}'::jsonb
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    'flyer-evo-lite-package',
    'PKG-EVO-LITE',
    'Flyer EVO Lite Complete Package',
    'Lightweight 90L package with 4000W propulsion for agile progression.',
    'The Lite package is tuned for riders building confidence with a nimble board, efficient propulsion, and accessible wing sizing.',
    'package',
    649900,
    699900,
    true,
    true,
    true,
    '{"board_volume_l":90,"propulsion_w":4000}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  sku = EXCLUDED.sku,
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  product_type = EXCLUDED.product_type,
  base_price_cents = EXCLUDED.base_price_cents,
  compare_at_price_cents = EXCLUDED.compare_at_price_cents,
  is_active = EXCLUDED.is_active,
  is_configurable = EXCLUDED.is_configurable,
  requires_dealer_review = EXCLUDED.requires_dealer_review,
  metadata = EXCLUDED.metadata;

-- ---------------------------------------------------------------------------
-- Component products
-- ---------------------------------------------------------------------------
INSERT INTO public.products (
  id, slug, sku, name, short_description, description, product_type,
  base_price_cents, compare_at_price_cents, is_active, is_configurable, metadata
)
VALUES
  -- Boards
  ('a1000000-0000-4000-8000-000000000010', 'flyer-evo-max-plus-board', 'BRD-EVO-MAX-130', 'Flyer EVO Max Plus Board (130L)', 'High-buoyancy 130L deck for beginners and family riders.', 'Stable platform with Smart Flight Assistance integration points.', 'board', 329900, NULL, true, false, '{"volume_l":130}'::jsonb),
  ('a1000000-0000-4000-8000-000000000011', 'flyer-evo-pro-plus-board', 'BRD-EVO-PRO-90', 'Flyer EVO Pro Plus Board (90L)', 'Responsive 90L deck for all skill levels.', 'Balanced volume and outline for progression and performance.', 'board', 289900, NULL, true, false, '{"volume_l":90}'::jsonb),
  ('a1000000-0000-4000-8000-000000000012', 'flyer-evo-lite-board', 'BRD-EVO-LITE-90', 'Flyer EVO Lite Board (90L)', 'Lightweight agile 90L deck.', 'Reduced weight for nimble handling and skill building.', 'board', 249900, NULL, true, false, '{"volume_l":90}'::jsonb),

  -- Batteries
  ('a1000000-0000-4000-8000-000000000020', 'powerflight-battery-28ah', 'BAT-PF-28AH', 'PowerFlight Smart Battery 28Ah', 'Extended range PowerFlight pack.', 'Smart BMS, hot-swap ready, up to 135 min ride time on Max Plus setups.', 'battery', 249900, NULL, true, false, '{"capacity_ah":28}'::jsonb),
  ('a1000000-0000-4000-8000-000000000021', 'powerflight-battery-22ah', 'BAT-PF-22AH', 'PowerFlight Smart Battery 22Ah', 'Standard range PowerFlight pack.', 'Balanced weight and runtime for Pro Plus and Lite builds.', 'battery', 199900, NULL, true, false, '{"capacity_ah":22}'::jsonb),

  -- Chargers
  ('a1000000-0000-4000-8000-000000000030', 'powerflight-fast-charger', 'CHG-PF-FAST', 'PowerFlight Fast Charger', '2-hour fast charge for PowerFlight batteries.', 'Dealer-grade charger with thermal monitoring.', 'charger', 49900, NULL, true, false, '{"charge_time_hours":2}'::jsonb),
  ('a1000000-0000-4000-8000-000000000031', 'powerflight-standard-charger', 'CHG-PF-STD', 'PowerFlight Standard Charger', 'Standard overnight charger.', 'Reliable charging for home and dockside use.', 'charger', 29900, NULL, true, false, '{"charge_time_hours":4}'::jsonb),

  -- Masts
  ('a1000000-0000-4000-8000-000000000040', 'carbon-mast-60cm', 'MST-CF-60', 'Carbon Mast 60 cm', 'Short mast for shallow water and learning.', 'Ultra-rigid carbon construction.', 'mast', 89900, NULL, true, false, '{"length_cm":60}'::jsonb),
  ('a1000000-0000-4000-8000-000000000041', 'carbon-mast-75cm', 'MST-CF-75', 'Carbon Mast 75 cm', 'Mid-length mast for versatile conditions.', 'Precise input translation with reduced flex.', 'mast', 94900, NULL, true, false, '{"length_cm":75}'::jsonb),
  ('a1000000-0000-4000-8000-000000000042', 'carbon-mast-90cm', 'MST-CF-90', 'Carbon Mast 90 cm', 'Long mast for open water performance.', 'Maximum leverage for advanced riding.', 'mast', 99900, NULL, true, false, '{"length_cm":90}'::jsonb),

  -- Front wings
  ('a1000000-0000-4000-8000-000000000050', 'front-wing-1300', 'FW-1300', 'Front Wing 1300', 'High-lift wing for early takeoff.', 'Ideal for beginners and heavier riders.', 'front_wing', 69900, NULL, true, false, '{"area_cm2":1300}'::jsonb),
  ('a1000000-0000-4000-8000-000000000051', 'front-wing-1100', 'FW-1100', 'Front Wing 1100', 'Balanced all-around front wing.', 'Smooth progression from first flights to carving.', 'front_wing', 64900, NULL, true, false, '{"area_cm2":1100}'::jsonb),
  ('a1000000-0000-4000-8000-000000000052', 'front-wing-900', 'FW-900', 'Front Wing 900', 'Performance front wing for agile riding.', 'Lower drag profile for experienced riders.', 'front_wing', 69900, NULL, true, false, '{"area_cm2":900}'::jsonb),

  -- Rear wings
  ('a1000000-0000-4000-8000-000000000060', 'rear-wing-320', 'RW-320', 'Rear Wing 320', 'Stable rear stabilizer.', 'Pairs with 1300 and 1100 front wings.', 'rear_wing', 24900, NULL, true, false, '{"area_cm2":320}'::jsonb),
  ('a1000000-0000-4000-8000-000000000061', 'rear-wing-280', 'RW-280', 'Rear Wing 280', 'Performance rear stabilizer.', 'Tighter pitch control for sport setups.', 'rear_wing', 24900, NULL, true, false, '{"area_cm2":280}'::jsonb),

  -- Propulsion
  ('a1000000-0000-4000-8000-000000000070', 'propulsion-6000w', 'PROP-6000W', '6000W Propulsion Unit', 'High-output motor module.', 'Required for Max Plus and Pro Plus packages.', 'propulsion', 189900, NULL, true, false, '{"power_w":6000}'::jsonb),
  ('a1000000-0000-4000-8000-000000000071', 'propulsion-4000w', 'PROP-4000W', '4000W Propulsion Unit', 'Efficient motor module for Lite builds.', 'Optimized for lightweight progression setups.', 'propulsion', 149900, NULL, true, false, '{"power_w":4000}'::jsonb),

  -- Controllers
  ('a1000000-0000-4000-8000-000000000080', 'wireless-hand-controller', 'CTL-WIRELESS', 'Wireless Hand Controller', 'Ergonomic throttle and mode control.', 'Bluetooth paired with Smart Flight Assistance.', 'controller', 39900, NULL, true, false, '{}'::jsonb),
  ('a1000000-0000-4000-8000-000000000081', 'controller-wrist-leash', 'ACC-CTL-LEASH', 'Controller Wrist Leash', 'Secure leash for hand controller.', 'Prevents controller loss on falls.', 'accessory', 1900, NULL, true, false, '{}'::jsonb),

  -- Bags
  ('a1000000-0000-4000-8000-000000000090', 'board-travel-bag', 'BAG-BOARD', 'Board Travel Bag', 'Padded bag for Flyer EVO boards.', 'Wheeled travel bag with reinforced base.', 'bag', 34900, NULL, true, false, '{}'::jsonb),
  ('a1000000-0000-4000-8000-000000000091', 'battery-transport-bag', 'BAG-BATTERY', 'Battery Transport Bag', 'Fire-rated battery transport bag.', 'Air-travel compliant padding and ventilation.', 'bag', 12900, NULL, true, false, '{}'::jsonb),

  -- Covers
  ('a1000000-0000-4000-8000-000000000100', 'board-cover-universal', 'COV-BOARD', 'Universal Board Cover', 'UV-resistant board sock.', 'Protects deck and rails between sessions.', 'cover', 8900, NULL, true, false, '{}'::jsonb),
  ('a1000000-0000-4000-8000-000000000101', 'wing-cover-set', 'COV-WING-SET', 'Wing Cover Set', 'Front and rear wing covers.', 'Neoprene-lined protection for foil surfaces.', 'cover', 5900, NULL, true, false, '{}'::jsonb),

  -- Safety
  ('a1000000-0000-4000-8000-000000000110', 'impact-vest', 'SAF-VEST', 'Impact Vest', 'USCG-style impact vest.', 'Recommended for all new riders.', 'safety', 12900, NULL, true, false, '{}'::jsonb),
  ('a1000000-0000-4000-8000-000000000111', 'efoil-helmet', 'SAF-HELMET', 'eFoil Helmet', 'Water sports helmet with ear coverage.', 'Charlotte eFoil recommended safety gear.', 'safety', 14900, NULL, true, false, '{}'::jsonb),
  ('a1000000-0000-4000-8000-000000000112', 'board-leash', 'SAF-LEASH', 'Board Leash', 'Coiled board leash.', 'Keeps board nearby after falls.', 'safety', 4900, NULL, true, false, '{}'::jsonb),

  -- Parts
  ('a1000000-0000-4000-8000-000000000120', 'mast-plate-hardware-kit', 'PRT-MAST-KIT', 'Mast Plate Hardware Kit', 'Replacement bolts and shims.', 'Service kit for mast-to-board mounting.', 'part', 3900, NULL, true, false, '{}'::jsonb),
  ('a1000000-0000-4000-8000-000000000121', 'propeller-service-kit', 'PRT-PROP-KIT', 'Propeller Service Kit', 'Prop, seals, and lubricant.', 'Annual maintenance kit for propulsion units.', 'part', 8900, NULL, true, false, '{}'::jsonb),

  -- Accessories
  ('a1000000-0000-4000-8000-000000000130', 'foil-tool-kit', 'ACC-TOOL-KIT', 'Foil Tool Kit', 'Torque wrench and hex set.', 'Essential assembly and travel tools.', 'accessory', 7900, NULL, true, false, '{}'::jsonb),
  ('a1000000-0000-4000-8000-000000000131', 'gps-ride-tracker-mount', 'ACC-GPS-MNT', 'GPS Ride Tracker Mount', 'Deck mount for ride logging devices.', 'Low-profile adhesive mount.', 'accessory', 2900, NULL, true, false, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  sku = EXCLUDED.sku,
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  product_type = EXCLUDED.product_type,
  base_price_cents = EXCLUDED.base_price_cents,
  compare_at_price_cents = EXCLUDED.compare_at_price_cents,
  is_active = EXCLUDED.is_active,
  is_configurable = EXCLUDED.is_configurable,
  metadata = EXCLUDED.metadata;

-- ---------------------------------------------------------------------------
-- Product ↔ category links
-- ---------------------------------------------------------------------------
INSERT INTO public.product_categories (product_id, category_id, is_primary, sort_order)
VALUES
  ('a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', true, 1),
  ('a1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', true, 2),
  ('a1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000001', true, 3),
  ('a1000000-0000-4000-8000-000000000010', 'c1000000-0000-4000-8000-000000000002', true, 1),
  ('a1000000-0000-4000-8000-000000000011', 'c1000000-0000-4000-8000-000000000002', true, 2),
  ('a1000000-0000-4000-8000-000000000012', 'c1000000-0000-4000-8000-000000000002', true, 3),
  ('a1000000-0000-4000-8000-000000000020', 'c1000000-0000-4000-8000-000000000003', true, 1),
  ('a1000000-0000-4000-8000-000000000021', 'c1000000-0000-4000-8000-000000000003', true, 2),
  ('a1000000-0000-4000-8000-000000000030', 'c1000000-0000-4000-8000-000000000004', true, 1),
  ('a1000000-0000-4000-8000-000000000031', 'c1000000-0000-4000-8000-000000000004', true, 2),
  ('a1000000-0000-4000-8000-000000000040', 'c1000000-0000-4000-8000-000000000005', true, 1),
  ('a1000000-0000-4000-8000-000000000041', 'c1000000-0000-4000-8000-000000000005', true, 2),
  ('a1000000-0000-4000-8000-000000000042', 'c1000000-0000-4000-8000-000000000005', true, 3),
  ('a1000000-0000-4000-8000-000000000050', 'c1000000-0000-4000-8000-000000000006', true, 1),
  ('a1000000-0000-4000-8000-000000000051', 'c1000000-0000-4000-8000-000000000006', true, 2),
  ('a1000000-0000-4000-8000-000000000052', 'c1000000-0000-4000-8000-000000000006', true, 3),
  ('a1000000-0000-4000-8000-000000000060', 'c1000000-0000-4000-8000-000000000007', true, 1),
  ('a1000000-0000-4000-8000-000000000061', 'c1000000-0000-4000-8000-000000000007', true, 2),
  ('a1000000-0000-4000-8000-000000000070', 'c1000000-0000-4000-8000-000000000008', true, 1),
  ('a1000000-0000-4000-8000-000000000071', 'c1000000-0000-4000-8000-000000000008', true, 2),
  ('a1000000-0000-4000-8000-000000000080', 'c1000000-0000-4000-8000-000000000009', true, 1),
  ('a1000000-0000-4000-8000-000000000081', 'c1000000-0000-4000-8000-000000000014', true, 1),
  ('a1000000-0000-4000-8000-000000000090', 'c1000000-0000-4000-8000-000000000010', true, 1),
  ('a1000000-0000-4000-8000-000000000091', 'c1000000-0000-4000-8000-000000000010', true, 2),
  ('a1000000-0000-4000-8000-000000000100', 'c1000000-0000-4000-8000-000000000011', true, 1),
  ('a1000000-0000-4000-8000-000000000101', 'c1000000-0000-4000-8000-000000000011', true, 2),
  ('a1000000-0000-4000-8000-000000000110', 'c1000000-0000-4000-8000-000000000012', true, 1),
  ('a1000000-0000-4000-8000-000000000111', 'c1000000-0000-4000-8000-000000000012', true, 2),
  ('a1000000-0000-4000-8000-000000000112', 'c1000000-0000-4000-8000-000000000012', true, 3),
  ('a1000000-0000-4000-8000-000000000120', 'c1000000-0000-4000-8000-000000000013', true, 1),
  ('a1000000-0000-4000-8000-000000000121', 'c1000000-0000-4000-8000-000000000013', true, 2),
  ('a1000000-0000-4000-8000-000000000130', 'c1000000-0000-4000-8000-000000000014', true, 1),
  ('a1000000-0000-4000-8000-000000000131', 'c1000000-0000-4000-8000-000000000014', true, 2)
ON CONFLICT (product_id, category_id) DO UPDATE SET
  is_primary = EXCLUDED.is_primary,
  sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- Default variants for standalone SKUs
-- ---------------------------------------------------------------------------
INSERT INTO public.product_variants (id, product_id, sku, name, price_cents, is_default, is_active, sort_order)
SELECT
  ('b' || substring(p.id::text from 2))::uuid,
  p.id,
  p.sku,
  p.name,
  p.base_price_cents,
  true,
  true,
  0
FROM public.products p
WHERE p.product_type <> 'package'
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  is_default = EXCLUDED.is_default,
  is_active = EXCLUDED.is_active;

-- Package default variants (starting price only)
INSERT INTO public.product_variants (id, product_id, sku, name, price_cents, is_default, is_active, sort_order)
VALUES
  ('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'PKG-EVO-MAX-PLUS-DEFAULT', 'Flyer EVO Max Plus Package (Default Build)', 899900, true, true, 0),
  ('b1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'PKG-EVO-PRO-PLUS-DEFAULT', 'Flyer EVO Pro Plus Package (Default Build)', 799900, true, true, 0),
  ('b1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', 'PKG-EVO-LITE-DEFAULT', 'Flyer EVO Lite Package (Default Build)', 649900, true, true, 0)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  is_default = EXCLUDED.is_default,
  is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- Product media (legacy placeholders — superseded by 002_product_media_import.sql)
-- ---------------------------------------------------------------------------
-- Imported Waydoo media is seeded via store/supabase/seed/002_product_media_import.sql
-- Regenerate that file with: npm run generate:product-media-seed

-- ---------------------------------------------------------------------------
-- Configurator option groups (shared across all three packages)
-- ---------------------------------------------------------------------------
INSERT INTO public.product_option_groups (id, product_id, name, slug, description, sort_order, is_required)
VALUES
  -- Max Plus package
  ('e1000000-0000-4000-8000-000000000101', 'a1000000-0000-4000-8000-000000000001', 'Board Model', 'board-model', 'Select the Flyer EVO board deck.', 10, true),
  ('e1000000-0000-4000-8000-000000000102', 'a1000000-0000-4000-8000-000000000001', 'Battery', 'battery', 'PowerFlight battery capacity.', 20, true),
  ('e1000000-0000-4000-8000-000000000103', 'a1000000-0000-4000-8000-000000000001', 'Mast Length', 'mast-length', 'Carbon mast length for your riding conditions.', 30, true),
  ('e1000000-0000-4000-8000-000000000104', 'a1000000-0000-4000-8000-000000000001', 'Front Wing', 'front-wing', 'Front foil wing sizing.', 40, true),
  ('e1000000-0000-4000-8000-000000000105', 'a1000000-0000-4000-8000-000000000001', 'Rear Wing', 'rear-wing', 'Stabilizer wing pairing.', 50, true),
  ('e1000000-0000-4000-8000-000000000106', 'a1000000-0000-4000-8000-000000000001', 'Charger', 'charger', 'Charging solution included with package.', 60, true),
  ('e1000000-0000-4000-8000-000000000107', 'a1000000-0000-4000-8000-000000000001', 'Board Color', 'color', 'Deck color finish.', 70, true),

  -- Pro Plus package
  ('e1000000-0000-4000-8000-000000000201', 'a1000000-0000-4000-8000-000000000002', 'Board Model', 'board-model', 'Select the Flyer EVO board deck.', 10, true),
  ('e1000000-0000-4000-8000-000000000202', 'a1000000-0000-4000-8000-000000000002', 'Battery', 'battery', 'PowerFlight battery capacity.', 20, true),
  ('e1000000-0000-4000-8000-000000000203', 'a1000000-0000-4000-8000-000000000002', 'Mast Length', 'mast-length', 'Carbon mast length for your riding conditions.', 30, true),
  ('e1000000-0000-4000-8000-000000000204', 'a1000000-0000-4000-8000-000000000002', 'Front Wing', 'front-wing', 'Front foil wing sizing.', 40, true),
  ('e1000000-0000-4000-8000-000000000205', 'a1000000-0000-4000-8000-000000000002', 'Rear Wing', 'rear-wing', 'Stabilizer wing pairing.', 50, true),
  ('e1000000-0000-4000-8000-000000000206', 'a1000000-0000-4000-8000-000000000002', 'Charger', 'charger', 'Charging solution included with package.', 60, true),
  ('e1000000-0000-4000-8000-000000000207', 'a1000000-0000-4000-8000-000000000002', 'Board Color', 'color', 'Deck color finish.', 70, true),

  -- Lite package
  ('e1000000-0000-4000-8000-000000000301', 'a1000000-0000-4000-8000-000000000003', 'Board Model', 'board-model', 'Select the Flyer EVO board deck.', 10, true),
  ('e1000000-0000-4000-8000-000000000302', 'a1000000-0000-4000-8000-000000000003', 'Battery', 'battery', 'PowerFlight battery capacity.', 20, true),
  ('e1000000-0000-4000-8000-000000000303', 'a1000000-0000-4000-8000-000000000003', 'Mast Length', 'mast-length', 'Carbon mast length for your riding conditions.', 30, true),
  ('e1000000-0000-4000-8000-000000000304', 'a1000000-0000-4000-8000-000000000003', 'Front Wing', 'front-wing', 'Front foil wing sizing.', 40, true),
  ('e1000000-0000-4000-8000-000000000305', 'a1000000-0000-4000-8000-000000000003', 'Rear Wing', 'rear-wing', 'Stabilizer wing pairing.', 50, true),
  ('e1000000-0000-4000-8000-000000000306', 'a1000000-0000-4000-8000-000000000003', 'Charger', 'charger', 'Charging solution included with package.', 60, true),
  ('e1000000-0000-4000-8000-000000000307', 'a1000000-0000-4000-8000-000000000003', 'Board Color', 'color', 'Deck color finish.', 70, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_required = EXCLUDED.is_required;

-- Helper: option values for Max Plus package (defaults pre-selected)
INSERT INTO public.product_option_values (
  id, option_group_id, linked_product_id, label, value_slug, price_adjustment_cents, is_default, sort_order
)
VALUES
  ('f1000000-0000-4000-8000-000000000101', 'e1000000-0000-4000-8000-000000000101', 'a1000000-0000-4000-8000-000000000010', 'Flyer EVO Max Plus (130L)', 'max-plus-130l', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000102', 'e1000000-0000-4000-8000-000000000102', 'a1000000-0000-4000-8000-000000000020', 'PowerFlight 28Ah', 'battery-28ah', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000103', 'e1000000-0000-4000-8000-000000000102', 'a1000000-0000-4000-8000-000000000021', 'PowerFlight 22Ah', 'battery-22ah', -50000, false, 2),
  ('f1000000-0000-4000-8000-000000000104', 'e1000000-0000-4000-8000-000000000103', 'a1000000-0000-4000-8000-000000000041', '75 cm Carbon Mast', 'mast-75cm', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000105', 'e1000000-0000-4000-8000-000000000103', 'a1000000-0000-4000-8000-000000000040', '60 cm Carbon Mast', 'mast-60cm', -5000, false, 2),
  ('f1000000-0000-4000-8000-000000000106', 'e1000000-0000-4000-8000-000000000103', 'a1000000-0000-4000-8000-000000000042', '90 cm Carbon Mast', 'mast-90cm', 5000, false, 3),
  ('f1000000-0000-4000-8000-000000000107', 'e1000000-0000-4000-8000-000000000104', 'a1000000-0000-4000-8000-000000000050', 'Front Wing 1300', 'front-wing-1300', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000108', 'e1000000-0000-4000-8000-000000000104', 'a1000000-0000-4000-8000-000000000051', 'Front Wing 1100', 'front-wing-1100', 0, false, 2),
  ('f1000000-0000-4000-8000-000000000109', 'e1000000-0000-4000-8000-000000000105', 'a1000000-0000-4000-8000-000000000060', 'Rear Wing 320', 'rear-wing-320', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000110', 'e1000000-0000-4000-8000-000000000106', 'a1000000-0000-4000-8000-000000000030', 'Fast Charger (2 hr)', 'charger-fast', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000111', 'e1000000-0000-4000-8000-000000000106', 'a1000000-0000-4000-8000-000000000031', 'Standard Charger (4 hr)', 'charger-standard', -20000, false, 2),
  ('f1000000-0000-4000-8000-000000000112', 'e1000000-0000-4000-8000-000000000107', NULL, 'Arctic White', 'color-white', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000113', 'e1000000-0000-4000-8000-000000000107', NULL, 'Lake Blue', 'color-blue', 0, false, 2),
  ('f1000000-0000-4000-8000-000000000114', 'e1000000-0000-4000-8000-000000000107', NULL, 'Carbon Black', 'color-black', 0, false, 3)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  value_slug = EXCLUDED.value_slug,
  price_adjustment_cents = EXCLUDED.price_adjustment_cents,
  is_default = EXCLUDED.is_default,
  sort_order = EXCLUDED.sort_order,
  linked_product_id = EXCLUDED.linked_product_id;

-- Pro Plus option values
INSERT INTO public.product_option_values (
  id, option_group_id, linked_product_id, label, value_slug, price_adjustment_cents, is_default, sort_order
)
VALUES
  ('f1000000-0000-4000-8000-000000000201', 'e1000000-0000-4000-8000-000000000201', 'a1000000-0000-4000-8000-000000000011', 'Flyer EVO Pro Plus (90L)', 'pro-plus-90l', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000202', 'e1000000-0000-4000-8000-000000000202', 'a1000000-0000-4000-8000-000000000021', 'PowerFlight 22Ah', 'battery-22ah', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000203', 'e1000000-0000-4000-8000-000000000202', 'a1000000-0000-4000-8000-000000000020', 'PowerFlight 28Ah', 'battery-28ah', 50000, false, 2),
  ('f1000000-0000-4000-8000-000000000204', 'e1000000-0000-4000-8000-000000000203', 'a1000000-0000-4000-8000-000000000041', '75 cm Carbon Mast', 'mast-75cm', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000205', 'e1000000-0000-4000-8000-000000000203', 'a1000000-0000-4000-8000-000000000040', '60 cm Carbon Mast', 'mast-60cm', -5000, false, 2),
  ('f1000000-0000-4000-8000-000000000206', 'e1000000-0000-4000-8000-000000000203', 'a1000000-0000-4000-8000-000000000042', '90 cm Carbon Mast', 'mast-90cm', 5000, false, 3),
  ('f1000000-0000-4000-8000-000000000207', 'e1000000-0000-4000-8000-000000000204', 'a1000000-0000-4000-8000-000000000051', 'Front Wing 1100', 'front-wing-1100', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000208', 'e1000000-0000-4000-8000-000000000204', 'a1000000-0000-4000-8000-000000000052', 'Front Wing 900', 'front-wing-900', 5000, false, 2),
  ('f1000000-0000-4000-8000-000000000209', 'e1000000-0000-4000-8000-000000000205', 'a1000000-0000-4000-8000-000000000061', 'Rear Wing 280', 'rear-wing-280', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000210', 'e1000000-0000-4000-8000-000000000206', 'a1000000-0000-4000-8000-000000000030', 'Fast Charger (2 hr)', 'charger-fast', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000211', 'e1000000-0000-4000-8000-000000000206', 'a1000000-0000-4000-8000-000000000031', 'Standard Charger (4 hr)', 'charger-standard', -20000, false, 2),
  ('f1000000-0000-4000-8000-000000000212', 'e1000000-0000-4000-8000-000000000207', NULL, 'Arctic White', 'color-white', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000213', 'e1000000-0000-4000-8000-000000000207', NULL, 'Sunset Orange', 'color-orange', 0, false, 2)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  value_slug = EXCLUDED.value_slug,
  price_adjustment_cents = EXCLUDED.price_adjustment_cents,
  is_default = EXCLUDED.is_default,
  sort_order = EXCLUDED.sort_order,
  linked_product_id = EXCLUDED.linked_product_id;

-- Lite option values
INSERT INTO public.product_option_values (
  id, option_group_id, linked_product_id, label, value_slug, price_adjustment_cents, is_default, sort_order
)
VALUES
  ('f1000000-0000-4000-8000-000000000301', 'e1000000-0000-4000-8000-000000000301', 'a1000000-0000-4000-8000-000000000012', 'Flyer EVO Lite (90L)', 'lite-90l', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000302', 'e1000000-0000-4000-8000-000000000302', 'a1000000-0000-4000-8000-000000000021', 'PowerFlight 22Ah', 'battery-22ah', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000303', 'e1000000-0000-4000-8000-000000000303', 'a1000000-0000-4000-8000-000000000040', '60 cm Carbon Mast', 'mast-60cm', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000304', 'e1000000-0000-4000-8000-000000000303', 'a1000000-0000-4000-8000-000000000041', '75 cm Carbon Mast', 'mast-75cm', 5000, false, 2),
  ('f1000000-0000-4000-8000-000000000305', 'e1000000-0000-4000-8000-000000000304', 'a1000000-0000-4000-8000-000000000051', 'Front Wing 1100', 'front-wing-1100', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000306', 'e1000000-0000-4000-8000-000000000305', 'a1000000-0000-4000-8000-000000000060', 'Rear Wing 320', 'rear-wing-320', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000307', 'e1000000-0000-4000-8000-000000000306', 'a1000000-0000-4000-8000-000000000031', 'Standard Charger (4 hr)', 'charger-standard', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000308', 'e1000000-0000-4000-8000-000000000307', NULL, 'Arctic White', 'color-white', 0, true, 1),
  ('f1000000-0000-4000-8000-000000000309', 'e1000000-0000-4000-8000-000000000307', NULL, 'Lake Blue', 'color-blue', 0, false, 2)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  value_slug = EXCLUDED.value_slug,
  price_adjustment_cents = EXCLUDED.price_adjustment_cents,
  is_default = EXCLUDED.is_default,
  sort_order = EXCLUDED.sort_order,
  linked_product_id = EXCLUDED.linked_product_id;

-- ---------------------------------------------------------------------------
-- Compatibility rules (configurator constraints)
-- ---------------------------------------------------------------------------
INSERT INTO public.compatibility_rules (
  id, product_id, source_option_value_id, target_option_group_id, rule_type,
  allowed_option_value_ids, excluded_option_value_ids, notes
)
VALUES
  (
    '71100000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'f1000000-0000-4000-8000-000000000101',
    'e1000000-0000-4000-8000-000000000104',
    'allows_only',
    ARRAY['f1000000-0000-4000-8000-000000000107', 'f1000000-0000-4000-8000-000000000108']::uuid[],
    NULL,
    'Max Plus board pairs with high-lift front wings only.'
  ),
  (
    '71100000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000002',
    'f1000000-0000-4000-8000-000000000208',
    'e1000000-0000-4000-8000-000000000205',
    'requires',
    ARRAY['f1000000-0000-4000-8000-000000000209']::uuid[],
    NULL,
    'Front Wing 900 requires the performance Rear Wing 280.'
  ),
  (
    '71100000-0000-4000-8000-000000000003',
    'a1000000-0000-4000-8000-000000000003',
    'f1000000-0000-4000-8000-000000000301',
    'e1000000-0000-4000-8000-000000000303',
    'excludes',
    NULL,
    ARRAY['f1000000-0000-4000-8000-000000000304']::uuid[],
    'Lite package excludes 75 cm mast to keep weight down for progression riders.'
  ),
  (
    '71100000-0000-4000-8000-000000000004',
    'a1000000-0000-4000-8000-000000000001',
    'f1000000-0000-4000-8000-000000000106',
    'e1000000-0000-4000-8000-000000000104',
    'requires',
    ARRAY['f1000000-0000-4000-8000-000000000107']::uuid[],
    NULL,
    '90 cm mast on Max Plus requires Front Wing 1300 for stability.'
  )
ON CONFLICT (id) DO UPDATE SET
  rule_type = EXCLUDED.rule_type,
  allowed_option_value_ids = EXCLUDED.allowed_option_value_ids,
  excluded_option_value_ids = EXCLUDED.excluded_option_value_ids,
  notes = EXCLUDED.notes;

-- ---------------------------------------------------------------------------
-- Inventory for default variants
-- ---------------------------------------------------------------------------
INSERT INTO public.inventory (variant_id, quantity_on_hand, quantity_reserved, reorder_point, warehouse_location)
SELECT
  pv.id,
  CASE
    WHEN p.product_type IN ('package', 'board', 'battery', 'propulsion') THEN 6
    WHEN p.product_type IN ('mast', 'front_wing', 'rear_wing') THEN 12
    ELSE 20
  END,
  0,
  2,
  'Charlotte, NC'
FROM public.product_variants pv
JOIN public.products p ON p.id = pv.product_id
WHERE pv.is_default = true
ON CONFLICT (variant_id) DO UPDATE SET
  quantity_on_hand = EXCLUDED.quantity_on_hand,
  reorder_point = EXCLUDED.reorder_point,
  warehouse_location = EXCLUDED.warehouse_location;

-- ---------------------------------------------------------------------------
-- Recommended products
-- ---------------------------------------------------------------------------
INSERT INTO public.recommended_products (id, product_id, recommended_product_id, recommendation_type, sort_order)
VALUES
  ('9ec00000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000110', 'accessory', 1),
  ('9ec00000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000111', 'accessory', 2),
  ('9ec00000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000090', 'cross_sell', 3),
  ('9ec00000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000020', 'upsell', 1),
  ('9ec00000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000100', 'accessory', 2),
  ('9ec00000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000112', 'accessory', 1),
  ('9ec00000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000130', 'accessory', 2),
  ('9ec00000-0000-4000-8000-000000000008', 'a1000000-0000-4000-8000-000000000020', 'a1000000-0000-4000-8000-000000000030', 'cross_sell', 1),
  ('9ec00000-0000-4000-8000-000000000009', 'a1000000-0000-4000-8000-000000000020', 'a1000000-0000-4000-8000-000000000091', 'accessory', 2),
  ('9ec00000-0000-4000-8000-000000000010', 'a1000000-0000-4000-8000-000000000070', 'a1000000-0000-4000-8000-000000000121', 'spare', 1)
ON CONFLICT (product_id, recommended_product_id) DO UPDATE SET
  recommendation_type = EXCLUDED.recommendation_type,
  sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- Payment instructions (Charlotte eFoil dealer checkout)
-- ---------------------------------------------------------------------------
INSERT INTO public.payment_instructions (id, title, method, instructions, is_active, sort_order)
VALUES
  (
    '8a900000-0000-4000-8000-000000000001',
    'ACH Bank Transfer',
    'ach',
    E'Charlotte eFoil\nAccount Name: Charlotte eFoil LLC\nBank: Truist Bank\nRouting Number: 053101121\nAccount Number: 9876543210\n\nInclude your order number in the payment memo. ACH transfers typically settle in 1–2 business days. Email hello@CharlotteEfoil.com once payment is initiated.',
    true,
    1
  ),
  (
    '8a900000-0000-4000-8000-000000000002',
    'Wire Transfer',
    'wire',
    E'Charlotte eFoil\nAccount Name: Charlotte eFoil LLC\nBank: Truist Bank\nSWIFT/BIC: SNTRUS3A\nRouting Number: 053101121\nAccount Number: 9876543210\n\nWire reference: your order number. International wires may incur bank fees. Contact hello@CharlotteEfoil.com or 704-421-8778 for large package deposits.',
    true,
    2
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  method = EXCLUDED.method,
  instructions = EXCLUDED.instructions,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- Store settings
-- ---------------------------------------------------------------------------
INSERT INTO public.store_settings (key, value, description)
VALUES
  ('store_name', '"Charlotte eFoil"'::jsonb, 'Public storefront name'),
  ('store_email', '"hello@CharlotteEfoil.com"'::jsonb, 'Customer-facing email'),
  ('store_phone', '"704-421-8778"'::jsonb, 'Customer-facing phone'),
  ('currency', '"USD"'::jsonb, 'Default currency code'),
  ('tax_rate_bps', '700'::jsonb, 'North Carolina sales tax in basis points (7.00%)'),
  ('dealer_disclaimer', '"All Waydoo eFoil orders are reviewed by Charlotte eFoil before invoicing. Pricing may adjust based on configuration and freight."'::jsonb, 'Checkout disclaimer')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;

COMMIT;
