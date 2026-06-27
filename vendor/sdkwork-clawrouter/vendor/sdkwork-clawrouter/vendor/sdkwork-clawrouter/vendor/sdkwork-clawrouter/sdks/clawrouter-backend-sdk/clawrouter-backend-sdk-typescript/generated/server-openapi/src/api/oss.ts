import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { DefaultBucketsListResult, DefaultBucketsUpdateResult, GcJobsCreateResult, GcJobsListResult, OssBucketsCreateResult, OssBucketsListResult, OssBucketsUpdateResult, OssProvidersCreateResult, OssProvidersListResult, OssProvidersUpdateResult, OssQuotasCreateResult, OssQuotasListResult, OssStorageReconciliationRunsCreateResult, OssStorageReconciliationRunsListResult, OssUsageListResult, ProvidersHealthCheckCreateResult, StorageBucketCreateRequest, StorageBucketUpdateRequest, StorageDefaultBucketUpdateRequest, StorageGarbageCollectionJobCreateRequest, StorageProviderCreateRequest, StorageProviderUpdateRequest, StorageQuotaCreateRequest, StorageReconciliationRunCreateRequest } from '../types';


export interface OssUsageListParams {
  cursor?: string;
  limit?: string;
  scopeType?: string;
  scopeId?: string;
}

export class OssUsageApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List storage usage counters */
  async list(params?: OssUsageListParams): Promise<OssUsageListResult> {
    const query = buildQueryString([
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_type', value: params?.scopeType, style: 'form', explode: true, allowReserved: false },
      { name: 'scope_id', value: params?.scopeId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OssUsageListResult>(appendQueryString(backendApiPath(`/storage/usage`), query));
  }
}

export interface OssStorageReconciliationRunsListParams {
  cursor?: string;
  limit?: string;
  status?: string;
  runType?: string;
}

export class OssStorageReconciliationRunsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List storage reconciliation runs */
  async list(params?: OssStorageReconciliationRunsListParams): Promise<OssStorageReconciliationRunsListResult> {
    const query = buildQueryString([
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'run_type', value: params?.runType, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OssStorageReconciliationRunsListResult>(appendQueryString(backendApiPath(`/storage/reconciliation_runs`), query));
  }

/** Create storage reconciliation run */
  async create(body: StorageReconciliationRunCreateRequest): Promise<OssStorageReconciliationRunsCreateResult> {
    return this.client.post<OssStorageReconciliationRunsCreateResult>(backendApiPath(`/storage/reconciliation_runs`), body, undefined, undefined, 'application/json');
  }
}

export class OssQuotasApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List storage quota policies */
  async list(): Promise<OssQuotasListResult> {
    return this.client.get<OssQuotasListResult>(backendApiPath(`/storage/quotas`));
  }

/** Create storage quota policy */
  async create(body: StorageQuotaCreateRequest): Promise<OssQuotasCreateResult> {
    return this.client.post<OssQuotasCreateResult>(backendApiPath(`/storage/quotas`), body, undefined, undefined, 'application/json');
  }
}

export class OssProvidersHealthCheckApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Health check storage provider */
  async create(providerId: string): Promise<ProvidersHealthCheckCreateResult> {
    return this.client.post<ProvidersHealthCheckCreateResult>(backendApiPath(`/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/health_check`));
  }
}

export class OssProvidersApi {
  private client: HttpClient;
  public readonly healthCheck: OssProvidersHealthCheckApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.healthCheck = new OssProvidersHealthCheckApi(client);
  }


/** List storage providers */
  async list(): Promise<OssProvidersListResult> {
    return this.client.get<OssProvidersListResult>(backendApiPath(`/storage/providers`));
  }

/** Create storage provider */
  async create(body: StorageProviderCreateRequest): Promise<OssProvidersCreateResult> {
    return this.client.post<OssProvidersCreateResult>(backendApiPath(`/storage/providers`), body, undefined, undefined, 'application/json');
  }

/** Update storage provider */
  async update(providerId: string, body: StorageProviderUpdateRequest): Promise<OssProvidersUpdateResult> {
    return this.client.patch<OssProvidersUpdateResult>(backendApiPath(`/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export interface OssGcJobsListParams {
  cursor?: string;
  limit?: string;
  status?: string;
}

export class OssGcJobsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List storage garbage collection jobs */
  async list(params?: OssGcJobsListParams): Promise<GcJobsListResult> {
    const query = buildQueryString([
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<GcJobsListResult>(appendQueryString(backendApiPath(`/storage/gc_jobs`), query));
  }

/** Create storage garbage collection job */
  async create(body: StorageGarbageCollectionJobCreateRequest): Promise<GcJobsCreateResult> {
    return this.client.post<GcJobsCreateResult>(backendApiPath(`/storage/gc_jobs`), body, undefined, undefined, 'application/json');
  }
}

export interface OssDefaultBucketsListParams {
  logicalScope?: string;
}

export class OssDefaultBucketsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List storage default buckets */
  async list(params?: OssDefaultBucketsListParams): Promise<DefaultBucketsListResult> {
    const query = buildQueryString([
      { name: 'logical_scope', value: params?.logicalScope, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<DefaultBucketsListResult>(appendQueryString(backendApiPath(`/storage/default_buckets`), query));
  }

/** Set storage default bucket */
  async update(logicalScope: string, body: StorageDefaultBucketUpdateRequest): Promise<DefaultBucketsUpdateResult> {
    return this.client.patch<DefaultBucketsUpdateResult>(backendApiPath(`/storage/default_buckets/${serializePathParameter(logicalScope, { name: 'logicalScope', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export interface OssBucketsListParams {
  cursor?: string;
  limit?: string;
  logicalScope?: string;
  providerId?: string;
  status?: string;
}

export class OssBucketsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List storage buckets */
  async list(params?: OssBucketsListParams): Promise<OssBucketsListResult> {
    const query = buildQueryString([
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'logical_scope', value: params?.logicalScope, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_id', value: params?.providerId, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OssBucketsListResult>(appendQueryString(backendApiPath(`/storage/buckets`), query));
  }

/** Create storage bucket */
  async create(body: StorageBucketCreateRequest): Promise<OssBucketsCreateResult> {
    return this.client.post<OssBucketsCreateResult>(backendApiPath(`/storage/buckets`), body, undefined, undefined, 'application/json');
  }

/** Update storage bucket */
  async update(bucketId: string, body: StorageBucketUpdateRequest): Promise<OssBucketsUpdateResult> {
    return this.client.patch<OssBucketsUpdateResult>(backendApiPath(`/storage/buckets/${serializePathParameter(bucketId, { name: 'bucketId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export class OssApi {
  private client: HttpClient;
  public readonly buckets: OssBucketsApi;
  public readonly defaultBuckets: OssDefaultBucketsApi;
  public readonly gcJobs: OssGcJobsApi;
  public readonly providers: OssProvidersApi;
  public readonly quotas: OssQuotasApi;
  public readonly storageReconciliationRuns: OssStorageReconciliationRunsApi;
  public readonly usage: OssUsageApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.buckets = new OssBucketsApi(client);
    this.defaultBuckets = new OssDefaultBucketsApi(client);
    this.gcJobs = new OssGcJobsApi(client);
    this.providers = new OssProvidersApi(client);
    this.quotas = new OssQuotasApi(client);
    this.storageReconciliationRuns = new OssStorageReconciliationRunsApi(client);
    this.usage = new OssUsageApi(client);
  }

}

export function createOssApi(client: HttpClient): OssApi {
  return new OssApi(client);
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
