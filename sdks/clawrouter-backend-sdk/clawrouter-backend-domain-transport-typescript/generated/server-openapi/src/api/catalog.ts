import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { CommerceApiResult, CommerceOperationCommand } from '../types';


export interface CatalogPriceListsListParams {
  currencyCode?: string;
  marketCode?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export class CatalogPriceListsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Catalog price Lists list. */
  async list(params?: CatalogPriceListsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'currency_code', value: params?.currencyCode, style: 'form', explode: true, allowReserved: false },
      { name: 'market_code', value: params?.marketCode, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/catalog/price_lists`), query));
  }

/** Catalog price Lists create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/catalog/price_lists`), body, undefined, undefined, 'application/json');
  }

/** Catalog price Lists update. */
  async update(priceListId: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(backendApiPath(`/catalog/price_lists/${serializePathParameter(priceListId, { name: 'priceListId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export interface CatalogCategoryAttributesListParams {
  categoryId?: string;
  attributeId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export class CatalogCategoryAttributesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Catalog category Attributes list. */
  async list(params?: CatalogCategoryAttributesListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'category_id', value: params?.categoryId, style: 'form', explode: true, allowReserved: false },
      { name: 'attribute_id', value: params?.attributeId, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/catalog/category_attributes`), query));
  }

/** Catalog category Attributes create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/catalog/category_attributes`), body, undefined, undefined, 'application/json');
  }

/** Catalog category Attributes update. */
  async update(bindingId: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(backendApiPath(`/catalog/category_attributes/${serializePathParameter(bindingId, { name: 'bindingId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

/** Catalog category Attributes delete. */
  async delete(bindingId: string): Promise<CommerceApiResult> {
    return this.client.delete<CommerceApiResult>(backendApiPath(`/catalog/category_attributes/${serializePathParameter(bindingId, { name: 'bindingId', style: 'simple', explode: false })}`));
  }
}

export class CatalogCategorySeedsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Catalog category Seeds create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/catalog/category_seeds/initialize`), body, undefined, undefined, 'application/json');
  }
}

export interface CatalogAttributesManagementListParams {
  scope?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export class CatalogAttributesManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Catalog attributes management list. */
  async list(params?: CatalogAttributesManagementListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'scope', value: params?.scope, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/catalog/attributes`), query));
  }
}

export class CatalogAttributesApi {
  private client: HttpClient;
  public readonly management: CatalogAttributesManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CatalogAttributesManagementApi(client);
  }


/** Catalog attributes create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/catalog/attributes`), body, undefined, undefined, 'application/json');
  }
}

export interface CatalogSkusListParams {
  productId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export class CatalogSkusApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Catalog skus list. */
  async list(params?: CatalogSkusListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'product_id', value: params?.productId, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/catalog/skus`), query));
  }

/** Catalog skus create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/catalog/skus`), body, undefined, undefined, 'application/json');
  }

/** Catalog skus update. */
  async update(skuId: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(backendApiPath(`/catalog/skus/${serializePathParameter(skuId, { name: 'skuId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

/** Catalog skus delete. */
  async delete(skuId: string): Promise<CommerceApiResult> {
    return this.client.delete<CommerceApiResult>(backendApiPath(`/catalog/skus/${serializePathParameter(skuId, { name: 'skuId', style: 'simple', explode: false })}`));
  }
}

export interface CatalogSpusManagementListParams {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export class CatalogSpusManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Catalog spus management list. */
  async list(params?: CatalogSpusManagementListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/catalog/spus`), query));
  }
}

export class CatalogSpusApi {
  private client: HttpClient;
  public readonly management: CatalogSpusManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CatalogSpusManagementApi(client);
  }


/** Catalog spus create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/catalog/spus`), body, undefined, undefined, 'application/json');
  }

/** Catalog spus update. */
  async update(spuId: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(backendApiPath(`/catalog/spus/${serializePathParameter(spuId, { name: 'spuId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

/** Catalog spus publish. */
  async publish(spuId: string, body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/catalog/spus/${serializePathParameter(spuId, { name: 'spuId', style: 'simple', explode: false })}/publish`), body, undefined, undefined, 'application/json');
  }

/** Catalog spus archive. */
  async archive(spuId: string, body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/catalog/spus/${serializePathParameter(spuId, { name: 'spuId', style: 'simple', explode: false })}/archive`), body, undefined, undefined, 'application/json');
  }
}

export interface CatalogProductsManagementListParams {
  q?: string;
  categoryId?: string;
  productType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}

export class CatalogProductsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Catalog products management list. */
  async list(params?: CatalogProductsManagementListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'category_id', value: params?.categoryId, style: 'form', explode: true, allowReserved: false },
      { name: 'product_type', value: params?.productType, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'sort', value: params?.sort, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/catalog/products`), query));
  }

/** Catalog products management retrieve. */
  async retrieve(productId: string): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(backendApiPath(`/catalog/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}`));
  }
}

export class CatalogProductsApi {
  private client: HttpClient;
  public readonly management: CatalogProductsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CatalogProductsManagementApi(client);
  }


/** Catalog products create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/catalog/products`), body, undefined, undefined, 'application/json');
  }

/** Catalog products update. */
  async update(productId: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(backendApiPath(`/catalog/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

/** Catalog products delete. */
  async delete(productId: string): Promise<CommerceApiResult> {
    return this.client.delete<CommerceApiResult>(backendApiPath(`/catalog/products/${serializePathParameter(productId, { name: 'productId', style: 'simple', explode: false })}`));
  }
}

export interface CatalogCategoriesManagementListParams {
  parentId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export class CatalogCategoriesManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Catalog categories management list. */
  async list(params?: CatalogCategoriesManagementListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'parent_id', value: params?.parentId, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/catalog/categories`), query));
  }
}

export class CatalogCategoriesApi {
  private client: HttpClient;
  public readonly management: CatalogCategoriesManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new CatalogCategoriesManagementApi(client);
  }


/** Catalog categories create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/catalog/categories`), body, undefined, undefined, 'application/json');
  }

/** Catalog categories update. */
  async update(categoryId: string, body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.patch<CommerceApiResult>(backendApiPath(`/catalog/categories/${serializePathParameter(categoryId, { name: 'categoryId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

/** Catalog categories delete. */
  async delete(categoryId: string): Promise<CommerceApiResult> {
    return this.client.delete<CommerceApiResult>(backendApiPath(`/catalog/categories/${serializePathParameter(categoryId, { name: 'categoryId', style: 'simple', explode: false })}`));
  }
}

export class CatalogApi {
  private client: HttpClient;
  public readonly categories: CatalogCategoriesApi;
  public readonly products: CatalogProductsApi;
  public readonly spus: CatalogSpusApi;
  public readonly skus: CatalogSkusApi;
  public readonly attributes: CatalogAttributesApi;
  public readonly categorySeeds: CatalogCategorySeedsApi;
  public readonly categoryAttributes: CatalogCategoryAttributesApi;
  public readonly priceLists: CatalogPriceListsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.categories = new CatalogCategoriesApi(client);
    this.products = new CatalogProductsApi(client);
    this.spus = new CatalogSpusApi(client);
    this.skus = new CatalogSkusApi(client);
    this.attributes = new CatalogAttributesApi(client);
    this.categorySeeds = new CatalogCategorySeedsApi(client);
    this.categoryAttributes = new CatalogCategoryAttributesApi(client);
    this.priceLists = new CatalogPriceListsApi(client);
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
