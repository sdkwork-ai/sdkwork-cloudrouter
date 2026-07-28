import { aiApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { GoogleBatchEmbedContentsRequest, GoogleBatchEmbedContentsResponse, GoogleEmbedContentRequest, GoogleEmbedContentResponse } from '../types';


export class EmbeddingsGoogleV1betaModelsModelEmbedContentApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Google Gemini embed content */
  async create(model: string, body: GoogleEmbedContentRequest, requestOptions?: ApiRequestOptions): Promise<GoogleEmbedContentResponse> {
    return this.client.request<GoogleEmbedContentResponse>(aiApiPath(`/google/v1beta/models/${serializePathParameter(model, { name: 'model', style: 'simple', explode: false })}:embedContent`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class EmbeddingsGoogleV1betaModelsModelBatchEmbedContentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Google Gemini batch embed contents */
  async create(model: string, body: GoogleBatchEmbedContentsRequest, requestOptions?: ApiRequestOptions): Promise<GoogleBatchEmbedContentsResponse> {
    return this.client.request<GoogleBatchEmbedContentsResponse>(aiApiPath(`/google/v1beta/models/${serializePathParameter(model, { name: 'model', style: 'simple', explode: false })}:batchEmbedContents`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class EmbeddingsGoogleV1betaModelsApi {
  private client: HttpClient;
  public readonly modelBatchEmbedContents: EmbeddingsGoogleV1betaModelsModelBatchEmbedContentsApi;
  public readonly modelEmbedContent: EmbeddingsGoogleV1betaModelsModelEmbedContentApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.modelBatchEmbedContents = new EmbeddingsGoogleV1betaModelsModelBatchEmbedContentsApi(client);
    this.modelEmbedContent = new EmbeddingsGoogleV1betaModelsModelEmbedContentApi(client);
  }

}

export class EmbeddingsGoogleV1betaApi {
  private client: HttpClient;
  public readonly models: EmbeddingsGoogleV1betaModelsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.models = new EmbeddingsGoogleV1betaModelsApi(client);
  }

}

export class EmbeddingsGoogleApi {
  private client: HttpClient;
  public readonly v1beta: EmbeddingsGoogleV1betaApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.v1beta = new EmbeddingsGoogleV1betaApi(client);
  }

}

export function createEmbeddingsGoogleApi(client: HttpClient): EmbeddingsGoogleApi {
  return new EmbeddingsGoogleApi(client);
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
