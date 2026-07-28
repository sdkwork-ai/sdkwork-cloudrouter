import { aiApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { ViduImageToVideoRequest, ViduReferenceToVideoRequest, ViduStartEndToVideoRequest, ViduTaskCreationsResponse, ViduTextToVideoRequest, ViduVideoGenerationTask } from '../types';


export class VideosViduEntV2Text2videoApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Vidu text to video */
  async create(body: ViduTextToVideoRequest, requestOptions?: ApiRequestOptions): Promise<ViduVideoGenerationTask> {
    return this.client.request<ViduVideoGenerationTask>(aiApiPath(`/vidu/ent/v2/text2video`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class VideosViduEntV2TasksCreationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Vidu get task creations */
  async list(taskId: string, requestOptions?: ApiRequestOptions): Promise<ViduTaskCreationsResponse> {
    return this.client.request<ViduTaskCreationsResponse>(aiApiPath(`/vidu/ent/v2/tasks/${serializePathParameter(taskId, { name: 'task_id', style: 'simple', explode: false })}/creations`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export class VideosViduEntV2TasksApi {
  private client: HttpClient;
  public readonly creations: VideosViduEntV2TasksCreationsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.creations = new VideosViduEntV2TasksCreationsApi(client);
  }

}

export class VideosViduEntV2StartEnd2videoApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Vidu start-end to video */
  async create(body: ViduStartEndToVideoRequest, requestOptions?: ApiRequestOptions): Promise<ViduVideoGenerationTask> {
    return this.client.request<ViduVideoGenerationTask>(aiApiPath(`/vidu/ent/v2/start-end2video`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class VideosViduEntV2Reference2videoApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Vidu reference to video */
  async create(body: ViduReferenceToVideoRequest, requestOptions?: ApiRequestOptions): Promise<ViduVideoGenerationTask> {
    return this.client.request<ViduVideoGenerationTask>(aiApiPath(`/vidu/ent/v2/reference2video`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class VideosViduEntV2Img2videoApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Vidu image to video */
  async create(body: ViduImageToVideoRequest, requestOptions?: ApiRequestOptions): Promise<ViduVideoGenerationTask> {
    return this.client.request<ViduVideoGenerationTask>(aiApiPath(`/vidu/ent/v2/img2video`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class VideosViduEntV2Api {
  private client: HttpClient;
  public readonly img2video: VideosViduEntV2Img2videoApi;
  public readonly reference2video: VideosViduEntV2Reference2videoApi;
  public readonly startEnd2video: VideosViduEntV2StartEnd2videoApi;
  public readonly tasks: VideosViduEntV2TasksApi;
  public readonly text2video: VideosViduEntV2Text2videoApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.img2video = new VideosViduEntV2Img2videoApi(client);
    this.reference2video = new VideosViduEntV2Reference2videoApi(client);
    this.startEnd2video = new VideosViduEntV2StartEnd2videoApi(client);
    this.tasks = new VideosViduEntV2TasksApi(client);
    this.text2video = new VideosViduEntV2Text2videoApi(client);
  }

}

export class VideosViduEntApi {
  private client: HttpClient;
  public readonly v2: VideosViduEntV2Api;

  constructor(client: HttpClient) {
    this.client = client;
    this.v2 = new VideosViduEntV2Api(client);
  }

}

export class VideosViduApi {
  private client: HttpClient;
  public readonly ent: VideosViduEntApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.ent = new VideosViduEntApi(client);
  }

}

export function createVideosViduApi(client: HttpClient): VideosViduApi {
  return new VideosViduApi(client);
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
