/**
 * Maps local catalog slugs to Waydoo Shopify product handles.
 * Multiple handles may map to one catalog product (e.g. shared component imagery).
 */
export const CATALOG_SLUGS = [
  "flyer-evo-max-plus-package",
  "flyer-evo-pro-plus-package",
  "flyer-evo-lite-package",
  "flyer-evo-max-plus-board",
  "flyer-evo-pro-plus-board",
  "flyer-evo-lite-board",
  "powerflight-battery-28ah",
  "powerflight-battery-22ah",
  "powerflight-fast-charger",
  "powerflight-standard-charger",
  "carbon-mast-60cm",
  "carbon-mast-75cm",
  "carbon-mast-90cm",
  "front-wing-1300",
  "front-wing-1100",
  "front-wing-900",
  "rear-wing-320",
  "rear-wing-280",
  "propulsion-6000w",
  "propulsion-4000w",
  "wireless-hand-controller",
  "controller-wrist-leash",
  "board-travel-bag",
  "battery-transport-bag",
  "board-cover-universal",
  "wing-cover-set",
  "impact-vest",
  "efoil-helmet",
  "board-leash",
  "mast-plate-hardware-kit",
  "propeller-service-kit",
  "foil-tool-kit",
  "gps-ride-tracker-mount",
];

/** Explicit Waydoo handle → local slug overrides (first match wins). */
export const WAYDOO_HANDLE_TO_SLUG = {
  "waydoo-flyer-evo-efoil-evo-max-plus": "flyer-evo-max-plus-package",
  "flyer-evo-efoil": "flyer-evo-pro-plus-package",
  "waydoo-flyer-evo-efoil-evo-lite": "flyer-evo-lite-package",
  "waydoo-flyer-evo-board-max-plus": "flyer-evo-max-plus-board",
  "waydoo-flyer-evo-board-pro-plus": "flyer-evo-pro-plus-board",
  "waydoo-flyer-evo-board-lite": "flyer-evo-lite-board",
  "waydoo-flyer-evo-battery": "powerflight-battery-28ah",
  "waydoo-flyer-evo-powerflight-charger": "powerflight-fast-charger",
  "waydoo-flyer-evo-powerflight-invertable-charger": "powerflight-standard-charger",
  "waydoo-flyer-evo-27-mast": "carbon-mast-60cm",
  "waydoo-flyer-evo-31-mast": "carbon-mast-75cm",
  "waydoo-flyer-evo-35-mast": "carbon-mast-90cm",
  "waydoo-flyer-evo-front-wings": "front-wing-1300",
  "waydoo-flyer-evo-gliding-tail-320": "rear-wing-320",
  "waydoo-flyer-evo-gliding-tail-322": "rear-wing-280",
  "waydoo-flyer-evo-propulsion-unit-performance": "propulsion-6000w",
  "evo-propulsion-unit-elite": "propulsion-6000w",
  "waydoo-flyer-evo-propulsion-unit-standard": "propulsion-4000w",
  "waydoo-flyer-evo-remote": "wireless-hand-controller",
  "flyer-evo-board-bag-90l": "board-travel-bag",
  "waydoo-battery-bag-for-evo": "battery-transport-bag",
  "battery-fire-proof-bag": "battery-transport-bag",
  "waydoo-impact-vest": "impact-vest",
  "evo-propeller": "propeller-service-kit",
  "waydoo-evo-folding-propeller": "propeller-service-kit",
  "waydoo-flyer-evo-propulsion-unit-bag": "board-cover-universal",
  "waydoo-flyer-evo-jet-drive": "propeller-service-kit",
  "scooter-kit": "foil-tool-kit",
};

/**
 * Local slug → preferred Waydoo handles (in priority order).
 * Used when multiple Waydoo products could supply media for one catalog item.
 */
export const SLUG_TO_WAYDOO_HANDLES = {
  "flyer-evo-max-plus-package": ["waydoo-flyer-evo-efoil-evo-max-plus"],
  "flyer-evo-pro-plus-package": ["flyer-evo-efoil"],
  "flyer-evo-lite-package": ["waydoo-flyer-evo-efoil-evo-lite"],
  "flyer-evo-max-plus-board": ["waydoo-flyer-evo-board-max-plus", "waydoo-flyer-evo-efoil-evo-max-plus"],
  "flyer-evo-pro-plus-board": ["waydoo-flyer-evo-board-pro-plus", "flyer-evo-efoil"],
  "flyer-evo-lite-board": ["waydoo-flyer-evo-board-lite", "waydoo-flyer-evo-efoil-evo-lite"],
  "powerflight-battery-28ah": ["waydoo-flyer-evo-battery"],
  "powerflight-battery-22ah": ["waydoo-flyer-evo-battery"],
  "powerflight-fast-charger": ["waydoo-flyer-evo-powerflight-charger"],
  "powerflight-standard-charger": ["waydoo-flyer-evo-powerflight-invertable-charger"],
  "carbon-mast-60cm": ["waydoo-flyer-evo-27-mast"],
  "carbon-mast-75cm": ["waydoo-flyer-evo-31-mast"],
  "carbon-mast-90cm": ["waydoo-flyer-evo-35-mast"],
  "front-wing-1300": ["waydoo-flyer-evo-front-wings"],
  "front-wing-1100": ["waydoo-flyer-evo-front-wings"],
  "front-wing-900": ["waydoo-flyer-evo-front-wings"],
  "rear-wing-320": ["waydoo-flyer-evo-gliding-tail-320"],
  "rear-wing-280": ["waydoo-flyer-evo-gliding-tail-322"],
  "propulsion-6000w": ["waydoo-flyer-evo-propulsion-unit-performance", "evo-propulsion-unit-elite"],
  "propulsion-4000w": ["waydoo-flyer-evo-propulsion-unit-standard"],
  "wireless-hand-controller": ["waydoo-flyer-evo-remote"],
  "controller-wrist-leash": ["waydoo-flyer-evo-remote"],
  "board-travel-bag": ["flyer-evo-board-bag-90l"],
  "battery-transport-bag": ["waydoo-battery-bag-for-evo", "battery-fire-proof-bag"],
  "board-cover-universal": ["waydoo-flyer-evo-propulsion-unit-bag"],
  "wing-cover-set": ["waydoo-flyer-evo-front-wings"],
  "impact-vest": ["waydoo-impact-vest"],
  "efoil-helmet": ["waydoo-impact-vest"],
  "board-leash": ["waydoo-flyer-evo-tali-extended-rod-comes-with-bolts"],
  "mast-plate-hardware-kit": ["waydoo-flyer-evo-31-mast"],
  "propeller-service-kit": ["evo-propeller", "waydoo-evo-folding-propeller", "waydoo-flyer-evo-jet-drive"],
  "foil-tool-kit": ["scooter-kit"],
  "gps-ride-tracker-mount": ["waydoo-flyer-evo-remote"],
};

/** Keyword hints for fuzzy slug matching when no explicit handle map exists. */
export const SLUG_KEYWORDS = {
  "flyer-evo-max-plus-package": ["max plus", "130l", "evo max"],
  "flyer-evo-pro-plus-package": ["pro plus", "balanced"],
  "flyer-evo-lite-package": ["evo lite", "lite:"],
  "flyer-evo-max-plus-board": ["max plus board", "board 130"],
  "flyer-evo-pro-plus-board": ["pro plus board", "board 90", "pro plus"],
  "flyer-evo-lite-board": ["lite board", "board lite"],
  "powerflight-battery-28ah": ["battery", "powerflight"],
  "powerflight-battery-22ah": ["battery", "22"],
  "powerflight-fast-charger": ["charger", "powerflight"],
  "powerflight-standard-charger": ["inverter", "charger"],
  "carbon-mast-60cm": ["27", "mast"],
  "carbon-mast-75cm": ["31", "mast"],
  "carbon-mast-90cm": ["35", "mast"],
  "front-wing-1300": ["front wing", "1300", "voyager"],
  "front-wing-1100": ["front wing", "1100", "glider"],
  "front-wing-900": ["front wing", "900"],
  "rear-wing-320": ["tail 320", "320"],
  "rear-wing-280": ["tail 322", "322", "280"],
  "propulsion-6000w": ["performance", "6000", "elite"],
  "propulsion-4000w": ["standard", "4000"],
  "wireless-hand-controller": ["remote", "controller"],
  "impact-vest": ["impact vest", "vest"],
};

export function resolveCatalogSlug(waydooProduct) {
  const handle = waydooProduct.handle;
  if (WAYDOO_HANDLE_TO_SLUG[handle]) {
    return WAYDOO_HANDLE_TO_SLUG[handle];
  }

  const haystack = `${waydooProduct.title} ${waydooProduct.product_type} ${(waydooProduct.tags || []).join(" ")}`.toLowerCase();

  let bestSlug = null;
  let bestScore = 0;

  for (const slug of CATALOG_SLUGS) {
    const keywords = SLUG_KEYWORDS[slug] || slug.split("-");
    let score = 0;
    for (const keyword of keywords) {
      if (haystack.includes(keyword.toLowerCase())) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestSlug = slug;
    }
  }

  return bestScore >= 2 ? bestSlug : null;
}

export function pickWaydooProductForSlug(slug, waydooByHandle) {
  const handles = SLUG_TO_WAYDOO_HANDLES[slug] || [];
  for (const handle of handles) {
    const product = waydooByHandle.get(handle);
    if (product?.images?.length) return product;
  }
  return null;
}
