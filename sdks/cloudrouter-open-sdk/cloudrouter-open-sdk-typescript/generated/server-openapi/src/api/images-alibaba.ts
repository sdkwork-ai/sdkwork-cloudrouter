import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { AlibabaImageGenerationRequest, AlibabaImageGenerationResponse } from '../types';


export interface ImagesAlibabaApiV1ServicesAigcText2imageImageSynthesisCreateParams {
  xDashScopeAsync: 'enable';
}

export class ImagesAlibabaApiV1ServicesAigcText2imageImageSynthesisApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Alibaba Wanx image generation */
  async create(body: AlibabaImageGenerationRequest, params: ImagesAlibabaApiV1ServicesAigcText2imageImageSynthesisCreateParams, requestOptions?: ApiRequestOptions): Promise<AlibabaImageGenerationResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'X-DashScope-Async': { value: params.xDashScopeAsync, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<AlibabaImageGenerationResponse>(`/alibaba/api/v1/services/aigc/text2image/image-synthesis`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}) });
  }
}

export class ImagesAlibabaApiV1ServicesAigcText2imageApi {
  public readonly imageSynthesis: ImagesAlibabaApiV1ServicesAigcText2imageImageSynthesisApi;

  constructor(client: HttpClient) {
    this.imageSynthesis = new ImagesAlibabaApiV1ServicesAigcText2imageImageSynthesisApi(client);
  }

}

export class ImagesAlibabaApiV1ServicesAigcApi {
  public readonly text2image: ImagesAlibabaApiV1ServicesAigcText2imageApi;

  constructor(client: HttpClient) {
    this.text2image = new ImagesAlibabaApiV1ServicesAigcText2imageApi(client);
  }

}

export class ImagesAlibabaApiV1ServicesApi {
  public readonly aigc: ImagesAlibabaApiV1ServicesAigcApi;

  constructor(client: HttpClient) {
    this.aigc = new ImagesAlibabaApiV1ServicesAigcApi(client);
  }

}

export class ImagesAlibabaApiV1Api {
  public readonly services: ImagesAlibabaApiV1ServicesApi;

  constructor(client: HttpClient) {
    this.services = new ImagesAlibabaApiV1ServicesApi(client);
  }

}

export class ImagesAlibabaApiApi {
  public readonly v1: ImagesAlibabaApiV1Api;

  constructor(client: HttpClient) {
    this.v1 = new ImagesAlibabaApiV1Api(client);
  }

}

export class ImagesAlibabaApi {
  public readonly api: ImagesAlibabaApiApi;

  constructor(client: HttpClient) {
    this.api = new ImagesAlibabaApiApi(client);
  }

}

export function createImagesAlibabaApi(client: HttpClient): ImagesAlibabaApi {
  return new ImagesAlibabaApi(client);
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
