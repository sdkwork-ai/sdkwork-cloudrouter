/**
 * Composed federated commerce facade for the Cloud Router backend SDK family.
 *
 * Consume it through the package subpath:
 *
 * ```ts
 * import { createClient, type SdkworkCloudRouterBackendDomainsClient }
 *   from "@sdkwork/cloudrouter-backend-sdk/domains";
 * ```
 *
 * The `commerce` namespace groups the generated backend commerce transports
 * under `generated/commerce-server-openapi/**` (generator-owned). This surface
 * is for `backend-admin` applications only, per
 * `APP_SDK_INTEGRATION_SPEC.md` section 9.
 */
import type { AuthTokenManager } from "@sdkwork/sdk-common";

import {
  SdkworkBackendClient as CloudRouterCommerceBackendClient,
  createClient as createCloudRouterCommerceBackendClient,
} from "../../generated/commerce-server-openapi/src/index";
import type { SdkworkBackendConfig } from "../../generated/commerce-server-openapi/src/types/common";

export { CloudRouterCommerceBackendClient };
export * from "../../generated/commerce-server-openapi/src/types";

/**
 * Federated Cloud Router backend client. `commerce` groups every
 * backend-governed commerce domain transport.
 */
export interface SdkworkCloudRouterBackendDomainsClient {
  /** Generated backend commerce namespaces (`shops`, `catalog`, `orders`, …). */
  readonly commerce: CloudRouterCommerceBackendClient;
  /** Installs the session token manager used by every subsequent commerce call. */
  setTokenManager(manager: AuthTokenManager): void;
}

/**
 * Creates the federated Cloud Router backend client for one runtime
 * configuration.
 *
 * @param config Generated transport configuration (base URL, auth mode, platform,
 *   token manager).
 */
export function createClient(
  config: SdkworkBackendConfig,
): SdkworkCloudRouterBackendDomainsClient {
  const commerce = createCloudRouterCommerceBackendClient(config);
  return {
    commerce,
    setTokenManager(manager: AuthTokenManager): void {
      commerce.setTokenManager(manager);
    },
  };
}
