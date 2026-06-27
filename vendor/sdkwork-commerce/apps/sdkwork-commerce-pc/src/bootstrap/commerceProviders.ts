import { createCommerceRuntime } from "@sdkwork/commerce-runtime";
import {
  configureSdkworkCommerceServiceProvider,
  configureSdkworkCommerceSessionTokenProvider,
  createSdkworkCommerceService,
} from "@sdkwork/commerce-service";
import type { CommerceAppSdkClient, CommerceBackendSdkClient } from "@sdkwork/commerce-sdk-ports";

import type { SdkworkCommercePcIamRuntime } from "./iamRuntime";
import type { SdkworkCommercePcSdkClientInventory } from "./sdkClients";
import type { SdkworkCommercePcRuntimeConfig } from "./environment";

export interface SdkworkCommercePcCommerceProviders {
  commerceService: ReturnType<typeof createSdkworkCommerceService>;
}

export function configureSdkworkCommercePcProviders(input: {
  config: SdkworkCommercePcRuntimeConfig;
  iamRuntime: SdkworkCommercePcIamRuntime;
  sdkClients: SdkworkCommercePcSdkClientInventory;
}): SdkworkCommercePcCommerceProviders {
  const appClient = {
    commerce: input.sdkClients.commerceAppClient,
  } as unknown as CommerceAppSdkClient;
  const backendClient = input.sdkClients.commerceBackendClient
    ? ({
        commerce: input.sdkClients.commerceBackendClient,
      } as unknown as CommerceBackendSdkClient)
    : undefined;

  const commerceRuntime = createCommerceRuntime({
    clients: {
      app: appClient,
      ...(backendClient ? { backend: backendClient } : {}),
    },
    config: {
      appApiBaseUrl: input.config.appApiBaseUrl,
      appId: input.config.appKey,
      backendApiBaseUrl: input.config.backendApiBaseUrl,
      deploymentMode: "saas",
      environment: input.config.environment,
    },
  });

  configureSdkworkCommerceServiceProvider(() => commerceRuntime.service);
  configureSdkworkCommerceSessionTokenProvider(() => {
    const snapshot = input.iamRuntime.session.getSnapshot();
    return {
      accessToken: snapshot.accessToken,
      authToken: snapshot.authToken,
      refreshToken: snapshot.refreshToken,
    };
  });

  return {
    commerceService: commerceRuntime.service,
  };
}
