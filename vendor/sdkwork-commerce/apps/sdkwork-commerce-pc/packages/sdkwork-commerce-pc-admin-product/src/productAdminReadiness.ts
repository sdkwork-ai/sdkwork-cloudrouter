import {
  DEFAULT_INVENTORY_POLICY,
  DEFAULT_PRODUCT_DETAIL_CONFIG,
  DEFAULT_STORE_VISIBILITY,
  type CommercialProductDraft,
  type ProductDetailConfig,
  type ProductInventoryPolicy,
  type ProductReadinessIssue,
  type ProductReadinessReport,
  type ProductStoreVisibility,
} from './productAdminTypes';

const READINESS_TOTAL = 9;

export function evaluateProductReadiness(draft: CommercialProductDraft): ProductReadinessReport {
  const issues: ProductReadinessIssue[] = [];
  const enabledSkus = draft.skuDrafts.filter((sku) => sku.enabled && sku.status !== 'archived');
  const detailConfig = draft.detailConfig ?? DEFAULT_PRODUCT_DETAIL_CONFIG;
  const storeVisibility = draft.storeVisibility ?? DEFAULT_STORE_VISIBILITY;
  const inventoryPolicy = draft.inventoryPolicy ?? resolveDefaultInventoryPolicy(draft.productType);

  addIssueIf(issues, !draft.title.trim(), {
    id: 'product-title-required',
    section: 'basic',
    severity: 'blocker',
    message: 'Product title is required before publish.',
    target: 'title',
  });
  addIssueIf(issues, !draft.spuNo.trim(), {
    id: 'product-spu-required',
    section: 'basic',
    severity: 'blocker',
    message: 'SPU number is required before publish.',
    target: 'spuNo',
  });
  addIssueIf(issues, draft.selectedCategoryIds.length === 0, {
    id: 'product-category-required',
    section: 'category',
    severity: 'blocker',
    message: 'Select at least one leaf category.',
    target: 'selectedCategoryIds',
  });
  addIssueIf(issues, hasMissingRequiredCategoryAttributes(draft), {
    id: 'category-required-attributes-missing',
    section: 'attribute',
    severity: 'blocker',
    message: 'Required category attributes are incomplete.',
    target: 'categoryAttributeValues',
  });
  addIssueIf(issues, !isDetailConfigComplete(detailConfig), {
    id: 'product-detail-incomplete',
    section: 'detail',
    severity: 'blocker',
    message: 'Product detail configuration needs media, selling points, parameters, and policy text.',
    target: 'detailConfig',
  });
  addIssueIf(issues, enabledSkus.length === 0, {
    id: 'sellable-sku-required',
    section: 'sku',
    severity: 'blocker',
    message: 'At least one sellable SKU is required.',
    target: 'skuDrafts',
  });
  addIssueIf(issues, enabledSkus.some((sku) => !sku.skuNo.trim() || !sku.title.trim()), {
    id: 'sku-basic-required',
    section: 'sku',
    severity: 'blocker',
    message: 'Every active SKU needs a title and SKU number.',
    target: 'skuDrafts',
  });
  addIssueIf(issues, enabledSkus.some((sku) => !isPositiveDecimalString(sku.priceAmount)), {
    id: 'sku-price-required',
    section: 'pricing',
    severity: 'blocker',
    message: 'Every active SKU needs a valid positive price.',
    target: 'skuDrafts',
  });
  addIssueIf(issues, hasMissingRequiredSkuAttributes(draft), {
    id: 'sku-required-attributes-missing',
    section: 'sku',
    severity: 'blocker',
    message: 'Required SKU attributes are incomplete for one or more active SKUs.',
    target: 'skuAttributeValues',
  });
  addIssueIf(issues, !isStoreVisibilityReady(storeVisibility), {
    id: 'store-visibility-required',
    section: 'store',
    severity: 'blocker',
    message: 'Store or channel visibility must be configured.',
    target: 'storeVisibility',
  });
  addIssueIf(issues, !isInventoryPolicyReady(draft.productType, inventoryPolicy), {
    id: 'inventory-policy-required',
    section: 'inventory',
    severity: 'blocker',
    message: 'Physical products require inventory source policy before publish.',
    target: 'inventoryPolicy',
  });
  addIssueIf(issues, !isPositiveDecimalString(draft.defaultPriceAmount), {
    id: 'default-price-warning',
    section: 'pricing',
    severity: 'warning',
    message: 'Default product price is missing or invalid.',
    target: 'defaultPriceAmount',
  });

  const blockers = issues.filter((issue) => issue.severity === 'blocker');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const completed = Math.max(0, READINESS_TOTAL - blockers.length);

  return {
    issues,
    blockers,
    warnings,
    completed,
    total: READINESS_TOTAL,
    publishable: blockers.length === 0,
  };
}

export function isProductPublishable(draft: CommercialProductDraft): boolean {
  return evaluateProductReadiness(draft).publishable;
}

export function isDetailConfigComplete(detailConfig: ProductDetailConfig): boolean {
  return Boolean(
    detailConfig.mainImageUrl.trim()
    && detailConfig.detailImageUrls.some((url) => url.trim())
    && detailConfig.sellingPoints.some((point) => point.trim())
    && detailConfig.parameterRows.some((row) => row.label.trim() && row.value.trim())
    && detailConfig.servicePromises.some((promise) => promise.trim())
    && detailConfig.shippingPolicy.trim()
    && detailConfig.afterSalePolicy.trim(),
  );
}

export function isStoreVisibilityReady(storeVisibility: ProductStoreVisibility): boolean {
  return storeVisibility.visible
    && storeVisibility.storeIds.some((storeId) => storeId.trim())
    && storeVisibility.channelCodes.some((channelCode) => channelCode.trim());
}

export function isInventoryPolicyReady(productType: string, inventoryPolicy: ProductInventoryPolicy): boolean {
  if (productType !== 'physical_good') {
    return true;
  }
  return inventoryPolicy.managed
    && inventoryPolicy.readinessMode === 'physical'
    && inventoryPolicy.sourceIds.some((sourceId) => sourceId.trim());
}

export function isPositiveDecimalString(value: string): boolean {
  if (!/^\d+(\.\d{1,6})?$/.test(value.trim())) {
    return false;
  }
  return Number(value) > 0;
}

function hasMissingRequiredCategoryAttributes(draft: CommercialProductDraft): boolean {
  return (draft.categoryAttributeValues ?? [])
    .some((attribute) => attribute.required && !attribute.value.trim() && !attribute.displayValue.trim());
}

function hasMissingRequiredSkuAttributes(draft: CommercialProductDraft): boolean {
  const enabledSkuKeys = new Set(
    draft.skuDrafts
      .filter((sku) => sku.enabled && sku.status !== 'archived')
      .flatMap((sku) => [sku.id, sku.specKey].filter(Boolean)),
  );
  return (draft.skuAttributeValues ?? [])
    .some((attribute) => {
      if (!attribute.required) {
        return false;
      }
      if (enabledSkuKeys.size > 0 && !enabledSkuKeys.has(attribute.skuDraftId) && !enabledSkuKeys.has(attribute.specKey)) {
        return false;
      }
      return !attribute.value.trim() && !attribute.displayValue.trim();
    });
}

function resolveDefaultInventoryPolicy(productType: string): ProductInventoryPolicy {
  if (productType === 'physical_good') {
    return DEFAULT_INVENTORY_POLICY;
  }
  return {
    ...DEFAULT_INVENTORY_POLICY,
    managed: false,
    readinessMode: 'not_required',
    sourceIds: [],
  };
}

function addIssueIf(issues: ProductReadinessIssue[], condition: boolean, issue: ProductReadinessIssue) {
  if (condition) {
    issues.push(issue);
  }
}
