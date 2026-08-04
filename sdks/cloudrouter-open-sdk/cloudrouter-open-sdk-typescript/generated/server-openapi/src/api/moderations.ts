import { aiApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { OpenAiModeration, OpenAiModerationCreateRequest } from '../types';


export class ModerationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create moderation */
  async create(body: OpenAiModerationCreateRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiModeration> {
    return this.client.request<OpenAiModeration>(aiApiPath(`/moderations`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export function createModerationsApi(client: HttpClient): ModerationsApi {
  return new ModerationsApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
