import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { CommerceApiResult, CommerceOperationCommand } from '../types';


export class PaymentsStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments status retrieve. */
  async retrieve(paymentId: string): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/payments/status/${serializePathParameter(paymentId, { name: 'paymentId', style: 'simple', explode: false })}`));
  }

/** Payments status retrieve By Out Trade No. */
  async retrieveByOutTradeNo(outTradeNo: string): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/payments/status/out_trade_no/${serializePathParameter(outTradeNo, { name: 'outTradeNo', style: 'simple', explode: false })}`));
  }
}

export class PaymentsStatisticsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments statistics retrieve. */
  async retrieve(): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/payments/statistics`));
  }
}

export interface PaymentsRecordsListParams {
  status?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export class PaymentsRecordsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments records list. */
  async list(params?: PaymentsRecordsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(appApiPath(`/payments/records`), query));
  }

/** Payments records retrieve. */
  async retrieve(paymentId: string): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/payments/records/${serializePathParameter(paymentId, { name: 'paymentId', style: 'simple', explode: false })}`));
  }
}

export class PaymentsAttemptsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments attempts retrieve. */
  async retrieve(paymentAttemptId: string): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/payments/attempts/${serializePathParameter(paymentAttemptId, { name: 'paymentAttemptId', style: 'simple', explode: false })}`));
  }
}

export class PaymentsIntentsAttemptsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments intents attempts create. */
  async create(paymentIntentId: string, body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/payments/intents/${serializePathParameter(paymentIntentId, { name: 'paymentIntentId', style: 'simple', explode: false })}/attempts`), body, undefined, undefined, 'application/json');
  }
}

export class PaymentsIntentsApi {
  private client: HttpClient;
  public readonly attempts: PaymentsIntentsAttemptsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.attempts = new PaymentsIntentsAttemptsApi(client);
  }


/** Payments intents create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/payments/intents`), body, undefined, undefined, 'application/json');
  }

/** Payments intents retrieve. */
  async retrieve(paymentIntentId: string): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/payments/intents/${serializePathParameter(paymentIntentId, { name: 'paymentIntentId', style: 'simple', explode: false })}`));
  }

/** Payments intents cancel. */
  async cancel(paymentIntentId: string, body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/payments/intents/${serializePathParameter(paymentIntentId, { name: 'paymentIntentId', style: 'simple', explode: false })}/cancel`), body, undefined, undefined, 'application/json');
  }
}

export class PaymentsMethodsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments methods list. */
  async list(): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/payments/methods`));
  }
}

export class PaymentsCheckoutApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments checkout retrieve. */
  async retrieve(paymentId: string): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/payments/checkout/${serializePathParameter(paymentId, { name: 'paymentId', style: 'simple', explode: false })}`));
  }
}

export class PaymentsOrderPaymentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments order Payments list. */
  async list(orderId: string): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/payments`));
  }
}

export class PaymentsApi {
  private client: HttpClient;
  public readonly orderPayments: PaymentsOrderPaymentsApi;
  public readonly checkout: PaymentsCheckoutApi;
  public readonly methods: PaymentsMethodsApi;
  public readonly intents: PaymentsIntentsApi;
  public readonly attempts: PaymentsAttemptsApi;
  public readonly records: PaymentsRecordsApi;
  public readonly statistics: PaymentsStatisticsApi;
  public readonly status: PaymentsStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.orderPayments = new PaymentsOrderPaymentsApi(client);
    this.checkout = new PaymentsCheckoutApi(client);
    this.methods = new PaymentsMethodsApi(client);
    this.intents = new PaymentsIntentsApi(client);
    this.attempts = new PaymentsAttemptsApi(client);
    this.records = new PaymentsRecordsApi(client);
    this.statistics = new PaymentsStatisticsApi(client);
    this.status = new PaymentsStatusApi(client);
  }


/** Payments close. */
  async close(paymentId: string, body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/payments/${serializePathParameter(paymentId, { name: 'paymentId', style: 'simple', explode: false })}/close`), body, undefined, undefined, 'application/json');
  }

/** Payments create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/payments`), body, undefined, undefined, 'application/json');
  }

/** Payments reconcile. */
  async reconcile(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/payments/reconciliations`), body, undefined, undefined, 'application/json');
  }
}

export function createPaymentsApi(client: HttpClient): PaymentsApi {
  return new PaymentsApi(client);
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
