import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { CommerceApiResult, CommerceOperationCommand } from '../types';


export interface PaymentsDisputesListParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export class PaymentsDisputesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments disputes list. */
  async list(params?: PaymentsDisputesListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/payments/disputes`), query));
  }
}

export interface PaymentsRuntimeSnapshotRetrieveParams {
  environment?: string;
}

export class PaymentsRuntimeSnapshotApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments runtime snapshot retrieve. */
  async retrieve(params?: PaymentsRuntimeSnapshotRetrieveParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'environment', value: params?.environment, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/payments/runtime/snapshot`), query));
  }
}

export class PaymentsRuntimeApi {
  private client: HttpClient;
  public readonly snapshot: PaymentsRuntimeSnapshotApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.snapshot = new PaymentsRuntimeSnapshotApi(client);
  }

}

export interface PaymentsReconciliationRunsListParams {
  providerCode?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export class PaymentsReconciliationRunsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments reconciliation Runs list. */
  async list(params?: PaymentsReconciliationRunsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'provider_code', value: params?.providerCode, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/payments/reconciliation_runs`), query));
  }

/** Payments reconciliation Runs create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/payments/reconciliation_runs`), body, undefined, undefined, 'application/json');
  }
}

export class PaymentsWebhookEventsReplaysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments webhook Events replays create. */
  async create(eventId: string, body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/payments/webhook_events/${serializePathParameter(eventId, { name: 'eventId', style: 'simple', explode: false })}/replays`), body, undefined, undefined, 'application/json');
  }
}

export interface PaymentsWebhookEventsListParams {
  providerCode?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export class PaymentsWebhookEventsApi {
  private client: HttpClient;
  public readonly replays: PaymentsWebhookEventsReplaysApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.replays = new PaymentsWebhookEventsReplaysApi(client);
  }


/** Payments webhook Events list. */
  async list(params?: PaymentsWebhookEventsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'provider_code', value: params?.providerCode, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/payments/webhook_events`), query));
  }
}

export interface PaymentsAttemptsListParams {
  providerCode?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export class PaymentsAttemptsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments attempts list. */
  async list(params?: PaymentsAttemptsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'provider_code', value: params?.providerCode, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/payments/attempts`), query));
  }
}

export class PaymentsIntentsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments intents management retrieve. */
  async retrieve(paymentIntentId: string): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(backendApiPath(`/payments/intents/${serializePathParameter(paymentIntentId, { name: 'paymentIntentId', style: 'simple', explode: false })}`));
  }
}

export interface PaymentsIntentsListParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export class PaymentsIntentsApi {
  private client: HttpClient;
  public readonly management: PaymentsIntentsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new PaymentsIntentsManagementApi(client);
  }


/** Payments intents list. */
  async list(params?: PaymentsIntentsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/payments/intents`), query));
  }
}

export interface PaymentsRouteRulesListParams {
  status?: string;
}

export class PaymentsRouteRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments route Rules list. */
  async list(params?: PaymentsRouteRulesListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/payments/route_rules`), query));
  }

/** Payments route Rules create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/payments/route_rules`), body, undefined, undefined, 'application/json');
  }

/** Payments route Rules update. */
  async update(routeRuleId: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(backendApiPath(`/payments/route_rules/${serializePathParameter(routeRuleId, { name: 'routeRuleId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export interface PaymentsChannelsListParams {
  providerAccountId?: string;
  methodId?: string;
  status?: string;
}

export class PaymentsChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments channels list. */
  async list(params?: PaymentsChannelsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'provider_account_id', value: params?.providerAccountId, style: 'form', explode: true, allowReserved: false },
      { name: 'method_id', value: params?.methodId, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/payments/channels`), query));
  }

/** Payments channels create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/payments/channels`), body, undefined, undefined, 'application/json');
  }

/** Payments channels update. */
  async update(channelId: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(backendApiPath(`/payments/channels/${serializePathParameter(channelId, { name: 'channelId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export interface PaymentsMethodsManagementListParams {
  status?: string;
}

export class PaymentsMethodsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments methods management list. */
  async list(params?: PaymentsMethodsManagementListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/payments/methods`), query));
  }
}

export class PaymentsMethodsApi {
  private client: HttpClient;
  public readonly management: PaymentsMethodsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new PaymentsMethodsManagementApi(client);
  }


/** Payments methods create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/payments/methods`), body, undefined, undefined, 'application/json');
  }

/** Payments methods update. */
  async update(methodId: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(backendApiPath(`/payments/methods/${serializePathParameter(methodId, { name: 'methodId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export class PaymentsProviderAccountsStatusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments provider Accounts status update. */
  async update(providerAccountId: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(backendApiPath(`/payments/provider_accounts/${serializePathParameter(providerAccountId, { name: 'providerAccountId', style: 'simple', explode: false })}/status`), body, undefined, undefined, 'application/json');
  }
}

export interface PaymentsProviderAccountsListParams {
  providerCode?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export class PaymentsProviderAccountsApi {
  private client: HttpClient;
  public readonly status: PaymentsProviderAccountsStatusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.status = new PaymentsProviderAccountsStatusApi(client);
  }


/** Payments provider Accounts list. */
  async list(params?: PaymentsProviderAccountsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'provider_code', value: params?.providerCode, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/payments/provider_accounts`), query));
  }

/** Payments provider Accounts create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/payments/provider_accounts`), body, undefined, undefined, 'application/json');
  }

/** Payments provider Accounts update. */
  async update(providerAccountId: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(backendApiPath(`/payments/provider_accounts/${serializePathParameter(providerAccountId, { name: 'providerAccountId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

/** Payments provider Accounts delete. */
  async delete(providerAccountId: string): Promise<CommerceApiResult> {
    return this.client.delete<CommerceApiResult>(backendApiPath(`/payments/provider_accounts/${serializePathParameter(providerAccountId, { name: 'providerAccountId', style: 'simple', explode: false })}`));
  }
}

export interface PaymentsProvidersListParams {
  status?: string;
}

export class PaymentsProvidersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Payments providers list. */
  async list(params?: PaymentsProvidersListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/payments/providers`), query));
  }

/** Payments providers update. */
  async update(providerCode: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(backendApiPath(`/payments/providers/${serializePathParameter(providerCode, { name: 'providerCode', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export class PaymentsApi {
  private client: HttpClient;
  public readonly providers: PaymentsProvidersApi;
  public readonly providerAccounts: PaymentsProviderAccountsApi;
  public readonly methods: PaymentsMethodsApi;
  public readonly channels: PaymentsChannelsApi;
  public readonly routeRules: PaymentsRouteRulesApi;
  public readonly intents: PaymentsIntentsApi;
  public readonly attempts: PaymentsAttemptsApi;
  public readonly webhookEvents: PaymentsWebhookEventsApi;
  public readonly reconciliationRuns: PaymentsReconciliationRunsApi;
  public readonly runtime: PaymentsRuntimeApi;
  public readonly disputes: PaymentsDisputesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.providers = new PaymentsProvidersApi(client);
    this.providerAccounts = new PaymentsProviderAccountsApi(client);
    this.methods = new PaymentsMethodsApi(client);
    this.channels = new PaymentsChannelsApi(client);
    this.routeRules = new PaymentsRouteRulesApi(client);
    this.intents = new PaymentsIntentsApi(client);
    this.attempts = new PaymentsAttemptsApi(client);
    this.webhookEvents = new PaymentsWebhookEventsApi(client);
    this.reconciliationRuns = new PaymentsReconciliationRunsApi(client);
    this.runtime = new PaymentsRuntimeApi(client);
    this.disputes = new PaymentsDisputesApi(client);
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
