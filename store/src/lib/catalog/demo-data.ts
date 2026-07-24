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

import productMediaManifest from "./product-media-manifest.json";

const TS = "2024-01-01T00:00:00.000Z";

type ImportedMediaEntry = {
  mediaType: "image" | "video";
  url: string;
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
};

type ImportedProductMedia = {
  slug: string;
  title: string;
  hero: string | null;
  card?: string | null;
  gallery: string[];
  media?: ImportedMediaEntry[];
};

const IMPORTED_MEDIA_BY_SLUG = new Map<string, ImportedProductMedia>(
  Object.entries(
    (productMediaManifest.products ?? {}) as Record<string, ImportedProductMedia>,
  ),
);

function getImportedHeroUrl(slug: string, fallback: string | null): string | null {
  return IMPORTED_MEDIA_BY_SLUG.get(slug)?.hero ?? fallback;
}

function getImportedCardUrl(slug: string, fallback: string | null): string | null {
  const imported = IMPORTED_MEDIA_BY_SLUG.get(slug);
  return imported?.card ?? imported?.hero ?? fallback;
}

function buildImportedMedia(seed: ProductSeed): ProductMedia[] {
  const imported = IMPORTED_MEDIA_BY_SLUG.get(seed.slug);
  if (!imported?.media?.length) return [];

  return imported.media.map((entry, index) => ({
    id: `d1000000-0000-4000-8000-${seed.id.slice(-12)}${String(index + 1).padStart(2, "0")}`,
    productId: seed.id,
    mediaType: entry.mediaType,
    url: entry.url,
    altText: entry.altText ?? seed.name,
    sortOrder: entry.sortOrder ?? index + 1,
    isPrimary: Boolean(entry.isPrimary),
  }));
}

const IMAGES = {
  maxPlus: "/photos/waydoo-evo-max-plus.webp",
  proPlus: "/photos/waydoo-evo-pro-plus.webp",
  lite: "/photos/waydoo-evo-lite.png",
  battery: "/photos/waydoo-powerflight-battery.webp",
  mast: "/photos/waydoo-carbon-mast.webp",
  frontWing: "/photos/waydoo-front-wing.webp",
  propulsion: "/photos/waydoo-propulsion-unit.webp",
  controller: "/photos/waydoo-hand-controller.webp",
  impactVest: "/photos/efoil-impact-vest.webp",
} as const;

export interface GetDemoProductsOptions {
  categorySlug?: string;
  productType?: ProductType;
  limit?: number;
}

type ProductSeed = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  productType: ProductType;
  basePriceCents: number;
  compareAtPriceCents: number | null;
  isConfigurable: boolean;
  metadata: Record<string, unknown>;
  imageUrl: string | null;
  categoryId: string;
  variantId: string;
  variantSku: string;
  specs?: Record<string, string | number | boolean | string[]>;
  features?: string[];
  whatsIncluded?: string[];
  faqs?: Product["faqs"];
  inventoryQty?: number;
};

type PackageExtras = Pick<
  Product,
  "specs" | "features" | "whatsIncluded" | "faqs"
>;

function category(
  id: string,
  slug: string,
  name: string,
  description: string,
  sortOrder: number,
): Category {
  return {
    id,
    slug,
    name,
    description,
    parentId: null,
    sortOrder,
    isActive: true,
    createdAt: TS,
    updatedAt: TS,
  };
}

const DEMO_CATEGORIES: Category[] = [
  category(
    "c1000000-0000-4000-8000-000000000001",
    "complete-packages",
    "Complete Packages",
    "Fully configured Waydoo Flyer EVO packages ready to ride.",
    10,
  ),
  category(
    "c1000000-0000-4000-8000-000000000002",
    "boards",
    "Boards",
    "Flyer EVO board decks for every rider profile.",
    20,
  ),
  category(
    "c1000000-0000-4000-8000-000000000003",
    "batteries",
    "Batteries & Power",
    "PowerFlight smart batteries and power modules.",
    30,
  ),
  category(
    "c1000000-0000-4000-8000-000000000004",
    "chargers",
    "Chargers",
    "Fast chargers and charging accessories for PowerFlight batteries.",
    40,
  ),
  category(
    "c1000000-0000-4000-8000-000000000005",
    "masts",
    "Masts",
    "Carbon fiber masts in multiple lengths.",
    50,
  ),
  category(
    "c1000000-0000-4000-8000-000000000006",
    "front-wings",
    "Front Wings",
    "Front wing foils for lift, stability, and progression.",
    60,
  ),
  category(
    "c1000000-0000-4000-8000-000000000007",
    "rear-wings",
    "Rear Wings",
    "Stabilizer rear wings for pitch control.",
    70,
  ),
  category(
    "c1000000-0000-4000-8000-000000000008",
    "propulsion",
    "Propulsion Units",
    "Waydoo propulsion modules and motor assemblies.",
    80,
  ),
  category(
    "c1000000-0000-4000-8000-000000000009",
    "controllers",
    "Controllers",
    "Hand controllers and wireless remotes.",
    90,
  ),
  category(
    "c1000000-0000-4000-8000-000000000010",
    "bags",
    "Bags & Transport",
    "Board bags, battery bags, and travel kits.",
    100,
  ),
  category(
    "c1000000-0000-4000-8000-000000000011",
    "covers",
    "Covers & Protection",
    "Board covers, wing covers, and protective sleeves.",
    110,
  ),
  category(
    "c1000000-0000-4000-8000-000000000012",
    "safety",
    "Safety Equipment",
    "Impact vests, helmets, leashes, and safety kits.",
    120,
  ),
  category(
    "c1000000-0000-4000-8000-000000000013",
    "parts",
    "Parts",
    "Replacement hardware, seals, and service parts.",
    130,
  ),
  category(
    "c1000000-0000-4000-8000-000000000014",
    "accessories",
    "Accessories",
    "Fins, adapters, tools, and ride accessories.",
    140,
  ),
];

const CATEGORY_BY_ID = new Map(DEMO_CATEGORIES.map((item) => [item.id, item]));
const CATEGORY_BY_SLUG = new Map(DEMO_CATEGORIES.map((item) => [item.slug, item]));

function inventoryQtyForType(productType: ProductType): number {
  if (["package", "board", "battery", "propulsion"].includes(productType)) {
    return 6;
  }
  if (["mast", "front_wing", "rear_wing"].includes(productType)) {
    return 12;
  }
  return 20;
}

function optionValue(
  id: string,
  optionGroupId: string,
  slug: string,
  label: string,
  priceDeltaCents: number,
  isDefault: boolean,
  sortOrder: number,
  linkedProductId: string | null = null,
  imageUrl: string | null = null,
): ProductOptionValue {
  return {
    id,
    optionGroupId,
    slug,
    label,
    description: null,
    priceDeltaCents,
    imageUrl,
    isDefault,
    sortOrder,
    metadata: linkedProductId ? { linkedProductId } : {},
  };
}

function optionGroup(
  id: string,
  productId: string,
  slug: string,
  name: string,
  description: string,
  sortOrder: number,
  values: ProductOptionValue[],
): ProductOptionGroup {
  return {
    id,
    productId,
    slug,
    name,
    description,
    isRequired: true,
    minSelections: 1,
    maxSelections: 1,
    sortOrder,
    values,
  };
}

type PackageOptionGroupConfig = {
  productId: string;
  groupPrefix: string;
  boardValues: ProductOptionValue[];
  batteryValues: ProductOptionValue[];
  mastValues: ProductOptionValue[];
  frontWingValues: ProductOptionValue[];
  rearWingValues: ProductOptionValue[];
  chargerValues: ProductOptionValue[];
  colorValues: ProductOptionValue[];
};

function buildPackageOptionGroups(config: PackageOptionGroupConfig): ProductOptionGroup[] {
  const { productId, groupPrefix } = config;
  const gid = (suffix: string) => `e1000000-0000-4000-8000-${groupPrefix}${suffix}`;

  return [
    optionGroup(
      gid("01"),
      productId,
      "board-model",
      "Board Model",
      "Select the Flyer EVO board deck.",
      10,
      config.boardValues,
    ),
    optionGroup(
      gid("02"),
      productId,
      "battery",
      "Battery",
      "PowerFlight battery capacity.",
      20,
      config.batteryValues,
    ),
    optionGroup(
      gid("03"),
      productId,
      "mast-length",
      "Mast Length",
      "Carbon mast length for your riding conditions.",
      30,
      config.mastValues,
    ),
    optionGroup(
      gid("04"),
      productId,
      "front-wing",
      "Front Wing",
      "Front foil wing sizing.",
      40,
      config.frontWingValues,
    ),
    optionGroup(
      gid("05"),
      productId,
      "rear-wing",
      "Rear Wing",
      "Stabilizer wing pairing.",
      50,
      config.rearWingValues,
    ),
    optionGroup(
      gid("06"),
      productId,
      "charger",
      "Charger",
      "Charging solution included with package.",
      60,
      config.chargerValues,
    ),
    optionGroup(
      gid("07"),
      productId,
      "color",
      "Board Color",
      "Deck color finish.",
      70,
      config.colorValues,
    ),
  ];
}

const SHARED_BATTERY_OPTIONS = {
  maxPlus: [
    optionValue(
      "f1000000-0000-4000-8000-000000000102",
      "e1000000-0000-4000-8000-000000000102",
      "battery-28ah",
      "PowerFlight 28Ah",
      0,
      true,
      1,
      "a1000000-0000-4000-8000-000000000020",
      IMAGES.battery,
    ),
    optionValue(
      "f1000000-0000-4000-8000-000000000103",
      "e1000000-0000-4000-8000-000000000102",
      "battery-22ah",
      "PowerFlight 22Ah",
      -50000,
      false,
      2,
      "a1000000-0000-4000-8000-000000000021",
      IMAGES.battery,
    ),
  ],
  proPlus: [
    optionValue(
      "f1000000-0000-4000-8000-000000000202",
      "e1000000-0000-4000-8000-000000000202",
      "battery-22ah",
      "PowerFlight 22Ah",
      0,
      true,
      1,
      "a1000000-0000-4000-8000-000000000021",
      IMAGES.battery,
    ),
    optionValue(
      "f1000000-0000-4000-8000-000000000203",
      "e1000000-0000-4000-8000-000000000202",
      "battery-28ah",
      "PowerFlight 28Ah",
      50000,
      false,
      2,
      "a1000000-0000-4000-8000-000000000020",
      IMAGES.battery,
    ),
  ],
  lite: [
    optionValue(
      "f1000000-0000-4000-8000-000000000302",
      "e1000000-0000-4000-8000-000000000302",
      "battery-22ah",
      "PowerFlight 22Ah",
      0,
      true,
      1,
      "a1000000-0000-4000-8000-000000000021",
      IMAGES.battery,
    ),
  ],
};

const SHARED_MAST_OPTIONS = {
  maxPro: (groupPrefix: "0000000001" | "0000000002", valuePrefix: "0000000001" | "0000000002") => [
    optionValue(
      `f1000000-0000-4000-8000-${valuePrefix}04`,
      `e1000000-0000-4000-8000-${groupPrefix}03`,
      "mast-75cm",
      "75 cm Carbon Mast",
      0,
      true,
      1,
      "a1000000-0000-4000-8000-000000000041",
      IMAGES.mast,
    ),
    optionValue(
      `f1000000-0000-4000-8000-${valuePrefix}05`,
      `e1000000-0000-4000-8000-${groupPrefix}03`,
      "mast-60cm",
      "60 cm Carbon Mast",
      -5000,
      false,
      2,
      "a1000000-0000-4000-8000-000000000040",
      IMAGES.mast,
    ),
    optionValue(
      `f1000000-0000-4000-8000-${valuePrefix}06`,
      `e1000000-0000-4000-8000-${groupPrefix}03`,
      "mast-90cm",
      "90 cm Carbon Mast",
      5000,
      false,
      3,
      "a1000000-0000-4000-8000-000000000042",
      IMAGES.mast,
    ),
  ],
  lite: [
    optionValue(
      "f1000000-0000-4000-8000-000000000303",
      "e1000000-0000-4000-8000-000000000303",
      "mast-60cm",
      "60 cm Carbon Mast",
      0,
      true,
      1,
      "a1000000-0000-4000-8000-000000000040",
      IMAGES.mast,
    ),
    optionValue(
      "f1000000-0000-4000-8000-000000000304",
      "e1000000-0000-4000-8000-000000000303",
      "mast-75cm",
      "75 cm Carbon Mast",
      5000,
      false,
      2,
      "a1000000-0000-4000-8000-000000000041",
      IMAGES.mast,
    ),
  ],
};

const SHARED_CHARGER_OPTIONS = {
  maxPro: (groupPrefix: "0000000001" | "0000000002", valuePrefix: "0000000001" | "0000000002") => [
    optionValue(
      `f1000000-0000-4000-8000-${valuePrefix}10`,
      `e1000000-0000-4000-8000-${groupPrefix}06`,
      "charger-fast",
      "Fast Charger (2 hr)",
      0,
      true,
      1,
      "a1000000-0000-4000-8000-000000000030",
      IMAGES.battery,
    ),
    optionValue(
      `f1000000-0000-4000-8000-${valuePrefix}11`,
      `e1000000-0000-4000-8000-${groupPrefix}06`,
      "charger-standard",
      "Standard Charger (4 hr)",
      -20000,
      false,
      2,
      "a1000000-0000-4000-8000-000000000031",
      IMAGES.battery,
    ),
  ],
  lite: [
    optionValue(
      "f1000000-0000-4000-8000-000000000307",
      "e1000000-0000-4000-8000-000000000306",
      "charger-standard",
      "Standard Charger (4 hr)",
      0,
      true,
      1,
      "a1000000-0000-4000-8000-000000000031",
      IMAGES.battery,
    ),
  ],
};

const MAX_PLUS_OPTION_GROUPS = buildPackageOptionGroups({
  productId: "a1000000-0000-4000-8000-000000000001",
  groupPrefix: "0000000001",
  boardValues: [
    optionValue(
      "f1000000-0000-4000-8000-000000000101",
      "e1000000-0000-4000-8000-000000000101",
      "max-plus-130l",
      "Flyer EVO Max Plus (130L)",
      0,
      true,
      1,
      "a1000000-0000-4000-8000-000000000010",
      IMAGES.maxPlus,
    ),
  ],
  batteryValues: SHARED_BATTERY_OPTIONS.maxPlus,
  mastValues: SHARED_MAST_OPTIONS.maxPro("0000000001", "0000000001"),
  frontWingValues: [
    optionValue(
      "f1000000-0000-4000-8000-000000000107",
      "e1000000-0000-4000-8000-000000000104",
      "front-wing-1300",
      "Front Wing 1300",
      0,
      true,
      1,
      "a1000000-0000-4000-8000-000000000050",
      IMAGES.frontWing,
    ),
    optionValue(
      "f1000000-0000-4000-8000-000000000108",
      "e1000000-0000-4000-8000-000000000104",
      "front-wing-1100",
      "Front Wing 1100",
      0,
      false,
      2,
      "a1000000-0000-4000-8000-000000000051",
      IMAGES.frontWing,
    ),
  ],
  rearWingValues: [
    optionValue(
      "f1000000-0000-4000-8000-000000000109",
      "e1000000-0000-4000-8000-000000000105",
      "rear-wing-320",
      "Rear Wing 320",
      0,
      true,
      1,
      "a1000000-0000-4000-8000-000000000060",
      IMAGES.frontWing,
    ),
  ],
  chargerValues: SHARED_CHARGER_OPTIONS.maxPro("0000000001", "0000000001"),
  colorValues: [
    optionValue(
      "f1000000-0000-4000-8000-000000000112",
      "e1000000-0000-4000-8000-000000000107",
      "color-white",
      "Arctic White",
      0,
      true,
      1,
    ),
    optionValue(
      "f1000000-0000-4000-8000-000000000113",
      "e1000000-0000-4000-8000-000000000107",
      "color-blue",
      "Lake Blue",
      0,
      false,
      2,
    ),
    optionValue(
      "f1000000-0000-4000-8000-000000000114",
      "e1000000-0000-4000-8000-000000000107",
      "color-black",
      "Carbon Black",
      0,
      false,
      3,
    ),
  ],
});

const PRO_PLUS_OPTION_GROUPS = buildPackageOptionGroups({
  productId: "a1000000-0000-4000-8000-000000000002",
  groupPrefix: "0000000002",
  boardValues: [
    optionValue(
      "f1000000-0000-4000-8000-000000000201",
      "e1000000-0000-4000-8000-000000000201",
      "pro-plus-90l",
      "Flyer EVO Pro Plus (90L)",
      0,
      true,
      1,
      "a1000000-0000-4000-8000-000000000011",
      IMAGES.proPlus,
    ),
  ],
  batteryValues: SHARED_BATTERY_OPTIONS.proPlus,
  mastValues: SHARED_MAST_OPTIONS.maxPro("0000000002", "0000000002"),
  frontWingValues: [
    optionValue(
      "f1000000-0000-4000-8000-000000000207",
      "e1000000-0000-4000-8000-000000000204",
      "front-wing-1100",
      "Front Wing 1100",
      0,
      true,
      1,
      "a1000000-0000-4000-8000-000000000051",
      IMAGES.frontWing,
    ),
    optionValue(
      "f1000000-0000-4000-8000-000000000208",
      "e1000000-0000-4000-8000-000000000204",
      "front-wing-900",
      "Front Wing 900",
      5000,
      false,
      2,
      "a1000000-0000-4000-8000-000000000052",
      IMAGES.frontWing,
    ),
  ],
  rearWingValues: [
    optionValue(
      "f1000000-0000-4000-8000-000000000209",
      "e1000000-0000-4000-8000-000000000205",
      "rear-wing-280",
      "Rear Wing 280",
      0,
      true,
      1,
      "a1000000-0000-4000-8000-000000000061",
      IMAGES.frontWing,
    ),
  ],
  chargerValues: SHARED_CHARGER_OPTIONS.maxPro("0000000002", "0000000002"),
  colorValues: [
    optionValue(
      "f1000000-0000-4000-8000-000000000212",
      "e1000000-0000-4000-8000-000000000207",
      "color-white",
      "Arctic White",
      0,
      true,
      1,
    ),
    optionValue(
      "f1000000-0000-4000-8000-000000000213",
      "e1000000-0000-4000-8000-000000000207",
      "color-orange",
      "Sunset Orange",
      0,
      false,
      2,
    ),
  ],
});

const LITE_OPTION_GROUPS = buildPackageOptionGroups({
  productId: "a1000000-0000-4000-8000-000000000003",
  groupPrefix: "0000000003",
  boardValues: [
    optionValue(
      "f1000000-0000-4000-8000-000000000301",
      "e1000000-0000-4000-8000-000000000301",
      "lite-90l",
      "Flyer EVO Lite (90L)",
      0,
      true,
      1,
      "a1000000-0000-4000-8000-000000000012",
      IMAGES.lite,
    ),
  ],
  batteryValues: SHARED_BATTERY_OPTIONS.lite,
  mastValues: SHARED_MAST_OPTIONS.lite,
  frontWingValues: [
    optionValue(
      "f1000000-0000-4000-8000-000000000305",
      "e1000000-0000-4000-8000-000000000304",
      "front-wing-1100",
      "Front Wing 1100",
      0,
      true,
      1,
      "a1000000-0000-4000-8000-000000000051",
      IMAGES.frontWing,
    ),
  ],
  rearWingValues: [
    optionValue(
      "f1000000-0000-4000-8000-000000000306",
      "e1000000-0000-4000-8000-000000000305",
      "rear-wing-320",
      "Rear Wing 320",
      0,
      true,
      1,
      "a1000000-0000-4000-8000-000000000060",
      IMAGES.frontWing,
    ),
  ],
  chargerValues: SHARED_CHARGER_OPTIONS.lite,
  colorValues: [
    optionValue(
      "f1000000-0000-4000-8000-000000000308",
      "e1000000-0000-4000-8000-000000000307",
      "color-white",
      "Arctic White",
      0,
      true,
      1,
    ),
    optionValue(
      "f1000000-0000-4000-8000-000000000309",
      "e1000000-0000-4000-8000-000000000307",
      "color-blue",
      "Lake Blue",
      0,
      false,
      2,
    ),
  ],
});

const PACKAGE_EXTRAS: Record<string, PackageExtras> = {
  "flyer-evo-max-plus-package": {
    specs: {
      boardVolumeL: 130,
      propulsionW: 6000,
      rideTimeMin: 135,
      topSpeedMph: 28,
      batteryCapacityAh: 28,
      mastLengthCm: 75,
      frontWingAreaCm2: 1300,
    },
    features: [
      "Smart Flight Assistance for stable first flights",
      "6000W propulsion with up to 135 minutes ride time",
      "130L high-buoyancy deck for beginners and family riders",
      "Modular wing and mast options for lake conditions",
      "Charlotte eFoil dealer setup and safety briefing included",
    ],
    whatsIncluded: [
      "Flyer EVO Max Plus board (130L)",
      "PowerFlight smart battery",
      "Carbon fiber mast",
      "Front and rear wing set",
      "6000W propulsion unit",
      "Wireless hand controller",
      "Selected charger",
      "Assembly hardware and quick-start guide",
    ],
    faqs: [
      {
        question: "Is dealer review required for this package?",
        answer:
          "Yes. Charlotte eFoil reviews every Max Plus configuration before sending an invoice. Final pricing reflects your selected battery, mast, and wing options.",
      },
      {
        question: "Which mast length should I choose?",
        answer:
          "60 cm works best in shallow lakes and learning zones. 75 cm is the default all-around choice. 90 cm adds leverage for open water but pairs best with the Front Wing 1300.",
      },
      {
        question: "How long does shipping take?",
        answer:
          "Most configured packages ship from Charlotte within 5–10 business days after order approval and payment confirmation.",
      },
    ],
  },
  "flyer-evo-pro-plus-package": {
    specs: {
      boardVolumeL: 90,
      propulsionW: 6000,
      topSpeedMph: 32,
      batteryCapacityAh: 22,
      mastLengthCm: 75,
      frontWingAreaCm2: 1100,
    },
    features: [
      "Balanced 90L platform for all skill levels",
      "6000W propulsion with responsive throttle mapping",
      "Performance Front Wing 900 option for sport setups",
      "Smart Flight Assistance with progression modes",
      "Configurable colors and charging options",
    ],
    whatsIncluded: [
      "Flyer EVO Pro Plus board (90L)",
      "PowerFlight smart battery",
      "Carbon fiber mast",
      "Front and rear wing set",
      "6000W propulsion unit",
      "Wireless hand controller",
      "Selected charger",
      "Assembly hardware and quick-start guide",
    ],
    faqs: [
      {
        question: "Can I upgrade to the 28Ah battery?",
        answer:
          "Yes. Selecting the 28Ah battery adds extended range for longer lake sessions. Charlotte eFoil will confirm weight and balance before invoicing.",
      },
      {
        question: "What wing setup is best for carving?",
        answer:
          "Choose Front Wing 900 with Rear Wing 280 for a sport-oriented setup. The configurator enforces this pairing automatically.",
      },
      {
        question: "Does the package include a travel bag?",
        answer:
          "A board travel bag is not included by default but is available as a recommended add-on during checkout.",
      },
    ],
  },
  "flyer-evo-lite-package": {
    specs: {
      boardVolumeL: 90,
      propulsionW: 4000,
      batteryCapacityAh: 22,
      mastLengthCm: 60,
      frontWingAreaCm2: 1100,
      weightClass: "lightweight",
    },
    features: [
      "Lightweight 90L deck for agile progression",
      "4000W propulsion tuned for efficiency",
      "Shorter 60 cm mast default for shallow water learning",
      "Accessible wing sizing for new riders",
      "Lower package price with full Smart Flight Assistance",
    ],
    whatsIncluded: [
      "Flyer EVO Lite board (90L)",
      "PowerFlight 22Ah battery",
      "60 cm carbon mast",
      "Front Wing 1100 and Rear Wing 320",
      "4000W propulsion unit",
      "Wireless hand controller",
      "Standard charger",
      "Assembly hardware and quick-start guide",
    ],
    faqs: [
      {
        question: "Why is the 75 cm mast excluded?",
        answer:
          "The Lite package is tuned for progression riders. To keep weight down, the configurator excludes the 75 cm mast option on Lite builds.",
      },
      {
        question: "Can Lite riders upgrade propulsion later?",
        answer:
          "Yes. The 6000W propulsion unit is sold separately and can be installed by Charlotte eFoil service technicians.",
      },
      {
        question: "Is this package good for teenagers?",
        answer:
          "Yes. The Lite package is popular for lighter riders and families building confidence before moving to Pro Plus or Max Plus platforms.",
      },
    ],
  },
};

const COMPATIBILITY_RULES: CompatibilityRule[] = [
  {
    id: "71100000-0000-4000-8000-000000000001",
    productId: "a1000000-0000-4000-8000-000000000001",
    sourceOptionValueId: "f1000000-0000-4000-8000-000000000101",
    targetOptionGroupId: "e1000000-0000-4000-8000-000000000104",
    allowedOptionValueIds: [
      "f1000000-0000-4000-8000-000000000107",
      "f1000000-0000-4000-8000-000000000108",
    ],
    ruleType: "allows",
  },
  {
    id: "71100000-0000-4000-8000-000000000002",
    productId: "a1000000-0000-4000-8000-000000000002",
    sourceOptionValueId: "f1000000-0000-4000-8000-000000000208",
    targetOptionGroupId: "e1000000-0000-4000-8000-000000000205",
    allowedOptionValueIds: ["f1000000-0000-4000-8000-000000000209"],
    ruleType: "requires",
  },
  {
    id: "71100000-0000-4000-8000-000000000003",
    productId: "a1000000-0000-4000-8000-000000000003",
    sourceOptionValueId: "f1000000-0000-4000-8000-000000000301",
    targetOptionGroupId: "e1000000-0000-4000-8000-000000000303",
    allowedOptionValueIds: ["f1000000-0000-4000-8000-000000000304"],
    ruleType: "excludes",
  },
  {
    id: "71100000-0000-4000-8000-000000000004",
    productId: "a1000000-0000-4000-8000-000000000001",
    sourceOptionValueId: "f1000000-0000-4000-8000-000000000106",
    targetOptionGroupId: "e1000000-0000-4000-8000-000000000104",
    allowedOptionValueIds: ["f1000000-0000-4000-8000-000000000107"],
    ruleType: "requires",
  },
];

const PRODUCT_SEEDS: ProductSeed[] = [
  {
    id: "a1000000-0000-4000-8000-000000000001",
    slug: "flyer-evo-max-plus-package",
    name: "Flyer EVO Max Plus Complete Package",
    shortDescription:
      "130L stability-focused package with Smart Flight Assistance for first flights and family riders.",
    description:
      "The Max Plus package pairs the 130L Flyer EVO board with 6000W propulsion, PowerFlight battery, and tuned wing set for smooth takeoffs and up to 135 minutes of ride time.",
    productType: "package",
    basePriceCents: 899900,
    compareAtPriceCents: 949900,
    isConfigurable: true,
    metadata: { board_volume_l: 130, propulsion_w: 6000, ride_time_min: 135 },
    imageUrl: IMAGES.maxPlus,
    categoryId: "c1000000-0000-4000-8000-000000000001",
    variantId: "b1000000-0000-4000-8000-000000000001",
    variantSku: "PKG-EVO-MAX-PLUS-DEFAULT",
  },
  {
    id: "a1000000-0000-4000-8000-000000000002",
    slug: "flyer-evo-pro-plus-package",
    name: "Flyer EVO Pro Plus Complete Package",
    shortDescription:
      "Balanced 90L package for all skill levels with responsive handling and Smart Flight Assistance.",
    description:
      "The Pro Plus package delivers the versatile 90L board platform, 6000W propulsion, and modular wing options for progression up to 32 mph.",
    productType: "package",
    basePriceCents: 799900,
    compareAtPriceCents: 849900,
    isConfigurable: true,
    metadata: { board_volume_l: 90, propulsion_w: 6000, top_speed_mph: 32 },
    imageUrl: IMAGES.proPlus,
    categoryId: "c1000000-0000-4000-8000-000000000001",
    variantId: "b1000000-0000-4000-8000-000000000002",
    variantSku: "PKG-EVO-PRO-PLUS-DEFAULT",
  },
  {
    id: "a1000000-0000-4000-8000-000000000003",
    slug: "flyer-evo-lite-package",
    name: "Flyer EVO Lite Complete Package",
    shortDescription: "Lightweight 90L package with 4000W propulsion for agile progression.",
    description:
      "The Lite package is tuned for riders building confidence with a nimble board, efficient propulsion, and accessible wing sizing.",
    productType: "package",
    basePriceCents: 649900,
    compareAtPriceCents: 699900,
    isConfigurable: true,
    metadata: { board_volume_l: 90, propulsion_w: 4000 },
    imageUrl: IMAGES.lite,
    categoryId: "c1000000-0000-4000-8000-000000000001",
    variantId: "b1000000-0000-4000-8000-000000000003",
    variantSku: "PKG-EVO-LITE-DEFAULT",
  },
  {
    id: "a1000000-0000-4000-8000-000000000010",
    slug: "flyer-evo-max-plus-board",
    name: "Flyer EVO Max Plus Board (130L)",
    shortDescription: "High-buoyancy 130L deck for beginners and family riders.",
    description: "Stable platform with Smart Flight Assistance integration points.",
    productType: "board",
    basePriceCents: 329900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: { volume_l: 130 },
    imageUrl: IMAGES.maxPlus,
    categoryId: "c1000000-0000-4000-8000-000000000002",
    variantId: "b1000000-0000-4000-8000-000000000010",
    variantSku: "BRD-EVO-MAX-130",
  },
  {
    id: "a1000000-0000-4000-8000-000000000011",
    slug: "flyer-evo-pro-plus-board",
    name: "Flyer EVO Pro Plus Board (90L)",
    shortDescription: "Responsive 90L deck for all skill levels.",
    description: "Balanced volume and outline for progression and performance.",
    productType: "board",
    basePriceCents: 289900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: { volume_l: 90 },
    imageUrl: IMAGES.proPlus,
    categoryId: "c1000000-0000-4000-8000-000000000002",
    variantId: "b1000000-0000-4000-8000-000000000011",
    variantSku: "BRD-EVO-PRO-90",
  },
  {
    id: "a1000000-0000-4000-8000-000000000012",
    slug: "flyer-evo-lite-board",
    name: "Flyer EVO Lite Board (90L)",
    shortDescription: "Lightweight agile 90L deck.",
    description: "Reduced weight for nimble handling and skill building.",
    productType: "board",
    basePriceCents: 249900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: { volume_l: 90 },
    imageUrl: IMAGES.lite,
    categoryId: "c1000000-0000-4000-8000-000000000002",
    variantId: "b1000000-0000-4000-8000-000000000012",
    variantSku: "BRD-EVO-LITE-90",
  },
  {
    id: "a1000000-0000-4000-8000-000000000020",
    slug: "powerflight-battery-28ah",
    name: "PowerFlight Smart Battery 28Ah",
    shortDescription: "Extended range PowerFlight pack.",
    description: "Smart BMS, hot-swap ready, up to 135 min ride time on Max Plus setups.",
    productType: "battery",
    basePriceCents: 249900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: { capacity_ah: 28 },
    imageUrl: IMAGES.battery,
    categoryId: "c1000000-0000-4000-8000-000000000003",
    variantId: "b1000000-0000-4000-8000-000000000020",
    variantSku: "BAT-PF-28AH",
  },
  {
    id: "a1000000-0000-4000-8000-000000000021",
    slug: "powerflight-battery-22ah",
    name: "PowerFlight Smart Battery 22Ah",
    shortDescription: "Standard range PowerFlight pack.",
    description: "Balanced weight and runtime for Pro Plus and Lite builds.",
    productType: "battery",
    basePriceCents: 199900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: { capacity_ah: 22 },
    imageUrl: IMAGES.battery,
    categoryId: "c1000000-0000-4000-8000-000000000003",
    variantId: "b1000000-0000-4000-8000-000000000021",
    variantSku: "BAT-PF-22AH",
  },
  {
    id: "a1000000-0000-4000-8000-000000000030",
    slug: "powerflight-fast-charger",
    name: "PowerFlight Fast Charger",
    shortDescription: "2-hour fast charge for PowerFlight batteries.",
    description: "Dealer-grade charger with thermal monitoring.",
    productType: "charger",
    basePriceCents: 49900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: { charge_time_hours: 2 },
    imageUrl: IMAGES.battery,
    categoryId: "c1000000-0000-4000-8000-000000000004",
    variantId: "b1000000-0000-4000-8000-000000000030",
    variantSku: "CHG-PF-FAST",
  },
  {
    id: "a1000000-0000-4000-8000-000000000031",
    slug: "powerflight-standard-charger",
    name: "PowerFlight Standard Charger",
    shortDescription: "Standard overnight charger.",
    description: "Reliable charging for home and dockside use.",
    productType: "charger",
    basePriceCents: 29900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: { charge_time_hours: 4 },
    imageUrl: IMAGES.battery,
    categoryId: "c1000000-0000-4000-8000-000000000004",
    variantId: "b1000000-0000-4000-8000-000000000031",
    variantSku: "CHG-PF-STD",
  },
  {
    id: "a1000000-0000-4000-8000-000000000040",
    slug: "carbon-mast-60cm",
    name: "Carbon Mast 60 cm",
    shortDescription: "Short mast for shallow water and learning.",
    description: "Ultra-rigid carbon construction.",
    productType: "mast",
    basePriceCents: 89900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: { length_cm: 60 },
    imageUrl: IMAGES.mast,
    categoryId: "c1000000-0000-4000-8000-000000000005",
    variantId: "b1000000-0000-4000-8000-000000000040",
    variantSku: "MST-CF-60",
  },
  {
    id: "a1000000-0000-4000-8000-000000000041",
    slug: "carbon-mast-75cm",
    name: "Carbon Mast 75 cm",
    shortDescription: "Mid-length mast for versatile conditions.",
    description: "Precise input translation with reduced flex.",
    productType: "mast",
    basePriceCents: 94900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: { length_cm: 75 },
    imageUrl: IMAGES.mast,
    categoryId: "c1000000-0000-4000-8000-000000000005",
    variantId: "b1000000-0000-4000-8000-000000000041",
    variantSku: "MST-CF-75",
  },
  {
    id: "a1000000-0000-4000-8000-000000000042",
    slug: "carbon-mast-90cm",
    name: "Carbon Mast 90 cm",
    shortDescription: "Long mast for open water performance.",
    description: "Maximum leverage for advanced riding.",
    productType: "mast",
    basePriceCents: 99900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: { length_cm: 90 },
    imageUrl: IMAGES.mast,
    categoryId: "c1000000-0000-4000-8000-000000000005",
    variantId: "b1000000-0000-4000-8000-000000000042",
    variantSku: "MST-CF-90",
  },
  {
    id: "a1000000-0000-4000-8000-000000000050",
    slug: "front-wing-1300",
    name: "Front Wing 1300",
    shortDescription: "High-lift wing for early takeoff.",
    description: "Ideal for beginners and heavier riders.",
    productType: "front_wing",
    basePriceCents: 69900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: { area_cm2: 1300 },
    imageUrl: IMAGES.frontWing,
    categoryId: "c1000000-0000-4000-8000-000000000006",
    variantId: "b1000000-0000-4000-8000-000000000050",
    variantSku: "FW-1300",
  },
  {
    id: "a1000000-0000-4000-8000-000000000051",
    slug: "front-wing-1100",
    name: "Front Wing 1100",
    shortDescription: "Balanced all-around front wing.",
    description: "Smooth progression from first flights to carving.",
    productType: "front_wing",
    basePriceCents: 64900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: { area_cm2: 1100 },
    imageUrl: IMAGES.frontWing,
    categoryId: "c1000000-0000-4000-8000-000000000006",
    variantId: "b1000000-0000-4000-8000-000000000051",
    variantSku: "FW-1100",
  },
  {
    id: "a1000000-0000-4000-8000-000000000052",
    slug: "front-wing-900",
    name: "Front Wing 900",
    shortDescription: "Performance front wing for agile riding.",
    description: "Lower drag profile for experienced riders.",
    productType: "front_wing",
    basePriceCents: 69900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: { area_cm2: 900 },
    imageUrl: IMAGES.frontWing,
    categoryId: "c1000000-0000-4000-8000-000000000006",
    variantId: "b1000000-0000-4000-8000-000000000052",
    variantSku: "FW-900",
  },
  {
    id: "a1000000-0000-4000-8000-000000000060",
    slug: "rear-wing-320",
    name: "Rear Wing 320",
    shortDescription: "Stable rear stabilizer.",
    description: "Pairs with 1300 and 1100 front wings.",
    productType: "rear_wing",
    basePriceCents: 24900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: { area_cm2: 320 },
    imageUrl: IMAGES.frontWing,
    categoryId: "c1000000-0000-4000-8000-000000000007",
    variantId: "b1000000-0000-4000-8000-000000000060",
    variantSku: "RW-320",
  },
  {
    id: "a1000000-0000-4000-8000-000000000061",
    slug: "rear-wing-280",
    name: "Rear Wing 280",
    shortDescription: "Performance rear stabilizer.",
    description: "Tighter pitch control for sport setups.",
    productType: "rear_wing",
    basePriceCents: 24900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: { area_cm2: 280 },
    imageUrl: IMAGES.frontWing,
    categoryId: "c1000000-0000-4000-8000-000000000007",
    variantId: "b1000000-0000-4000-8000-000000000061",
    variantSku: "RW-280",
  },
  {
    id: "a1000000-0000-4000-8000-000000000070",
    slug: "propulsion-6000w",
    name: "6000W Propulsion Unit",
    shortDescription: "High-output motor module.",
    description: "Required for Max Plus and Pro Plus packages.",
    productType: "propulsion",
    basePriceCents: 189900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: { power_w: 6000 },
    imageUrl: IMAGES.propulsion,
    categoryId: "c1000000-0000-4000-8000-000000000008",
    variantId: "b1000000-0000-4000-8000-000000000070",
    variantSku: "PROP-6000W",
  },
  {
    id: "a1000000-0000-4000-8000-000000000071",
    slug: "propulsion-4000w",
    name: "4000W Propulsion Unit",
    shortDescription: "Efficient motor module for Lite builds.",
    description: "Optimized for lightweight progression setups.",
    productType: "propulsion",
    basePriceCents: 149900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: { power_w: 4000 },
    imageUrl: IMAGES.propulsion,
    categoryId: "c1000000-0000-4000-8000-000000000008",
    variantId: "b1000000-0000-4000-8000-000000000071",
    variantSku: "PROP-4000W",
  },
  {
    id: "a1000000-0000-4000-8000-000000000080",
    slug: "wireless-hand-controller",
    name: "Wireless Hand Controller",
    shortDescription: "Ergonomic throttle and mode control.",
    description: "Bluetooth paired with Smart Flight Assistance.",
    productType: "controller",
    basePriceCents: 39900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: {},
    imageUrl: IMAGES.controller,
    categoryId: "c1000000-0000-4000-8000-000000000009",
    variantId: "b1000000-0000-4000-8000-000000000080",
    variantSku: "CTL-WIRELESS",
  },
  {
    id: "a1000000-0000-4000-8000-000000000081",
    slug: "controller-wrist-leash",
    name: "Controller Wrist Leash",
    shortDescription: "Secure leash for hand controller.",
    description: "Prevents controller loss on falls.",
    productType: "accessory",
    basePriceCents: 1900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: {},
    imageUrl: IMAGES.controller,
    categoryId: "c1000000-0000-4000-8000-000000000014",
    variantId: "b1000000-0000-4000-8000-000000000081",
    variantSku: "ACC-CTL-LEASH",
  },
  {
    id: "a1000000-0000-4000-8000-000000000090",
    slug: "board-travel-bag",
    name: "Board Travel Bag",
    shortDescription: "Padded bag for Flyer EVO boards.",
    description: "Wheeled travel bag with reinforced base.",
    productType: "bag",
    basePriceCents: 34900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: {},
    imageUrl: IMAGES.maxPlus,
    categoryId: "c1000000-0000-4000-8000-000000000010",
    variantId: "b1000000-0000-4000-8000-000000000090",
    variantSku: "BAG-BOARD",
  },
  {
    id: "a1000000-0000-4000-8000-000000000091",
    slug: "battery-transport-bag",
    name: "Battery Transport Bag",
    shortDescription: "Fire-rated battery transport bag.",
    description: "Air-travel compliant padding and ventilation.",
    productType: "bag",
    basePriceCents: 12900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: {},
    imageUrl: IMAGES.battery,
    categoryId: "c1000000-0000-4000-8000-000000000010",
    variantId: "b1000000-0000-4000-8000-000000000091",
    variantSku: "BAG-BATTERY",
  },
  {
    id: "a1000000-0000-4000-8000-000000000100",
    slug: "board-cover-universal",
    name: "Universal Board Cover",
    shortDescription: "UV-resistant board sock.",
    description: "Protects deck and rails between sessions.",
    productType: "cover",
    basePriceCents: 8900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: {},
    imageUrl: IMAGES.proPlus,
    categoryId: "c1000000-0000-4000-8000-000000000011",
    variantId: "b1000000-0000-4000-8000-000000000100",
    variantSku: "COV-BOARD",
  },
  {
    id: "a1000000-0000-4000-8000-000000000101",
    slug: "wing-cover-set",
    name: "Wing Cover Set",
    shortDescription: "Front and rear wing covers.",
    description: "Neoprene-lined protection for foil surfaces.",
    productType: "cover",
    basePriceCents: 5900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: {},
    imageUrl: IMAGES.frontWing,
    categoryId: "c1000000-0000-4000-8000-000000000011",
    variantId: "b1000000-0000-4000-8000-000000000101",
    variantSku: "COV-WING-SET",
  },
  {
    id: "a1000000-0000-4000-8000-000000000110",
    slug: "impact-vest",
    name: "Impact Vest",
    shortDescription: "USCG-style impact vest.",
    description: "Recommended for all new riders.",
    productType: "safety",
    basePriceCents: 12900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: {},
    imageUrl: IMAGES.impactVest,
    categoryId: "c1000000-0000-4000-8000-000000000012",
    variantId: "b1000000-0000-4000-8000-000000000110",
    variantSku: "SAF-VEST",
  },
  {
    id: "a1000000-0000-4000-8000-000000000111",
    slug: "efoil-helmet",
    name: "eFoil Helmet",
    shortDescription: "Water sports helmet with ear coverage.",
    description: "Charlotte eFoil recommended safety gear.",
    productType: "safety",
    basePriceCents: 14900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: {},
    imageUrl: IMAGES.impactVest,
    categoryId: "c1000000-0000-4000-8000-000000000012",
    variantId: "b1000000-0000-4000-8000-000000000111",
    variantSku: "SAF-HELMET",
  },
  {
    id: "a1000000-0000-4000-8000-000000000112",
    slug: "board-leash",
    name: "Board Leash",
    shortDescription: "Coiled board leash.",
    description: "Keeps board nearby after falls.",
    productType: "safety",
    basePriceCents: 4900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: {},
    imageUrl: IMAGES.lite,
    categoryId: "c1000000-0000-4000-8000-000000000012",
    variantId: "b1000000-0000-4000-8000-000000000112",
    variantSku: "SAF-LEASH",
  },
  {
    id: "a1000000-0000-4000-8000-000000000120",
    slug: "mast-plate-hardware-kit",
    name: "Mast Plate Hardware Kit",
    shortDescription: "Replacement bolts and shims.",
    description: "Service kit for mast-to-board mounting.",
    productType: "part",
    basePriceCents: 3900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: {},
    imageUrl: IMAGES.mast,
    categoryId: "c1000000-0000-4000-8000-000000000013",
    variantId: "b1000000-0000-4000-8000-000000000120",
    variantSku: "PRT-MAST-KIT",
  },
  {
    id: "a1000000-0000-4000-8000-000000000121",
    slug: "propeller-service-kit",
    name: "Propeller Service Kit",
    shortDescription: "Prop, seals, and lubricant.",
    description: "Annual maintenance kit for propulsion units.",
    productType: "part",
    basePriceCents: 8900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: {},
    imageUrl: IMAGES.propulsion,
    categoryId: "c1000000-0000-4000-8000-000000000013",
    variantId: "b1000000-0000-4000-8000-000000000121",
    variantSku: "PRT-PROP-KIT",
  },
  {
    id: "a1000000-0000-4000-8000-000000000130",
    slug: "foil-tool-kit",
    name: "Foil Tool Kit",
    shortDescription: "Torque wrench and hex set.",
    description: "Essential assembly and travel tools.",
    productType: "accessory",
    basePriceCents: 7900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: {},
    imageUrl: IMAGES.controller,
    categoryId: "c1000000-0000-4000-8000-000000000014",
    variantId: "b1000000-0000-4000-8000-000000000130",
    variantSku: "ACC-TOOL-KIT",
  },
  {
    id: "a1000000-0000-4000-8000-000000000131",
    slug: "gps-ride-tracker-mount",
    name: "GPS Ride Tracker Mount",
    shortDescription: "Deck mount for ride logging devices.",
    description: "Low-profile adhesive mount.",
    productType: "accessory",
    basePriceCents: 2900,
    compareAtPriceCents: null,
    isConfigurable: false,
    metadata: {},
    imageUrl: IMAGES.controller,
    categoryId: "c1000000-0000-4000-8000-000000000014",
    variantId: "b1000000-0000-4000-8000-000000000131",
    variantSku: "ACC-GPS-MNT",
  },
];

const RECOMMENDED_PRODUCT_LINKS: Array<{
  id: string;
  productId: string;
  recommendedProductId: string;
  sortOrder: number;
  label: string | null;
}> = [
  {
    id: "9ec00000-0000-4000-8000-000000000001",
    productId: "a1000000-0000-4000-8000-000000000001",
    recommendedProductId: "a1000000-0000-4000-8000-000000000110",
    sortOrder: 1,
    label: "Recommended safety gear",
  },
  {
    id: "9ec00000-0000-4000-8000-000000000002",
    productId: "a1000000-0000-4000-8000-000000000001",
    recommendedProductId: "a1000000-0000-4000-8000-000000000111",
    sortOrder: 2,
    label: "Recommended safety gear",
  },
  {
    id: "9ec00000-0000-4000-8000-000000000003",
    productId: "a1000000-0000-4000-8000-000000000001",
    recommendedProductId: "a1000000-0000-4000-8000-000000000090",
    sortOrder: 3,
    label: "Board travel bag",
  },
  {
    id: "9ec00000-0000-4000-8000-000000000004",
    productId: "a1000000-0000-4000-8000-000000000002",
    recommendedProductId: "a1000000-0000-4000-8000-000000000020",
    sortOrder: 1,
    label: "Extended range battery upgrade",
  },
  {
    id: "9ec00000-0000-4000-8000-000000000005",
    productId: "a1000000-0000-4000-8000-000000000002",
    recommendedProductId: "a1000000-0000-4000-8000-000000000100",
    sortOrder: 2,
    label: "Board cover",
  },
  {
    id: "9ec00000-0000-4000-8000-000000000006",
    productId: "a1000000-0000-4000-8000-000000000003",
    recommendedProductId: "a1000000-0000-4000-8000-000000000112",
    sortOrder: 1,
    label: "Board leash",
  },
  {
    id: "9ec00000-0000-4000-8000-000000000007",
    productId: "a1000000-0000-4000-8000-000000000003",
    recommendedProductId: "a1000000-0000-4000-8000-000000000130",
    sortOrder: 2,
    label: "Foil tool kit",
  },
  {
    id: "9ec00000-0000-4000-8000-000000000008",
    productId: "a1000000-0000-4000-8000-000000000020",
    recommendedProductId: "a1000000-0000-4000-8000-000000000030",
    sortOrder: 1,
    label: "Fast charger",
  },
  {
    id: "9ec00000-0000-4000-8000-000000000009",
    productId: "a1000000-0000-4000-8000-000000000020",
    recommendedProductId: "a1000000-0000-4000-8000-000000000091",
    sortOrder: 2,
    label: "Battery transport bag",
  },
  {
    id: "9ec00000-0000-4000-8000-000000000010",
    productId: "a1000000-0000-4000-8000-000000000070",
    recommendedProductId: "a1000000-0000-4000-8000-000000000121",
    sortOrder: 1,
    label: "Propeller service kit",
  },
];

const PACKAGE_OPTION_GROUPS: Record<string, ProductOptionGroup[]> = {
  "flyer-evo-max-plus-package": MAX_PLUS_OPTION_GROUPS,
  "flyer-evo-pro-plus-package": PRO_PLUS_OPTION_GROUPS,
  "flyer-evo-lite-package": LITE_OPTION_GROUPS,
};

function seedToProduct(seed: ProductSeed): Product {
  const extras = PACKAGE_EXTRAS[seed.slug];
  return {
    id: seed.id,
    slug: seed.slug,
    name: seed.name,
    shortDescription: seed.shortDescription,
    description: seed.description,
    productType: seed.productType,
    basePriceCents: seed.basePriceCents,
    compareAtPriceCents: seed.compareAtPriceCents,
    isActive: true,
    isConfigurable: seed.isConfigurable,
    primaryImageUrl: getImportedCardUrl(seed.slug, seed.imageUrl),
    specs: extras?.specs ?? seed.specs ?? {},
    features: extras?.features ?? seed.features ?? [],
    whatsIncluded: extras?.whatsIncluded ?? seed.whatsIncluded ?? [],
    faqs: extras?.faqs ?? seed.faqs ?? [],
    metadata: seed.metadata,
    createdAt: TS,
    updatedAt: TS,
  };
}

function seedToSummary(seed: ProductSeed): ProductSummary {
  const product = seedToProduct(seed);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    productType: product.productType,
    basePriceCents: product.basePriceCents,
    compareAtPriceCents: product.compareAtPriceCents,
    isActive: product.isActive,
    isConfigurable: product.isConfigurable,
    primaryImageUrl: product.primaryImageUrl,
  };
}

function buildMedia(seed: ProductSeed): ProductMedia[] {
  const imported = buildImportedMedia(seed);
  if (imported.length) return imported;

  if (!seed.imageUrl) return [];
  return [
    {
      id: `d1000000-0000-4000-8000-${seed.id.slice(-12)}`,
      productId: seed.id,
      mediaType: "image",
      url: seed.imageUrl,
      altText: seed.name,
      sortOrder: 1,
      isPrimary: true,
    },
  ];
}

function buildVariant(seed: ProductSeed): ProductVariant {
  return {
    id: seed.variantId,
    productId: seed.id,
    sku: seed.variantSku,
    name: seed.productType === "package" ? `${seed.name} (Default Build)` : seed.name,
    priceCents: seed.basePriceCents,
    compareAtPriceCents: seed.compareAtPriceCents,
    isDefault: true,
    isActive: true,
    attributes: {},
    createdAt: TS,
    updatedAt: TS,
  };
}

function buildInventory(seed: ProductSeed): InventoryRecord {
  return {
    id: `b2000000-0000-4000-8000-${seed.variantId.slice(-12)}`,
    productVariantId: seed.variantId,
    quantityAvailable: seed.inventoryQty ?? inventoryQtyForType(seed.productType),
    quantityReserved: 0,
    lowStockThreshold: 2,
  };
}

const PRODUCT_BY_SLUG = new Map(PRODUCT_SEEDS.map((seed) => [seed.slug, seed]));
const PRODUCT_BY_ID = new Map(PRODUCT_SEEDS.map((seed) => [seed.id, seed]));
const SUMMARY_BY_ID = new Map(
  PRODUCT_SEEDS.map((seed) => [seed.id, seedToSummary(seed)]),
);

function applyImportedOptionImages(optionGroups: ProductOptionGroup[]): ProductOptionGroup[] {
  return optionGroups.map((group) => ({
    ...group,
    values: group.values.map((value) => {
      const linkedProductId = value.metadata?.linkedProductId;
      if (typeof linkedProductId !== "string") return value;
      const linkedSeed = PRODUCT_BY_ID.get(linkedProductId);
      if (!linkedSeed) return value;
      const hero = getImportedHeroUrl(linkedSeed.slug, value.imageUrl);
      return hero && hero !== value.imageUrl ? { ...value, imageUrl: hero } : value;
    }),
  }));
}

function buildRecommendedProducts(productId: string): RecommendedProduct[] {
  return RECOMMENDED_PRODUCT_LINKS.filter((link) => link.productId === productId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((link) => ({
      id: link.id,
      productId: link.productId,
      recommendedProductId: link.recommendedProductId,
      sortOrder: link.sortOrder,
      label: link.label,
      recommendedProduct: SUMMARY_BY_ID.get(link.recommendedProductId),
    }));
}

function buildProductWithDetails(seed: ProductSeed): ProductWithDetails {
  const categoryItem = CATEGORY_BY_ID.get(seed.categoryId);
  return {
    ...seedToProduct(seed),
    categories: categoryItem ? [categoryItem] : [],
    media: buildMedia(seed),
    variants: [buildVariant(seed)],
    optionGroups: applyImportedOptionImages(PACKAGE_OPTION_GROUPS[seed.slug] ?? []),
    compatibilityRules: COMPATIBILITY_RULES.filter((rule) => rule.productId === seed.id),
    inventory: [buildInventory(seed)],
    recommendedProducts: buildRecommendedProducts(seed.id),
  };
}

/** Return all active demo categories ordered for navigation. */
export function getDemoCategories(): Category[] {
  return DEMO_CATEGORIES;
}

/** Return active demo product summaries with optional filters. */
export function getDemoProducts(options: GetDemoProductsOptions = {}): ProductSummary[] {
  let rows = PRODUCT_SEEDS.filter((seed) => seed.slug);

  if (options.productType) {
    rows = rows.filter((seed) => seed.productType === options.productType);
  }

  if (options.categorySlug) {
    const categoryItem = CATEGORY_BY_SLUG.get(options.categorySlug);
    if (!categoryItem) return [];
    rows = rows.filter((seed) => seed.categoryId === categoryItem.id);
  }

  rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));

  if (options.limit) {
    rows = rows.slice(0, options.limit);
  }

  return rows.map(seedToSummary);
}

/** Return a single active demo product by slug. */
export function getDemoProductBySlug(slug: string): Product | null {
  const seed = PRODUCT_BY_SLUG.get(slug);
  return seed ? seedToProduct(seed) : null;
}

/** Return a demo product with full configurator and catalog relations. */
export function getDemoProductWithDetails(slug: string): ProductWithDetails | null {
  const seed = PRODUCT_BY_SLUG.get(slug);
  return seed ? buildProductWithDetails(seed) : null;
}
