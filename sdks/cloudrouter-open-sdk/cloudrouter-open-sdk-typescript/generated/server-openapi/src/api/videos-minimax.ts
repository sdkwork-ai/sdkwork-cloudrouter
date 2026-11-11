import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { MinimaxFileRetrieveResponse, MinimaxVideoGenerationRequest, MinimaxVideoGenerationTask } from '../types';


export class VideosMinimaxV1VideoGenerationApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** MiniMax video generation */
  async create(body: MinimaxVideoGenerationRequest, requestOptions?: ApiRequestOptions): Promise<MinimaxVideoGenerationTask> {
    return this.client.request<MinimaxVideoGenerationTask>(`/minimax/v1/video_generation`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export interface VideosMinimaxV1QueryVideoGenerationListParams {
  taskId?: string;
}

export class VideosMinimaxV1QueryVideoGenerationApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** MiniMax retrieve video generation task */
  async list(params?: VideosMinimaxV1QueryVideoGenerationListParams, requestOptions?: ApiRequestOptions): Promise<MinimaxVideoGenerationTask> {
    const query = buildQueryString([
      { name: 'task_id', value: params?.taskId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<MinimaxVideoGenerationTask>(appendQueryString(`/minimax/v1/query/video_generation`, query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any });
  }
}

export class VideosMinimaxV1QueryApi {
  public readonly videoGeneration: VideosMinimaxV1QueryVideoGenerationApi;

  constructor(client: HttpClient) {
    this.videoGeneration = new VideosMinimaxV1QueryVideoGenerationApi(client);
  }

}

export interface VideosMinimaxV1FilesRetrieveListParams {
  fileId?: string;
}

export class VideosMinimaxV1FilesRetrieveApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** MiniMax retrieve video file */
  async list(params?: VideosMinimaxV1FilesRetrieveListParams, requestOptions?: ApiRequestOptions): Promise<MinimaxFileRetrieveResponse> {
    const query = buildQueryString([
      { name: 'file_id', value: params?.fileId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<MinimaxFileRetrieveResponse>(appendQueryString(`/minimax/v1/files/retrieve`, query), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any });
  }
}

export class VideosMinimaxV1FilesApi {
  public readonly retrieve: VideosMinimaxV1FilesRetrieveApi;

  constructor(client: HttpClient) {
    this.retrieve = new VideosMinimaxV1FilesRetrieveApi(client);
  }

}

export class VideosMinimaxV1Api {
  public readonly files: VideosMinimaxV1FilesApi;
  public readonly query: VideosMinimaxV1QueryApi;
  public readonly videoGeneration: VideosMinimaxV1VideoGenerationApi;

  constructor(client: HttpClient) {
    this.files = new VideosMinimaxV1FilesApi(client);
    this.query = new VideosMinimaxV1QueryApi(client);
    this.videoGeneration = new VideosMinimaxV1VideoGenerationApi(client);
  }

}

export class VideosMinimaxApi {
  public readonly v1: VideosMinimaxV1Api;

  constructor(client: HttpClient) {
    this.v1 = new VideosMinimaxV1Api(client);
  }

}

export function createVideosMinimaxApi(client: HttpClient): VideosMinimaxApi {
  return new VideosMinimaxApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}


interface QueryParameterSpec {
  name: string;
  value: unknown;
  style: string;
  explode: boolean;
  allowReserved: boolean;
  contentType?: string;
}

function buildQueryString(parameters: QueryParameterSpec[]): string {
  const pairs: string[] = [];
  for (const parameter of parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join('&');
}

function appendSerializedParameter(pairs: string[], parameter: QueryParameterSpec): void {
  if (parameter.value === undefined || parameter.value === null) {
    return;
  }

  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }

  const style = parameter.style || 'form';
  if (style === 'deepObject') {
    appendDeepObjectParameter(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }

  if (Array.isArray(parameter.value)) {
    appendArrayParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }

  if (typeof parameter.value === 'object') {
    appendObjectParameter(pairs, parameter.name, parameter.value as Record<string, unknown>, style, parameter.explode, parameter.allowReserved);
    return;
  }

  pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(serializePrimitive(parameter.value), parameter.allowReserved)}`);
}

function appendArrayParameter(
  pairs: string[],
  name: string,
  value: unknown[],
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const values = value
    .filter((item) => item !== undefined && item !== null)
    .map((item) => serializePrimitive(item));
  if (values.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(item, allowReserved)}`);
    }
    return;
  }

  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(values.join(','), allowReserved)}`);
}

function appendObjectParameter(
  pairs: string[],
  name: string,
  value: Record<string, unknown>,
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent(key)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
    }
    return;
  }

  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive(entryValue)]).join(',');
  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serialized, allowReserved)}`);
}

function appendDeepObjectParameter(
  pairs: string[],
  name: string,
  value: unknown,
  allowReserved: boolean,
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serializePrimitive(value), allowReserved)}`);
    return;
  }

  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    if (entryValue === undefined || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent(`${name}[${key}]`)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
  }
}

function serializePrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value);
}

function encodeQueryValue(value: string, allowReserved: boolean): string {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ':')
    .replace(/%2F/gi, '/')
    .replace(/%3F/gi, '?')
    .replace(/%23/gi, '#')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']')
    .replace(/%40/gi, '@')
    .replace(/%21/gi, '!')
    .replace(/%24/gi, '$')
    .replace(/%26/gi, '&')
    .replace(/%27/gi, "'")
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')
    .replace(/%2A/gi, '*')
    .replace(/%2B/gi, '+')
    .replace(/%2C/gi, ',')
    .replace(/%3B/gi, ';')
    .replace(/%3D/gi, '=');
}
