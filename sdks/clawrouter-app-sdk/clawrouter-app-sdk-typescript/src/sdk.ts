import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkAppConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { AiApi, createAiApi } from './api/ai';
import { ChatApi, createChatApi } from './api/chat';
import { IamApi, createIamApi } from './api/iam';
import { NotificationApi, createNotificationApi } from './api/notification';
import { RuntimeApi, createRuntimeApi } from './api/runtime';
import { SystemApi, createSystemApi } from './api/system';

export class SdkworkAppClient {
  private httpClient: HttpClient;

  public readonly ai: AiApi;
  public readonly chat: ChatApi;
  public readonly iam: IamApi;
  public readonly notification: NotificationApi;
  public readonly runtime: RuntimeApi;
  public readonly system: SystemApi;

  constructor(config: SdkworkAppConfig) {
    this.httpClient = createHttpClient(config);
    this.ai = createAiApi(this.httpClient);

    this.chat = createChatApi(this.httpClient);

    this.iam = createIamApi(this.httpClient);

    this.notification = createNotificationApi(this.httpClient);

    this.runtime = createRuntimeApi(this.httpClient);

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

export function createClient(config: SdkworkAppConfig): SdkworkAppClient {
  return new SdkworkAppClient(config);
}

export default SdkworkAppClient;
