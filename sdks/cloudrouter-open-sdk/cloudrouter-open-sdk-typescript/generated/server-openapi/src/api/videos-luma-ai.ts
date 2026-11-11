import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { LumaVideoGenerationRequest, LumaVideoGenerationTask } from '../types';


export class VideosLumaAiDreamMachineV1GenerationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Luma Dream Machine video generation */
  async create(body: LumaVideoGenerationRequest, requestOptions?: ApiRequestOptions): Promise<LumaVideoGenerationTask> {
    return this.client.request<LumaVideoGenerationTask>(`/luma_ai/dream-machine/v1/generations`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }

/** Luma retrieve video generation */
  async retrieve(generationId: string, requestOptions?: ApiRequestOptions): Promise<LumaVideoGenerationTask> {
    return this.client.request<LumaVideoGenerationTask>(`/luma_ai/dream-machine/v1/generations/${serializePathParameter(generationId, { name: 'generation_id', style: 'simple', explode: false })}`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any });
  }
}

export class VideosLumaAiDreamMachineV1Api {
  public readonly generations: VideosLumaAiDreamMachineV1GenerationsApi;

  constructor(client: HttpClient) {
    this.generations = new VideosLumaAiDreamMachineV1GenerationsApi(client);
  }

}

export class VideosLumaAiDreamMachineApi {
  public readonly v1: VideosLumaAiDreamMachineV1Api;

  constructor(client: HttpClient) {
    this.v1 = new VideosLumaAiDreamMachineV1Api(client);
  }

}

export class VideosLumaAiApi {
  public readonly dreamMachine: VideosLumaAiDreamMachineApi;

  constructor(client: HttpClient) {
    this.dreamMachine = new VideosLumaAiDreamMachineApi(client);
  }

}

export function createVideosLumaAiApi(client: HttpClient): VideosLumaAiApi {
  return new VideosLumaAiApi(client);
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
