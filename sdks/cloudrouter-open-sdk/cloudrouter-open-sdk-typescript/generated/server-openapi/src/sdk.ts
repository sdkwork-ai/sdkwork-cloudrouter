import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkAiConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';



export class SdkworkAiClient {
  private httpClient: HttpClient;


  constructor(config: SdkworkAiConfig) {
    this.httpClient = createHttpClient(config);

  }

  setApiKey(apiKey: string): this {
    this.httpClient.setApiKey(apiKey);
    return this;
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

export function createClient(config: SdkworkAiConfig): SdkworkAiClient {
  return new SdkworkAiClient(config);
}

export default SdkworkAiClient;
