import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { MinimaxImageGenerationRequest, MinimaxImageGenerationResponse } from '../types';


export class ImagesMinimaxV1ImageGenerationApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** MiniMax image generation */
  async create(body: MinimaxImageGenerationRequest, requestOptions?: ApiRequestOptions): Promise<MinimaxImageGenerationResponse> {
    return this.client.request<MinimaxImageGenerationResponse>(`/minimax/v1/image_generation`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ImagesMinimaxV1Api {
  public readonly imageGeneration: ImagesMinimaxV1ImageGenerationApi;

  constructor(client: HttpClient) {
    this.imageGeneration = new ImagesMinimaxV1ImageGenerationApi(client);
  }

}

export class ImagesMinimaxApi {
  public readonly v1: ImagesMinimaxV1Api;

  constructor(client: HttpClient) {
    this.v1 = new ImagesMinimaxV1Api(client);
  }

}

export function createImagesMinimaxApi(client: HttpClient): ImagesMinimaxApi {
  return new ImagesMinimaxApi(client);
}
