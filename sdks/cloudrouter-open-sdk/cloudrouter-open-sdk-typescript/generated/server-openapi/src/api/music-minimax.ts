import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { MiniMaxMusicGenerationRequest, MiniMaxMusicGenerationResponse } from '../types';


export class MusicMinimaxV1MusicGenerationApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Minimax create music generation */
  async create(body: MiniMaxMusicGenerationRequest, requestOptions?: ApiRequestOptions): Promise<MiniMaxMusicGenerationResponse> {
    return this.client.request<MiniMaxMusicGenerationResponse>(`/minimax/v1/music_generation`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class MusicMinimaxV1Api {
  public readonly musicGeneration: MusicMinimaxV1MusicGenerationApi;

  constructor(client: HttpClient) {
    this.musicGeneration = new MusicMinimaxV1MusicGenerationApi(client);
  }

}

export class MusicMinimaxApi {
  public readonly v1: MusicMinimaxV1Api;

  constructor(client: HttpClient) {
    this.v1 = new MusicMinimaxV1Api(client);
  }

}

export function createMusicMinimaxApi(client: HttpClient): MusicMinimaxApi {
  return new MusicMinimaxApi(client);
}
