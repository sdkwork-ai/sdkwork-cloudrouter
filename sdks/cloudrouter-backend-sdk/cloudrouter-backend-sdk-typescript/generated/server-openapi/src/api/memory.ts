import { backendApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

export class MemoryMemoryAdminSpacesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List memory categories */
  async list(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/memory/spaces`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }
}

export class MemoryMemoryAdminRecordsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List memory records */
  async list(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/memory/memories`), { ...(requestOptions?.signal !== undefined ? { signal: requestOptions.signal } : {}), ...(requestOptions?.timeout !== undefined ? { timeout: requestOptions.timeout } : {}), method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }
}

export class MemoryMemoryAdminApi {
  public readonly records: MemoryMemoryAdminRecordsApi;
  public readonly spaces: MemoryMemoryAdminSpacesApi;

  constructor(client: HttpClient) {
    this.records = new MemoryMemoryAdminRecordsApi(client);
    this.spaces = new MemoryMemoryAdminSpacesApi(client);
  }

}

export class MemoryApi {
  public readonly memoryAdmin: MemoryMemoryAdminApi;

  constructor(client: HttpClient) {
    this.memoryAdmin = new MemoryMemoryAdminApi(client);
  }

}

export function createMemoryApi(client: HttpClient): MemoryApi {
  return new MemoryApi(client);
}
