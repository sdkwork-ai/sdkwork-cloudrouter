import { listSdkworkCommercePcBackendAdminSdkFamilies } from "@sdkwork/commerce-pc-admin-core/composition";
import { listSdkworkCommercePcAppSdkFamilies } from "@sdkwork/commerce-pc-core/composition";
import type { SdkworkAppClient } from "sdkwork-commerce-app-sdk-generated-typescript";
import type { SdkworkBackendClient } from "sdkwork-commerce-backend-sdk-generated-typescript";

import type { SdkworkCommercePcRuntimeConfig } from "./environment";

export interface SdkworkCommercePcSdkClientInventory {
  appApiBaseUrl: string;
  backendApiBaseUrl?: string;
  commerceAppClient: SdkworkAppClient & { setTokenManager(manager: unknown): unknown };
  commerceBackendClient?: SdkworkBackendClient & { setTokenManager(manager: unknown): unknown };
  sdkFamilies: {
    app: string[];
    backendAdmin: string[];
  };
}

export function listSdkworkCommercePcRegisteredSdkFamilies(
  config: SdkworkCommercePcRuntimeConfig,
): SdkworkCommercePcSdkClientInventory["sdkFamilies"] {
  void config;
  return {
    app: listSdkworkCommercePcAppSdkFamilies()
      .filter((sdkFamily) => sdkFamily.surface === "app")
      .map((sdkFamily) => sdkFamily.family),
    backendAdmin: listSdkworkCommercePcBackendAdminSdkFamilies().map((sdkFamily) => sdkFamily.family),
  };
}
