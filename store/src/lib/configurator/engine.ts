import type {
  CompatibilityRule,
  ConfigurationSelection,
  ConfigurationSummary,
  ConfigurationValidationResult,
  ProductOptionGroup,
  ProductWithDetails,
} from "@/types/commerce";

function findSelectedValueIds(
  selections: ConfigurationSelection[],
): Set<string> {
  return new Set(selections.map((selection) => selection.optionValueId));
}

function findSelectionForGroup(
  selections: ConfigurationSelection[],
  groupId: string,
): ConfigurationSelection | undefined {
  return selections.find((selection) => selection.optionGroupId === groupId);
}

function getValueById(
  product: ProductWithDetails,
  valueId: string,
): { group: ProductOptionGroup; valueLabel: string } | null {
  for (const group of product.optionGroups) {
    const value = group.values.find((item) => item.id === valueId);
    if (value) {
      return { group, valueLabel: value.label };
    }
  }
  return null;
}

/** Validate configurator selections against required groups and compatibility rules. */
export function validateConfiguration(
  product: ProductWithDetails,
  selections: ConfigurationSelection[],
): ConfigurationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const selectedIds = findSelectedValueIds(selections);
  const selectedGroupIds = new Set(
    selections.map((selection) => selection.optionGroupId),
  );

  for (const group of product.optionGroups) {
    const groupSelections = selections.filter(
      (selection) => selection.optionGroupId === group.id,
    );

    if (group.isRequired && groupSelections.length === 0) {
      errors.push(`Select a ${group.name.toLowerCase()} option.`);
      continue;
    }

    if (groupSelections.length < group.minSelections) {
      errors.push(
        `Select at least ${group.minSelections} option(s) for ${group.name}.`,
      );
    }

    if (groupSelections.length > group.maxSelections) {
      errors.push(
        `Select no more than ${group.maxSelections} option(s) for ${group.name}.`,
      );
    }

    for (const selection of groupSelections) {
      const validValue = group.values.some(
        (value) => value.id === selection.optionValueId,
      );
      if (!validValue) {
        errors.push(`Invalid selection for ${group.name}.`);
      }
    }
  }

  for (const selection of selections) {
    if (!product.optionGroups.some((group) => group.id === selection.optionGroupId)) {
      errors.push(`Unknown option group: ${selection.optionGroupSlug}.`);
    }
  }

  applyCompatibilityRules(
    product.compatibilityRules,
    selectedIds,
    selectedGroupIds,
    errors,
    warnings,
  );

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function applyCompatibilityRules(
  rules: CompatibilityRule[],
  selectedIds: Set<string>,
  selectedGroupIds: Set<string>,
  errors: string[],
  warnings: string[],
): void {
  for (const rule of rules) {
    if (!selectedIds.has(rule.sourceOptionValueId)) continue;

    const targetSelection = [...selectedGroupIds].find(
      (groupId) => groupId === rule.targetOptionGroupId,
    );

    if (rule.ruleType === "requires" && !targetSelection) {
      errors.push("A required companion option is missing for your selection.");
      continue;
    }

    if (rule.ruleType === "excludes") {
      const blocked = rule.allowedOptionValueIds.some((valueId) =>
        selectedIds.has(valueId),
      );
      if (blocked) {
        errors.push("One or more selections are incompatible.");
      }
      continue;
    }

    if (rule.ruleType === "allows" && targetSelection) {
      const selectedInTargetGroup = [...selectedIds].filter((valueId) =>
        rule.allowedOptionValueIds.includes(valueId),
      );
      if (selectedInTargetGroup.length === 0) {
        warnings.push("Your selection limits compatible options in another group.");
      }
    }
  }
}

/** Calculate total unit price for a configured product. */
export function calculateConfigurationPrice(
  product: ProductWithDetails,
  selections: ConfigurationSelection[],
): number {
  const basePrice = product.basePriceCents;
  const optionsTotal = selections.reduce(
    (sum, selection) => sum + selection.priceDeltaCents,
    0,
  );
  return basePrice + optionsTotal;
}

/** Return option values still compatible with the current selection state. */
export function getCompatibleOptions(
  product: ProductWithDetails,
  groupId: string,
  selections: ConfigurationSelection[],
): ProductOptionGroup["values"] {
  const group = product.optionGroups.find((item) => item.id === groupId);
  if (!group) return [];

  const selectedIds = findSelectedValueIds(selections);

  return group.values.filter((value) => {
    for (const rule of product.compatibilityRules) {
      if (rule.targetOptionGroupId !== groupId) continue;

      const sourceSelected = selectedIds.has(rule.sourceOptionValueId);
      if (!sourceSelected) continue;

      if (rule.ruleType === "excludes" && rule.allowedOptionValueIds.includes(value.id)) {
        return false;
      }

      if (
        rule.ruleType === "allows" &&
        rule.allowedOptionValueIds.length > 0 &&
        !rule.allowedOptionValueIds.includes(value.id)
      ) {
        return false;
      }
    }

    return true;
  });
}

/** Build a human-readable configuration summary with pricing breakdown. */
export function buildConfigurationSummary(
  product: ProductWithDetails,
  selections: ConfigurationSelection[],
): ConfigurationSummary {
  const validation = validateConfiguration(product, selections);
  const basePriceCents = product.basePriceCents;
  const optionsTotalCents = selections.reduce(
    (sum, selection) => sum + selection.priceDeltaCents,
    0,
  );

  const normalizedSelections = selections.map((selection) => {
    const match = getValueById(product, selection.optionValueId);
    return {
      ...selection,
      label: match?.valueLabel ?? selection.label,
    };
  });

  return {
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    selections: normalizedSelections,
    basePriceCents,
    optionsTotalCents,
    unitPriceCents: basePriceCents + optionsTotalCents,
    warnings: validation.warnings,
  };
}

/** Resolve selections from option value IDs for a product. */
export function selectionsFromValueIds(
  product: ProductWithDetails,
  valueIds: string[],
): ConfigurationSelection[] {
  const selections: ConfigurationSelection[] = [];

  for (const valueId of valueIds) {
    for (const group of product.optionGroups) {
      const value = group.values.find((item) => item.id === valueId);
      if (!value) continue;

      selections.push({
        optionGroupId: group.id,
        optionGroupSlug: group.slug,
        optionValueId: value.id,
        optionValueSlug: value.slug,
        label: value.label,
        priceDeltaCents: value.priceDeltaCents,
      });
      break;
    }
  }

  return selections;
}
