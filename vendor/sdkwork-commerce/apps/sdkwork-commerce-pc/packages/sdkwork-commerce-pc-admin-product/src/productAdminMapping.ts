import {
  evaluateProductReadiness,
  isDetailConfigComplete,
  isInventoryPolicyReady,
  isPositiveDecimalString,
  isStoreVisibilityReady,
} from './productAdminReadiness';
import {
  DEFAULT_INVENTORY_POLICY,
  DEFAULT_PRODUCT_DETAIL_CONFIG,
  DEFAULT_STORE_VISIBILITY,
  type CommercialProductDraft,
  type ProductCategoryAttributeValue,
  type ProductDetailConfig,
  type ProductDetailCustomSection,
  type ProductDetailParameterRow,
  type ProductInventoryPolicy,
  type ProductCommercialSignals,
  type ProductSkuAttributeValue,
  type ProductStoreVisibility,
} from './productAdminTypes';

const COMMERCIAL_METADATA_KEY = 'commercialProductCenter';

export function buildCommercialProductMetadata(draft: CommercialProductDraft): Record<string, unknown> {
  const readiness = evaluateProductReadiness(draft);
  return {
    [COMMERCIAL_METADATA_KEY]: {
      productDetailConfig: normalizeProductDetailConfig(draft.detailConfig),
      storeVisibility: normalizeStoreVisibility(draft.storeVisibility),
      inventoryPolicy: normalizeInventoryPolicy(draft.productType, draft.inventoryPolicy),
      categoryAttributeValues: normalizeCategoryAttributeValues(draft.categoryAttributeValues),
      skuAttributeValues: normalizeSkuAttributeValues(draft.skuAttributeValues),
      publishReadiness: {
        completed: readiness.completed,
        total: readiness.total,
        publishable: readiness.publishable,
        blockerCount: readiness.blockers.length,
        warningCount: readiness.warnings.length,
        issues: readiness.issues,
      },
    },
  };
}

export function readCommercialProductMetadata(record: Record<string, unknown>): Partial<CommercialProductDraft> {
  const metadata = readRecord(record.metadata);
  const commercial = readRecord(metadata?.[COMMERCIAL_METADATA_KEY]);
  if (!commercial) {
    return {};
  }
  return {
    detailConfig: normalizeProductDetailConfig(commercial.productDetailConfig),
    storeVisibility: normalizeStoreVisibility(commercial.storeVisibility),
    inventoryPolicy: normalizeInventoryPolicy('', commercial.inventoryPolicy),
    categoryAttributeValues: normalizeCategoryAttributeValues(commercial.categoryAttributeValues),
    skuAttributeValues: normalizeSkuAttributeValues(commercial.skuAttributeValues),
  };
}

export function readProductCommercialSignals(record: Record<string, unknown>): ProductCommercialSignals {
  const commercial = readRecord(readRecord(record.metadata)?.[COMMERCIAL_METADATA_KEY]);
  const detailConfig = normalizeProductDetailConfig(commercial?.productDetailConfig);
  const storeVisibility = normalizeStoreVisibility(commercial?.storeVisibility);
  const productType = readString(record.productType) || readString(record.product_type);
  const inventoryPolicy = normalizeInventoryPolicy(productType, commercial?.inventoryPolicy);
  const skuAttributeValues = normalizeSkuAttributeValues(commercial?.skuAttributeValues);
  const readiness = readRecord(commercial?.publishReadiness);
  const blockerCount = readNumber(readiness?.blockerCount, commercial ? 0 : 1);
  const publishable = readBoolean(readiness?.publishable, blockerCount === 0);
  const priceComplete = isPositiveDecimalString(
    readString(record.minPriceAmount)
    || readString(record.priceAmount)
    || readString(record.defaultPriceAmount)
    || readString(record.min_price_amount)
    || readString(record.price_amount)
    || readString(record.default_price_amount),
  );
  return {
    detailComplete: isDetailConfigComplete(detailConfig),
    storeVisible: isStoreVisibilityReady(storeVisibility),
    skuAttributeComplete: skuAttributeValues.every((attribute) => !attribute.required || Boolean(attribute.value || attribute.displayValue)),
    inventoryReady: isInventoryPolicyReady(productType, inventoryPolicy),
    priceComplete,
    readinessStatus: publishable ? 'ready' : blockerCount > 0 ? 'blocked' : 'draft',
    readinessLabel: publishable ? 'Ready' : blockerCount > 0 ? `${blockerCount} blockers` : 'Draft',
  };
}

export function normalizeProductDetailConfig(value: unknown): ProductDetailConfig {
  const record = readRecord(value);
  if (!record) {
    return cloneDetailConfig(DEFAULT_PRODUCT_DETAIL_CONFIG);
  }
  return {
    mainImageUrl: readString(record.mainImageUrl),
    galleryImageUrls: readStringArray(record.galleryImageUrls),
    detailImageUrls: readStringArray(record.detailImageUrls),
    videoUrl: readString(record.videoUrl),
    sellingPoints: readStringArray(record.sellingPoints),
    parameterRows: readParameterRows(record.parameterRows),
    servicePromises: readStringArray(record.servicePromises),
    shippingPolicy: readString(record.shippingPolicy),
    afterSalePolicy: readString(record.afterSalePolicy),
    seoTitle: readString(record.seoTitle),
    seoDescription: readString(record.seoDescription),
    seoKeywords: readStringArray(record.seoKeywords),
    shareTitle: readString(record.shareTitle),
    shareDescription: readString(record.shareDescription),
    shareImageUrl: readString(record.shareImageUrl),
    customSections: readCustomSections(record.customSections),
  };
}

export function normalizeStoreVisibility(value: unknown): ProductStoreVisibility {
  const record = readRecord(value);
  if (!record) {
    return { ...DEFAULT_STORE_VISIBILITY };
  }
  const storeIds = readStringArray(record.storeIds);
  const channelCodes = readStringArray(record.channelCodes);
  return {
    visible: readBoolean(record.visible, DEFAULT_STORE_VISIBILITY.visible),
    storeIds: storeIds.length ? storeIds : [...DEFAULT_STORE_VISIBILITY.storeIds],
    channelCodes: channelCodes.length ? channelCodes : [...DEFAULT_STORE_VISIBILITY.channelCodes],
    primaryStoreId: readString(record.primaryStoreId) || storeIds[0] || DEFAULT_STORE_VISIBILITY.primaryStoreId,
  };
}

export function normalizeInventoryPolicy(productType: string, value: unknown): ProductInventoryPolicy {
  const record = readRecord(value);
  if (!record) {
    if (productType === 'physical_good' || !productType) {
      return { ...DEFAULT_INVENTORY_POLICY, sourceIds: [...DEFAULT_INVENTORY_POLICY.sourceIds] };
    }
    return {
      ...DEFAULT_INVENTORY_POLICY,
      managed: false,
      readinessMode: 'not_required',
      sourceIds: [],
    };
  }
  const readinessMode = readString(record.readinessMode);
  return {
    managed: readBoolean(record.managed, productType === 'physical_good'),
    readinessMode: readinessMode === 'virtual' || readinessMode === 'not_required' ? readinessMode : 'physical',
    sourceIds: readStringArray(record.sourceIds),
    safetyStock: readNumber(record.safetyStock, 0),
    allowBackorder: readBoolean(record.allowBackorder, false),
  };
}

export function normalizeCategoryAttributeValues(value: unknown): ProductCategoryAttributeValue[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(readRecord)
    .filter((record): record is Record<string, unknown> => Boolean(record))
    .map((record, index) => ({
      id: readString(record.id) || `category-attribute-${index}`,
      attributeId: readString(record.attributeId),
      attributeNo: readString(record.attributeNo),
      attributeName: readString(record.attributeName) || readString(record.name),
      valueType: normalizeAttributeValueType(readString(record.valueType)),
      value: readString(record.value),
      displayValue: readString(record.displayValue) || readString(record.value),
      required: readBoolean(record.required, false),
    }));
}

export function normalizeSkuAttributeValues(value: unknown): ProductSkuAttributeValue[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(readRecord)
    .filter((record): record is Record<string, unknown> => Boolean(record))
    .map((record, index) => ({
      id: readString(record.id) || `sku-attribute-${index}`,
      skuDraftId: readString(record.skuDraftId),
      specKey: readString(record.specKey),
      attributeId: readString(record.attributeId),
      attributeName: readString(record.attributeName) || readString(record.name),
      valueCode: readString(record.valueCode),
      value: readString(record.value),
      displayValue: readString(record.displayValue) || readString(record.value),
      required: readBoolean(record.required, false),
    }));
}

function readParameterRows(value: unknown): ProductDetailParameterRow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(readRecord)
    .filter((record): record is Record<string, unknown> => Boolean(record))
    .map((record, index) => ({
      id: readString(record.id) || `parameter-${index}`,
      label: readString(record.label),
      value: readString(record.value),
    }))
    .filter((row) => row.label || row.value);
}

function readCustomSections(value: unknown): ProductDetailCustomSection[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(readRecord)
    .filter((record): record is Record<string, unknown> => Boolean(record))
    .map((record, index) => ({
      id: readString(record.id) || `detail-section-${index}`,
      title: readString(record.title),
      body: readString(record.body),
    }))
    .filter((section) => section.title || section.body);
}

function normalizeAttributeValueType(value: string): ProductCategoryAttributeValue['valueType'] {
  if (
    value === 'number'
    || value === 'boolean'
    || value === 'enum'
    || value === 'multi_enum'
    || value === 'date'
    || value === 'json'
  ) {
    return value;
  }
  return 'text';
}

function cloneDetailConfig(value: ProductDetailConfig): ProductDetailConfig {
  return {
    ...value,
    galleryImageUrls: [...value.galleryImageUrls],
    detailImageUrls: [...value.detailImageUrls],
    sellingPoints: [...value.sellingPoints],
    parameterRows: value.parameterRows.map((row) => ({ ...row })),
    servicePromises: [...value.servicePromises],
    seoKeywords: [...value.seoKeywords],
    customSections: value.customSections.map((section) => ({ ...section })),
  };
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readString(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return '';
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(readString).filter(Boolean);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
