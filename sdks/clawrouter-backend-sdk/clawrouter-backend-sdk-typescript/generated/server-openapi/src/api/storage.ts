import { backendApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';
import type { AdminStorageBucketCreateRequest, AdminStorageDefaultBucketUpdateRequest, AdminStorageGarbageCollectionCreateRequest, AdminStorageProviderCreateRequest, AdminStorageQuotaCreateRequest, AdminStorageReconciliationCreateRequest, AdminStorageStatusUpdateRequest } from '../types';
export class StorageProvidersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Backend storage provider health check */
  async healthCheck(providerId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/health_check`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, sdkworkUnwrapKind: 'data' });
  }
}

export interface StorageGcJobsListParams {
  cursor?: string;
  pageSize?: number;
  status?: string;
  logicalScope?: string;
  scopeType?: string;
  scopeId?: string;
  runType?: string;
}

export interface StorageGcJobsCreateParams {
  idempotencyKey: string;
}

export class StorageGcJobsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Backend storage garbage collection jobs list */
  async list(params?: StorageGcJobsListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'logical_scope', value: params?.logicalScope, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_type', value: params?.scopeType, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_id', value: params?.scopeId, style: 'form', explode: true, allowReserved: false },
      { name: 'run_type', value: params?.runType, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/storage/gc_jobs`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }

/** Backend storage garbage collection job create */
  async create(params: StorageGcJobsCreateParams, body?: AdminStorageGarbageCollectionCreateRequest, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<Record<string, never>>(backendApiPath(`/storage/gc_jobs`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }
}

export interface StorageDefaultBucketsListParams {
  cursor?: string;
  pageSize?: number;
  status?: string;
  logicalScope?: string;
  scopeType?: string;
  scopeId?: string;
  runType?: string;
}

export class StorageDefaultBucketsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Backend storage default buckets list */
  async list(params?: StorageDefaultBucketsListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'logical_scope', value: params?.logicalScope, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_type', value: params?.scopeType, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_id', value: params?.scopeId, style: 'form', explode: true, allowReserved: false },
      { name: 'run_type', value: params?.runType, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/storage/default_buckets`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }

/** Backend storage default bucket update */
  async update(logicalScope: string, body: AdminStorageDefaultBucketUpdateRequest, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/storage/default_buckets/${serializePathParameter(logicalScope, { name: 'logicalScope', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }
}

export interface StorageOssUsageListParams {
  cursor?: string;
  pageSize?: number;
  status?: string;
  logicalScope?: string;
  scopeType?: string;
  scopeId?: string;
  runType?: string;
}

export class StorageOssUsageApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Backend storage usage list */
  async list(params?: StorageOssUsageListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'logical_scope', value: params?.logicalScope, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_type', value: params?.scopeType, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_id', value: params?.scopeId, style: 'form', explode: true, allowReserved: false },
      { name: 'run_type', value: params?.runType, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/storage/usage`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }
}

export interface StorageOssStorageReconciliationRunsListParams {
  cursor?: string;
  pageSize?: number;
  status?: string;
  logicalScope?: string;
  scopeType?: string;
  scopeId?: string;
  runType?: string;
}

export interface StorageOssStorageReconciliationRunsCreateParams {
  idempotencyKey: string;
}

export class StorageOssStorageReconciliationRunsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Backend storage reconciliation runs list */
  async list(params?: StorageOssStorageReconciliationRunsListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'logical_scope', value: params?.logicalScope, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_type', value: params?.scopeType, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_id', value: params?.scopeId, style: 'form', explode: true, allowReserved: false },
      { name: 'run_type', value: params?.runType, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/storage/reconciliation_runs`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }

/** Backend storage reconciliation run create */
  async create(params: StorageOssStorageReconciliationRunsCreateParams, body?: AdminStorageReconciliationCreateRequest, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<Record<string, never>>(backendApiPath(`/storage/reconciliation_runs`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }
}

export interface StorageOssQuotasListParams {
  cursor?: string;
  pageSize?: number;
  status?: string;
  logicalScope?: string;
  scopeType?: string;
  scopeId?: string;
  runType?: string;
}

export interface StorageOssQuotasCreateParams {
  idempotencyKey: string;
}

export class StorageOssQuotasApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Backend storage quotas list */
  async list(params?: StorageOssQuotasListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'logical_scope', value: params?.logicalScope, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_type', value: params?.scopeType, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_id', value: params?.scopeId, style: 'form', explode: true, allowReserved: false },
      { name: 'run_type', value: params?.runType, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/storage/quotas`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }

/** Backend storage quota create */
  async create(body: AdminStorageQuotaCreateRequest, params: StorageOssQuotasCreateParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<Record<string, never>>(backendApiPath(`/storage/quotas`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }
}

export interface StorageOssProvidersListParams {
  cursor?: string;
  pageSize?: number;
  status?: string;
  logicalScope?: string;
  scopeType?: string;
  scopeId?: string;
  runType?: string;
}

export interface StorageOssProvidersCreateParams {
  idempotencyKey: string;
}

export class StorageOssProvidersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Backend storage providers list */
  async list(params?: StorageOssProvidersListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'logical_scope', value: params?.logicalScope, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_type', value: params?.scopeType, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_id', value: params?.scopeId, style: 'form', explode: true, allowReserved: false },
      { name: 'run_type', value: params?.runType, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/storage/providers`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }

/** Backend storage provider create */
  async create(body: AdminStorageProviderCreateRequest, params: StorageOssProvidersCreateParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<Record<string, never>>(backendApiPath(`/storage/providers`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }

/** Update */
  async update(providerId: string, body: AdminStorageStatusUpdateRequest, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }
}

export interface StorageOssBucketsListParams {
  cursor?: string;
  pageSize?: number;
  status?: string;
  logicalScope?: string;
  scopeType?: string;
  scopeId?: string;
  runType?: string;
}

export interface StorageOssBucketsCreateParams {
  idempotencyKey: string;
}

export class StorageOssBucketsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Backend storage buckets list */
  async list(params?: StorageOssBucketsListParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const query = buildQueryString([
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'logical_scope', value: params?.logicalScope, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_type', value: params?.scopeType, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_id', value: params?.scopeId, style: 'form', explode: true, allowReserved: false },
      { name: 'run_type', value: params?.runType, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<Record<string, never>>(appendQueryString(backendApiPath(`/storage/buckets`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }

/** Backend storage bucket create */
  async create(body: AdminStorageBucketCreateRequest, params: StorageOssBucketsCreateParams, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<Record<string, never>>(backendApiPath(`/storage/buckets`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }

/** Update */
  async update(bucketId: string, body: AdminStorageStatusUpdateRequest, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/storage/buckets/${serializePathParameter(bucketId, { name: 'bucketId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'data' });
  }
}

export class StorageOssApi {
  private client: HttpClient;
  public readonly buckets: StorageOssBucketsApi;
  public readonly providers: StorageOssProvidersApi;
  public readonly quotas: StorageOssQuotasApi;
  public readonly storageReconciliationRuns: StorageOssStorageReconciliationRunsApi;
  public readonly usage: StorageOssUsageApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.buckets = new StorageOssBucketsApi(client);
    this.providers = new StorageOssProvidersApi(client);
    this.quotas = new StorageOssQuotasApi(client);
    this.storageReconciliationRuns = new StorageOssStorageReconciliationRunsApi(client);
    this.usage = new StorageOssUsageApi(client);
  }

}

export class StorageApi {
  private client: HttpClient;
  public readonly oss: StorageOssApi;
  public readonly defaultBuckets: StorageDefaultBucketsApi;
  public readonly gcJobs: StorageGcJobsApi;
  public readonly providers: StorageProvidersApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.oss = new StorageOssApi(client);
    this.defaultBuckets = new StorageDefaultBucketsApi(client);
    this.gcJobs = new StorageGcJobsApi(client);
    this.providers = new StorageProvidersApi(client);
  }

}

export function createStorageApi(client: HttpClient): StorageApi {
  return new StorageApi(client);
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
function buildRequestHeaders(
  headers: Record<string, HeaderParameterSpec | undefined>,
  cookies: Record<string, HeaderParameterSpec | undefined> = {},
): Record<string, string> | undefined {
  const requestHeaders: Record<string, string> = {};

  for (const [name, parameter] of Object.entries(headers)) {
    const serialized = serializeParameterValue(parameter);
    if (serialized !== undefined) {
      requestHeaders[name] = serialized;
    }
  }

  const cookieHeader = buildCookieHeader(cookies);
  if (cookieHeader) {
    requestHeaders.Cookie = requestHeaders.Cookie
      ? `${requestHeaders.Cookie}; ${cookieHeader}`
      : cookieHeader;
  }

  return Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined;
}

interface HeaderParameterSpec {
  value: unknown;
  style: string;
  explode: boolean;
  contentType?: string;
}

function buildCookieHeader(cookies: Record<string, HeaderParameterSpec | undefined>): string | undefined {
  const pairs: string[] = [];
  for (const [name, parameter] of Object.entries(cookies)) {
    const serialized = serializeParameterValue(parameter);
    if (serialized !== undefined) {
      pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(serialized)}`);
    }
  }
  return pairs.length > 0 ? pairs.join('; ') : undefined;
}

function serializeParameterValue(parameter: HeaderParameterSpec | undefined): string | undefined {
  const value = parameter?.value;
  if (value === undefined || value === null) {
    return undefined;
  }
  if (parameter?.contentType) {
    return JSON.stringify(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeHeaderPrimitive(item)).join(',');
  }
  if (typeof value === 'object' && value !== null) {
    return serializeHeaderObject(value as Record<string, unknown>, parameter?.explode === true);
  }
  return serializeHeaderPrimitive(value);
}

function serializeHeaderObject(value: Record<string, unknown>, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (explode) {
    return entries.map(([key, entryValue]) => `${key}=${serializeHeaderPrimitive(entryValue)}`).join(',');
  }
  return entries.flatMap(([key, entryValue]) => [key, serializeHeaderPrimitive(entryValue)]).join(',');
}

function serializeHeaderPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}
