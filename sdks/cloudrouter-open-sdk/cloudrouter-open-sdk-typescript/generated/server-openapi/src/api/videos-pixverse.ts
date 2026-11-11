import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { PixverseVideoGenerationRequest, PixverseVideoGenerationResponse, PixverseVideoGenerationTask } from '../types';


export interface VideosPixverseOpenapiV2VideoTextGenerateCreateParams {
  aiTraceId: string;
}

export class VideosPixverseOpenapiV2VideoTextGenerateApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** PixVerse text to video generation */
  async create(body: PixverseVideoGenerationRequest, params: VideosPixverseOpenapiV2VideoTextGenerateCreateParams, requestOptions?: ApiRequestOptions): Promise<PixverseVideoGenerationResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'Ai-trace-id': { value: params.aiTraceId, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<PixverseVideoGenerationResponse>(`/pixverse/openapi/v2/video/text/generate`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}) });
  }
}

export class VideosPixverseOpenapiV2VideoTextApi {
  public readonly generate: VideosPixverseOpenapiV2VideoTextGenerateApi;

  constructor(client: HttpClient) {
    this.generate = new VideosPixverseOpenapiV2VideoTextGenerateApi(client);
  }

}

export interface VideosPixverseOpenapiV2VideoResultRetrieveParams {
  aiTraceId: string;
}

export class VideosPixverseOpenapiV2VideoResultApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** PixVerse retrieve video generation */
  async retrieve(videoId: string, params: VideosPixverseOpenapiV2VideoResultRetrieveParams, requestOptions?: ApiRequestOptions): Promise<PixverseVideoGenerationTask> {
    const requestHeaders = buildRequestHeaders(
      {
        'Ai-trace-id': { value: params.aiTraceId, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<PixverseVideoGenerationTask>(`/pixverse/openapi/v2/video/result/${serializePathParameter(videoId, { name: 'video_id', style: 'simple', explode: false })}`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}) });
  }
}

export class VideosPixverseOpenapiV2VideoApi {
  public readonly result: VideosPixverseOpenapiV2VideoResultApi;
  public readonly text: VideosPixverseOpenapiV2VideoTextApi;

  constructor(client: HttpClient) {
    this.result = new VideosPixverseOpenapiV2VideoResultApi(client);
    this.text = new VideosPixverseOpenapiV2VideoTextApi(client);
  }

}

export class VideosPixverseOpenapiV2Api {
  public readonly video: VideosPixverseOpenapiV2VideoApi;

  constructor(client: HttpClient) {
    this.video = new VideosPixverseOpenapiV2VideoApi(client);
  }

}

export class VideosPixverseOpenapiApi {
  public readonly v2: VideosPixverseOpenapiV2Api;

  constructor(client: HttpClient) {
    this.v2 = new VideosPixverseOpenapiV2Api(client);
  }

}

export class VideosPixverseApi {
  public readonly openapi: VideosPixverseOpenapiApi;

  constructor(client: HttpClient) {
    this.openapi = new VideosPixverseOpenapiApi(client);
  }

}

export function createVideosPixverseApi(client: HttpClient): VideosPixverseApi {
  return new VideosPixverseApi(client);
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
