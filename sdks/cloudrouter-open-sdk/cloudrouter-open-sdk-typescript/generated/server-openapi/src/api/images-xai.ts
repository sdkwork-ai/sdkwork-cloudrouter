import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { XaiDeferredImageResponse, XaiImageEditRequest, XaiImageGenerationRequest, XaiImageGenerationResponse } from '../types';


export class ImagesXaiV1ImagesGenerationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** xAI Grok Imagine image generation */
  async create(body: XaiImageGenerationRequest, requestOptions?: ApiRequestOptions): Promise<XaiImageGenerationResponse> {
    return this.client.request<XaiImageGenerationResponse>(`/xai/v1/images/generations`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ImagesXaiV1ImagesEditsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** xAI Grok Imagine image edit */
  async create(body: XaiImageEditRequest, requestOptions?: ApiRequestOptions): Promise<XaiImageGenerationResponse> {
    return this.client.request<XaiImageGenerationResponse>(`/xai/v1/images/edits`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ImagesXaiV1ImagesApi {
  private client: HttpClient;
  public readonly edits: ImagesXaiV1ImagesEditsApi;
  public readonly generations: ImagesXaiV1ImagesGenerationsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.edits = new ImagesXaiV1ImagesEditsApi(client);
    this.generations = new ImagesXaiV1ImagesGenerationsApi(client);
  }


/** xAI Grok Imagine retrieve deferred image */
  async retrieve(requestId: string, requestOptions?: ApiRequestOptions): Promise<XaiDeferredImageResponse> {
    return this.client.request<XaiDeferredImageResponse>(`/xai/v1/images/${serializePathParameter(requestId, { name: 'request_id', style: 'simple', explode: false })}`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any });
  }
}

export class ImagesXaiV1Api {
  public readonly images: ImagesXaiV1ImagesApi;

  constructor(client: HttpClient) {
    this.images = new ImagesXaiV1ImagesApi(client);
  }

}

export class ImagesXaiApi {
  public readonly v1: ImagesXaiV1Api;

  constructor(client: HttpClient) {
    this.v1 = new ImagesXaiV1Api(client);
  }

}

export function createImagesXaiApi(client: HttpClient): ImagesXaiApi {
  return new ImagesXaiApi(client);
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
