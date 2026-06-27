import {
  createClient,
  type SdkworkAppClient as GeneratedSdkworkMCPAppClient,
} from "sdkwork-mcp-app-sdk-generated-typescript/src/sdk";
import type { SdkworkAppConfig } from "sdkwork-mcp-app-sdk-generated-typescript/src/types/common";
import type { Interceptors } from "@sdkwork/sdk-common";

import {
  createSdkworkChatRequestContextInterceptors,
  getSdkworkChatGlobalTokenManager,
  readAppSdkSessionTokens,
  resolveAppSdkAccessToken,
  resolveAppSdkAuthToken,
  type SdkworkChatSession,
} from "../session/session";

export type SdkworkMCPAppClient = GeneratedSdkworkMCPAppClient;
export type SdkworkMCPAppClientConfig = SdkworkAppConfig & {
  interceptors?: Interceptors;
};

let mcpAppSdkClient: SdkworkMCPAppClient | null = null;

export function resolveMCPAppSdkBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_SDKWORK_MCP_H5_APP_API_BASE_URL;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  const publicUrl = import.meta.env.VITE_SDKWORK_MCP_H5_APPLICATION_PUBLIC_HTTP_URL ?? "http://127.0.0.1:8095";
  return `${String(publicUrl).replace(/\/+$/u, "")}/app/v3/api`;
}

export function createMCPAppSdkClientConfig(
  session?: SdkworkChatSession | null,
): SdkworkMCPAppClientConfig {
  const currentSession = session ?? readAppSdkSessionTokens();
  const envAccessToken =
    typeof import.meta.env.SDKWORK_ACCESS_TOKEN === "string"
      ? import.meta.env.SDKWORK_ACCESS_TOKEN.trim()
      : undefined;

  return {
    baseUrl: resolveMCPAppSdkBaseUrl(),
    accessToken: resolveAppSdkAccessToken(currentSession) ?? envAccessToken,
    authToken: resolveAppSdkAuthToken(currentSession),
    interceptors: createSdkworkChatRequestContextInterceptors(
      () => readAppSdkSessionTokens() ?? currentSession,
    ),
    platform: "h5",
    tokenManager: getSdkworkChatGlobalTokenManager(),
  };
}

export function initMCPAppSdkClient(
  config: SdkworkMCPAppClientConfig = createMCPAppSdkClientConfig(),
): SdkworkMCPAppClient {
  mcpAppSdkClient = createClient(config);
  return mcpAppSdkClient;
}

export function getMCPAppSdkClient(): SdkworkMCPAppClient {
  return mcpAppSdkClient ?? initMCPAppSdkClient();
}

export function getMCPAppSdkClientWithSession(
  session = readAppSdkSessionTokens(),
): SdkworkMCPAppClient {
  return initMCPAppSdkClient(createMCPAppSdkClientConfig(session));
}

export function resetMCPAppSdkClient(): void {
  mcpAppSdkClient = null;
}

export function useMCPAppSdkClient(): SdkworkMCPAppClient {
  return getMCPAppSdkClientWithSession();
}
