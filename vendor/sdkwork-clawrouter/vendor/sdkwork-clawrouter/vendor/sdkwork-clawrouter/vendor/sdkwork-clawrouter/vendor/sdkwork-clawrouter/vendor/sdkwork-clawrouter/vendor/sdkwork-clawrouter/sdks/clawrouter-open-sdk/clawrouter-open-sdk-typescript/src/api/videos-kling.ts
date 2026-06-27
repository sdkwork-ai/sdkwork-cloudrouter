import { aiApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { KlingVideoGenerationRequest, KlingVideoGenerationTask } from '../types';


export class VideosKlingV1VideosGenerationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Kling video generation */
  async create(body: KlingVideoGenerationRequest): Promise<KlingVideoGenerationTask> {
    return this.client.post<KlingVideoGenerationTask>(aiApiPath(`/kling/v1/videos/generations`), body, undefined, undefined, 'application/json');
  }

/** Kling retrieve video generation */
  async retrieve(taskId: string): Promise<KlingVideoGenerationTask> {
    return this.client.get<KlingVideoGenerationTask>(aiApiPath(`/kling/v1/videos/generations/${serializePathParameter(taskId, { name: 'task_id', style: 'simple', explode: false })}`));
  }
}

export class VideosKlingV1VideosApi {
  private client: HttpClient;
  public readonly generations: VideosKlingV1VideosGenerationsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.generations = new VideosKlingV1VideosGenerationsApi(client);
  }

}

export class VideosKlingV1Api {
  private client: HttpClient;
  public readonly videos: VideosKlingV1VideosApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.videos = new VideosKlingV1VideosApi(client);
  }

}

export class VideosKlingApi {
  private client: HttpClient;
  public readonly v1: VideosKlingV1Api;

  constructor(client: HttpClient) {
    this.client = client;
    this.v1 = new VideosKlingV1Api(client);
  }

}

export function createVideosKlingApi(client: HttpClient): VideosKlingApi {
  return new VideosKlingApi(client);
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
