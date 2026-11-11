import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { AlibabaVideoGenerationRequest, AlibabaVideoGenerationResponse, AlibabaVideoGenerationTask } from '../types';


export class VideosAlibabaApiV1TasksApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Alibaba Wan retrieve video generation task */
  async retrieve(taskId: string, requestOptions?: ApiRequestOptions): Promise<AlibabaVideoGenerationTask> {
    return this.client.request<AlibabaVideoGenerationTask>(`/alibaba/api/v1/tasks/${serializePathParameter(taskId, { name: 'task_id', style: 'simple', explode: false })}`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any });
  }
}

export interface VideosAlibabaApiV1ServicesAigcVideoGenerationVideoSynthesisCreateParams {
  xDashScopeAsync: 'enable';
}

export class VideosAlibabaApiV1ServicesAigcVideoGenerationVideoSynthesisApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Alibaba Wan video generation */
  async create(body: AlibabaVideoGenerationRequest, params: VideosAlibabaApiV1ServicesAigcVideoGenerationVideoSynthesisCreateParams, requestOptions?: ApiRequestOptions): Promise<AlibabaVideoGenerationResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'X-DashScope-Async': { value: params.xDashScopeAsync, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<AlibabaVideoGenerationResponse>(`/alibaba/api/v1/services/aigc/video-generation/video-synthesis`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}) });
  }
}

export class VideosAlibabaApiV1ServicesAigcVideoGenerationApi {
  public readonly videoSynthesis: VideosAlibabaApiV1ServicesAigcVideoGenerationVideoSynthesisApi;

  constructor(client: HttpClient) {
    this.videoSynthesis = new VideosAlibabaApiV1ServicesAigcVideoGenerationVideoSynthesisApi(client);
  }

}

export class VideosAlibabaApiV1ServicesAigcApi {
  public readonly videoGeneration: VideosAlibabaApiV1ServicesAigcVideoGenerationApi;

  constructor(client: HttpClient) {
    this.videoGeneration = new VideosAlibabaApiV1ServicesAigcVideoGenerationApi(client);
  }

}

export class VideosAlibabaApiV1ServicesApi {
  public readonly aigc: VideosAlibabaApiV1ServicesAigcApi;

  constructor(client: HttpClient) {
    this.aigc = new VideosAlibabaApiV1ServicesAigcApi(client);
  }

}

export class VideosAlibabaApiV1Api {
  public readonly services: VideosAlibabaApiV1ServicesApi;
  public readonly tasks: VideosAlibabaApiV1TasksApi;

  constructor(client: HttpClient) {
    this.services = new VideosAlibabaApiV1ServicesApi(client);
    this.tasks = new VideosAlibabaApiV1TasksApi(client);
  }

}

export class VideosAlibabaApiApi {
  public readonly v1: VideosAlibabaApiV1Api;

  constructor(client: HttpClient) {
    this.v1 = new VideosAlibabaApiV1Api(client);
  }

}

export class VideosAlibabaApi {
  public readonly api: VideosAlibabaApiApi;

  constructor(client: HttpClient) {
    this.api = new VideosAlibabaApiApi(client);
  }

}

export function createVideosAlibabaApi(client: HttpClient): VideosAlibabaApi {
  return new VideosAlibabaApi(client);
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

function buildRequestHeaders(
  headers: Record<string, HeaderParameterSpec | undefined>,
  cookies: Record<string, HeaderParameterSpec | undefined> = {},
): Record<string, string> | undefined {
  const requestHeaders: Record<string, string> = {};

  for (const [name, parameter] of Object.entries(headers)) {
    const serialized = serializeParameterValue(parameter);
    if (serialized !== undefined) {
      requestHeaders[name] = serialized;
    }
  }

  const cookieHeader = buildCookieHeader(cookies);
  if (cookieHeader) {
    requestHeaders.Cookie = requestHeaders.Cookie
      ? `${requestHeaders.Cookie}; ${cookieHeader}`
      : cookieHeader;
  }

  return Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined;
}

interface HeaderParameterSpec {
  value: unknown;
  style: string;
  explode: boolean;
  contentType?: string;
}

function buildCookieHeader(cookies: Record<string, HeaderParameterSpec | undefined>): string | undefined {
  const pairs: string[] = [];
  for (const [name, parameter] of Object.entries(cookies)) {
    const serialized = serializeParameterValue(parameter);
    if (serialized !== undefined) {
      pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(serialized)}`);
    }
  }
  return pairs.length > 0 ? pairs.join('; ') : undefined;
}

function serializeParameterValue(parameter: HeaderParameterSpec | undefined): string | undefined {
  const value = parameter?.value;
  if (value === undefined || value === null) {
    return undefined;
  }
  if (parameter?.contentType) {
    return JSON.stringify(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeHeaderPrimitive(item)).join(',');
  }
  if (typeof value === 'object' && value !== null) {
    return serializeHeaderObject(value as Record<string, unknown>, parameter?.explode === true);
  }
  return serializeHeaderPrimitive(value);
}

function serializeHeaderObject(value: Record<string, unknown>, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (explode) {
    return entries.map(([key, entryValue]) => `${key}=${serializeHeaderPrimitive(entryValue)}`).join(',');
  }
  return entries.flatMap(([key, entryValue]) => [key, serializeHeaderPrimitive(entryValue)]).join(',');
}

function serializeHeaderPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}
