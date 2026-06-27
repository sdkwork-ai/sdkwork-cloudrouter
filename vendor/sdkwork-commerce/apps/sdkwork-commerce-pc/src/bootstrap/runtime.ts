import type { SdkworkCommerceService } from "@sdkwork/commerce-service";

import { configureSdkworkCommercePcProviders } from "./commerceProviders";
import {
  resolveSdkworkCommercePcRuntimeConfig,
  type SdkworkCommercePcRuntimeConfig,
} from "./environment";
import {
  createSdkworkCommercePcIamRuntime,
  createSdkworkCommercePcSdkClientsWithTokenManager,
  type SdkworkCommercePcIamRuntime,
} from "./iamRuntime";
import {
  sdkworkCommercePcRoutes,
  type SdkworkCommercePcRouteContribution,
} from "./routes";
import {
  createSdkworkCommercePcSessionStore,
  type SdkworkCommercePcSessionStore,
} from "./sessionStore";
import { createSdkworkCommercePcSessionTokenManager } from "./sessionTokenManager";
import type { SdkworkCommercePcSdkClientInventory } from "./sdkClients";

export interface SdkworkCommercePcRuntime {
  commerceService: SdkworkCommerceService;
  config: SdkworkCommercePcRuntimeConfig;
  iamRuntime: SdkworkCommercePcIamRuntime;
  routes: readonly SdkworkCommercePcRouteContribution[];
  sdkClients: SdkworkCommercePcSdkClientInventory;
  session: SdkworkCommercePcSessionStore;
}

export function createSdkworkCommercePcRuntime(): SdkworkCommercePcRuntime {
  const config = resolveSdkworkCommercePcRuntimeConfig();
  const session = createSdkworkCommercePcSessionStore(
    typeof window === "undefined" ? undefined : window.sessionStorage,
  );
  const tokenManager = createSdkworkCommercePcSessionTokenManager(session);
  const sdkClients = createSdkworkCommercePcSdkClientsWithTokenManager(config, tokenManager);
  const iamRuntime = createSdkworkCommercePcIamRuntime({
    config,
    sdkClients,
    session,
  });
  const { commerceService } = configureSdkworkCommercePcProviders({
    config,
    iamRuntime,
    sdkClients,
  });

  return {
    commerceService,
    config,
    iamRuntime,
    routes: sdkworkCommercePcRoutes,
    sdkClients,
    session,
  };
}
