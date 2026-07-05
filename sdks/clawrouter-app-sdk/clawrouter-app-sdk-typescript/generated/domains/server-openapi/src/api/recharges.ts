import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { RechargesOrdersCancelResult, RechargesOrdersCreateResult, RechargesOrdersRetrieveResult, RechargesSettingsRetrieveResult, SdkWorkPageData } from '../types';


export class RechargesSettingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<RechargesSettingsRetrieveResult> {
    return this.client.get<RechargesSettingsRetrieveResult>(appApiPath(`/recharges/settings`));
  }
}

export class RechargesPackagesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/recharges/packages`));
  }
}

export class RechargesOrdersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<RechargesOrdersCreateResult> {
    return this.client.post<RechargesOrdersCreateResult>(appApiPath(`/recharges/orders`));
  }

/** Retrieve */
  async retrieve(orderId: string): Promise<RechargesOrdersRetrieveResult> {
    return this.client.get<RechargesOrdersRetrieveResult>(appApiPath(`/recharges/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}`));
  }

/** Cancel */
  async cancel(orderId: string): Promise<RechargesOrdersCancelResult> {
    return this.client.post<RechargesOrdersCancelResult>(appApiPath(`/recharges/orders/${serializePathParameter(orderId, { name: 'orderId', style: 'simple', explode: false })}/cancellations`));
  }
}

export class RechargesApi {
  private client: HttpClient;
  public readonly orders: RechargesOrdersApi;
  public readonly packages: RechargesPackagesApi;
  public readonly settings: RechargesSettingsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.orders = new RechargesOrdersApi(client);
    this.packages = new RechargesPackagesApi(client);
    this.settings = new RechargesSettingsApi(client);
  }

}

export function createRechargesApi(client: HttpClient): RechargesApi {
  return new RechargesApi(client);
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
