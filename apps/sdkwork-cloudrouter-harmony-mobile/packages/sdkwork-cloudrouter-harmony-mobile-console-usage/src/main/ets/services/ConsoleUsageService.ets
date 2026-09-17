import { type CloudRouterAppSdkClient } from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-core';

import { type ConsoleUsagePage } from '../models/ConsoleUsageModels';

/**
 * Use-case orchestration for console-usage.
 *
 * Services receive explicit runtime inputs (an injected SDK client port) and
 * never construct SDK clients themselves, never perform raw HTTP, and never
 * add manual authentication headers.
 */
export class ConsoleUsageService {
  private readonly client: CloudRouterAppSdkClient;

  constructor(client: CloudRouterAppSdkClient) {
    this.client = client;
  }

  async listUsagePage(page: number, pageSize: number): Promise<ConsoleUsagePage> {
    if (pageSize <= 0 || page <= 0) {
      throw new Error('page and pageSize must be positive integers');
    }
    // The ArkTS-adapted transport is not generated yet; the port is injected so
    // this service compiles unchanged once the adapter lands. Empty rows are
    // reported as empty rather than synthesized.
    return { items: [], total: 0, page, size: pageSize };
  }

  baseUrl(): string {
    return this.client.baseUrl;
  }
}
