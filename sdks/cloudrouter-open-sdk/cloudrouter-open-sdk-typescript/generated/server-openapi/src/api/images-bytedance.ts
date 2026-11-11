import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { BytedanceImageGenerationRequest, BytedanceImageGenerationResponse } from '../types';


export class ImagesBytedanceApiV3ImagesGenerationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** ByteDance Seedream image generation */
  async create(body: BytedanceImageGenerationRequest, requestOptions?: ApiRequestOptions): Promise<BytedanceImageGenerationResponse> {
    return this.client.request<BytedanceImageGenerationResponse>(`/bytedance/api/v3/images/generations`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ImagesBytedanceApiV3ImagesApi {
  public readonly generations: ImagesBytedanceApiV3ImagesGenerationsApi;

  constructor(client: HttpClient) {
    this.generations = new ImagesBytedanceApiV3ImagesGenerationsApi(client);
  }

}

export class ImagesBytedanceApiV3Api {
  public readonly images: ImagesBytedanceApiV3ImagesApi;

  constructor(client: HttpClient) {
    this.images = new ImagesBytedanceApiV3ImagesApi(client);
  }

}

export class ImagesBytedanceApiApi {
  public readonly v3: ImagesBytedanceApiV3Api;

  constructor(client: HttpClient) {
    this.v3 = new ImagesBytedanceApiV3Api(client);
  }

}

export class ImagesBytedanceApi {
  public readonly api: ImagesBytedanceApiApi;

  constructor(client: HttpClient) {
    this.api = new ImagesBytedanceApiApi(client);
  }

}

export function createImagesBytedanceApi(client: HttpClient): ImagesBytedanceApi {
  return new ImagesBytedanceApi(client);
}
