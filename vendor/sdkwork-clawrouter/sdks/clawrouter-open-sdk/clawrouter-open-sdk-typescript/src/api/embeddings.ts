import { aiApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { OpenAiEmbeddingList, OpenAiEmbeddingsRequest } from '../types';


export class EmbeddingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create embeddings */
  async create(body: OpenAiEmbeddingsRequest): Promise<OpenAiEmbeddingList> {
    return this.client.post<OpenAiEmbeddingList>(aiApiPath(`/embeddings`), body, undefined, undefined, 'application/json');
  }
}

export function createEmbeddingsApi(client: HttpClient): EmbeddingsApi {
  return new EmbeddingsApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
