import {
  createClient as createGeneratedClawrouterBackendDomainsClient,
  SdkworkBackendClient,
} from '#clawrouter-backend-domains-generated';
import type { SdkworkBackendConfig } from '#clawrouter-backend-domains-generated';

export { SdkworkBackendClient, createGeneratedClawrouterBackendDomainsClient };
export type { SdkworkBackendConfig };
export * from '#clawrouter-backend-domains-generated';

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
