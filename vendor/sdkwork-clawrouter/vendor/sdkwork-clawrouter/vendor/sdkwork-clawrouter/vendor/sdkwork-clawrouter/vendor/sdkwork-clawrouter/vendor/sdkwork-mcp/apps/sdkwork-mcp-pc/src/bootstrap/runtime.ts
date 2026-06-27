import {
  resolveSdkworkMCPPcRuntimeConfig,
  type SdkworkMCPPcRuntimeConfig,
} from './environment';
import {
  createSdkworkMCPPcIamRuntime,
  createSdkworkMCPPcSdkClientsWithTokenManager,
  type SdkworkMCPPcIamRuntime,
} from './iamRuntime';
import {
  createSdkworkMCPPcSessionStore,
  type SdkworkMCPPcSessionStore,
} from './sessionStore';
import { createSdkworkMCPPcSessionTokenManager } from './sessionTokenManager';
import type { SdkworkMCPPcSdkClientInventory } from './sdkClients';

export interface SdkworkMCPPcRuntime {
  config: SdkworkMCPPcRuntimeConfig;
  iamRuntime: SdkworkMCPPcIamRuntime;
  sdkClients: SdkworkMCPPcSdkClientInventory;
  session: SdkworkMCPPcSessionStore;
}

export function createSdkworkMCPPcRuntime(): SdkworkMCPPcRuntime {
  const config = resolveSdkworkMCPPcRuntimeConfig();
  const session = createSdkworkMCPPcSessionStore(
    typeof window === 'undefined' ? undefined : window.sessionStorage,
  );
  const tokenManager = createSdkworkMCPPcSessionTokenManager(session);
  const sdkClients = createSdkworkMCPPcSdkClientsWithTokenManager(config, tokenManager);
  const iamRuntime = createSdkworkMCPPcIamRuntime({
    config,
    sdkClients,
    session,
  });

  return {
    config,
    iamRuntime,
    sdkClients,
    session,
  };
}

export { resolveSdkworkMCPPcRuntimeConfig } from './environment';
