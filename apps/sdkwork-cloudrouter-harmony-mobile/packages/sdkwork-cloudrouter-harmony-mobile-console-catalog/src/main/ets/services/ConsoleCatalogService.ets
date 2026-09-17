import { type CloudRouterAppSdkClient } from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-core';

import { type ConsoleCatalogPage } from '../models/ConsoleCatalogModels';

/**
 * Use-case orchestration for console-catalog.
 *
 * Services receive explicit runtime inputs (an injected SDK client port) and
 * never construct SDK clients themselves, never perform raw HTTP, and never
 * add manual authentication headers.
 */
export class ConsoleCatalogService {
  private readonly client: CloudRouterAppSdkClient;

  constructor(client: CloudRouterAppSdkClient) {
    this.client = client;
  }

  async listCatalogPage(page: number, pageSize: number): Promise<ConsoleCatalogPage> {
    if (pageSize <= 0 || page <= 0) {
      throw new Error('page and pageSize must be positive integers');
    }
    // The ArkTS-adapted transport is not generated yet; the port is injected so
    // this service compiles unchanged once the adapter lands. Prices are never
    // synthesized: an unpriced model reports null, not zero.
    return { items: [], total: 0, page, size: pageSize };
  }

  baseUrl(): string {
    return this.client.baseUrl;
  }
}
