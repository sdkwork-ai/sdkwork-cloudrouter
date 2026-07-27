import { backendApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';
import type { AdminSiteConnectionCheckResult, AdminSiteCreateRequest, AdminSiteItem, AdminSiteUpdateRequest } from '../types';
export class SitesTestConnectionApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Test site connection */
  async create(siteId: string, requestOptions?: ApiRequestOptions): Promise<AdminSiteConnectionCheckResult> {
    return this.client.request<AdminSiteConnectionCheckResult>(backendApiPath(`/sites/${serializePathParameter(siteId, { name: 'siteId', style: 'simple', explode: false })}/test_connection`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any });
  }
}

export class SitesHealthCheckApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Health check site */
  async create(siteId: string, requestOptions?: ApiRequestOptions): Promise<AdminSiteConnectionCheckResult> {
    return this.client.request<AdminSiteConnectionCheckResult>(backendApiPath(`/sites/${serializePathParameter(siteId, { name: 'siteId', style: 'simple', explode: false })}/health_check`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any });
  }
}

export class SitesChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List site channels */
  async list(siteId: string, requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/sites/${serializePathParameter(siteId, { name: 'siteId', style: 'simple', explode: false })}/channels`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export class SitesApi {
  private client: HttpClient;
  public readonly channels: SitesChannelsApi;
  public readonly healthCheck: SitesHealthCheckApi;
  public readonly testConnection: SitesTestConnectionApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.channels = new SitesChannelsApi(client);
    this.healthCheck = new SitesHealthCheckApi(client);
    this.testConnection = new SitesTestConnectionApi(client);
  }


/** List sites */
  async list(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/sites`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Create site */
  async create(body: AdminSiteCreateRequest, requestOptions?: ApiRequestOptions): Promise<AdminSiteItem> {
    return this.client.request<AdminSiteItem>(backendApiPath(`/sites`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }

/** Delete site */
  async delete(siteId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/sites/${serializePathParameter(siteId, { name: 'siteId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any });
  }

/** Update site */
  async update(siteId: string, body: AdminSiteUpdateRequest, requestOptions?: ApiRequestOptions): Promise<AdminSiteItem> {
    return this.client.request<AdminSiteItem>(backendApiPath(`/sites/${serializePathParameter(siteId, { name: 'siteId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any, body, contentType: 'application/json' });
  }
}

export function createSitesApi(client: HttpClient): SitesApi {
  return new SitesApi(client);
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
