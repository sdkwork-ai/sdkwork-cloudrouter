/**
 * Composed federated commerce facade for the Cloud Router app SDK family.
 *
 * Consume it through the package subpath:
 *
 * ```ts
 * import { createClient, type SdkworkCloudRouterDomainsClient }
 *   from "@sdkwork/cloudrouter-app-sdk/domains";
 * ```
 *
 * The `commerce` namespace groups the generated commerce transports under
 * `generated/commerce-server-openapi/**` (generator-owned). Consumers call
 * `client.commerce.<domain>.<aggregate>.<method>()` and never import the
 * generated transport package directly, per `APP_SDK_INTEGRATION_SPEC.md`
 * section 9 and `SDK_WORKSPACE_GENERATION_SPEC.md` composed-facade rules.
 */
import type { AuthTokenManager } from "@sdkwork/sdk-common";

import {
  SdkworkAppClient as CloudRouterCommerceAppClient,
  createClient as createCloudRouterCommerceAppClient,
} from "../../generated/commerce-server-openapi/src/index";
import type { SdkworkAppConfig } from "../../generated/commerce-server-openapi/src/types/common";

export { CloudRouterCommerceAppClient };
export * from "../../generated/commerce-server-openapi/src/types";

/**
 * Federated Cloud Router app client. `commerce` groups every commerce domain
 * transport the app surface is allowed to call.
 */
export interface SdkworkCloudRouterDomainsClient {
  /** Generated commerce transport namespaces (`accounts`, `catalog`, `cart`, …). */
  readonly commerce: CloudRouterCommerceAppClient;
  /** Installs the session token manager used by every subsequent commerce call. */
  setTokenManager(manager: AuthTokenManager): void;
}

/**
 * Creates the federated Cloud Router app client for one runtime configuration.
 *
 * @param config Generated transport configuration (base URL, auth mode, platform,
 *   token manager).
 */
export function createClient(config: SdkworkAppConfig): SdkworkCloudRouterDomainsClient {
  const commerce = createCloudRouterCommerceAppClient(config);
  return {
    commerce,
    setTokenManager(manager: AuthTokenManager): void {
      commerce.setTokenManager(manager);
    },
  };
}
