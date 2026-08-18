import { aiApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { OpenAiEmbeddingList, OpenAiEmbeddingsRequest } from '../types';


export class EmbeddingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create embeddings */
  async create(body: OpenAiEmbeddingsRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiEmbeddingList> {
    return this.client.request<OpenAiEmbeddingList>(aiApiPath(`/embeddings`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export function createEmbeddingsApi(client: HttpClient): EmbeddingsApi {
  return new EmbeddingsApi(client);
}
