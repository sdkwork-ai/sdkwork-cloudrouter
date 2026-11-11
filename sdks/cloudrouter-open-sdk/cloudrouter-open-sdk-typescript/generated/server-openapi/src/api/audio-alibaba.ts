import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { AlibabaSpeechRequest, AlibabaSpeechResponse } from '../types';


export class AudioAlibabaApiV1ServicesAudioTtsSpeechSynthesizerApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Alibaba Qwen TTS speech synthesis */
  async create(body: AlibabaSpeechRequest, requestOptions?: ApiRequestOptions): Promise<AlibabaSpeechResponse> {
    return this.client.request<AlibabaSpeechResponse>(`/alibaba/api/v1/services/audio/tts/SpeechSynthesizer`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class AudioAlibabaApiV1ServicesAudioTtsApi {
  public readonly speechSynthesizer: AudioAlibabaApiV1ServicesAudioTtsSpeechSynthesizerApi;

  constructor(client: HttpClient) {
    this.speechSynthesizer = new AudioAlibabaApiV1ServicesAudioTtsSpeechSynthesizerApi(client);
  }

}

export class AudioAlibabaApiV1ServicesAudioApi {
  public readonly tts: AudioAlibabaApiV1ServicesAudioTtsApi;

  constructor(client: HttpClient) {
    this.tts = new AudioAlibabaApiV1ServicesAudioTtsApi(client);
  }

}

export class AudioAlibabaApiV1ServicesApi {
  public readonly audio: AudioAlibabaApiV1ServicesAudioApi;

  constructor(client: HttpClient) {
    this.audio = new AudioAlibabaApiV1ServicesAudioApi(client);
  }

}

export class AudioAlibabaApiV1Api {
  public readonly services: AudioAlibabaApiV1ServicesApi;

  constructor(client: HttpClient) {
    this.services = new AudioAlibabaApiV1ServicesApi(client);
  }

}

export class AudioAlibabaApiApi {
  public readonly v1: AudioAlibabaApiV1Api;

  constructor(client: HttpClient) {
    this.v1 = new AudioAlibabaApiV1Api(client);
  }

}

export class AudioAlibabaApi {
  public readonly api: AudioAlibabaApiApi;

  constructor(client: HttpClient) {
    this.api = new AudioAlibabaApiApi(client);
  }

}

export function createAudioAlibabaApi(client: HttpClient): AudioAlibabaApi {
  return new AudioAlibabaApi(client);
}
