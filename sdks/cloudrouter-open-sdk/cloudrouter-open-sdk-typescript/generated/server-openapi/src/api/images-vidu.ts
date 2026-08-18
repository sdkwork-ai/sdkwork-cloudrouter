import { aiApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { ViduImageGenerationTask, ViduReferenceToImageRequest } from '../types';


export class ImagesViduEntV2Reference2imageApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Vidu reference to image */
  async create(body: ViduReferenceToImageRequest, requestOptions?: ApiRequestOptions): Promise<ViduImageGenerationTask> {
    return this.client.request<ViduImageGenerationTask>(aiApiPath(`/vidu/ent/v2/reference2image`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ImagesViduEntV2Api {
  public readonly reference2image: ImagesViduEntV2Reference2imageApi;

  constructor(client: HttpClient) {
    this.reference2image = new ImagesViduEntV2Reference2imageApi(client);
  }

}

export class ImagesViduEntApi {
  public readonly v2: ImagesViduEntV2Api;

  constructor(client: HttpClient) {
    this.v2 = new ImagesViduEntV2Api(client);
  }

}

export class ImagesViduApi {
  public readonly ent: ImagesViduEntApi;

  constructor(client: HttpClient) {
    this.ent = new ImagesViduEntApi(client);
  }

}

export function createImagesViduApi(client: HttpClient): ImagesViduApi {
  return new ImagesViduApi(client);
}
