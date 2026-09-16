import { aiApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { MiniMaxMusicGenerationRequest, MiniMaxMusicGenerationResponse } from '../types';


export class AudioMinimaxV1MusicGenerationApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Minimax create music generation */
  async create(body: MiniMaxMusicGenerationRequest, requestOptions?: ApiRequestOptions): Promise<MiniMaxMusicGenerationResponse> {
    return this.client.request<MiniMaxMusicGenerationResponse>(aiApiPath(`/minimax/v1/music_generation`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class AudioMinimaxV1Api {
  public readonly musicGeneration: AudioMinimaxV1MusicGenerationApi;

  constructor(client: HttpClient) {
    this.musicGeneration = new AudioMinimaxV1MusicGenerationApi(client);
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
