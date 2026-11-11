import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { AnthropicCountMessageTokensRequest, AnthropicCountMessageTokensResponse, AnthropicMessage, AnthropicMessageCreateRequest } from '../types';


export interface ChatAnthropicV1MessagesCountTokensCreateParams {
  anthropicVersion: string;
}

export class ChatAnthropicV1MessagesCountTokensApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Anthropic count message tokens */
  async create(body: AnthropicCountMessageTokensRequest, params: ChatAnthropicV1MessagesCountTokensCreateParams, requestOptions?: ApiRequestOptions): Promise<AnthropicCountMessageTokensResponse> {
    const requestHeaders = buildRequestHeaders(
      {
        'anthropic-version': { value: params.anthropicVersion, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<AnthropicCountMessageTokensResponse>(`/anthropic/v1/messages/count_tokens`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}) });
  }
}

export interface ChatAnthropicV1MessagesCreateParams {
  anthropicVersion: string;
}

export class ChatAnthropicV1MessagesApi {
  private client: HttpClient;
  public readonly countTokens: ChatAnthropicV1MessagesCountTokensApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.countTokens = new ChatAnthropicV1MessagesCountTokensApi(client);
  }


/** Anthropic Claude message */
  async create(body: AnthropicMessageCreateRequest, params: ChatAnthropicV1MessagesCreateParams, requestOptions?: ApiRequestOptions): Promise<AnthropicMessage> {
    const requestHeaders = buildRequestHeaders(
      {
        'anthropic-version': { value: params.anthropicVersion, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<AnthropicMessage>(`/anthropic/v1/messages`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json', ...(requestHeaders !== undefined ? { headers: requestHeaders } : {}) });
  }
}

export class ChatAnthropicV1Api {
  public readonly messages: ChatAnthropicV1MessagesApi;

  constructor(client: HttpClient) {
    this.messages = new ChatAnthropicV1MessagesApi(client);
  }

}

export class ChatAnthropicApi {
  public readonly v1: ChatAnthropicV1Api;

  constructor(client: HttpClient) {
    this.v1 = new ChatAnthropicV1Api(client);
  }

}

export function createChatAnthropicApi(client: HttpClient): ChatAnthropicApi {
  return new ChatAnthropicApi(client);
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
