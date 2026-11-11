import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { MinimaxTextToSpeechRequest, MinimaxTextToSpeechResponse } from '../types';


export class AudioMinimaxV1T2aV2Api {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** MiniMax speech synthesis */
  async create(body: MinimaxTextToSpeechRequest, requestOptions?: ApiRequestOptions): Promise<MinimaxTextToSpeechResponse> {
    return this.client.request<MinimaxTextToSpeechResponse>(`/minimax/v1/t2a_v2`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class AudioMinimaxV1Api {
  public readonly t2aV2: AudioMinimaxV1T2aV2Api;

  constructor(client: HttpClient) {
    this.t2aV2 = new AudioMinimaxV1T2aV2Api(client);
  }

}

export class AudioMinimaxApi {
  public readonly v1: AudioMinimaxV1Api;

  constructor(client: HttpClient) {
    this.v1 = new AudioMinimaxV1Api(client);
  }

}

export function createAudioMinimaxApi(client: HttpClient): AudioMinimaxApi {
  return new AudioMinimaxApi(client);
}
