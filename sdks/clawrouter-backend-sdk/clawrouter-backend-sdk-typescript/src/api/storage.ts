import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { DefaultBucketsUpdateResult, GcJobsCreateResult, OssBucketsCreateResult, OssBucketsUpdateResult, OssProvidersCreateResult, OssProvidersUpdateResult, OssQuotasCreateResult, OssStorageReconciliationRunsCreateResult, PageInfo, ProvidersHealthCheckCreateResult } from '../types';


export class StorageProvidersHealthCheckApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(providerId: string): Promise<ProvidersHealthCheckCreateResult> {
    return this.client.post<ProvidersHealthCheckCreateResult>(backendApiPath(`/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/health_check`));
  }
}

export class StorageProvidersApi {
  private client: HttpClient;
  public readonly healthCheck: StorageProvidersHealthCheckApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.healthCheck = new StorageProvidersHealthCheckApi(client);
  }

}

export class StorageGcJobsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/storage/gc_jobs`));
  }

/** Create */
  async create(): Promise<GcJobsCreateResult> {
    return this.client.post<GcJobsCreateResult>(backendApiPath(`/storage/gc_jobs`));
  }
}

export class StorageDefaultBucketsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/storage/default_buckets`));
  }

/** Update */
  async update(logicalScope: string): Promise<DefaultBucketsUpdateResult> {
    return this.client.patch<DefaultBucketsUpdateResult>(backendApiPath(`/storage/default_buckets/${serializePathParameter(logicalScope, { name: 'logicalScope', style: 'simple', explode: false })}`));
  }
}

export class StorageOssUsageApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/storage/usage`));
  }
}

export class StorageOssStorageReconciliationRunsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/storage/reconciliation_runs`));
  }

/** Create */
  async create(): Promise<OssStorageReconciliationRunsCreateResult> {
    return this.client.post<OssStorageReconciliationRunsCreateResult>(backendApiPath(`/storage/reconciliation_runs`));
  }
}

export class StorageOssQuotasApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/storage/quotas`));
  }

/** Create */
  async create(): Promise<OssQuotasCreateResult> {
    return this.client.post<OssQuotasCreateResult>(backendApiPath(`/storage/quotas`));
  }
}

export class StorageOssProvidersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/storage/providers`));
  }

/** Create */
  async create(): Promise<OssProvidersCreateResult> {
    return this.client.post<OssProvidersCreateResult>(backendApiPath(`/storage/providers`));
  }

/** Update */
  async update(providerId: string): Promise<OssProvidersUpdateResult> {
    return this.client.patch<OssProvidersUpdateResult>(backendApiPath(`/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}`));
  }
}

export class StorageOssBucketsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/storage/buckets`));
  }

/** Create */
  async create(): Promise<OssBucketsCreateResult> {
    return this.client.post<OssBucketsCreateResult>(backendApiPath(`/storage/buckets`));
  }

/** Update */
  async update(bucketId: string): Promise<OssBucketsUpdateResult> {
    return this.client.patch<OssBucketsUpdateResult>(backendApiPath(`/storage/buckets/${serializePathParameter(bucketId, { name: 'bucketId', style: 'simple', explode: false })}`));
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
