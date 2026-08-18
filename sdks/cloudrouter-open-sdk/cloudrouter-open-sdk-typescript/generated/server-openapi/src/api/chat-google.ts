import { aiApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { GoogleCountTokensRequest, GoogleCountTokensResponse, GoogleGenerateContentRequest, GoogleGenerateContentResponse } from '../types';


export class ChatGoogleV1betaModelsModelStreamGenerateContentApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Google Gemini stream generate content */
  async create(model: string, body: GoogleGenerateContentRequest, requestOptions?: ApiRequestOptions): Promise<GoogleGenerateContentResponse> {
    return this.client.request<GoogleGenerateContentResponse>(aiApiPath(`/google/v1beta/models/${serializePathParameter(model, { name: 'model', style: 'simple', explode: false })}:streamGenerateContent`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ChatGoogleV1betaModelsModelGenerateContentApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Google Gemini generate content */
  async create(model: string, body: GoogleGenerateContentRequest, requestOptions?: ApiRequestOptions): Promise<GoogleGenerateContentResponse> {
    return this.client.request<GoogleGenerateContentResponse>(aiApiPath(`/google/v1beta/models/${serializePathParameter(model, { name: 'model', style: 'simple', explode: false })}:generateContent`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ChatGoogleV1betaModelsModelCountTokensApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Google Gemini count tokens */
  async create(model: string, body: GoogleCountTokensRequest, requestOptions?: ApiRequestOptions): Promise<GoogleCountTokensResponse> {
    return this.client.request<GoogleCountTokensResponse>(aiApiPath(`/google/v1beta/models/${serializePathParameter(model, { name: 'model', style: 'simple', explode: false })}:countTokens`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ChatGoogleV1betaModelsApi {
  public readonly modelCountTokens: ChatGoogleV1betaModelsModelCountTokensApi;
  public readonly modelGenerateContent: ChatGoogleV1betaModelsModelGenerateContentApi;
  public readonly modelStreamGenerateContent: ChatGoogleV1betaModelsModelStreamGenerateContentApi;

  constructor(client: HttpClient) {
    this.modelCountTokens = new ChatGoogleV1betaModelsModelCountTokensApi(client);
    this.modelGenerateContent = new ChatGoogleV1betaModelsModelGenerateContentApi(client);
    this.modelStreamGenerateContent = new ChatGoogleV1betaModelsModelStreamGenerateContentApi(client);
  }

}

export class ChatGoogleV1betaApi {
  public readonly models: ChatGoogleV1betaModelsApi;

  constructor(client: HttpClient) {
    this.models = new ChatGoogleV1betaModelsApi(client);
  }

}

export class ChatGoogleApi {
  public readonly v1beta: ChatGoogleV1betaApi;

  constructor(client: HttpClient) {
    this.v1beta = new ChatGoogleV1betaApi(client);
  }

}

export function createChatGoogleApi(client: HttpClient): ChatGoogleApi {
  return new ChatGoogleApi(client);
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
