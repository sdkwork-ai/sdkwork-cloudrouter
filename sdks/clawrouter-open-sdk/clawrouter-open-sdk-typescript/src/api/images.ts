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
    return this.client.request<OpenAiImageList>(aiApiPath(`/images/variations`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ImagesGenerationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create image */
  async create(body: OpenAiImageGenerationRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiImageList> {
    return this.client.request<OpenAiImageList>(aiApiPath(`/images/generations`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ImagesEditsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create image edit */
  async create(body: OpenAiImageEditRequest, requestOptions?: ApiRequestOptions): Promise<OpenAiImageList> {
    return this.client.request<OpenAiImageList>(aiApiPath(`/images/edits`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json' });
  }
}

export class ImagesApi {
  private client: HttpClient;
  public readonly edits: ImagesEditsApi;
  public readonly generations: ImagesGenerationsApi;
  public readonly variations: ImagesVariationsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.edits = new ImagesEditsApi(client);
    this.generations = new ImagesGenerationsApi(client);
    this.variations = new ImagesVariationsApi(client);
  }

}

export function createImagesApi(client: HttpClient): ImagesApi {
  return new ImagesApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
