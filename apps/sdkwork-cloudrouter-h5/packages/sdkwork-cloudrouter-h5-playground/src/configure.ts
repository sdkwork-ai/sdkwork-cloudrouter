import { createClient } from "@sdkwork/agents-app-sdk";
import { configurePlaygroundRuntime } from "@sdkwork/agents-h5-playground";
import { resolveCloudRouterAppApiBaseUrl } from "@sdkwork/cloudrouter-h5-core/sdk";
import { getCloudRouterTokenManager } from "@sdkwork/cloudrouter-h5-core/session";

export interface CloudRouterPlaygroundOptions {
  readonly locale?: string | null;
}

let configured = false;

/**
 * Resolves the Agents app API base.
 *
 * The Agents app SDK appends `/app/v3/api` itself (unlike the Cloud Router app
 * SDK, whose transport root is origin-only), so the host origin must carry the
 * canonical suffix. Same-origin dev/standalone resolves to the page origin.
 */
export function resolveCloudRouterAgentsApiBaseUrl(): string {
  const root = resolveCloudRouterAppApiBaseUrl();
  const origin = root || (typeof window === "undefined" ? "" : window.location.origin);
  return `${origin.replace(/\/+$/u, "")}/app/v3/api`;
}

/**
 * Binds the Playground to the Cloud Router session once per page load.
 *
 * The token manager is the same dual-token store the console/order clients
 * use, so a login immediately authenticates the playground without a second
 * credential flow.
 */
export function configureCloudRouterPlayground(
  options: CloudRouterPlaygroundOptions = {},
): void {
  if (configured) {
    return;
  }
  const client = createClient({
    baseUrl: resolveCloudRouterAgentsApiBaseUrl(),
    platform: "H5",
    tokenManager: getCloudRouterTokenManager(),
  });
  configurePlaygroundRuntime({
    getClient: () => client,
    ...(options.locale ? { locale: options.locale } : {}),
  });
  configured = true;
}
