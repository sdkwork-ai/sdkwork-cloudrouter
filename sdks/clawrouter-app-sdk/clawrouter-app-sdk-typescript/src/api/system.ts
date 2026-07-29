import { appApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

export class SystemSiteRuntimeApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List site branding */
  async list(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(appApiPath(`/system/site/runtime`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }
}

export class SystemSiteApi {
  private client: HttpClient;
  public readonly runtime: SystemSiteRuntimeApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.runtime = new SystemSiteRuntimeApi(client);
  }

}

export class SystemApi {
  private client: HttpClient;
  public readonly site: SystemSiteApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.site = new SystemSiteApi(client);
  }

}

export function createSystemApi(client: HttpClient): SystemApi {
  return new SystemApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
