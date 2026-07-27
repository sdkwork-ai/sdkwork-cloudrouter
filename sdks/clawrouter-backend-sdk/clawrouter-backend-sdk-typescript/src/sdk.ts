import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkBackendConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { AiApi, createAiApi } from './api/ai';
import { IntegrationApi, createIntegrationApi } from './api/integration';
import { SystemApi, createSystemApi } from './api/system';
import { MembershipsApi, createMembershipsApi } from './api/memberships';
import { PaymentsApi, createPaymentsApi } from './api/payments';
import { PromotionsApi, createPromotionsApi } from './api/promotions';
import { RechargesApi, createRechargesApi } from './api/recharges';
import { SitesApi, createSitesApi } from './api/sites';
import { StorageApi, createStorageApi } from './api/storage';

export class SdkworkBackendClient {
  private httpClient: HttpClient;

  public readonly ai: AiApi;
  public readonly integration: IntegrationApi;
  public readonly system: SystemApi;
  public readonly memberships: MembershipsApi;
  public readonly payments: PaymentsApi;
  public readonly promotions: PromotionsApi;
  public readonly recharges: RechargesApi;
  public readonly sites: SitesApi;
  public readonly storage: StorageApi;

  constructor(config: SdkworkBackendConfig) {
    this.httpClient = createHttpClient(config);
    this.ai = createAiApi(this.httpClient);

    this.integration = createIntegrationApi(this.httpClient);

    this.system = createSystemApi(this.httpClient);

    this.memberships = createMembershipsApi(this.httpClient);

    this.payments = createPaymentsApi(this.httpClient);

    this.promotions = createPromotionsApi(this.httpClient);

    this.recharges = createRechargesApi(this.httpClient);

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
