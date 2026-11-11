import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { TypeSafeSystemOneRequest, TypeSafeSystemOneResponse } from '../types';


export class ChatTypesafeV1SystemoneApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** TypeSafe AI System One decision */
  async create(body: TypeSafeSystemOneRequest, requestOptions?: ApiRequestOptions): Promise<TypeSafeSystemOneResponse> {
    return this.client.request<TypeSafeSystemOneResponse>(`/typesafe/v1/systemone`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ChatTypesafeV1Api {
  public readonly systemone: ChatTypesafeV1SystemoneApi;

  constructor(client: HttpClient) {
    this.systemone = new ChatTypesafeV1SystemoneApi(client);
  }

}

export class ChatTypesafeApi {
  public readonly v1: ChatTypesafeV1Api;

  constructor(client: HttpClient) {
    this.v1 = new ChatTypesafeV1Api(client);
  }

}

export function createChatTypesafeApi(client: HttpClient): ChatTypesafeApi {
  return new ChatTypesafeApi(client);
}
