import {
  createClient as createGeneratedClawrouterAppDomainsClient,
  SdkworkAppClient,
} from '#clawrouter-app-domains-generated';
import type { SdkworkAppConfig } from '#clawrouter-app-domains-generated';

export { SdkworkAppClient, createGeneratedClawrouterAppDomainsClient };
export type { SdkworkAppConfig };
export * from '#clawrouter-app-domains-generated';

export type SdkworkClawrouterAppDomainsClient = SdkworkAppClient;

export function createClawrouterAppDomainsClient(
  config: SdkworkAppConfig,
): SdkworkClawrouterAppDomainsClient {
  return createGeneratedClawrouterAppDomainsClient(config);
}

export function createClient(config: SdkworkAppConfig): SdkworkClawrouterAppDomainsClient {
  return createClawrouterAppDomainsClient(config);
}
