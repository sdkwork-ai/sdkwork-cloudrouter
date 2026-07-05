import {
  createClient as createGeneratedClawrouterBackendDomainsClient,
  SdkworkBackendClient,
} from '../../generated/domains/server-openapi/src/index';
import type { SdkworkBackendConfig } from '../../generated/domains/server-openapi/src/types/common';

export { SdkworkBackendClient, createGeneratedClawrouterBackendDomainsClient };
export type { SdkworkBackendConfig };
export * from '../../generated/domains/server-openapi/src/types';
export * from '../../generated/domains/server-openapi/src/api';
export * from '../../generated/domains/server-openapi/src/http';
export * from '../../generated/domains/server-openapi/src/auth';

export type SdkworkClawrouterBackendDomainsClient = SdkworkBackendClient;

export function createClawrouterBackendDomainsClient(
  config: SdkworkBackendConfig,
): SdkworkClawrouterBackendDomainsClient {
  return createGeneratedClawrouterBackendDomainsClient(config);
}

export function createClient(
  config: SdkworkBackendConfig,
): SdkworkClawrouterBackendDomainsClient {
  return createClawrouterBackendDomainsClient(config);
}
