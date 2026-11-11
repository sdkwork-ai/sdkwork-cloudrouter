import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { ZhipuImageGenerationRequest, ZhipuImageGenerationResponse } from '../types';


export class ImagesZhipuApiPaasV4ImagesGenerationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Zhipu CogView image generation */
  async create(body: ZhipuImageGenerationRequest, requestOptions?: ApiRequestOptions): Promise<ZhipuImageGenerationResponse> {
    return this.client.request<ZhipuImageGenerationResponse>(`/zhipu/api/paas/v4/images/generations`, { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ImagesZhipuApiPaasV4ImagesApi {
  public readonly generations: ImagesZhipuApiPaasV4ImagesGenerationsApi;

  constructor(client: HttpClient) {
    this.generations = new ImagesZhipuApiPaasV4ImagesGenerationsApi(client);
  }

}

export class ImagesZhipuApiPaasV4Api {
  public readonly images: ImagesZhipuApiPaasV4ImagesApi;

  constructor(client: HttpClient) {
    this.images = new ImagesZhipuApiPaasV4ImagesApi(client);
  }

}

export class ImagesZhipuApiPaasApi {
  public readonly v4: ImagesZhipuApiPaasV4Api;

  constructor(client: HttpClient) {
    this.v4 = new ImagesZhipuApiPaasV4Api(client);
  }

}

export class ImagesZhipuApiApi {
  public readonly paas: ImagesZhipuApiPaasApi;

  constructor(client: HttpClient) {
    this.paas = new ImagesZhipuApiPaasApi(client);
  }

}

export class ImagesZhipuApi {
  public readonly api: ImagesZhipuApiApi;

  constructor(client: HttpClient) {
    this.api = new ImagesZhipuApiApi(client);
  }

}

export function createImagesZhipuApi(client: HttpClient): ImagesZhipuApi {
  return new ImagesZhipuApi(client);
}
