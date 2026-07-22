import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

export class SystemSiteRuntimeApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List site branding */
  async list(): Promise<Record<string, never>> {
    return this.client.get<Record<string, never>>(appApiPath(`/system/site/runtime`));
  }
}

export class SystemSiteApi {

  public readonly runtime: SystemSiteRuntimeApi;

  constructor(client: HttpClient) {

    this.runtime = new SystemSiteRuntimeApi(client);
  }

}

export class SystemApi {

  public readonly site: SystemSiteApi;

  constructor(client: HttpClient) {

    this.site = new SystemSiteApi(client);
  }

}

export function createSystemApi(client: HttpClient): SystemApi {
  return new SystemApi(client);
}
