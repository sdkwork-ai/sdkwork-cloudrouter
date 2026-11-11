import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { BytedanceVideoGenerationRequest, BytedanceVideoGenerationTask } from '../types';


export class VideosBytedanceApiV3ContentsGenerationsTasksApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** ByteDance Seedance video generation */
  async create(body: BytedanceVideoGenerationRequest, requestOptions?: ApiRequestOptions): Promise<BytedanceVideoGenerationTask> {
    return this.client.request<BytedanceVideoGenerationTask>(`/bytedance/api/v3/contents/generations/tasks`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }

/** ByteDance retrieve video generation task */
  async retrieve(taskId: string, requestOptions?: ApiRequestOptions): Promise<BytedanceVideoGenerationTask> {
    return this.client.request<BytedanceVideoGenerationTask>(`/bytedance/api/v3/contents/generations/tasks/${serializePathParameter(taskId, { name: 'task_id', style: 'simple', explode: false })}`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any });
  }
}

export class VideosBytedanceApiV3ContentsGenerationsApi {
  public readonly tasks: VideosBytedanceApiV3ContentsGenerationsTasksApi;

  constructor(client: HttpClient) {
    this.tasks = new VideosBytedanceApiV3ContentsGenerationsTasksApi(client);
  }

}

export class VideosBytedanceApiV3ContentsApi {
  public readonly generations: VideosBytedanceApiV3ContentsGenerationsApi;

  constructor(client: HttpClient) {
    this.generations = new VideosBytedanceApiV3ContentsGenerationsApi(client);
  }

}

export class VideosBytedanceApiV3Api {
  public readonly contents: VideosBytedanceApiV3ContentsApi;

  constructor(client: HttpClient) {
    this.contents = new VideosBytedanceApiV3ContentsApi(client);
  }

}

export class VideosBytedanceApiApi {
  public readonly v3: VideosBytedanceApiV3Api;

  constructor(client: HttpClient) {
    this.v3 = new VideosBytedanceApiV3Api(client);
  }

}

export class VideosBytedanceApi {
  public readonly api: VideosBytedanceApiApi;

  constructor(client: HttpClient) {
    this.api = new VideosBytedanceApiApi(client);
  }

}

export function createVideosBytedanceApi(client: HttpClient): VideosBytedanceApi {
  return new VideosBytedanceApi(client);
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
