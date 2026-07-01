import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { HealthCheckCreateResult, SdkWorkCommandData, SdkWorkPageData, SiteCreateResult, SiteUpdateResult, TestConnectionCreateResult } from '../types';


export class SitesTestConnectionApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(siteId: string): Promise<TestConnectionCreateResult> {
    return this.client.post<TestConnectionCreateResult>(backendApiPath(`/sites/${serializePathParameter(siteId, { name: 'siteId', style: 'simple', explode: false })}/test_connection`));
  }
}

export class SitesHealthCheckApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(siteId: string): Promise<HealthCheckCreateResult> {
    return this.client.post<HealthCheckCreateResult>(backendApiPath(`/sites/${serializePathParameter(siteId, { name: 'siteId', style: 'simple', explode: false })}/health_check`));
  }
}

export class SitesSiteChannelsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(siteId: string): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/sites/${serializePathParameter(siteId, { name: 'siteId', style: 'simple', explode: false })}/channels`));
  }
}

export class SitesSiteCatalogApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(backendApiPath(`/sites`));
  }
}

export class SitesApi {
  private client: HttpClient;
  public readonly siteCatalog: SitesSiteCatalogApi;
  public readonly siteChannels: SitesSiteChannelsApi;
  public readonly healthCheck: SitesHealthCheckApi;
  public readonly testConnection: SitesTestConnectionApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.siteCatalog = new SitesSiteCatalogApi(client);
    this.siteChannels = new SitesSiteChannelsApi(client);
    this.healthCheck = new SitesHealthCheckApi(client);
    this.testConnection = new SitesTestConnectionApi(client);
  }


/** Create */
  async create(): Promise<SiteCreateResult> {
    return this.client.post<SiteCreateResult>(backendApiPath(`/sites`));
  }

/** Delete */
  async delete(siteId: string): Promise<SdkWorkCommandData> {
    return this.client.delete<SdkWorkCommandData>(backendApiPath(`/sites/${serializePathParameter(siteId, { name: 'siteId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(siteId: string): Promise<SiteUpdateResult> {
    return this.client.patch<SiteUpdateResult>(backendApiPath(`/sites/${serializePathParameter(siteId, { name: 'siteId', style: 'simple', explode: false })}`));
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
