import { aiApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { OpenAiSpeechCreateRequest } from '../types';


export class AudioVolcengineApiV3AudioSpeechApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Volcengine create speech */
  async create(body: OpenAiSpeechCreateRequest, requestOptions?: ApiRequestOptions): Promise<Blob> {
    return this.client.request<Blob>(aiApiPath(`/volcengine/api/v3/audio/speech`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class AudioVolcengineApiV3AudioApi {
  public readonly speech: AudioVolcengineApiV3AudioSpeechApi;

  constructor(client: HttpClient) {
    this.speech = new AudioVolcengineApiV3AudioSpeechApi(client);
  }

}

export class AudioVolcengineApiV3Api {
  public readonly audio: AudioVolcengineApiV3AudioApi;

  constructor(client: HttpClient) {
    this.audio = new AudioVolcengineApiV3AudioApi(client);
  }

}

export class AudioVolcengineApiApi {
  public readonly v3: AudioVolcengineApiV3Api;

  constructor(client: HttpClient) {
    this.v3 = new AudioVolcengineApiV3Api(client);
  }

}

export class AudioVolcengineApi {
  public readonly api: AudioVolcengineApiApi;

  constructor(client: HttpClient) {
    this.api = new AudioVolcengineApiApi(client);
  }

}

export function createAudioVolcengineApi(client: HttpClient): AudioVolcengineApi {
  return new AudioVolcengineApi(client);
}
