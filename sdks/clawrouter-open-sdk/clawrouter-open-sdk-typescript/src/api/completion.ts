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
    return this.client.request<OpenAiCompletion>(aiApiPath(`/completions`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export function createCompletionApi(client: HttpClient): CompletionApi {
  return new CompletionApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
