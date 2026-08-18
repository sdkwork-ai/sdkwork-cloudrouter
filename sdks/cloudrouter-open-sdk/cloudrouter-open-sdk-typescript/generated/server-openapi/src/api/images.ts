import { aiApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { OpenAiImageEditRequest, OpenAiImageGenerationRequest, OpenAiImageList, OpenAiImageVariationRequest } from '../types';


export class ImagesVariationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create image variation */
  async create(body: OpenAiImageVariationRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiImageList> {
    return this.client.request<OpenAiImageList>(aiApiPath(`/images/variations`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ImagesGenerationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create image */
  async create(body: OpenAiImageGenerationRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiImageList> {
    return this.client.request<OpenAiImageList>(aiApiPath(`/images/generations`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ImagesEditsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create image edit */
  async create(body: OpenAiImageEditRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiImageList> {
    return this.client.request<OpenAiImageList>(aiApiPath(`/images/edits`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ImagesApi {
  public readonly edits: ImagesEditsApi;
  public readonly generations: ImagesGenerationsApi;
  public readonly variations: ImagesVariationsApi;

  constructor(client: HttpClient) {
    this.edits = new ImagesEditsApi(client);
    this.generations = new ImagesGenerationsApi(client);
    this.variations = new ImagesVariationsApi(client);
  }

}

export function createImagesApi(client: HttpClient): ImagesApi {
  return new ImagesApi(client);
}
