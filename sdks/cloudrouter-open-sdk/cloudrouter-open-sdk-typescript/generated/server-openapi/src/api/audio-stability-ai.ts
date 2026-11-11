import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { StabilityAudioRequest } from '../types';


export class AudioStabilityAiV2betaAudioStableAudio2TextToAudioApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Stability AI text-to-audio (music and sound effects) */
  async create(body: StabilityAudioRequest, requestOptions?: ApiRequestOptions): Promise<Blob> {
    return this.client.request<Blob>(`/stability_ai/v2beta/audio/stable-audio-2/text-to-audio`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'multipart/form-data' });
  }
}

export class AudioStabilityAiV2betaAudioStableAudio2Api {
  public readonly textToAudio: AudioStabilityAiV2betaAudioStableAudio2TextToAudioApi;

  constructor(client: HttpClient) {
    this.textToAudio = new AudioStabilityAiV2betaAudioStableAudio2TextToAudioApi(client);
  }

}

export class AudioStabilityAiV2betaAudioApi {
  public readonly stableAudio2: AudioStabilityAiV2betaAudioStableAudio2Api;

  constructor(client: HttpClient) {
    this.stableAudio2 = new AudioStabilityAiV2betaAudioStableAudio2Api(client);
  }

}

export class AudioStabilityAiV2betaApi {
  public readonly audio: AudioStabilityAiV2betaAudioApi;

  constructor(client: HttpClient) {
    this.audio = new AudioStabilityAiV2betaAudioApi(client);
  }

}

export class AudioStabilityAiApi {
  public readonly v2beta: AudioStabilityAiV2betaApi;

  constructor(client: HttpClient) {
    this.v2beta = new AudioStabilityAiV2betaApi(client);
  }

}

export function createAudioStabilityAiApi(client: HttpClient): AudioStabilityAiApi {
  return new AudioStabilityAiApi(client);
}
