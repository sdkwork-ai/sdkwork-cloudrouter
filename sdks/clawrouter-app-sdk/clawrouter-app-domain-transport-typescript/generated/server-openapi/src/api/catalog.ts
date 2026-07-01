import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { CatalogCategoriesRetrieveResult, CatalogProductsRetrieveResult, CatalogSkusPricesRetrieveResult, CatalogSkusRetrieveResult, CatalogSpusRetrieveResult, SdkWorkPageData } from '../types';


export class CatalogSpusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/catalog/spus`));
  }

/** Retrieve */
  async retrieve(spuId: string): Promise<CatalogSpusRetrieveResult> {
    return this.client.get<CatalogSpusRetrieveResult>(appApiPath(`/catalog/spus/${serializePathParameter(spuId, { name: 'spuId', style: 'simple', explode: false })}`));
  }
}

export class CatalogSkusPricesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(skuId: string): Promise<CatalogSkusPricesRetrieveResult> {
    return this.client.get<CatalogSkusPricesRetrieveResult>(appApiPath(`/catalog/skus/${serializePathParameter(skuId, { name: 'skuId', style: 'simple', explode: false })}/prices`));
  }
}

export class CatalogSkusApi {
  private client: HttpClient;
  public readonly prices: CatalogSkusPricesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.prices = new CatalogSkusPricesApi(client);
  }


/** Retrieve */
  async retrieve(skuId: string): Promise<CatalogSkusRetrieveResult> {
    return this.client.get<CatalogSkusRetrieveResult>(appApiPath(`/catalog/skus/${serializePathParameter(skuId, { name: 'skuId', style: 'simple', explode: false })}`));
  }
}

export class CatalogProductsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/catalog/products`));
  }

/** Retrieve */
  async retrieve(productId: string): Promise<CatalogProductsRetrieveResult> {
    return this.client.get<CatalogProductsRetrieveResult>(appApiPath(`/catalog/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}`));
  }
}

export class CatalogCategoriesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/catalog/categories`));
  }

/** Retrieve */
  async retrieve(categoryId: string): Promise<CatalogCategoriesRetrieveResult> {
    return this.client.get<CatalogCategoriesRetrieveResult>(appApiPath(`/catalog/categories/${serializePathParameter(categoryId, { name: 'categoryId', style: 'simple', explode: false })}`));
  }
}

export class CatalogAttributesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/catalog/attributes`));
  }
}

export class CatalogApi {
  private client: HttpClient;
  public readonly attributes: CatalogAttributesApi;
  public readonly categories: CatalogCategoriesApi;
  public readonly products: CatalogProductsApi;
  public readonly skus: CatalogSkusApi;
  public readonly spus: CatalogSpusApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.attributes = new CatalogAttributesApi(client);
    this.categories = new CatalogCategoriesApi(client);
    this.products = new CatalogProductsApi(client);
    this.skus = new CatalogSkusApi(client);
    this.spus = new CatalogSpusApi(client);
  }

}

export function createCatalogApi(client: HttpClient): CatalogApi {
  return new CatalogApi(client);
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
