import { aiApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { AnthropicCountMessageTokensRequest, AnthropicCountMessageTokensResponse, AnthropicMessage, AnthropicMessageCreateRequest } from '../types';


export class ChatAnthropicV1MessagesCountTokensApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Anthropic count message tokens */
  async create(body: AnthropicCountMessageTokensRequest, requestOptions?: ApiRequestOptions): Promise<AnthropicCountMessageTokensResponse> {
    return this.client.request<AnthropicCountMessageTokensResponse>(aiApiPath(`/anthropic/v1/messages/count_tokens`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ChatAnthropicV1MessagesApi {
  private client: HttpClient;
  public readonly countTokens: ChatAnthropicV1MessagesCountTokensApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.countTokens = new ChatAnthropicV1MessagesCountTokensApi(client);
  }


/** Anthropic Claude message */
  async create(body: AnthropicMessageCreateRequest, requestOptions?: ApiRequestOptions): Promise<AnthropicMessage> {
    return this.client.request<AnthropicMessage>(aiApiPath(`/anthropic/v1/messages`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ChatAnthropicV1Api {
  private client: HttpClient;
  public readonly messages: ChatAnthropicV1MessagesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.messages = new ChatAnthropicV1MessagesApi(client);
  }

}

export class ChatAnthropicApi {
  private client: HttpClient;
  public readonly v1: ChatAnthropicV1Api;

  constructor(client: HttpClient) {
    this.client = client;
    this.v1 = new ChatAnthropicV1Api(client);
  }

}

export function createChatAnthropicApi(client: HttpClient): ChatAnthropicApi {
  return new ChatAnthropicApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
