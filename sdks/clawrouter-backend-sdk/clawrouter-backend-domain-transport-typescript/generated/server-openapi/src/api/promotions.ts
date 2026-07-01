import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { CommerceApiResult, CommerceOperationCommand } from '../types';


export interface PromotionsEventsListParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export class PromotionsEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Promotions events list. */
  async list(params?: PromotionsEventsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/promotions/events`), query));
  }
}

export interface PromotionsExternalBindingsListParams {
  platform?: string;
  page?: number;
  pageSize?: number;
}

export class PromotionsExternalBindingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Promotions external Bindings list. */
  async list(params?: PromotionsExternalBindingsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'platform', value: params?.platform, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/promotions/external_bindings`), query));
  }
}

export interface PromotionsBudgetLedgerEntriesListParams {
  budgetAccountId?: string;
  page?: number;
  pageSize?: number;
}

export class PromotionsBudgetLedgerEntriesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Promotions budget Ledger Entries list. */
  async list(params?: PromotionsBudgetLedgerEntriesListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'budget_account_id', value: params?.budgetAccountId, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/promotions/budget_ledger_entries`), query));
  }
}

export interface PromotionsCouponLedgerEntriesListParams {
  stockId?: string;
  page?: number;
  pageSize?: number;
}

export class PromotionsCouponLedgerEntriesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Promotions coupon Ledger Entries list. */
  async list(params?: PromotionsCouponLedgerEntriesListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'stock_id', value: params?.stockId, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/promotions/coupon_ledger_entries`), query));
  }
}

export interface PromotionsDiscountAllocationsListParams {
  applicationId?: string;
  orderItemId?: string;
  page?: number;
  pageSize?: number;
}

export class PromotionsDiscountAllocationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Promotions discount Allocations list. */
  async list(params?: PromotionsDiscountAllocationsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'application_id', value: params?.applicationId, style: 'form', explode: true, allowReserved: false },
      { name: 'order_item_id', value: params?.orderItemId, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/promotions/discount_allocations`), query));
  }
}

export interface PromotionsDiscountApplicationsListParams {
  orderId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export class PromotionsDiscountApplicationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Promotions discount Applications list. */
  async list(params?: PromotionsDiscountApplicationsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'order_id', value: params?.orderId, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/promotions/discount_applications`), query));
  }
}

export interface PromotionsUserCouponsManagementListParams {
  userId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export class PromotionsUserCouponsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Promotions user Coupons management list. */
  async list(params?: PromotionsUserCouponsManagementListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'user_id', value: params?.userId, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/promotions/user_coupons`), query));
  }
}

export class PromotionsUserCouponsApi {
  private client: HttpClient;
  public readonly management: PromotionsUserCouponsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new PromotionsUserCouponsManagementApi(client);
  }

}

export interface PromotionsCodesRedemptionsListParams {
  page?: number;
  pageSize?: number;
  codeStatus?: string;
}

export class PromotionsCodesRedemptionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Promotions codes redemptions list. */
  async list(params?: PromotionsCodesRedemptionsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'code_status', value: params?.codeStatus, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/promotions/codes/redemptions`), query));
  }
}

export interface PromotionsCodesListParams {
  stockId?: string;
  offerId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export class PromotionsCodesApi {
  private client: HttpClient;
  public readonly redemptions: PromotionsCodesRedemptionsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.redemptions = new PromotionsCodesRedemptionsApi(client);
  }


/** Promotions codes list. */
  async list(params?: PromotionsCodesListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'stock_id', value: params?.stockId, style: 'form', explode: true, allowReserved: false },
      { name: 'offer_id', value: params?.offerId, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/promotions/codes`), query));
  }

/** Promotions codes create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/promotions/codes`), body, undefined, undefined, 'application/json');
  }
}

export interface PromotionsCouponStocksListParams {
  offerId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export class PromotionsCouponStocksApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Promotions coupon Stocks list. */
  async list(params?: PromotionsCouponStocksListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'offer_id', value: params?.offerId, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/promotions/coupon_stocks`), query));
  }

/** Promotions coupon Stocks create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/promotions/coupon_stocks`), body, undefined, undefined, 'application/json');
  }
}

export interface PromotionsOffersManagementListParams {
  status?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export class PromotionsOffersManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Promotions offers management list. */
  async list(params?: PromotionsOffersManagementListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/promotions/offers`), query));
  }
}

export class PromotionsOffersApi {
  private client: HttpClient;
  public readonly management: PromotionsOffersManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new PromotionsOffersManagementApi(client);
  }


/** Promotions offers create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/promotions/offers`), body, undefined, undefined, 'application/json');
  }

/** Promotions offers update. */
  async update(offerId: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(backendApiPath(`/promotions/offers/${serializePathParameter(offerId, { name: 'offerId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export class PromotionsApi {
  private client: HttpClient;
  public readonly offers: PromotionsOffersApi;
  public readonly couponStocks: PromotionsCouponStocksApi;
  public readonly codes: PromotionsCodesApi;
  public readonly userCoupons: PromotionsUserCouponsApi;
  public readonly discountApplications: PromotionsDiscountApplicationsApi;
  public readonly discountAllocations: PromotionsDiscountAllocationsApi;
  public readonly couponLedgerEntries: PromotionsCouponLedgerEntriesApi;
  public readonly budgetLedgerEntries: PromotionsBudgetLedgerEntriesApi;
  public readonly externalBindings: PromotionsExternalBindingsApi;
  public readonly events: PromotionsEventsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.offers = new PromotionsOffersApi(client);
    this.couponStocks = new PromotionsCouponStocksApi(client);
    this.codes = new PromotionsCodesApi(client);
    this.userCoupons = new PromotionsUserCouponsApi(client);
    this.discountApplications = new PromotionsDiscountApplicationsApi(client);
    this.discountAllocations = new PromotionsDiscountAllocationsApi(client);
    this.couponLedgerEntries = new PromotionsCouponLedgerEntriesApi(client);
    this.budgetLedgerEntries = new PromotionsBudgetLedgerEntriesApi(client);
    this.externalBindings = new PromotionsExternalBindingsApi(client);
    this.events = new PromotionsEventsApi(client);
  }

}

export function createPromotionsApi(client: HttpClient): PromotionsApi {
  return new PromotionsApi(client);
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
