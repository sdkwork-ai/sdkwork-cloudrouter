import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { RunwayImageToVideoRequest, RunwayTaskAccepted, RunwayTextToVideoRequest } from '../types';


export interface VideosRunwayV1TextToVideoCreateParams {
  xRunwayVersion: '2024-11-06';
}

export class VideosRunwayV1TextToVideoApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Runway text to video */
  async create(body: RunwayTextToVideoRequest, params: VideosRunwayV1TextToVideoCreateParams, requestOptions?: ApiRequestOptions): Promise<RunwayTaskAccepted> {
    const requestHeaders = buildRequestHeaders(
      {
        'X-Runway-Version': { value: params.xRunwayVersion, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<RunwayTaskAccepted>(`/runway/v1/text_to_video`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}) });
  }
}

export interface VideosRunwayV1ImageToVideoCreateParams {
  xRunwayVersion: '2024-11-06';
}

export class VideosRunwayV1ImageToVideoApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Runway image to video */
  async create(body: RunwayImageToVideoRequest, params: VideosRunwayV1ImageToVideoCreateParams, requestOptions?: ApiRequestOptions): Promise<RunwayTaskAccepted> {
    const requestHeaders = buildRequestHeaders(
      {
        'X-Runway-Version': { value: params.xRunwayVersion, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<RunwayTaskAccepted>(`/runway/v1/image_to_video`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}) });
  }
}

export class VideosRunwayV1Api {
  public readonly imageToVideo: VideosRunwayV1ImageToVideoApi;
  public readonly textToVideo: VideosRunwayV1TextToVideoApi;

  constructor(client: HttpClient) {
    this.imageToVideo = new VideosRunwayV1ImageToVideoApi(client);
    this.textToVideo = new VideosRunwayV1TextToVideoApi(client);
  }

}

export class VideosRunwayApi {
  public readonly v1: VideosRunwayV1Api;

  constructor(client: HttpClient) {
    this.v1 = new VideosRunwayV1Api(client);
  }

}

export function createVideosRunwayApi(client: HttpClient): VideosRunwayApi {
  return new VideosRunwayApi(client);
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
