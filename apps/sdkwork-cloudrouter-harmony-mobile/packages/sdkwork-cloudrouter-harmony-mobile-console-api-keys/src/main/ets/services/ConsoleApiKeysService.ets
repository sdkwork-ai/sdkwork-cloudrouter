import { type CloudRouterAppSdkClient } from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-core';

import { type ConsoleApiKeyRow } from '../models/ConsoleApiKeysModels';

/**
 * Use-case orchestration for console-api-keys.
 *
 * Services receive explicit runtime inputs (an injected SDK client port) and
 * never construct SDK clients themselves, never perform raw HTTP, and never
 * add manual authentication headers.
 */
export class ConsoleApiKeysService {
  private readonly client: CloudRouterAppSdkClient;

  constructor(client: CloudRouterAppSdkClient) {
    this.client = client;
  }

  async listApiKeys(): Promise<ConsoleApiKeyRow[]> {
    // The ArkTS-adapted transport is not generated yet; the port is injected so
    // this service compiles unchanged once the adapter lands. Key masking is a
    // shared read-model rule (cloudrouter-service); it is not re-implemented
    // here, and no placeholder key is invented.
    return [];
  }

  baseUrl(): string {
    return this.client.baseUrl;
  }
}
