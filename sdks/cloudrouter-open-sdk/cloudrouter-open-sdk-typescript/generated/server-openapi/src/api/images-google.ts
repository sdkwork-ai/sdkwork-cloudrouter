import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { GeminiImageGenerationRequest, GeminiImageGenerationResponse } from '../types';


export class ImagesGoogleV1betaModelsModelGenerateImagesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Google Gemini image generation */
  async create(model: string, body: GeminiImageGenerationRequest, requestOptions?: ApiRequestOptions): Promise<GeminiImageGenerationResponse> {
    return this.client.request<GeminiImageGenerationResponse>(`/google/v1beta/models/${serializePathParameter(model, { name: 'model', style: 'simple', explode: false })}:generateImages`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ImagesGoogleV1betaModelsApi {
  public readonly modelGenerateImages: ImagesGoogleV1betaModelsModelGenerateImagesApi;

  constructor(client: HttpClient) {
    this.modelGenerateImages = new ImagesGoogleV1betaModelsModelGenerateImagesApi(client);
  }

}

export class ImagesGoogleV1betaApi {
  public readonly models: ImagesGoogleV1betaModelsApi;

  constructor(client: HttpClient) {
    this.models = new ImagesGoogleV1betaModelsApi(client);
  }

}

export class ImagesGoogleApi {
  public readonly v1beta: ImagesGoogleV1betaApi;

  constructor(client: HttpClient) {
    this.v1beta = new ImagesGoogleV1betaApi(client);
  }

}

export function createImagesGoogleApi(client: HttpClient): ImagesGoogleApi {
  return new ImagesGoogleApi(client);
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
