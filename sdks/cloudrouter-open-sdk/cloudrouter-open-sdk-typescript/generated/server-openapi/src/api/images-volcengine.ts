import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { VolcengineImageGenerationRequest, VolcengineImageGenerationResponse } from '../types';


export class ImagesVolcengineApiV3ImagesGenerationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Volcengine Ark image generation */
  async create(body: VolcengineImageGenerationRequest, requestOptions?: ApiRequestOptions): Promise<VolcengineImageGenerationResponse> {
    return this.client.request<VolcengineImageGenerationResponse>(`/volcengine/api/v3/images/generations`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ImagesVolcengineApiV3ImagesApi {
  public readonly generations: ImagesVolcengineApiV3ImagesGenerationsApi;

  constructor(client: HttpClient) {
    this.generations = new ImagesVolcengineApiV3ImagesGenerationsApi(client);
  }

}

export class ImagesVolcengineApiV3Api {
  public readonly images: ImagesVolcengineApiV3ImagesApi;

  constructor(client: HttpClient) {
    this.images = new ImagesVolcengineApiV3ImagesApi(client);
  }

}

export class ImagesVolcengineApiApi {
  public readonly v3: ImagesVolcengineApiV3Api;

  constructor(client: HttpClient) {
    this.v3 = new ImagesVolcengineApiV3Api(client);
  }

}

export class ImagesVolcengineApi {
  public readonly api: ImagesVolcengineApiApi;

  constructor(client: HttpClient) {
    this.api = new ImagesVolcengineApiApi(client);
  }

}

export function createImagesVolcengineApi(client: HttpClient): ImagesVolcengineApi {
  return new ImagesVolcengineApi(client);
}
