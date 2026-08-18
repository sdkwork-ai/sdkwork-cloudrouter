import { aiApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { OpenAiCompletion, OpenAiCompletionCreateRequest } from '../types';


export class CompletionApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create completion */
  async create(body: OpenAiCompletionCreateRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiCompletion> {
    return this.client.request<OpenAiCompletion>(aiApiPath(`/completions`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export function createCompletionApi(client: HttpClient): CompletionApi {
  return new CompletionApi(client);
}
