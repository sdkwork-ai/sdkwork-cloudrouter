import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { GeminiVideoGenerationRequest, GeminiVideoOperation } from '../types';


export class VideosGoogleV1betaModelsModelGenerateVideosApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Google Gemini video generation (Veo) */
  async create(model: string, body: GeminiVideoGenerationRequest, requestOptions?: ApiRequestOptions): Promise<GeminiVideoOperation> {
    return this.client.request<GeminiVideoOperation>(`/google/v1beta/models/${serializePathParameter(model, { name: 'model', style: 'simple', explode: false })}:generateVideos`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class VideosGoogleV1betaModelsOperationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Google Gemini retrieve video operation (Veo) */
  async retrieve(model: string, operationId: string, requestOptions?: ApiRequestOptions): Promise<GeminiVideoOperation> {
    return this.client.request<GeminiVideoOperation>(`/google/v1beta/models/${serializePathParameter(model, { name: 'model', style: 'simple', explode: false })}/operations/${serializePathParameter(operationId, { name: 'operation_id', style: 'simple', explode: false })}`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any });
  }
}

export class VideosGoogleV1betaModelsApi {
  public readonly operations: VideosGoogleV1betaModelsOperationsApi;
  public readonly modelGenerateVideos: VideosGoogleV1betaModelsModelGenerateVideosApi;

  constructor(client: HttpClient) {
    this.operations = new VideosGoogleV1betaModelsOperationsApi(client);
    this.modelGenerateVideos = new VideosGoogleV1betaModelsModelGenerateVideosApi(client);
  }

}

export class VideosGoogleV1betaApi {
  public readonly models: VideosGoogleV1betaModelsApi;

  constructor(client: HttpClient) {
    this.models = new VideosGoogleV1betaModelsApi(client);
  }

}

export class VideosGoogleApi {
  public readonly v1beta: VideosGoogleV1betaApi;

  constructor(client: HttpClient) {
    this.v1beta = new VideosGoogleV1betaApi(client);
  }

}

export function createVideosGoogleApi(client: HttpClient): VideosGoogleApi {
  return new VideosGoogleApi(client);
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
