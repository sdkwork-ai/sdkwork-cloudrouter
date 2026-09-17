import { type CloudRouterAppSdkClient } from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-core';

import { type ConsoleOverviewSnapshot } from '../models/ConsoleDashboardModels';

/**
 * Use-case orchestration for console-dashboard.
 *
 * Services receive explicit runtime inputs (an injected SDK client port) and
 * never construct SDK clients themselves, never perform raw HTTP, and never
 * add manual authentication headers.
 */
export class ConsoleDashboardService {
  private readonly client: CloudRouterAppSdkClient;

  constructor(client: CloudRouterAppSdkClient) {
    this.client = client;
  }

  async loadOverview(): Promise<ConsoleOverviewSnapshot | null> {
    // The ArkTS-adapted transport is not generated yet; the port is injected so
    // this service compiles unchanged once the adapter lands. Returning a
    // synthesized overview here would be fabricated data.
    return null;
  }

  baseUrl(): string {
    return this.client.baseUrl;
  }
}
