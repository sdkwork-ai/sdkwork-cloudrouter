import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { MurekaMusicGenerationRequest, MurekaMusicGenerationTask } from '../types';


export class MusicMurekaV1SongQueryApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Mureka retrieve song generation */
  async retrieve(taskId: string, requestOptions?: ApiRequestOptions): Promise<MurekaMusicGenerationTask> {
    return this.client.request<MurekaMusicGenerationTask>(`/mureka/v1/song/query/${serializePathParameter(taskId, { name: 'task_id', style: 'simple', explode: false })}`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any });
  }
}

export class MusicMurekaV1SongGenerateApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Mureka song generation */
  async create(body: MurekaMusicGenerationRequest, requestOptions?: ApiRequestOptions): Promise<MurekaMusicGenerationTask> {
    return this.client.request<MurekaMusicGenerationTask>(`/mureka/v1/song/generate`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class MusicMurekaV1SongApi {
  public readonly generate: MusicMurekaV1SongGenerateApi;
  public readonly query: MusicMurekaV1SongQueryApi;

  constructor(client: HttpClient) {
    this.generate = new MusicMurekaV1SongGenerateApi(client);
    this.query = new MusicMurekaV1SongQueryApi(client);
  }

}

export class MusicMurekaV1Api {
  public readonly song: MusicMurekaV1SongApi;

  constructor(client: HttpClient) {
    this.song = new MusicMurekaV1SongApi(client);
  }

}

export class MusicMurekaApi {
  public readonly v1: MusicMurekaV1Api;

  constructor(client: HttpClient) {
    this.v1 = new MusicMurekaV1Api(client);
  }

}

export function createMusicMurekaApi(client: HttpClient): MusicMurekaApi {
  return new MusicMurekaApi(client);
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
