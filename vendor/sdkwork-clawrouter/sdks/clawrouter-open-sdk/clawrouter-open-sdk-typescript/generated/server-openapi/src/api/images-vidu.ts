import { aiApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { ViduImageGenerationTask, ViduReferenceToImageRequest } from '../types';


export class ImagesViduEntV2Reference2imageApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Vidu reference to image */
  async create(body: ViduReferenceToImageRequest): Promise<ViduImageGenerationTask> {
    return this.client.post<ViduImageGenerationTask>(aiApiPath(`/vidu/ent/v2/reference2image`), body, undefined, undefined, 'application/json');
  }
}

export class ImagesViduEntV2Api {
  private client: HttpClient;
  public readonly reference2image: ImagesViduEntV2Reference2imageApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.reference2image = new ImagesViduEntV2Reference2imageApi(client);
  }

}

export class ImagesViduEntApi {
  private client: HttpClient;
  public readonly v2: ImagesViduEntV2Api;

  constructor(client: HttpClient) {
    this.client = client;
    this.v2 = new ImagesViduEntV2Api(client);
  }

}

export class ImagesViduApi {
  private client: HttpClient;
  public readonly ent: ImagesViduEntApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.ent = new ImagesViduEntApi(client);
  }

}

export function createImagesViduApi(client: HttpClient): ImagesViduApi {
  return new ImagesViduApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
