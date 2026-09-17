import {
  configureCloudRouterAppSdkBaseUrl,
  configureCloudRouterBackendApiBaseUrl,
  getCloudRouterAppSdkClient,
  resetCloudRouterAppSdkClient,
  type CloudRouterAppSdkClient,
  type CloudRouterAppSdkClientConfig,
} from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-core';

/**
 * SDK client construction for the HarmonyOS root.
 *
 * Authority: `APP_SDK_INTEGRATION_SPEC.md` and
 * `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 6. Concrete clients are
 * constructed here (bootstrap only) and injected into feature packages.
 */
export class CloudRouterHarmonySdkClients {
  private appClient: CloudRouterAppSdkClient | null = null;

  initialize(appApiBaseUrl: string, backendApiBaseUrl: string, accessToken?: string): void {
    configureCloudRouterAppSdkBaseUrl(appApiBaseUrl);
    configureCloudRouterBackendApiBaseUrl(backendApiBaseUrl);
    const config: CloudRouterAppSdkClientConfig = {
      baseUrl: appApiBaseUrl,
      accessToken: accessToken,
    };
    this.appClient = getCloudRouterAppSdkClient(config);
  }

  get app(): CloudRouterAppSdkClient {
    if (this.appClient === null) {
      throw new Error('Cloud Router app SDK client must be initialized by bootstrap before use');
    }
    return this.appClient;
  }

  reset(): void {
    resetCloudRouterAppSdkClient();
    this.appClient = null;
  }
}

let sdkClients: CloudRouterHarmonySdkClients | null = null;

export function createCloudRouterHarmonySdkClients(): CloudRouterHarmonySdkClients {
  sdkClients = new CloudRouterHarmonySdkClients();
  return sdkClients;
}

export function getCloudRouterHarmonySdkClients(): CloudRouterHarmonySdkClients {
  if (sdkClients === null) {
    return createCloudRouterHarmonySdkClients();
  }
  return sdkClients;
}
