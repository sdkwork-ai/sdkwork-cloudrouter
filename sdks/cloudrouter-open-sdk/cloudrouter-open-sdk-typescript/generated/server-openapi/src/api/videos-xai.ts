import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { XaiVideoEditRequest, XaiVideoExtensionRequest, XaiVideoGenerationRequest, XaiVideoGenerationTask, XaiVideoStartResponse } from '../types';


export class VideosXaiV1VideosGenerationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** xAI Grok Imagine video generation */
  async create(body: XaiVideoGenerationRequest, requestOptions?: ApiRequestOptions): Promise<XaiVideoStartResponse> {
    return this.client.request<XaiVideoStartResponse>(`/xai/v1/videos/generations`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class VideosXaiV1VideosExtensionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** xAI Grok Imagine video extension */
  async create(body: XaiVideoExtensionRequest, requestOptions?: ApiRequestOptions): Promise<XaiVideoStartResponse> {
    return this.client.request<XaiVideoStartResponse>(`/xai/v1/videos/extensions`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class VideosXaiV1VideosEditsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** xAI Grok Imagine video edit */
  async create(body: XaiVideoEditRequest, requestOptions?: ApiRequestOptions): Promise<XaiVideoStartResponse> {
    return this.client.request<XaiVideoStartResponse>(`/xai/v1/videos/edits`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class VideosXaiV1VideosApi {
  private client: HttpClient;
  public readonly edits: VideosXaiV1VideosEditsApi;
  public readonly extensions: VideosXaiV1VideosExtensionsApi;
  public readonly generations: VideosXaiV1VideosGenerationsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.edits = new VideosXaiV1VideosEditsApi(client);
    this.extensions = new VideosXaiV1VideosExtensionsApi(client);
    this.generations = new VideosXaiV1VideosGenerationsApi(client);
  }


/** xAI Grok Imagine retrieve video generation */
  async retrieve(requestId: string, requestOptions?: ApiRequestOptions): Promise<XaiVideoGenerationTask> {
    return this.client.request<XaiVideoGenerationTask>(`/xai/v1/videos/${serializePathParameter(requestId, { name: 'request_id', style: 'simple', explode: false })}`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any });
  }
}

export class VideosXaiV1Api {
  public readonly videos: VideosXaiV1VideosApi;

  constructor(client: HttpClient) {
    this.videos = new VideosXaiV1VideosApi(client);
  }

}

export class VideosXaiApi {
  public readonly v1: VideosXaiV1Api;

  constructor(client: HttpClient) {
    this.v1 = new VideosXaiV1Api(client);
  }

}

export function createVideosXaiApi(client: HttpClient): VideosXaiApi {
  return new VideosXaiApi(client);
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
