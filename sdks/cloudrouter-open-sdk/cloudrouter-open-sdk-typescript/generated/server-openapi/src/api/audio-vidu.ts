import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { ViduAudioGenerationTask, ViduTextToAudioRequest, ViduTimingToAudioRequest } from '../types';


export class AudioViduEntV2Timing2audioApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Vidu timing to audio */
  async create(body: ViduTimingToAudioRequest, requestOptions?: ApiRequestOptions): Promise<ViduAudioGenerationTask> {
    return this.client.request<ViduAudioGenerationTask>(`/vidu/ent/v2/timing2audio`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class AudioViduEntV2Text2audioApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Vidu text to audio */
  async create(body: ViduTextToAudioRequest, requestOptions?: ApiRequestOptions): Promise<ViduAudioGenerationTask> {
    return this.client.request<ViduAudioGenerationTask>(`/vidu/ent/v2/text2audio`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class AudioViduEntV2Api {
  public readonly text2audio: AudioViduEntV2Text2audioApi;
  public readonly timing2audio: AudioViduEntV2Timing2audioApi;

  constructor(client: HttpClient) {
    this.text2audio = new AudioViduEntV2Text2audioApi(client);
    this.timing2audio = new AudioViduEntV2Timing2audioApi(client);
  }

}

export class AudioViduEntApi {
  public readonly v2: AudioViduEntV2Api;

  constructor(client: HttpClient) {
    this.v2 = new AudioViduEntV2Api(client);
  }

}

export class AudioViduApi {
  public readonly ent: AudioViduEntApi;

  constructor(client: HttpClient) {
    this.ent = new AudioViduEntApi(client);
  }

}

export function createAudioViduApi(client: HttpClient): AudioViduApi {
  return new AudioViduApi(client);
}
