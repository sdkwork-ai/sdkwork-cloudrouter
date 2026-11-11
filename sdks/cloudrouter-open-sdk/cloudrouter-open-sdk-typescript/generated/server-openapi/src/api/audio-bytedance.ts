import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { BytedanceSpeechChunk, BytedanceSpeechRequest } from '../types';


export interface AudioBytedanceApiV3TtsUnidirectionalCreateParams {
  xApiResourceId: 'seed-tts-2.0';
  xApiRequestId: string;
}

export class AudioBytedanceApiV3TtsUnidirectionalApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** ByteDance Seed TTS speech synthesis */
  async create(body: BytedanceSpeechRequest, params: AudioBytedanceApiV3TtsUnidirectionalCreateParams, requestOptions?: ApiRequestOptions): Promise<BytedanceSpeechChunk> {
    const requestHeaders = buildRequestHeaders(
      {
        'X-Api-Resource-Id': { value: params.xApiResourceId, style: 'simple', explode: false },
        'X-Api-Request-Id': { value: params.xApiRequestId, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<BytedanceSpeechChunk>(`/bytedance/api/v3/tts/unidirectional`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}) });
  }
}

export class AudioBytedanceApiV3TtsApi {
  public readonly unidirectional: AudioBytedanceApiV3TtsUnidirectionalApi;

  constructor(client: HttpClient) {
    this.unidirectional = new AudioBytedanceApiV3TtsUnidirectionalApi(client);
  }

}

export class AudioBytedanceApiV3Api {
  public readonly tts: AudioBytedanceApiV3TtsApi;

  constructor(client: HttpClient) {
    this.tts = new AudioBytedanceApiV3TtsApi(client);
  }

}

export class AudioBytedanceApiApi {
  public readonly v3: AudioBytedanceApiV3Api;

  constructor(client: HttpClient) {
    this.v3 = new AudioBytedanceApiV3Api(client);
  }

}

export class AudioBytedanceApi {
  public readonly api: AudioBytedanceApiApi;

  constructor(client: HttpClient) {
    this.api = new AudioBytedanceApiApi(client);
  }

}

export function createAudioBytedanceApi(client: HttpClient): AudioBytedanceApi {
  return new AudioBytedanceApi(client);
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
