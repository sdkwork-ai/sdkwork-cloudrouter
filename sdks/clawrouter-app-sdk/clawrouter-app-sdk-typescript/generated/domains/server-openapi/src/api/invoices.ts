import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { InvoicesCancellationsCreateResult, InvoicesCreateResult, InvoicesRetrieveResult, InvoicesStatisticsRetrieveResult, InvoicesSubmissionsCreateResult, InvoicesUpdateResult, SdkWorkPageData } from '../types';


export class InvoicesSubmissionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(invoiceId: string): Promise<InvoicesSubmissionsCreateResult> {
    return this.client.post<InvoicesSubmissionsCreateResult>(appApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}/submissions`));
  }
}

export class InvoicesItemsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(invoiceId: string): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}/items`));
  }
}

export class InvoicesCancellationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(invoiceId: string): Promise<InvoicesCancellationsCreateResult> {
    return this.client.post<InvoicesCancellationsCreateResult>(appApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}/cancellations`));
  }
}

export class InvoicesStatisticsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<InvoicesStatisticsRetrieveResult> {
    return this.client.get<InvoicesStatisticsRetrieveResult>(appApiPath(`/invoices/statistics`));
  }
}

export class InvoicesMineApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/invoices/current`));
  }
}

export class InvoicesApi {
  private client: HttpClient;
  public readonly mine: InvoicesMineApi;
  public readonly statistics: InvoicesStatisticsApi;
  public readonly cancellations: InvoicesCancellationsApi;
  public readonly items: InvoicesItemsApi;
  public readonly submissions: InvoicesSubmissionsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.mine = new InvoicesMineApi(client);
    this.statistics = new InvoicesStatisticsApi(client);
    this.cancellations = new InvoicesCancellationsApi(client);
    this.items = new InvoicesItemsApi(client);
    this.submissions = new InvoicesSubmissionsApi(client);
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/invoices`));
  }

/** Create */
  async create(): Promise<InvoicesCreateResult> {
    return this.client.post<InvoicesCreateResult>(appApiPath(`/invoices`));
  }

/** Retrieve */
  async retrieve(invoiceId: string): Promise<InvoicesRetrieveResult> {
    return this.client.get<InvoicesRetrieveResult>(appApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}`));
  }

/** Update */
  async update(invoiceId: string): Promise<InvoicesUpdateResult> {
    return this.client.patch<InvoicesUpdateResult>(appApiPath(`/invoices/${serializePathParameter(invoiceId, { name: 'invoiceId', style: 'simple', explode: false })}`));
  }
}

export function createInvoicesApi(client: HttpClient): InvoicesApi {
  return new InvoicesApi(client);
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
