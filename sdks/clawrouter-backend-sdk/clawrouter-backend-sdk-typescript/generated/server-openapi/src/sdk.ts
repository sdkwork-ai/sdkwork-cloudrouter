import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkBackendConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { SystemApi, createSystemApi } from './api/system';
import { AiApi, createAiApi } from './api/ai';
import { CommerceApi, createCommerceApi } from './api/commerce';
import { ContentApi, createContentApi } from './api/content';
import { IntegrationApi, createIntegrationApi } from './api/integration';
import { McpApi, createMcpApi } from './api/mcp';
import { MessagingApi, createMessagingApi } from './api/messaging';
import { ServiceProvidersApi, createServiceProvidersApi } from './api/service-providers';
import { SitesApi, createSitesApi } from './api/sites';
import { StorageApi, createStorageApi } from './api/storage';

export class SdkworkBackendClient {
  private httpClient: HttpClient;

  public readonly system: SystemApi;
  public readonly ai: AiApi;
  public readonly commerce: CommerceApi;
  public readonly content: ContentApi;
  public readonly integration: IntegrationApi;
  public readonly mcp: McpApi;
  public readonly messaging: MessagingApi;
  public readonly serviceProviders: ServiceProvidersApi;
  public readonly sites: SitesApi;
  public readonly storage: StorageApi;

  constructor(config: SdkworkBackendConfig) {
    this.httpClient = createHttpClient(config);
    this.system = createSystemApi(this.httpClient);

    this.ai = createAiApi(this.httpClient);

    this.commerce = createCommerceApi(this.httpClient);

    this.content = createContentApi(this.httpClient);

    this.integration = createIntegrationApi(this.httpClient);

    this.mcp = createMcpApi(this.httpClient);

    this.messaging = createMessagingApi(this.httpClient);

    this.serviceProviders = createServiceProvidersApi(this.httpClient);

    this.sites = createSitesApi(this.httpClient);

    this.storage = createStorageApi(this.httpClient);
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
