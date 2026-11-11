import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { JimengVideoGenerationRequest, JimengVideoGenerationTask } from '../types';


export class VideosJimengV1VideosGenerationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Jimeng video generation */
  async create(body: JimengVideoGenerationRequest, requestOptions?: ApiRequestOptions): Promise<JimengVideoGenerationTask> {
    return this.client.request<JimengVideoGenerationTask>(`/jimeng/v1/videos/generations`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class VideosJimengV1VideosApi {
  public readonly generations: VideosJimengV1VideosGenerationsApi;

  constructor(client: HttpClient) {
    this.generations = new VideosJimengV1VideosGenerationsApi(client);
  }

}

export class VideosJimengV1TasksApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Jimeng retrieve video generation task */
  async retrieve(taskId: string, requestOptions?: ApiRequestOptions): Promise<JimengVideoGenerationTask> {
    return this.client.request<JimengVideoGenerationTask>(`/jimeng/v1/tasks/${serializePathParameter(taskId, { name: 'task_id', style: 'simple', explode: false })}`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any });
  }
}

export class VideosJimengV1Api {
  public readonly tasks: VideosJimengV1TasksApi;
  public readonly videos: VideosJimengV1VideosApi;

  constructor(client: HttpClient) {
    this.tasks = new VideosJimengV1TasksApi(client);
    this.videos = new VideosJimengV1VideosApi(client);
  }

}

export class VideosJimengApi {
  public readonly v1: VideosJimengV1Api;

  constructor(client: HttpClient) {
    this.v1 = new VideosJimengV1Api(client);
  }

}

export function createVideosJimengApi(client: HttpClient): VideosJimengApi {
  return new VideosJimengApi(client);
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
