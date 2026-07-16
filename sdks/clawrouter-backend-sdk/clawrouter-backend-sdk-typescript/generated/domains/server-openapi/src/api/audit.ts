import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

export class AuditCommerceEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(backendApiPath(`/audit/commerce_events`));
  }
}

export class AuditApi {
  private client: HttpClient;
  public readonly commerceEvents: AuditCommerceEventsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.commerceEvents = new AuditCommerceEventsApi(client);
  }

}

export function createAuditApi(client: HttpClient): AuditApi {
  return new AuditApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
