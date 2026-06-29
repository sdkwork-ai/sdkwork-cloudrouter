import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkAppConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { CommerceApi, createCommerceApi } from './api/commerce';
import { SystemApi, createSystemApi } from './api/system';
import { AiApi, createAiApi } from './api/ai';
import { ChatApi, createChatApi } from './api/chat';
import { NotificationApi, createNotificationApi } from './api/notification';
import { RuntimeApi, createRuntimeApi } from './api/runtime';

export class SdkworkAppClient {
  private httpClient: HttpClient;

  public readonly commerce: CommerceApi;
  public readonly system: SystemApi;
  public readonly ai: AiApi;
  public readonly chat: ChatApi;
  public readonly notification: NotificationApi;
  public readonly runtime: RuntimeApi;

  constructor(config: SdkworkAppConfig) {
    this.httpClient = createHttpClient(config);
    this.commerce = createCommerceApi(this.httpClient);

    this.system = createSystemApi(this.httpClient);

    this.ai = createAiApi(this.httpClient);

    this.chat = createChatApi(this.httpClient);

    this.notification = createNotificationApi(this.httpClient);

    this.runtime = createRuntimeApi(this.httpClient);
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

export function createClient(config: SdkworkAppConfig): SdkworkAppClient {
  return new SdkworkAppClient(config);
}

export default SdkworkAppClient;
