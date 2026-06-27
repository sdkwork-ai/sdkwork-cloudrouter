import { aiApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { OpenAiImageEditRequest, OpenAiImageGenerationRequest, OpenAiImageList, OpenAiImageVariationRequest } from '../types';


export class ImagesVariationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create image variation */
  async create(body: OpenAiImageVariationRequest): Promise<OpenAiImageList> {
    return this.client.post<OpenAiImageList>(aiApiPath(`/images/variations`), body, undefined, undefined, 'application/json');
  }
}

export class ImagesGenerationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create image */
  async create(body: OpenAiImageGenerationRequest): Promise<OpenAiImageList> {
    return this.client.post<OpenAiImageList>(aiApiPath(`/images/generations`), body, undefined, undefined, 'application/json');
  }
}

export class ImagesEditsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create image edit */
  async create(body: OpenAiImageEditRequest): Promise<OpenAiImageList> {
    return this.client.post<OpenAiImageList>(aiApiPath(`/images/edits`), body, undefined, undefined, 'application/json');
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
