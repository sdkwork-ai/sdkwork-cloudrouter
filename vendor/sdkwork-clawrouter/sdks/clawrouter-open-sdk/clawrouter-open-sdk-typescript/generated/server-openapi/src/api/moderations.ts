import { aiApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { OpenAiModeration, OpenAiModerationCreateRequest } from '../types';


export class ModerationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create moderation */
  async create(body: OpenAiModerationCreateRequest): Promise<OpenAiModeration> {
    return this.client.post<OpenAiModeration>(aiApiPath(`/moderations`), body, undefined, undefined, 'application/json');
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
