import { aiApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';

import type { GatewayUserBalance } from '../types';


export class UserBalanceApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve account balance */
  async list(requestOptions?: ApiRequestOptions): Promise<GatewayUserBalance> {
    return this.client.request<GatewayUserBalance>(aiApiPath(`/user/balance`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any });
  }
}

export class UserApi {
  private client: HttpClient;
  public readonly balance: UserBalanceApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.balance = new UserBalanceApi(client);
  }

}

export function createUserApi(client: HttpClient): UserApi {
  return new UserApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
