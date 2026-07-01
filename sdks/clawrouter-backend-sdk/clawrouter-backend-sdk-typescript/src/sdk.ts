import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkBackendConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { AiApi, createAiApi } from './api/ai';
import { ContentApi, createContentApi } from './api/content';
import { IntegrationApi, createIntegrationApi } from './api/integration';
import { McpApi, createMcpApi } from './api/mcp';
import { MessagingApi, createMessagingApi } from './api/messaging';
import { ServiceProvidersApi, createServiceProvidersApi } from './api/service-providers';
import { SitesApi, createSitesApi } from './api/sites';
import { StorageApi, createStorageApi } from './api/storage';
import { SystemApi, createSystemApi } from './api/system';

export class SdkworkBackendClient {
  private httpClient: HttpClient;

  public readonly ai: AiApi;
  public readonly content: ContentApi;
  public readonly integration: IntegrationApi;
  public readonly mcp: McpApi;
  public readonly messaging: MessagingApi;
  public readonly serviceProviders: ServiceProvidersApi;
  public readonly sites: SitesApi;
  public readonly storage: StorageApi;
  public readonly system: SystemApi;

  constructor(config: SdkworkBackendConfig) {
    this.httpClient = createHttpClient(config);
    this.ai = createAiApi(this.httpClient);

    this.content = createContentApi(this.httpClient);

    this.integration = createIntegrationApi(this.httpClient);

    this.mcp = createMcpApi(this.httpClient);

    this.messaging = createMessagingApi(this.httpClient);

    this.serviceProviders = createServiceProvidersApi(this.httpClient);

    this.sites = createSitesApi(this.httpClient);

    this.storage = createStorageApi(this.httpClient);

    this.system = createSystemApi(this.httpClient);
  }
  setAuthToken(token: string): this {
    this.httpClient.setAuthToken(token);
    return this;
  }

  setAccessToken(token: string): this {
    this.httpClient.setAccessToken(token);
    return this;
  }

  setTokenManager(manager: AuthTokenManager): this {
    this.httpClient.setTokenManager(manager);
    return this;
  }

  get http(): HttpClient {
    return this.httpClient;
  }
}

export function createClient(config: SdkworkBackendConfig): SdkworkBackendClient {
  return new SdkworkBackendClient(config);
}

export default SdkworkBackendClient;
