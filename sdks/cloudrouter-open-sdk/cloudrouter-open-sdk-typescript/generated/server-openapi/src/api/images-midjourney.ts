import { aiApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { MidjourneyImageGenerationRequest, MidjourneyImageGenerationTask } from '../types';


export class ImagesMidjourneyV1ImagesGenerationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Midjourney image generation */
  async create(body: MidjourneyImageGenerationRequest, requestOptions?: ApiRequestOptions): Promise<MidjourneyImageGenerationTask> {
    return this.client.request<MidjourneyImageGenerationTask>(aiApiPath(`/midjourney/v1/images/generations`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }

/** Midjourney retrieve image generation */
  async retrieve(taskId: string, requestOptions?: ApiRequestOptions): Promise<MidjourneyImageGenerationTask> {
    return this.client.request<MidjourneyImageGenerationTask>(aiApiPath(`/midjourney/v1/images/generations/${serializePathParameter(taskId, { name: 'task_id', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export class ImagesMidjourneyV1ImagesApi {
  private client: HttpClient;
  public readonly generations: ImagesMidjourneyV1ImagesGenerationsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.generations = new ImagesMidjourneyV1ImagesGenerationsApi(client);
  }

}

export class ImagesMidjourneyV1Api {
  private client: HttpClient;
  public readonly images: ImagesMidjourneyV1ImagesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.images = new ImagesMidjourneyV1ImagesApi(client);
  }

}

export class ImagesMidjourneyApi {
  private client: HttpClient;
  public readonly v1: ImagesMidjourneyV1Api;

  constructor(client: HttpClient) {
    this.client = client;
    this.v1 = new ImagesMidjourneyV1Api(client);
  }

}

export function createImagesMidjourneyApi(client: HttpClient): ImagesMidjourneyApi {
  return new ImagesMidjourneyApi(client);
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
