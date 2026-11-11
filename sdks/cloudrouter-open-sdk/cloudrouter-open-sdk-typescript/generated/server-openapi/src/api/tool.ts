import { aiApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { OpenAiDeepSeekWebFetchRequest, OpenAiDeepSeekWebFetchResponse, OpenAiDeepSeekWebSearchRequest, OpenAiDeepSeekWebSearchResponse } from '../types';


export class ToolFetchApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Fetch a web page */
  async create(body: OpenAiDeepSeekWebFetchRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiDeepSeekWebFetchResponse> {
    return this.client.request<OpenAiDeepSeekWebFetchResponse>(aiApiPath(`/tools/fetch`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ToolApi {
  private client: HttpClient;
  public readonly fetch: ToolFetchApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.fetch = new ToolFetchApi(client);
  }


/** Search the web */
  async search(body: OpenAiDeepSeekWebSearchRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiDeepSeekWebSearchResponse> {
    return this.client.request<OpenAiDeepSeekWebSearchResponse>(aiApiPath(`/tools/search`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export function createToolApi(client: HttpClient): ToolApi {
  return new ToolApi(client);
}
