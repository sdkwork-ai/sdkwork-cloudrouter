import { ImSdkClient } from "@sdkwork/im-sdk";
import { resolveCloudRouterAppApiBaseUrl } from "@sdkwork/cloudrouter-h5-core/sdk";
import { getCloudRouterTokenManager } from "@sdkwork/cloudrouter-h5-core/session";

let imClient: ImSdkClient | null = null;

/**
 * Resolves the IM HTTP/WebSocket origins.
 *
 * The IM SDK appends its own `/im/v3/api` and realtime path, so the host
 * supplies the shared API origin (same-origin in dev/standalone, the cloud
 * gateway origin in deployed profiles). This mirrors the IM H5 app's default
 * `sharedApiOrigin` resolution.
 */
export function resolveCloudRouterImBaseUrls(): {
  apiBaseUrl: string;
  websocketBaseUrl: string;
} {
  const root = resolveCloudRouterAppApiBaseUrl();
  const pageOrigin = typeof window === "undefined" ? "" : window.location.origin;
  const absolute = root
    ? (/^https?:\/\//u.test(root) ? root : `${pageOrigin}${root}`)
    : pageOrigin;
  const apiBaseUrl = absolute.replace(/\/+$/u, "");
  return {
    apiBaseUrl,
    websocketBaseUrl: apiBaseUrl.replace(/^http/u, "ws"),
  };
}

/**
 * Initializes the IM SDK once per page load with the Cloud Router session.
 *
 * The IM client shares the console/order/playground dual-token manager, so a
 * login authenticates the conversation list without a second credential flow.
 * The generated SDK owns transport and auth headers; this adapter only supplies
 * the host origin and session.
 */
export function configureCloudRouterIm(): void {
  if (imClient) {
    return;
  }
  const { apiBaseUrl, websocketBaseUrl } = resolveCloudRouterImBaseUrls();
  imClient = new ImSdkClient({
    apiBaseUrl,
    websocketBaseUrl,
    platform: "h5",
    tokenManager: getCloudRouterTokenManager(),
  });
}

export function getCloudRouterImClient(): ImSdkClient {
  if (!imClient) {
    throw new Error("Cloud Router IM client is not configured.");
  }
  return imClient;
}

/** Test-only reset for isolated contract tests. */
export function resetCloudRouterIm(): void {
  imClient = null;
}
