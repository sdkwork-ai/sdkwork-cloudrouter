import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkBackendConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { AiApi, createAiApi } from './api/ai';
import { SystemApi, createSystemApi } from './api/system';
import { PaymentsApi, createPaymentsApi } from './api/payments';
import { RechargesApi, createRechargesApi } from './api/recharges';
import { StorageApi, createStorageApi } from './api/storage';

export class SdkworkBackendClient {
  private httpClient: HttpClient;

  public readonly ai: AiApi;
  public readonly system: SystemApi;
  public readonly payments: PaymentsApi;
  public readonly recharges: RechargesApi;
  public readonly storage: StorageApi;

  constructor(config: SdkworkBackendConfig) {
    this.httpClient = createHttpClient(config);
    this.ai = createAiApi(this.httpClient);

    this.system = createSystemApi(this.httpClient);

    this.payments = createPaymentsApi(this.httpClient);

    this.recharges = createRechargesApi(this.httpClient);

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
