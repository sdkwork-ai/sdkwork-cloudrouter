import {
  createClient as createGeneratedClawrouterAppDomainsClient,
  SdkworkAppClient,
} from '../../generated/domains/server-openapi/src/index';
import type { SdkworkAppConfig } from '../../generated/domains/server-openapi/src/types/common';

export { SdkworkAppClient, createGeneratedClawrouterAppDomainsClient };
export type { SdkworkAppConfig };
export * from '../../generated/domains/server-openapi/src/types';
export * from '../../generated/domains/server-openapi/src/api';
export * from '../../generated/domains/server-openapi/src/http';
export * from '../../generated/domains/server-openapi/src/auth';

export type SdkworkClawrouterAppDomainsClient = SdkworkAppClient;

export function createClawrouterAppDomainsClient(
  config: SdkworkAppConfig,
): SdkworkClawrouterAppDomainsClient {
  return createGeneratedClawrouterAppDomainsClient(config);
}

export function createClient(config: SdkworkAppConfig): SdkworkClawrouterAppDomainsClient {
  return createClawrouterAppDomainsClient(config);
}
