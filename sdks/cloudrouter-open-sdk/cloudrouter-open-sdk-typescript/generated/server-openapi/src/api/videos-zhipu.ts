import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { ZhipuVideoGenerationRequest, ZhipuVideoGenerationTask } from '../types';


export class VideosZhipuApiPaasV4VideosGenerationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Zhipu CogVideoX video generation */
  async create(body: ZhipuVideoGenerationRequest, requestOptions?: ApiRequestOptions): Promise<ZhipuVideoGenerationTask> {
    return this.client.request<ZhipuVideoGenerationTask>(`/zhipu/api/paas/v4/videos/generations`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class VideosZhipuApiPaasV4VideosApi {
  public readonly generations: VideosZhipuApiPaasV4VideosGenerationsApi;

  constructor(client: HttpClient) {
    this.generations = new VideosZhipuApiPaasV4VideosGenerationsApi(client);
  }

}

export class VideosZhipuApiPaasV4AsyncResultApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Zhipu retrieve video generation task */
  async retrieve(taskId: string, requestOptions?: ApiRequestOptions): Promise<ZhipuVideoGenerationTask> {
    return this.client.request<ZhipuVideoGenerationTask>(`/zhipu/api/paas/v4/async-result/${serializePathParameter(taskId, { name: 'task_id', style: 'simple', explode: false })}`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any });
  }
}

export class VideosZhipuApiPaasV4Api {
  public readonly asyncResult: VideosZhipuApiPaasV4AsyncResultApi;
  public readonly videos: VideosZhipuApiPaasV4VideosApi;

  constructor(client: HttpClient) {
    this.asyncResult = new VideosZhipuApiPaasV4AsyncResultApi(client);
    this.videos = new VideosZhipuApiPaasV4VideosApi(client);
  }

}

export class VideosZhipuApiPaasApi {
  public readonly v4: VideosZhipuApiPaasV4Api;

  constructor(client: HttpClient) {
    this.v4 = new VideosZhipuApiPaasV4Api(client);
  }

}

export class VideosZhipuApiApi {
  public readonly paas: VideosZhipuApiPaasApi;

  constructor(client: HttpClient) {
    this.paas = new VideosZhipuApiPaasApi(client);
  }

}

export class VideosZhipuApi {
  public readonly api: VideosZhipuApiApi;

  constructor(client: HttpClient) {
    this.api = new VideosZhipuApiApi(client);
  }

}

export function createVideosZhipuApi(client: HttpClient): VideosZhipuApi {
  return new VideosZhipuApi(client);
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
