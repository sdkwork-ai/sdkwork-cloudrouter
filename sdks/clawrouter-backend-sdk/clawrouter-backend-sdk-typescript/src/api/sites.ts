import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';
import type { AdminSiteConnectionCheckResult, AdminSiteCreateRequest, AdminSiteItem, AdminSiteUpdateRequest } from '../types';
export class SitesTestConnectionApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Test site connection */
  async create(siteId: string): Promise<AdminSiteConnectionCheckResult> {
    return this.client.post<AdminSiteConnectionCheckResult>(backendApiPath(`/sites/${serializePathParameter(siteId, { name: 'siteId', style: 'simple', explode: false })}/test_connection`));
  }
}

export class SitesHealthCheckApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Health check site */
  async create(siteId: string): Promise<AdminSiteConnectionCheckResult> {
    return this.client.post<AdminSiteConnectionCheckResult>(backendApiPath(`/sites/${serializePathParameter(siteId, { name: 'siteId', style: 'simple', explode: false })}/health_check`));
  }
}

export class SitesChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List site channels */
  async list(siteId: string): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/sites/${serializePathParameter(siteId, { name: 'siteId', style: 'simple', explode: false })}/channels`));
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
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/sites`));
  }

/** Create site */
  async create(body: AdminSiteCreateRequest): Promise<AdminSiteItem> {
    return this.client.post<AdminSiteItem>(backendApiPath(`/sites`), body, undefined, undefined, 'application/json');
  }

/** Delete site */
  async delete(siteId: string): Promise<void> {
    return this.client.delete<void>(backendApiPath(`/sites/${serializePathParameter(siteId, { name: 'siteId', style: 'simple', explode: false })}`));
  }

/** Update site */
  async update(siteId: string, body: AdminSiteUpdateRequest): Promise<AdminSiteItem> {
    return this.client.patch<AdminSiteItem>(backendApiPath(`/sites/${serializePathParameter(siteId, { name: 'siteId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export function createSitesApi(client: HttpClient): SitesApi {
  return new SitesApi(client);
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
