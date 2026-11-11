import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { BlackForestLabsVideoGenerationRequest, BlackForestLabsVideoGenerationTask } from '../types';


export class VideosBlackForestLabsV1Flux3VideoApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Black Forest Labs FLUX 3 video generation */
  async create(body: BlackForestLabsVideoGenerationRequest, requestOptions?: ApiRequestOptions): Promise<BlackForestLabsVideoGenerationTask> {
    return this.client.request<BlackForestLabsVideoGenerationTask>(`/black_forest_labs/v1/flux-3-video`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class VideosBlackForestLabsV1Api {
  public readonly flux3Video: VideosBlackForestLabsV1Flux3VideoApi;

  constructor(client: HttpClient) {
    this.flux3Video = new VideosBlackForestLabsV1Flux3VideoApi(client);
  }

}

export class VideosBlackForestLabsApi {
  public readonly v1: VideosBlackForestLabsV1Api;

  constructor(client: HttpClient) {
    this.v1 = new VideosBlackForestLabsV1Api(client);
  }

}

export function createVideosBlackForestLabsApi(client: HttpClient): VideosBlackForestLabsApi {
  return new VideosBlackForestLabsApi(client);
}
