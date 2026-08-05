import { aiApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { OpenAiVendorList } from '../types';


export class VendorApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List vendors */
  async list(requestOptions?: ApiRequestOptions): Promise<OpenAiVendorList> {
    return this.client.request<OpenAiVendorList>(aiApiPath(`/vendors`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export function createVendorApi(client: HttpClient): VendorApi {
  return new VendorApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
