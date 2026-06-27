import { aiApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { VolcengineContentGenerationTask, VolcengineContentGenerationTaskCreateRequest, VolcengineContentGenerationTaskCreateResponse } from '../types';


export class VideosVolcengineApiV3ContentsGenerationsTasksApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Volcengine Ark content generation task */
  async create(body: VolcengineContentGenerationTaskCreateRequest): Promise<VolcengineContentGenerationTaskCreateResponse> {
    return this.client.post<VolcengineContentGenerationTaskCreateResponse>(aiApiPath(`/volcengine/api/v3/contents/generations/tasks`), body, undefined, undefined, 'application/json');
  }

/** Volcengine Ark retrieve content generation task */
  async retrieve(taskId: string): Promise<VolcengineContentGenerationTask> {
    return this.client.get<VolcengineContentGenerationTask>(aiApiPath(`/volcengine/api/v3/contents/generations/tasks/${serializePathParameter(taskId, { name: 'task_id', style: 'simple', explode: false })}`));
  }
}

export class VideosVolcengineApiV3ContentsGenerationsApi {
  private client: HttpClient;
  public readonly tasks: VideosVolcengineApiV3ContentsGenerationsTasksApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.tasks = new VideosVolcengineApiV3ContentsGenerationsTasksApi(client);
  }

}

export class VideosVolcengineApiV3ContentsApi {
  private client: HttpClient;
  public readonly generations: VideosVolcengineApiV3ContentsGenerationsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.generations = new VideosVolcengineApiV3ContentsGenerationsApi(client);
  }

}

export class VideosVolcengineApiV3Api {
  private client: HttpClient;
  public readonly contents: VideosVolcengineApiV3ContentsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.contents = new VideosVolcengineApiV3ContentsApi(client);
  }

}

export class VideosVolcengineApiApi {
  private client: HttpClient;
  public readonly v3: VideosVolcengineApiV3Api;

  constructor(client: HttpClient) {
    this.client = client;
    this.v3 = new VideosVolcengineApiV3Api(client);
  }

}

export class VideosVolcengineApi {
  private client: HttpClient;
  public readonly api: VideosVolcengineApiApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.api = new VideosVolcengineApiApi(client);
  }

}

export function createVideosVolcengineApi(client: HttpClient): VideosVolcengineApi {
  return new VideosVolcengineApi(client);
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
