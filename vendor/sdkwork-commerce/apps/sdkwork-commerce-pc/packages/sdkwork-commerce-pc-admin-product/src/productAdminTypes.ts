export type ProductReadinessSeverity = 'blocker' | 'warning' | 'complete';

export type ProductReadinessSection =
  | 'basic'
  | 'category'
  | 'detail'
  | 'attribute'
  | 'sku'
  | 'store'
  | 'inventory'
  | 'pricing'
  | 'publishing';

export type ProductInventoryReadinessMode = 'physical' | 'virtual' | 'not_required';

export type ProductAttributeValueType = 'text' | 'number' | 'boolean' | 'enum' | 'multi_enum' | 'date' | 'json';

export type ProductDetailConfig = {
  mainImageUrl: string;
  galleryImageUrls: string[];
  detailImageUrls: string[];
  videoUrl: string;
  sellingPoints: string[];
  parameterRows: ProductDetailParameterRow[];
  servicePromises: string[];
  shippingPolicy: string;
  afterSalePolicy: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  shareTitle: string;
  shareDescription: string;
  shareImageUrl: string;
  customSections: ProductDetailCustomSection[];
};

export type ProductDetailParameterRow = {
  id: string;
  label: string;
  value: string;
};

export type ProductDetailCustomSection = {
  id: string;
  title: string;
  body: string;
};

export type ProductStoreVisibility = {
  visible: boolean;
  storeIds: string[];
  channelCodes: string[];
  primaryStoreId: string;
};

export type ProductInventoryPolicy = {
  managed: boolean;
  readinessMode: ProductInventoryReadinessMode;
  sourceIds: string[];
  safetyStock: number;
  allowBackorder: boolean;
};

export type ProductCategoryAttributeValue = {
  id: string;
  attributeId: string;
  attributeNo: string;
  attributeName: string;
  valueType: ProductAttributeValueType;
  value: string;
  displayValue: string;
  required: boolean;
};

export type ProductSkuAttributeValue = {
  id: string;
  skuDraftId: string;
  specKey: string;
  attributeId: string;
  attributeName: string;
  valueCode: string;
  value: string;
  displayValue: string;
  required: boolean;
};

export type ProductReadinessIssue = {
  id: string;
  section: ProductReadinessSection;
  severity: ProductReadinessSeverity;
  message: string;
  target?: string;
};

export type ProductReadinessReport = {
  issues: ProductReadinessIssue[];
  blockers: ProductReadinessIssue[];
  warnings: ProductReadinessIssue[];
  completed: number;
  total: number;
  publishable: boolean;
};

export type CommercialSkuDraft = {
  id: string;
  backendSkuId?: string;
  specKey: string;
  title: string;
  skuNo: string;
  priceAmount: string;
  currencyCode: string;
  fulfillmentType?: string;
  status: 'draft' | 'active' | 'inactive' | 'archived';
  enabled: boolean;
  specSelections?: Array<{
    groupId: string;
    groupName: string;
    valueId: string;
    valueName: string;
    valueCode: string;
  }>;
};

export type CommercialProductDraft = {
  title: string;
  subtitle?: string;
  description: string;
  brand?: string;
  productType: string;
  spuNo: string;
  defaultPriceAmount: string;
  defaultCurrencyCode: string;
  fulfillmentType: string;
  selectedCategoryIds: string[];
  shopCategoryIds?: string[];
  skuDrafts: CommercialSkuDraft[];
  detailConfig?: ProductDetailConfig;
  storeVisibility?: ProductStoreVisibility;
  inventoryPolicy?: ProductInventoryPolicy;
  categoryAttributeValues?: ProductCategoryAttributeValue[];
  skuAttributeValues?: ProductSkuAttributeValue[];
};

export type ProductCommercialSignals = {
  detailComplete: boolean;
  storeVisible: boolean;
  skuAttributeComplete: boolean;
  inventoryReady: boolean;
  priceComplete: boolean;
  readinessStatus: 'ready' | 'blocked' | 'draft';
  readinessLabel: string;
};

export const DEFAULT_PRODUCT_DETAIL_CONFIG: ProductDetailConfig = {
  mainImageUrl: '',
  galleryImageUrls: [],
  detailImageUrls: [],
  videoUrl: '',
  sellingPoints: ['Core value', 'Fulfillment promise', 'After-sale support'],
  parameterRows: [],
  servicePromises: ['Authentic product', 'Invoice support', 'After-sale service'],
  shippingPolicy: 'Standard shipping policy',
  afterSalePolicy: 'Standard after-sale policy',
  seoTitle: '',
  seoDescription: '',
  seoKeywords: [],
  shareTitle: '',
  shareDescription: '',
  shareImageUrl: '',
  customSections: [],
};

export const DEFAULT_STORE_VISIBILITY: ProductStoreVisibility = {
  visible: true,
  storeIds: ['default-store'],
  channelCodes: ['admin', 'pc'],
  primaryStoreId: 'default-store',
};

export const DEFAULT_INVENTORY_POLICY: ProductInventoryPolicy = {
  managed: true,
  readinessMode: 'physical',
  sourceIds: ['default-source'],
  safetyStock: 0,
  allowBackorder: false,
};
