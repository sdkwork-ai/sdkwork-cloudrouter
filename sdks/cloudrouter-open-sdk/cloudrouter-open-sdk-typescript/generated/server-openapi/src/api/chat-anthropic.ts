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
    return this.client.request<AnthropicCountMessageTokensResponse>(aiApiPath(`/anthropic/v1/messages/count_tokens`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
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
    return this.client.request<AnthropicMessage>(aiApiPath(`/anthropic/v1/messages`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
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
