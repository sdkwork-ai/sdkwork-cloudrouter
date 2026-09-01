import { backendApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { AdminDefaultRegionItem, AdminDefaultRegionListResponse, AdminPricingPlan, AdminPricingPlanListResponse, AdminPricingRule, AdminPricingRuleListResponse, AdminRateCard, AdminRateCardListResponse, OfficialPricingCatalogResponse, OfficialPricingProductCatalogResponse, PricingDefaultRegionCreateRequest, PricingPlanCreateRequest, PricingPlanUpdateRequest, PricingRuleCreateRequest, PricingRuleUpdateRequest, RateCardCreateRequest, RateCardUpdateRequest } from '../types';


export interface PricingRulesListParams {
  q?: string;
  pricingPlanId?: string;
  status?: 'active' | 'inactive';
  page?: number;
  pageSize?: number;
}

export class PricingRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List pricing rules */
  async list(params?: PricingRulesListParams, requestOptions?: ApiRequestOptions): Promise<AdminPricingRuleListResponse> {
    const query = buildQueryString([
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'pricing_plan_id', value: params?.pricingPlanId, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<AdminPricingRuleListResponse>(appendQueryString(backendApiPath(`/pricing/rules`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Create pricing rule */
  async create(body: PricingRuleCreateRequest, requestOptions?: ApiRequestOptions): Promise<AdminPricingRule> {
    return this.client.request<AdminPricingRule>(backendApiPath(`/pricing/rules`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }

/** Delete pricing rule */
  async delete(ruleId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/pricing/rules/${serializePathParameter(ruleId, { name: 'ruleId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Update pricing rule */
  async update(ruleId: string, body: PricingRuleUpdateRequest, requestOptions?: ApiRequestOptions): Promise<AdminPricingRule> {
    return this.client.request<AdminPricingRule>(backendApiPath(`/pricing/rules/${serializePathParameter(ruleId, { name: 'ruleId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }
}

export interface PricingRateCardsListParams {
  subjectType?: 'default' | 'api_key' | 'account_group' | 'account' | 'user' | 'organization';
  pricingPlanId?: string;
  status?: 'active' | 'inactive';
  page?: number;
  pageSize?: number;
}

export class PricingRateCardsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List pricing rate cards */
  async list(params?: PricingRateCardsListParams, requestOptions?: ApiRequestOptions): Promise<AdminRateCardListResponse> {
    const query = buildQueryString([
      { name: 'subject_type', value: params?.subjectType, style: 'form', explode: true, allowReserved: false },
      { name: 'pricing_plan_id', value: params?.pricingPlanId, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<AdminRateCardListResponse>(appendQueryString(backendApiPath(`/pricing/rate_cards`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Create pricing rate card */
  async create(body: RateCardCreateRequest, requestOptions?: ApiRequestOptions): Promise<AdminRateCard> {
    return this.client.request<AdminRateCard>(backendApiPath(`/pricing/rate_cards`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }

/** Delete pricing rate card */
  async delete(rateCardId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/pricing/rate_cards/${serializePathParameter(rateCardId, { name: 'rateCardId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Update pricing rate card */
  async update(rateCardId: string, body: RateCardUpdateRequest, requestOptions?: ApiRequestOptions): Promise<AdminRateCard> {
    return this.client.request<AdminRateCard>(backendApiPath(`/pricing/rate_cards/${serializePathParameter(rateCardId, { name: 'rateCardId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }
}

export interface PricingPlansListParams {
  q?: string;
  basePriceSide?: 'official_reference' | 'upstream_cost' | 'customer_charge' | 'internal_transfer';
  status?: 'active' | 'inactive';
  page?: number;
  pageSize?: number;
}

export class PricingPlansApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List pricing plans */
  async list(params?: PricingPlansListParams, requestOptions?: ApiRequestOptions): Promise<AdminPricingPlanListResponse> {
    const query = buildQueryString([
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'base_price_side', value: params?.basePriceSide, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<AdminPricingPlanListResponse>(appendQueryString(backendApiPath(`/pricing/plans`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Create pricing plan */
  async create(body: PricingPlanCreateRequest, requestOptions?: ApiRequestOptions): Promise<AdminPricingPlan> {
    return this.client.request<AdminPricingPlan>(backendApiPath(`/pricing/plans`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }

/** List pricing plan */
  async retrieve(planId: string, requestOptions?: ApiRequestOptions): Promise<AdminPricingPlan> {
    return this.client.request<AdminPricingPlan>(backendApiPath(`/pricing/plans/${serializePathParameter(planId, { name: 'planId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }

/** Update pricing plan */
  async update(planId: string, body: PricingPlanUpdateRequest, requestOptions?: ApiRequestOptions): Promise<AdminPricingPlan> {
    return this.client.request<AdminPricingPlan>(backendApiPath(`/pricing/plans/${serializePathParameter(planId, { name: 'planId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }
}

export interface PricingOfficialRatesListParams {
  category?: 'all' | 'llm' | 'image' | 'video' | 'audio' | 'music' | 'embedding' | 'sound' | 'api' | 'other';
  q?: string;
  vendorCode?: string;
  regionCode?: string;
  meterCode?: string;
  currencyCode?: string;
  page?: number;
  pageSize?: number;
}

export class PricingOfficialRatesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List admin official pricing rates */
  async list(params?: PricingOfficialRatesListParams, requestOptions?: ApiRequestOptions): Promise<OfficialPricingCatalogResponse> {
    const query = buildQueryString([
      { name: 'category', value: params?.category, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'vendor_code', value: params?.vendorCode, style: 'form', explode: true, allowReserved: false },
      { name: 'region_code', value: params?.regionCode, style: 'form', explode: true, allowReserved: false },
      { name: 'meter_code', value: params?.meterCode, style: 'form', explode: true, allowReserved: false },
      { name: 'currency_code', value: params?.currencyCode, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<OfficialPricingCatalogResponse>(appendQueryString(backendApiPath(`/pricing/official_rates`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }
}

export interface PricingOfficialProductsListParams {
  category?: 'all' | 'llm' | 'image' | 'video' | 'audio' | 'music' | 'embedding' | 'sound' | 'api' | 'other';
  q?: string;
  vendorCodes?: string[];
  regionCode?: string;
  page?: number;
  pageSize?: number;
}

export class PricingOfficialProductsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List admin official pricing products */
  async list(params?: PricingOfficialProductsListParams, requestOptions?: ApiRequestOptions): Promise<OfficialPricingProductCatalogResponse> {
    const query = buildQueryString([
      { name: 'category', value: params?.category, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'vendor_codes', value: params?.vendorCodes, style: 'form', explode: false, allowReserved: false },
      { name: 'region_code', value: params?.regionCode, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<OfficialPricingProductCatalogResponse>(appendQueryString(backendApiPath(`/pricing/official_products`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }
}

export interface PricingDefaultRegionsListParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export class PricingDefaultRegionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List pricing default regions */
  async list(params?: PricingDefaultRegionsListParams, requestOptions?: ApiRequestOptions): Promise<AdminDefaultRegionListResponse> {
    const query = buildQueryString([
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<AdminDefaultRegionListResponse>(appendQueryString(backendApiPath(`/pricing/default_regions`), query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Create pricing default region */
  async create(body: PricingDefaultRegionCreateRequest, requestOptions?: ApiRequestOptions): Promise<AdminDefaultRegionItem> {
    return this.client.request<AdminDefaultRegionItem>(backendApiPath(`/pricing/default_regions`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }

/** Delete pricing default region */
  async delete(defaultRegionId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/pricing/default_regions/${serializePathParameter(defaultRegionId, { name: 'defaultRegionId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'DELETE' as any });
  }

/** Update pricing default region */
  async update(defaultRegionId: string, body: PricingDefaultRegionCreateRequest, requestOptions?: ApiRequestOptions): Promise<AdminDefaultRegionItem> {
    return this.client.request<AdminDefaultRegionItem>(backendApiPath(`/pricing/default_regions/${serializePathParameter(defaultRegionId, { name: 'defaultRegionId', style: 'simple', explode: false })}`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'PATCH' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }
}

export class PricingApi {
  public readonly defaultRegions: PricingDefaultRegionsApi;
  public readonly officialProducts: PricingOfficialProductsApi;
  public readonly officialRates: PricingOfficialRatesApi;
  public readonly plans: PricingPlansApi;
  public readonly rateCards: PricingRateCardsApi;
  public readonly rules: PricingRulesApi;

  constructor(client: HttpClient) {
    this.defaultRegions = new PricingDefaultRegionsApi(client);
    this.officialProducts = new PricingOfficialProductsApi(client);
    this.officialRates = new PricingOfficialRatesApi(client);
    this.plans = new PricingPlansApi(client);
    this.rateCards = new PricingRateCardsApi(client);
    this.rules = new PricingRulesApi(client);
  }

}

export function createPricingApi(client: HttpClient): PricingApi {
  return new PricingApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}

interface PathParameterSpec {
  name: string;
  style: string;
  explode: boolean;
}

function serializePathParameter(value: unknown, spec: PathParameterSpec): string {
  if (value === undefined || value === null) {
    return '';
  }

  const style = spec.style || 'simple';
  if (Array.isArray(value)) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (typeof value === 'object') {
    return serializePathObject(spec.name, value as Record<string, unknown>, style, spec.explode);
  }
  return pathPrefix(spec.name, style, false) + encodePathValue(serializePathPrimitive(value));
}

function serializePathArray(name: string, values: unknown[], style: string, explode: boolean): string {
  const serialized = values
    .filter((item) => item !== undefined && item !== null)
    .map((item) => encodePathValue(serializePathPrimitive(item)));
  if (serialized.length === 0) {
    return pathPrefix(name, style, false);
  }
  if (style === 'matrix') {
    return explode
      ? serialized.map((item) => `;${name}=${item}`).join('')
      : `;${name}=${serialized.join(',')}`;
  }
  return pathPrefix(name, style, false) + serialized.join(explode ? '.' : ',');
}

function serializePathObject(name: string, value: Record<string, unknown>, style: string, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return pathPrefix(name, style, true);
  }
  if (style === 'matrix') {
    return explode
      ? entries.map(([key, entryValue]) => `;${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join('')
      : `;${name}=${entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',')}`;
  }
  const serialized = explode
    ? entries.map(([key, entryValue]) => `${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join(style === 'label' ? '.' : ',')
    : entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',');
  return pathPrefix(name, style, true) + serialized;
}

function pathPrefix(name: string, style: string, _objectValue: boolean): string {
  if (style === 'label') return '.';
  if (style === 'matrix') return `;${name}`;
  return '';
}

function encodePathValue(value: string): string {
  return encodeURIComponent(value);
}

function serializePathPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
interface QueryParameterSpec {
  name: string;
  value: unknown;
  style: string;
  explode: boolean;
  allowReserved: boolean;
  contentType?: string;
}

function buildQueryString(parameters: QueryParameterSpec[]): string {
  const pairs: string[] = [];
  for (const parameter of parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join('&');
}

function appendSerializedParameter(pairs: string[], parameter: QueryParameterSpec): void {
  if (parameter.value === undefined || parameter.value === null) {
    return;
  }

  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }

  const style = parameter.style || 'form';
  if (style === 'deepObject') {
    appendDeepObjectParameter(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }

  if (Array.isArray(parameter.value)) {
    appendArrayParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }

  if (typeof parameter.value === 'object') {
    appendObjectParameter(pairs, parameter.name, parameter.value as Record<string, unknown>, style, parameter.explode, parameter.allowReserved);
    return;
  }

  pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(serializePrimitive(parameter.value), parameter.allowReserved)}`);
}

function appendArrayParameter(
  pairs: string[],
  name: string,
  value: unknown[],
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const values = value
    .filter((item) => item !== undefined && item !== null)
    .map((item) => serializePrimitive(item));
  if (values.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(item, allowReserved)}`);
    }
    return;
  }

  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(values.join(','), allowReserved)}`);
}

function appendObjectParameter(
  pairs: string[],
  name: string,
  value: Record<string, unknown>,
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent(key)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
    }
    return;
  }

  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive(entryValue)]).join(',');
  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serialized, allowReserved)}`);
}

function appendDeepObjectParameter(
  pairs: string[],
  name: string,
  value: unknown,
  allowReserved: boolean,
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serializePrimitive(value), allowReserved)}`);
    return;
  }

  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    if (entryValue === undefined || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent(`${name}[${key}]`)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
  }
}

function serializePrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value);
}

function encodeQueryValue(value: string, allowReserved: boolean): string {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ':')
    .replace(/%2F/gi, '/')
    .replace(/%3F/gi, '?')
    .replace(/%23/gi, '#')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']')
    .replace(/%40/gi, '@')
    .replace(/%21/gi, '!')
    .replace(/%24/gi, '$')
    .replace(/%26/gi, '&')
    .replace(/%27/gi, "'")
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')
    .replace(/%2A/gi, '*')
    .replace(/%2B/gi, '+')
    .replace(/%2C/gi, ',')
    .replace(/%3B/gi, ';')
    .replace(/%3D/gi, '=');
}
