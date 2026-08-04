import { aiApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { DeleteResult, OpenAiVectorStore, OpenAiVectorStoreCreateRequest, OpenAiVectorStoreFile, OpenAiVectorStoreFileBatch, OpenAiVectorStoreFileBatchCreateRequest, OpenAiVectorStoreFileCreateRequest, OpenAiVectorStoreFileList, OpenAiVectorStoreFileUpdateRequest, OpenAiVectorStoreList, OpenAiVectorStoreSearchRequest, OpenAiVectorStoreSearchResponse, OpenAiVectorStoreUpdateRequest } from '../types';


export interface VectorStoresFilesListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class VectorStoresFilesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List vector store files */
  async list(vectorStoreId: string, params?: VectorStoresFilesListParams, requestOptions?: ApiRequestOptions): Promise<OpenAiVectorStoreFileList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<OpenAiVectorStoreFileList>(appendQueryString(aiApiPath(`/vector_stores/${serializePathParameter(vectorStoreId, { name: 'vector_store_id', style: 'simple', explode: false })}/files`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Create vector store file */
  async create(vectorStoreId: string, body: OpenAiVectorStoreFileCreateRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiVectorStoreFile> {
    return this.client.request<OpenAiVectorStoreFile>(aiApiPath(`/vector_stores/${serializePathParameter(vectorStoreId, { name: 'vector_store_id', style: 'simple', explode: false })}/files`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }

/** Delete vector store file */
  async delete(vectorStoreId: string, fileId: string, requestOptions?: ApiRequestOptions): Promise<DeleteResult> {
    return this.client.request<DeleteResult>(aiApiPath(`/vector_stores/${serializePathParameter(vectorStoreId, { name: 'vector_store_id', style: 'simple', explode: false })}/files/${serializePathParameter(fileId, { name: 'file_id', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any });
  }

/** Retrieve vector store file */
  async retrieve(vectorStoreId: string, fileId: string, requestOptions?: ApiRequestOptions): Promise<OpenAiVectorStoreFile> {
    return this.client.request<OpenAiVectorStoreFile>(aiApiPath(`/vector_stores/${serializePathParameter(vectorStoreId, { name: 'vector_store_id', style: 'simple', explode: false })}/files/${serializePathParameter(fileId, { name: 'file_id', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Modify vector store file */
  async update(vectorStoreId: string, fileId: string, body: OpenAiVectorStoreFileUpdateRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiVectorStoreFile> {
    return this.client.request<OpenAiVectorStoreFile>(aiApiPath(`/vector_stores/${serializePathParameter(vectorStoreId, { name: 'vector_store_id', style: 'simple', explode: false })}/files/${serializePathParameter(fileId, { name: 'file_id', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export interface VectorStoresFileBatchesListFilesParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class VectorStoresFileBatchesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create vector store file batch */
  async create(vectorStoreId: string, body: OpenAiVectorStoreFileBatchCreateRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiVectorStoreFileBatch> {
    return this.client.request<OpenAiVectorStoreFileBatch>(aiApiPath(`/vector_stores/${serializePathParameter(vectorStoreId, { name: 'vector_store_id', style: 'simple', explode: false })}/file_batches`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }

/** Retrieve vector store file batch */
  async retrieve(vectorStoreId: string, batchId: string, requestOptions?: ApiRequestOptions): Promise<OpenAiVectorStoreFileBatch> {
    return this.client.request<OpenAiVectorStoreFileBatch>(aiApiPath(`/vector_stores/${serializePathParameter(vectorStoreId, { name: 'vector_store_id', style: 'simple', explode: false })}/file_batches/${serializePathParameter(batchId, { name: 'batch_id', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Cancel vector store file batch */
  async cancel(vectorStoreId: string, batchId: string, requestOptions?: ApiRequestOptions): Promise<OpenAiVectorStoreFileBatch> {
    return this.client.request<OpenAiVectorStoreFileBatch>(aiApiPath(`/vector_stores/${serializePathParameter(vectorStoreId, { name: 'vector_store_id', style: 'simple', explode: false })}/file_batches/${serializePathParameter(batchId, { name: 'batch_id', style: 'simple', explode: false })}/cancel`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any });
  }

/** List vector store file batch files */
  async listFiles(vectorStoreId: string, batchId: string, params?: VectorStoresFileBatchesListFilesParams, requestOptions?: ApiRequestOptions): Promise<OpenAiVectorStoreFileList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<OpenAiVectorStoreFileList>(appendQueryString(aiApiPath(`/vector_stores/${serializePathParameter(vectorStoreId, { name: 'vector_store_id', style: 'simple', explode: false })}/file_batches/${serializePathParameter(batchId, { name: 'batch_id', style: 'simple', explode: false })}/files`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export interface VectorStoresListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class VectorStoresApi {
  private client: HttpClient;
  public readonly fileBatches: VectorStoresFileBatchesApi;
  public readonly files: VectorStoresFilesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.fileBatches = new VectorStoresFileBatchesApi(client);
    this.files = new VectorStoresFilesApi(client);
  }


/** List vector stores */
  async list(params?: VectorStoresListParams, requestOptions?: ApiRequestOptions): Promise<OpenAiVectorStoreList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<OpenAiVectorStoreList>(appendQueryString(aiApiPath(`/vector_stores`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Create vector store */
  async create(body: OpenAiVectorStoreCreateRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiVectorStore> {
    return this.client.request<OpenAiVectorStore>(aiApiPath(`/vector_stores`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }

/** Delete vector store */
  async delete(vectorStoreId: string, requestOptions?: ApiRequestOptions): Promise<DeleteResult> {
    return this.client.request<DeleteResult>(aiApiPath(`/vector_stores/${serializePathParameter(vectorStoreId, { name: 'vector_store_id', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any });
  }

/** Retrieve vector store */
  async retrieve(vectorStoreId: string, requestOptions?: ApiRequestOptions): Promise<OpenAiVectorStore> {
    return this.client.request<OpenAiVectorStore>(aiApiPath(`/vector_stores/${serializePathParameter(vectorStoreId, { name: 'vector_store_id', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }

/** Modify vector store */
  async update(vectorStoreId: string, body: OpenAiVectorStoreUpdateRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiVectorStore> {
    return this.client.request<OpenAiVectorStore>(aiApiPath(`/vector_stores/${serializePathParameter(vectorStoreId, { name: 'vector_store_id', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }

/** Search vector store */
  async search(vectorStoreId: string, body: OpenAiVectorStoreSearchRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiVectorStoreSearchResponse> {
    return this.client.request<OpenAiVectorStoreSearchResponse>(aiApiPath(`/vector_stores/${serializePathParameter(vectorStoreId, { name: 'vector_store_id', style: 'simple', explode: false })}/search`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export function createVectorStoresApi(client: HttpClient): VectorStoresApi {
  return new VectorStoresApi(client);
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
