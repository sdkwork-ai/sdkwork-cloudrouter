import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

export class BillingHistoryApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/billing/history`));
  }
}

export class BillingApi {
  private client: HttpClient;
  public readonly history: BillingHistoryApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.history = new BillingHistoryApi(client);
  }

}

export function createBillingApi(client: HttpClient): BillingApi {
  return new BillingApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
