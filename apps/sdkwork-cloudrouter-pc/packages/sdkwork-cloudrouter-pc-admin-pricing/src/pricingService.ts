import {
  isRecord,
  readRequiredApiItem,
  readRequiredApiItems,
  readString,
  type ApiRecord,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  getCloudRouterBackendSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

type BackendPricingService = ReturnType<typeof getCloudRouterBackendSdkClient>['pricing'];

export type AdminPricingStatus = 'active' | 'inactive';
export type AdminBasePriceSide =
  | 'official_reference'
  | 'upstream_cost'
  | 'customer_charge'
  | 'internal_transfer';
export type AdminRoundingMode = 'half_up' | 'half_even' | 'up' | 'down';
export type AdminRateCardSubjectType =
  | 'default'
  | 'api_key'
  | 'account_group'
  | 'account'
  | 'user'
  | 'organization';
export type AdminFormulaMode = 'multiplier_markup' | 'unit_price_override';

export interface AdminPricingPlanItem {
  id: string;
  planCode: string;
  planName: string;
  basePriceSide: AdminBasePriceSide;
  currencyCode: string;
  fallbackPolicy: string;
  roundingMode: AdminRoundingMode;
  minimumChargeAmount: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status: AdminPricingStatus;
  createdAt?: string;
  updatedAt?: string;
  version?: string;
}

export interface AdminRateCardItem {
  id: string;
  subjectType: AdminRateCardSubjectType;
  subjectId?: string;
  subjectCode?: string;
  pricingPlanId: string;
  planCode?: string;
  planName?: string;
  priority: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  status: AdminPricingStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminPricingRuleItem {
  id: string;
  pricingPlanId: string;
  planCode?: string;
  ruleCode: string;
  productCode?: string;
  operationCode?: string;
  meterCode?: string;
  providerCode?: string;
  regionCode?: string;
  catalogKey?: string;
  formulaMode: AdminFormulaMode;
  multiplier: string;
  markupAmount: string;
  unitPriceOverride?: string;
  priority: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  status: AdminPricingStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminPricingPlanMutationInput {
  planCode?: string;
  planName: string;
  basePriceSide: AdminBasePriceSide;
  currencyCode: string;
  roundingMode: AdminRoundingMode;
  minimumChargeAmount: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status: AdminPricingStatus;
}

export interface AdminRateCardMutationInput {
  subjectType: AdminRateCardSubjectType;
  subjectId?: string;
  subjectCode?: string;
  pricingPlanId: string;
  priority: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  status: AdminPricingStatus;
}

export interface AdminPricingRuleMutationInput {
  ruleCode?: string;
  pricingPlanId: string;
  productCode?: string;
  operationCode?: string;
  meterCode?: string;
  providerCode?: string;
  regionCode?: string;
  catalogKey?: string;
  formulaMode: AdminFormulaMode;
  multiplier?: string;
  markupAmount?: string;
  unitPriceOverride?: string;
  priority: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  status: AdminPricingStatus;
}

export interface AdminPricingListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: AdminPricingStatus;
  basePriceSide?: AdminBasePriceSide;
  subjectType?: AdminRateCardSubjectType;
  pricingPlanId?: string;
}

export interface AdminPricingPageInfo {
  mode: 'offset' | 'cursor';
  page?: number;
  pageSize?: number;
  totalItems?: string;
  totalPages?: number;
  nextCursor?: string | null;
  hasMore?: boolean;
}

export interface AdminPricingPage<T> {
  items: T[];
  pageInfo: AdminPricingPageInfo;
}

async function backendPlansList(params?: Parameters<BackendPricingService['plans']['list']>[0]) {
  return getCloudRouterBackendSdkClient().pricing.plans.list(params);
}

async function backendPlansCreate(
  body: Parameters<BackendPricingService['plans']['create']>[0],
) {
  return getCloudRouterBackendSdkClient().pricing.plans.create(body);
}

async function backendPlansRetrieve(planId: string) {
  return getCloudRouterBackendSdkClient().pricing.plans.retrieve(planId);
}

async function backendPlansUpdate(
  planId: string,
  body: Parameters<BackendPricingService['plans']['update']>[1],
) {
  return getCloudRouterBackendSdkClient().pricing.plans.update(planId, body);
}

async function backendRateCardsList(params?: Parameters<BackendPricingService['rateCards']['list']>[0]) {
  return getCloudRouterBackendSdkClient().pricing.rateCards.list(params);
}

async function backendRateCardsCreate(
  body: Parameters<BackendPricingService['rateCards']['create']>[0],
) {
  return getCloudRouterBackendSdkClient().pricing.rateCards.create(body);
}

async function backendRateCardsUpdate(
  rateCardId: string,
  body: Parameters<BackendPricingService['rateCards']['update']>[1],
) {
  return getCloudRouterBackendSdkClient().pricing.rateCards.update(rateCardId, body);
}

async function backendRateCardsDelete(rateCardId: string) {
  return getCloudRouterBackendSdkClient().pricing.rateCards.delete(rateCardId);
}

async function backendRulesList(params?: Parameters<BackendPricingService['rules']['list']>[0]) {
  return getCloudRouterBackendSdkClient().pricing.rules.list(params);
}

async function backendRulesCreate(
  body: Parameters<BackendPricingService['rules']['create']>[0],
) {
  return getCloudRouterBackendSdkClient().pricing.rules.create(body);
}

async function backendRulesUpdate(
  ruleId: string,
  body: Parameters<BackendPricingService['rules']['update']>[1],
) {
  return getCloudRouterBackendSdkClient().pricing.rules.update(ruleId, body);
}

async function backendRulesDelete(ruleId: string) {
  return getCloudRouterBackendSdkClient().pricing.rules.delete(ruleId);
}

export async function fetchPricingPlans(
  params: AdminPricingListParams = {},
): Promise<AdminPricingPage<AdminPricingPlanItem>> {
  const result = await backendPlansList({
    page: requiredListPage(params.page),
    pageSize: requiredListPageSize(params.pageSize),
    q: params.q || undefined,
    status: params.status,
    basePriceSide: params.basePriceSide,
  });
  return {
    items: readRequiredApiItems(result, 'Pricing plans could not be loaded').map(normalizePricingPlan),
    pageInfo: result.pageInfo,
  };
}

export async function fetchPricingPlan(planId: string): Promise<AdminPricingPlanItem> {
  const result = await backendPlansRetrieve(requiredPricingText(planId, 'planId'));
  return normalizePricingPlan(readRequiredApiItem(result, 'Pricing plan could not be loaded'));
}

export async function createPricingPlan(
  input: AdminPricingPlanMutationInput,
): Promise<AdminPricingPlanItem> {
  const result = await backendPlansCreate(buildPlanCreateRequest(input));
  return normalizePricingPlan(readRequiredApiItem(result, 'Pricing plan could not be created'));
}

export async function updatePricingPlan(
  planId: string,
  input: AdminPricingPlanMutationInput,
): Promise<AdminPricingPlanItem> {
  const result = await backendPlansUpdate(
    requiredPricingText(planId, 'planId'),
    buildPlanUpdateRequest(input),
  );
  return normalizePricingPlan(readRequiredApiItem(result, 'Pricing plan could not be updated'));
}

export async function fetchPricingRateCards(
  params: AdminPricingListParams = {},
): Promise<AdminPricingPage<AdminRateCardItem>> {
  const result = await backendRateCardsList({
    page: requiredListPage(params.page),
    pageSize: requiredListPageSize(params.pageSize),
    subjectType: params.subjectType,
    pricingPlanId: params.pricingPlanId,
    status: params.status,
  });
  return {
    items: readRequiredApiItems(result, 'Rate cards could not be loaded').map(normalizeRateCard),
    pageInfo: result.pageInfo,
  };
}

export async function createPricingRateCard(
  input: AdminRateCardMutationInput,
): Promise<AdminRateCardItem> {
  const result = await backendRateCardsCreate(buildRateCardCreateRequest(input));
  return normalizeRateCard(readRequiredApiItem(result, 'Rate card could not be created'));
}

export async function updatePricingRateCard(
  rateCardId: string,
  input: AdminRateCardMutationInput,
): Promise<AdminRateCardItem> {
  const result = await backendRateCardsUpdate(
    requiredPricingText(rateCardId, 'rateCardId'),
    buildRateCardUpdateRequest(input),
  );
  return normalizeRateCard(readRequiredApiItem(result, 'Rate card could not be updated'));
}

export async function deletePricingRateCard(rateCardId: string): Promise<void> {
  await backendRateCardsDelete(requiredPricingText(rateCardId, 'rateCardId'));
}

export async function fetchPricingRules(
  params: AdminPricingListParams = {},
): Promise<AdminPricingPage<AdminPricingRuleItem>> {
  const result = await backendRulesList({
    page: requiredListPage(params.page),
    pageSize: requiredListPageSize(params.pageSize),
    q: params.q || undefined,
    pricingPlanId: params.pricingPlanId,
    status: params.status,
  });
  return {
    items: readRequiredApiItems(result, 'Pricing rules could not be loaded').map(normalizePricingRule),
    pageInfo: result.pageInfo,
  };
}

export async function createPricingRule(
  input: AdminPricingRuleMutationInput,
): Promise<AdminPricingRuleItem> {
  const result = await backendRulesCreate(buildRuleCreateRequest(input));
  return normalizePricingRule(readRequiredApiItem(result, 'Pricing rule could not be created'));
}

export async function updatePricingRule(
  ruleId: string,
  input: AdminPricingRuleMutationInput,
): Promise<AdminPricingRuleItem> {
  const result = await backendRulesUpdate(
    requiredPricingText(ruleId, 'ruleId'),
    buildRuleUpdateRequest(input),
  );
  return normalizePricingRule(readRequiredApiItem(result, 'Pricing rule could not be updated'));
}

export async function deletePricingRule(ruleId: string): Promise<void> {
  await backendRulesDelete(requiredPricingText(ruleId, 'ruleId'));
}

export const pricingService = {
  plans: {
    list: fetchPricingPlans,
    retrieve: fetchPricingPlan,
    create: createPricingPlan,
    update: updatePricingPlan,
  },
  rateCards: {
    list: fetchPricingRateCards,
    create: createPricingRateCard,
    update: updatePricingRateCard,
    delete: deletePricingRateCard,
  },
  rules: {
    list: fetchPricingRules,
    create: createPricingRule,
    update: updatePricingRule,
    delete: deletePricingRule,
  },
};

function normalizePricingPlan(value: unknown): AdminPricingPlanItem {
  const item = isRecord(value) ? value as ApiRecord : {} as ApiRecord;
  return {
    id: requireRecordString(item, 'id', 'Pricing plan id is required'),
    planCode: requireRecordString(item, 'planCode', 'Pricing plan code is required'),
    planName: requireRecordString(item, 'planName', 'Pricing plan name is required'),
    basePriceSide: normalizeBasePriceSide(readString(item, 'basePriceSide')),
    currencyCode: readString(item, 'currencyCode').trim() || 'CNY',
    fallbackPolicy: readString(item, 'fallbackPolicy').trim() || 'fail_closed',
    roundingMode: normalizeRoundingMode(readString(item, 'roundingMode')),
    minimumChargeAmount: readString(item, 'minimumChargeAmount').trim() || '0',
    effectiveFrom: optionalTrimmed(item, 'effectiveFrom'),
    effectiveTo: optionalTrimmed(item, 'effectiveTo'),
    status: normalizeStatus(readString(item, 'status')),
    createdAt: optionalTrimmed(item, 'createdAt'),
    updatedAt: optionalTrimmed(item, 'updatedAt'),
    version: optionalTrimmed(item, 'version'),
  };
}

function normalizeRateCard(value: unknown): AdminRateCardItem {
  const item = isRecord(value) ? value as ApiRecord : {} as ApiRecord;
  return {
    id: requireRecordString(item, 'id', 'Rate card id is required'),
    subjectType: normalizeSubjectType(readString(item, 'subjectType')),
    subjectId: optionalTrimmed(item, 'subjectId'),
    subjectCode: optionalTrimmed(item, 'subjectCode'),
    pricingPlanId: requireRecordString(item, 'pricingPlanId', 'Rate card pricing plan id is required'),
    planCode: optionalTrimmed(item, 'planCode'),
    planName: optionalTrimmed(item, 'planName'),
    priority: readNumber(item, 'priority', 100),
    effectiveFrom: optionalTrimmed(item, 'effectiveFrom'),
    effectiveTo: optionalTrimmed(item, 'effectiveTo'),
    status: normalizeStatus(readString(item, 'status')),
    createdAt: optionalTrimmed(item, 'createdAt'),
    updatedAt: optionalTrimmed(item, 'updatedAt'),
  };
}

function normalizePricingRule(value: unknown): AdminPricingRuleItem {
  const item = isRecord(value) ? value as ApiRecord : {} as ApiRecord;
  return {
    id: requireRecordString(item, 'id', 'Pricing rule id is required'),
    pricingPlanId: requireRecordString(item, 'pricingPlanId', 'Pricing rule plan id is required'),
    planCode: optionalTrimmed(item, 'planCode'),
    ruleCode: requireRecordString(item, 'ruleCode', 'Pricing rule code is required'),
    productCode: optionalTrimmed(item, 'productCode'),
    operationCode: optionalTrimmed(item, 'operationCode'),
    meterCode: optionalTrimmed(item, 'meterCode'),
    providerCode: optionalTrimmed(item, 'providerCode'),
    regionCode: optionalTrimmed(item, 'regionCode'),
    catalogKey: optionalTrimmed(item, 'catalogKey'),
    formulaMode: normalizeFormulaMode(readString(item, 'formulaMode')),
    multiplier: readString(item, 'multiplier').trim() || '1',
    markupAmount: readString(item, 'markupAmount').trim() || '0',
    unitPriceOverride: optionalTrimmed(item, 'unitPriceOverride'),
    priority: readNumber(item, 'priority', 100),
    effectiveFrom: optionalTrimmed(item, 'effectiveFrom'),
    effectiveTo: optionalTrimmed(item, 'effectiveTo'),
    status: normalizeStatus(readString(item, 'status')),
    createdAt: optionalTrimmed(item, 'createdAt'),
    updatedAt: optionalTrimmed(item, 'updatedAt'),
  };
}

function buildPlanCreateRequest(input: AdminPricingPlanMutationInput) {
  return {
    planCode: requiredPricingText(input.planCode, 'planCode'),
    planName: requiredPricingText(input.planName, 'planName'),
    basePriceSide: input.basePriceSide,
    currencyCode: normalizeCurrencyCode(input.currencyCode),
    roundingMode: input.roundingMode,
    minimumChargeAmount: normalizeDecimal(input.minimumChargeAmount, 'minimumChargeAmount'),
    effectiveFrom: optionalPricingText(input.effectiveFrom),
    effectiveTo: optionalPricingText(input.effectiveTo),
    status: input.status,
  };
}

function buildPlanUpdateRequest(input: AdminPricingPlanMutationInput) {
  return {
    planName: requiredPricingText(input.planName, 'planName'),
    basePriceSide: input.basePriceSide,
    currencyCode: normalizeCurrencyCode(input.currencyCode),
    roundingMode: input.roundingMode,
    minimumChargeAmount: normalizeDecimal(input.minimumChargeAmount, 'minimumChargeAmount'),
    effectiveFrom: optionalPricingText(input.effectiveFrom),
    effectiveTo: optionalPricingText(input.effectiveTo),
    status: input.status,
  };
}

function buildRateCardCreateRequest(input: AdminRateCardMutationInput) {
  const subject = normalizeRateCardSubject(input);
  return {
    subjectType: input.subjectType,
    subjectId: subject.subjectId,
    subjectCode: subject.subjectCode,
    pricingPlanId: requiredPricingText(input.pricingPlanId, 'pricingPlanId'),
    priority: requiredPriority(input.priority),
    effectiveFrom: optionalPricingText(input.effectiveFrom),
    effectiveTo: optionalPricingText(input.effectiveTo),
    status: input.status,
  };
}

function buildRateCardUpdateRequest(input: AdminRateCardMutationInput) {
  return buildRateCardCreateRequest(input);
}

function buildRuleCreateRequest(input: AdminPricingRuleMutationInput) {
  return {
    ruleCode: requiredPricingText(input.ruleCode, 'ruleCode'),
    pricingPlanId: requiredPricingText(input.pricingPlanId, 'pricingPlanId'),
    productCode: optionalPricingText(input.productCode),
    operationCode: optionalPricingText(input.operationCode),
    meterCode: optionalPricingText(input.meterCode),
    providerCode: optionalPricingText(input.providerCode),
    regionCode: optionalPricingText(input.regionCode),
    catalogKey: optionalPricingText(input.catalogKey),
    formulaMode: input.formulaMode,
    multiplier: normalizeOptionalDecimal(input.multiplier),
    markupAmount: normalizeOptionalDecimal(input.markupAmount),
    unitPriceOverride: normalizeOptionalDecimal(input.unitPriceOverride),
    priority: requiredPriority(input.priority),
    effectiveFrom: optionalPricingText(input.effectiveFrom),
    effectiveTo: optionalPricingText(input.effectiveTo),
    status: input.status,
  };
}

function buildRuleUpdateRequest(input: AdminPricingRuleMutationInput) {
  return {
    pricingPlanId: requiredPricingText(input.pricingPlanId, 'pricingPlanId'),
    productCode: optionalPricingText(input.productCode),
    operationCode: optionalPricingText(input.operationCode),
    meterCode: optionalPricingText(input.meterCode),
    providerCode: optionalPricingText(input.providerCode),
    regionCode: optionalPricingText(input.regionCode),
    catalogKey: optionalPricingText(input.catalogKey),
    formulaMode: input.formulaMode,
    multiplier: normalizeOptionalDecimal(input.multiplier),
    markupAmount: normalizeOptionalDecimal(input.markupAmount),
    unitPriceOverride: normalizeOptionalDecimal(input.unitPriceOverride),
    priority: requiredPriority(input.priority),
    effectiveFrom: optionalPricingText(input.effectiveFrom),
    effectiveTo: optionalPricingText(input.effectiveTo),
    status: input.status,
  };
}

function normalizeRateCardSubject(input: AdminRateCardMutationInput): {
  subjectId?: string;
  subjectCode?: string;
} {
  const subjectId = optionalPricingText(input.subjectId);
  const subjectCode = optionalPricingText(input.subjectCode);
  if ((subjectId !== undefined) === (subjectCode !== undefined)) {
    throw new Error('subjectId and subjectCode are mutually exclusive; provide exactly one');
  }
  if (subjectId !== undefined && !/^-?[0-9]+$/.test(subjectId)) {
    throw new Error('subjectId must be an integer');
  }
  return { subjectId, subjectCode };
}

function normalizeCurrencyCode(value: string): string {
  const normalized = requiredPricingText(value, 'currencyCode').toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error('currencyCode must be a 3-letter ISO currency code');
  }
  return normalized;
}

function normalizeDecimal(value: string, fieldName: string): string {
  const normalized = requiredPricingText(value, fieldName);
  if (!/^[0-9]+(?:\.[0-9]{1,6})?$/.test(normalized)) {
    throw new Error(`${fieldName} must be a non-negative decimal with at most 6 decimal places`);
  }
  return normalized;
}

function normalizeOptionalDecimal(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  return normalizeDecimal(value, 'value');
}

function requiredPriority(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('priority must be a non-negative integer');
  }
  return value;
}

function normalizeBasePriceSide(value: string): AdminBasePriceSide {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'official_reference'
    || normalized === 'upstream_cost'
    || normalized === 'customer_charge'
    || normalized === 'internal_transfer'
  ) {
    return normalized;
  }
  return 'official_reference';
}

function normalizeRoundingMode(value: string): AdminRoundingMode {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'half_up' || normalized === 'half_even' || normalized === 'up' || normalized === 'down') {
    return normalized;
  }
  return 'half_up';
}

function normalizeSubjectType(value: string): AdminRateCardSubjectType {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'default'
    || normalized === 'api_key'
    || normalized === 'account_group'
    || normalized === 'account'
    || normalized === 'user'
    || normalized === 'organization'
  ) {
    return normalized;
  }
  return 'default';
}

function normalizeFormulaMode(value: string): AdminFormulaMode {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'multiplier_markup' || normalized === 'unit_price_override') {
    return normalized;
  }
  return 'multiplier_markup';
}

function normalizeStatus(value: string): AdminPricingStatus {
  return value.trim().toLowerCase() === 'active' ? 'active' : 'inactive';
}

function requiredListPage(value: number | undefined): number {
  const page = Number.isInteger(value) && (value ?? 0) > 0 ? value! : 1;
  return page;
}

function requiredListPageSize(value: number | undefined): number {
  const pageSize = Number.isInteger(value) && (value ?? 0) > 0 ? value! : 20;
  if (pageSize > 200) {
    throw new Error('pageSize must not exceed 200');
  }
  return pageSize;
}

function requiredPricingText(value: string | undefined, fieldName: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
}

function optionalPricingText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function optionalTrimmed(item: ApiRecord, key: string): string | undefined {
  const value = readString(item, key).trim();
  return value || undefined;
}

function requireRecordString(record: ApiRecord, key: string, message: string): string {
  const value = readString(record, key).trim();
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function readNumber(record: ApiRecord, key: string, fallback: number): number {
  const raw = record[key];
  const parsed = typeof raw === 'number'
    ? raw
    : typeof raw === 'string'
      ? Number.parseInt(raw.trim(), 10)
      : Number.NaN;
  return Number.isInteger(parsed) ? parsed : fallback;
}
