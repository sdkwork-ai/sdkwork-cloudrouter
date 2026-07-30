import { backendApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

export class PaymentsRuntimeSnapshotApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/payments/runtime/snapshot`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }
}

export class PaymentsRuntimeApi {
  private client: HttpClient;
  public readonly snapshot: PaymentsRuntimeSnapshotApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.snapshot = new PaymentsRuntimeSnapshotApi(client);
  }

}

export class PaymentsApi {
  private client: HttpClient;
  public readonly runtime: PaymentsRuntimeApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.runtime = new PaymentsRuntimeApi(client);
  }

}

export function createPaymentsApi(client: HttpClient): PaymentsApi {
  return new PaymentsApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
