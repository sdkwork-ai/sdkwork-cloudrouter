import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getLoadErrorMessage } from "./packages/sdkwork-clawroutes-pc-commons/src/load-error.ts";
import { formatUserAgentDeviceLabel } from "./packages/sdkwork-clawroutes-pc-commons/src/user-agent.ts";
import { createClientOperationToken, createIdempotencyParams } from "./packages/sdkwork-clawroutes-pc-commons/src/idempotency.ts";
import {
  ensureSdkworkApiSuccess,
  readApiItems,
  readRequiredApiItems,
  readApiRecord,
  readRequiredNumber,
  readRequiredNonNegativeNumber,
  readRequiredString,
  readRequiredApiItem,
} from "./packages/sdkwork-clawroutes-pc-commons/src/api-result.ts";
import {
  clearStoredAppSessionToken,
  getStoredAppSessionAccessToken,
  getStoredAppSessionAuthToken,
  loadStoredAppSessionToken,
  storeAppSessionFromResult,
  } from "./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts";
import {
  buildPortalAuthLoginRedirect,
  hasStoredPortalSession,
  resolvePortalLoginRequiredAction,
} from "./packages/sdkwork-clawroutes-pc-commons/src/portal-auth.ts";
import { PORTAL_EXTERNAL_TAILWIND_SOURCES } from "./src/portal-external-tailwind-sources.ts";
import { normalizeGeneratedSdkBaseUrl } from "./packages/sdkwork-clawroutes-pc-commons/src/sdk-base-url.ts";
import { formatRechargeCurrencyAmount } from "./packages/sdkwork-clawroutes-pc-commons/src/recharge-math.ts";
import {
  createClawRouterAiSdkClient,
  createClawRouterBackendSdkClient,
  createSdkworkAgentAppSdkClient,
  getClawRouterAiSdkClient,
  getClawRouterGlobalTokenManager,
  prepareClawRouterCredentialEntryTokens,
  resetClawRouterSdkClients,
  SDK_SYSTEM_CONFIG,
} from "./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts";
import {
  readMediaResource,
  readMediaResourceUrl,
  toExternalUrlMediaResource,
} from "./packages/sdkwork-clawroutes-pc-commons/src/media-resource.ts";
import {
  optionalBoundedPositiveInteger,
  optionalInteger,
  optionalPositiveInteger,
  optionalText,
  pruneUndefinedQueryParams,
  requiredSafePathSegment,
} from "./packages/sdkwork-clawroutes-pc-commons/src/sdk-request-boundary.ts";
import { createAppSession, revokeAppSession } from "./packages/sdkwork-clawroutes-pc-commons/src/sessionService.ts";
import { verifyCurrentPortalAdminAccess } from "./packages/sdkwork-clawroutes-pc-commons/src/portal-session.ts";
import { API_BASE_URL } from "./packages/sdkwork-clawroutes-pc-commons/src/utils/env.ts";
import { syntaxHighlightJson } from "./packages/sdkwork-clawroutes-pc-commons/src/utils/index.ts";
import {
  createReferenceSidebarGroupElementId,
  createReferenceSidebarGroupKey,
  isReferenceSidebarGroupCollapsed,
  toggleReferenceSidebarGroup,
} from "./packages/sdkwork-clawroutes-pc-commons/src/reference-sidebar-groups.ts";
import { readAdminResourceCollectionMeta } from "./packages/sdkwork-clawroutes-pc-commons/src/components/AdminResourceCenter.tsx";
import { generateCodeSnippets } from "./packages/sdkwork-clawrouter-pc-core/src/index.ts";

const originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
const originalFetch = globalThis.fetch;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

function readPortalSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function withCrypto<T>(cryptoValue: Crypto | undefined, fn: () => T): T {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    enumerable: true,
    value: cryptoValue,
  });

  try {
    return fn();
  } finally {
    if (originalCryptoDescriptor) {
      Object.defineProperty(globalThis, "crypto", originalCryptoDescriptor);
    } else {
      delete (globalThis as { crypto?: Crypto }).crypto;
    }
  }
}

test("createClientOperationToken uses cryptographic random bytes without crypto.randomUUID", () => {
  const token = withCrypto(
    {
      randomUUID: () => "11111111-2222-4333-8444-555555555555",
      getRandomValues: (array: Uint8Array) => {
        for (let index = 0; index < array.length; index += 1) {
          array[index] = index + 1;
        }
        return array;
      },
    } as unknown as Crypto,
    () => createClientOperationToken(" api-key "),
  );

  assert.equal(token, "api-key-01020304-0506-4708-890a-0b0c0d0e0f10");
});

test("formatUserAgentDeviceLabel returns compact device and client information", () => {
  assert.equal(
    formatUserAgentDeviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36"),
    "Windows / Chrome",
  );
  assert.equal(
    formatUserAgentDeviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Version/17.5 Mobile/15E148 Safari/604.1"),
    "iPhone / Safari",
  );
  assert.equal(formatUserAgentDeviceLabel("curl/8.7.1"), "CLI / curl");
  assert.equal(formatUserAgentDeviceLabel(""), "Unknown");
});

test("createClientOperationToken falls back only to cryptographic random bytes", () => {
  const token = withCrypto(
    {
      getRandomValues: (array: Uint8Array) => {
        for (let index = 0; index < array.length; index += 1) {
          array[index] = index + 1;
        }
        return array;
      },
    } as unknown as Crypto,
    () => createClientOperationToken("request"),
  );

  assert.equal(token, "request-01020304-0506-4708-890a-0b0c0d0e0f10");
});

test("createClientOperationToken fails closed when secure randomness is unavailable", () => {
  assert.throws(
    () => withCrypto(undefined, () => createClientOperationToken("request")),
    /Secure random source is unavailable/,
  );
});

test("formatRechargeCurrencyAmount prefers currency symbols for standard recharge currencies", () => {
  assert.equal(formatRechargeCurrencyAmount("29.90", "CNY"), "¥29.90");
  assert.equal(formatRechargeCurrencyAmount("100", "USD"), "$100.00");
  assert.equal(formatRechargeCurrencyAmount("5", "EUR"), "€5.00");
  assert.equal(formatRechargeCurrencyAmount("0", "CNY"), "¥0.00");
});

test("createClientOperationToken rejects an all-zero random byte result", () => {
  assert.throws(
    () =>
      withCrypto(
        {
          getRandomValues: (array: Uint8Array) => array,
        } as unknown as Crypto,
        () => createClientOperationToken("request"),
      ),
    /Secure random source returned an invalid token seed/,
  );
});

test("createIdempotencyParams creates only idempotency keys for generated SDK write calls", () => {
  const params = withCrypto(
    {
      getRandomValues: (array: Uint8Array) => {
        const bytes = [
          0x11, 0x11, 0x11, 0x11,
          0x22, 0x22,
          0x43, 0x33,
          0x84, 0x44,
          0x55, 0x55, 0x55, 0x55, 0x55, 0x55,
        ];
        for (let index = 0; index < array.length; index += 1) {
          array[index] = bytes[index];
        }
        return array;
      },
    } as unknown as Crypto,
    () => createIdempotencyParams(" commerce-wallet-topup "),
  );

  assert.deepEqual(params, {
    idempotencyKey: "commerce-wallet-topup-11111111-2222-4333-8444-555555555555",
  });
});

test("curl snippet conversion strips caller-owned request id headers", () => {
  const snippets = generateCodeSnippets(`curl https://api.example.test/v1/chat/completions \\
  -H "Authorization: Bearer sk-test" \\
  -H "X-Request-Id: client-generated" \\
  -H "Vendor-Request-Id: client-generated" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4o","messages":[]}'`);

  assert.equal(snippets.cURL.includes("X-Request-Id"), false);
  assert.equal(snippets.cURL.includes("Vendor-Request-Id"), false);
  assert.equal(snippets.JavaScript?.includes("X-Request-Id"), false);
  assert.equal(snippets.JavaScript?.includes("Vendor-Request-Id"), false);
  assert.equal(snippets.Python?.includes("X-Request-Id"), false);
  assert.equal(snippets.Python?.includes("Vendor-Request-Id"), false);
  assert.equal(snippets.JavaScript?.includes("Authorization"), true);
  assert.equal(snippets.Python?.includes("Content-Type"), true);
});

test("getLoadErrorMessage returns Error messages", () => {
  assert.equal(getLoadErrorMessage(new Error("network unavailable"), "Fallback"), "network unavailable");
});

test("getLoadErrorMessage falls back for empty or non-Error values", () => {
  assert.equal(getLoadErrorMessage(new Error(""), "Fallback"), "Fallback");
  assert.equal(getLoadErrorMessage("network unavailable", "Fallback"), "Fallback");
  assert.equal(getLoadErrorMessage({ message: "raw object" }, "Fallback"), "Fallback");
  assert.equal(getLoadErrorMessage(null, "Fallback"), "Fallback");
});

test("normalizeGeneratedSdkBaseUrl strips generated SDK API prefixes from deployment base URLs", () => {
  assert.equal(normalizeGeneratedSdkBaseUrl("/app/v3/api", "/app/v3/api"), "");
  assert.equal(normalizeGeneratedSdkBaseUrl("https://tenant.example.com/app/v3/api", "/app/v3/api"), "https://tenant.example.com");
  assert.equal(
    normalizeGeneratedSdkBaseUrl("https://tenant.example.com/base/app/v3/api", "/app/v3/api"),
    "https://tenant.example.com/base",
  );
  assert.equal(normalizeGeneratedSdkBaseUrl("/backend/v3/api", "/backend/v3/api"), "");
  assert.equal(normalizeGeneratedSdkBaseUrl("https://admin.example.com/backend/v3/api/", "/backend/v3/api"), "https://admin.example.com");
  assert.equal(
    normalizeGeneratedSdkBaseUrl("http://127.0.0.1:3900/app/v3/api", "/app/v3/api"),
    "http://127.0.0.1:3900",
  );
});

test("normalizeGeneratedSdkBaseUrl preserves raw origins and unrelated root-relative bases", () => {
  assert.equal(normalizeGeneratedSdkBaseUrl("https://tenant.example.com", "/app/v3/api"), "https://tenant.example.com");
  assert.equal(normalizeGeneratedSdkBaseUrl("/tenant-a", "/app/v3/api"), "/tenant-a");
  assert.equal(normalizeGeneratedSdkBaseUrl("", "/app/v3/api"), "");
});

test("agents app SDK factory preserves the canonical app-api surface URL", async () => {
  const requestedUrls: string[] = [];
  const tokenManager = getClawRouterGlobalTokenManager();
  tokenManager.setTokens({ accessToken: "agents-test-access-token" });
  globalThis.fetch = async (input) => {
    requestedUrls.push(String(input));
    return new Response(
      JSON.stringify({
        code: 0,
        data: {
          items: [],
          pageInfo: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        },
      }),
      { headers: { "content-type": "application/json" }, status: 200 },
    );
  };

  try {
    const sameOriginClient = createSdkworkAgentAppSdkClient({ tokenManager });
    await sameOriginClient.ai.agents.list({ scope: "market", page: 1, pageSize: 20 });

    const hostedClient = createSdkworkAgentAppSdkClient({
      appBaseUrl: "https://tenant.example.com/router/app/v3/api",
      tokenManager,
    });
    await hostedClient.ai.agents.list({ scope: "market", page: 1, pageSize: 20 });
  } finally {
    tokenManager.clearTokens();
    resetClawRouterSdkClients();
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(requestedUrls, [
    "/app/v3/api/ai/agents?scope=market&page=1&page_size=20",
    "https://tenant.example.com/router/app/v3/api/ai/agents?scope=market&page=1&page_size=20",
  ]);
});

test("media resource helpers keep structural media as objects", () => {
  const resource = toExternalUrlMediaResource("https://cdn.example.test/media.png", "image");

  assert.deepEqual(resource, {
    kind: "image",
    source: "external_url",
    url: "https://cdn.example.test/media.png",
    publicUrl: "https://cdn.example.test/media.png",
  });
  assert.equal(readMediaResourceUrl(resource), "https://cdn.example.test/media.png");
  assert.equal(readMediaResourceUrl("https://cdn.example.test/media.png"), "");
  assert.equal(readMediaResource("https://cdn.example.test/media.png"), undefined);
});

test("reference sidebar group collapse state defaults expanded and toggles by system category key", () => {
  assert.equal(isReferenceSidebarGroupCollapsed({}, "gateway", "chat"), false);
  assert.equal(createReferenceSidebarGroupKey("gateway", "chat"), "gateway::chat");

  const collapsed = toggleReferenceSidebarGroup({}, "gateway", "chat");
  assert.deepEqual(collapsed, { "gateway::chat": true });
  assert.equal(isReferenceSidebarGroupCollapsed(collapsed, "gateway", "chat"), true);
  assert.equal(isReferenceSidebarGroupCollapsed(collapsed, "app", "chat"), false);

  const expanded = toggleReferenceSidebarGroup(collapsed, "gateway", "chat");
  assert.deepEqual(expanded, {});
  assert.equal(isReferenceSidebarGroupCollapsed(expanded, "gateway", "chat"), false);
});

test("reference sidebar group element ids are safe and stable for aria controls", () => {
  assert.equal(
    createReferenceSidebarGroupElementId("api-reference-sidebar-group", "Claw Router Open API", "Chat / Responses"),
    "api-reference-sidebar-group-claw-router-open-api-chat-responses",
  );
  assert.equal(
    createReferenceSidebarGroupElementId("sdk-reference-sidebar-group", "", ""),
    "sdk-reference-sidebar-group-system-category",
  );
});

test("api base url defaults to same-origin edge gateway path when runtime env is absent", () => {
  assert.equal(API_BASE_URL, "/v1");
});

test("generated SDK metadata declares independent runtime base URL variables for every SDK surface", () => {
  assert.equal(SDK_SYSTEM_CONFIG.gateway.runtimeEnvName, "VITE_CLAWROUTER_OPEN_API_BASE_URL");
  assert.equal(SDK_SYSTEM_CONFIG.app.runtimeEnvName, "VITE_CLAWROUTER_APP_API_BASE_URL");
  assert.equal(SDK_SYSTEM_CONFIG.backend.runtimeEnvName, "VITE_CLAWROUTER_BACKEND_API_BASE_URL");
});

test("documents runtime adapter prefers documents app base URL, then clawrouter app base URL, then APP_API_PREFIX", () => {
  const source = readPortalSource("./packages/sdkwork-clawroutes-pc-commons/src/documents-reference-runtime-adapter.ts");

  const documentsEnvIndex = source.indexOf("VITE_SDKWORK_DOCUMENTS_APP_API_BASE_URL");
  const clawRouterEnvIndex = source.indexOf("VITE_CLAWROUTER_APP_API_BASE_URL");
  const apiPrefixFallbackIndex = source.lastIndexOf("?? APP_API_PREFIX");

  assert.ok(documentsEnvIndex !== -1, "documents runtime adapter must read VITE_SDKWORK_DOCUMENTS_APP_API_BASE_URL");
  assert.ok(clawRouterEnvIndex !== -1, "documents runtime adapter must retain VITE_CLAWROUTER_APP_API_BASE_URL fallback");
  assert.ok(apiPrefixFallbackIndex !== -1, "documents runtime adapter must fall back to APP_API_PREFIX");
  assert.ok(documentsEnvIndex < clawRouterEnvIndex, "documents runtime adapter must prefer the dedicated documents API base URL");
  assert.ok(clawRouterEnvIndex < apiPrefixFallbackIndex, "documents runtime adapter must fall back to the clawrouter app API base URL before APP_API_PREFIX");
});

test("documents runtime adapter caches a singleton SDK client bound to the clawrouter token manager", () => {
  const source = readPortalSource("./packages/sdkwork-clawroutes-pc-commons/src/documents-reference-runtime-adapter.ts");

  assert.match(source, /let documentsAppSdkClient: SdkworkDocumentsAppClient \| null = null;/);
  assert.match(source, /if \(!documentsAppSdkClient\) \{/);
  assert.match(source, /documentsAppSdkClient = createClient\(\{/);
  assert.match(source, /baseUrl: resolveDocumentsAppApiBaseUrl\(\),/);
  assert.match(source, /normalizeGeneratedSdkBaseUrl\(/);
  assert.match(source, /tokenManager: getClawRouterGlobalTokenManager\(\),/);
  assert.match(source, /return documentsAppSdkClient as unknown as DocumentsAppSdkClient;/);
});

test("portal bootstrap mounts the documents runtime provider with the clawrouter adapter", () => {
  const source = readPortalSource("./src/main.tsx");

  assert.match(source, /import \{ PortalQueryProvider, PortalErrorBoundary, clawRouterDocumentsReferenceRuntime \} from '@sdkwork\/clawroutes-pc-commons';/);
  assert.match(source, /import \{ DocumentsReferenceRuntimeProvider \} from '@sdkwork\/documents-pc-commons';/);
  assert.match(source, /<DocumentsReferenceRuntimeProvider value=\{clawRouterDocumentsReferenceRuntime\}>/);
  assert.match(source, /<App \/>/);
  assert.match(source, /<\/DocumentsReferenceRuntimeProvider>/);
});

test("portal shell offsets embedded documents routes below the fixed navbar", () => {
  const shellSource = readPortalSource("./packages/sdkwork-clawrouter-pc-shell/src/AppShellLayout.tsx");
  const indexCssSource = readPortalSource("./src/index.css");

  assert.match(shellSource, /navbarAuthenticatedActionsStart/);
  assert.match(shellSource, /authenticatedActionsStart=\{navbarAuthenticatedActionsStart\}/);
  assert.match(shellSource, /PORTAL_HOST_OFFSET_ROUTE_PATTERN/);
  assert.match(shellSource, /product-docs\|docs\|api-reference\|token-plan/);
  assert.match(shellSource, /sdkwork-clawrouter-documents-host-offset flex-1/);
  assert.match(indexCssSource, /\.sdkwork-clawrouter-documents-host-offset \{/);
  assert.match(indexCssSource, /padding-top: var\(--sdkwork-portal-navbar-height, 4rem\);/);
  assert.match(indexCssSource, /\.sdkwork-clawrouter-documents-host-offset \.sdkwork-documents-shell-page-root \{/);
  assert.match(indexCssSource, /\.sdkwork-documents-shell-sticky-sidebar \{/);
});

test("portal shell offsets playground routes below the fixed navbar", () => {
  const shellSource = readPortalSource("./packages/sdkwork-clawrouter-pc-shell/src/AppShellLayout.tsx");
  const pageSource = readFileSync(
    new URL(
      "../../../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-playground/src/pages/PlaygroundPage.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const indexCssSource = readPortalSource("./src/index.css");

  assert.match(shellSource, /sdkwork-clawrouter-playground-host-offset flex-1/);
  assert.match(shellSource, /isPlayground/);
  assert.match(indexCssSource, /\.sdkwork-clawrouter-playground-host-offset \{/);
  assert.match(indexCssSource, /position:\s*fixed;/);
  assert.match(indexCssSource, /top:\s*var\(--sdkwork-portal-navbar-height, 4rem\);/);
  assert.match(indexCssSource, /--sdkwork-playground-workspace-sidebar-width:/);
  assert.match(indexCssSource, /--sdkwork-playground-chat-sidebar-width:/);
  assert.match(indexCssSource, /--sdkwork-playground-rail-width:/);
  assert.match(indexCssSource, /\.sdkwork-playground-workspace-sidebar \{/);
  assert.match(indexCssSource, /\.sdkwork-playground-rail-item \{/);
  assert.match(indexCssSource, /\.sdkwork-playground-chat-sidebar \{/);
  assert.match(indexCssSource, /--sdkwork-studio-bg:/);
  assert.match(indexCssSource, /--sdkwork-image-generation-bg: var\(--sdkwork-studio-bg\)/);
  assert.match(indexCssSource, /\.sdkwork-playground-chat-composer__submit/);
  assert.match(indexCssSource, /\.sdkwork-playground-chat-message-bubble--user/);
  assert.match(pageSource, /flex h-full min-h-0 w-full flex-1 flex-row overflow-hidden/);
  assert.doesNotMatch(pageSource, /pt-\[58px\]/);
  assert.doesNotMatch(pageSource, /h-\[100dvh\]/);
});

test("portal index.css registers tailwind sources for all external workspace UI integrations", () => {
  const indexCssSource = readPortalSource("./src/index.css");

  for (const source of PORTAL_EXTERNAL_TAILWIND_SOURCES) {
    assert.match(
      indexCssSource,
      new RegExp(`@source "${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}";`),
      `index.css must register tailwind source: ${source}`,
    );
  }
});

test("portal i18n consumes documents catalogs from sdkwork-documents", () => {
  const resourcesSource = readPortalSource("./packages/sdkwork-clawrouter-pc-i18n/src/resources/index.ts");
  const mainSource = readPortalSource("./src/main.tsx");

  assert.match(resourcesSource, /from '@sdkwork\/documents-pc-i18n'/);
  assert.match(resourcesSource, /publicDocsMessages/);
  assert.match(resourcesSource, /publicApiReferenceMessages/);
  assert.match(resourcesSource, /publicSdkReferenceMessages/);
  assert.doesNotMatch(resourcesSource, /\.\/public\/docs/);
  assert.match(mainSource, /platformName: 'Claw Router'/);
  assert.match(mainSource, /defaultVariables=/);
});

test("sdk clients use a static IAM runtime reset dependency so Vite can chunk the portal deterministically", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts", import.meta.url),
    "utf8",
  );
  const iamRuntimeSource = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/iam-runtime.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /from '\.\/iam-runtime\.ts';/);
  assert.doesNotMatch(source, /await import\('\.\/iam-runtime\.ts'\)/);
  assert.doesNotMatch(
    iamRuntimeSource,
    /SDKWORK_IAM_BOOTSTRAP_|readClawRouterRuntimeEnv\('SDKWORK_APP_ID'\)/u,
    "Claw Router IAM runtime must not read runtime identity scope from bootstrap env variables.",
  );
  assert.match(
    iamRuntimeSource,
    /CLAW_ROUTER_IAM_RUNTIME_APP_ID[\s\S]*?readClawRouterRuntimeEnv\('VITE_SDKWORK_APP_ID'\)[\s\S]*?\|\|\s*['"]sdkwork-clawrouter['"]/u,
    "Claw Router IAM runtime must resolve app id from manifest-derived VITE_SDKWORK_APP_ID with manifest fallback.",
  );
});

test("global token manager seeds bootstrap access token before login session exists", () => {
  clearStoredAppSessionToken();
  resetClawRouterSdkClients();
  const previousAccessToken = process.env.SDKWORK_ACCESS_TOKEN;
  process.env.SDKWORK_ACCESS_TOKEN = "bootstrap-access-token";

  try {
    assert.equal(getClawRouterGlobalTokenManager().getAccessToken(), "bootstrap-access-token");
    assert.equal(getClawRouterGlobalTokenManager().getAuthToken(), undefined);
  } finally {
    if (previousAccessToken === undefined) {
      delete process.env.SDKWORK_ACCESS_TOKEN;
    } else {
      process.env.SDKWORK_ACCESS_TOKEN = previousAccessToken;
    }
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
  }
});

test("stored login session replaces bootstrap access token in global token manager", () => {
  clearStoredAppSessionToken();
  resetClawRouterSdkClients();
  const previousAccessToken = process.env.SDKWORK_ACCESS_TOKEN;
  process.env.SDKWORK_ACCESS_TOKEN = "bootstrap-access-token";

  try {
    storeAppSessionFromResult({
      accessToken: "session-access-token",
      authToken: "session-auth-token",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });

    assert.equal(getClawRouterGlobalTokenManager().getAccessToken(), "session-access-token");
    assert.equal(getClawRouterGlobalTokenManager().getAuthToken(), "session-auth-token");
  } finally {
    if (previousAccessToken === undefined) {
      delete process.env.SDKWORK_ACCESS_TOKEN;
    } else {
      process.env.SDKWORK_ACCESS_TOKEN = previousAccessToken;
    }
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
  }
});

test("stored session token helpers strip Bearer prefixes from persisted tokens", () => {
  clearStoredAppSessionToken();
  resetClawRouterSdkClients();

  try {
    storeAppSessionFromResult({
      accessToken: "Bearer session-access-token",
      authToken: "Bearer session-auth-token",
      refreshToken: "Bearer session-refresh-token",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      context: {
        tenantId: "100001",
        userId: "1",
        sessionId: "session-1",
      },
    });

    assert.equal(getStoredAppSessionAccessToken(), "session-access-token");
    assert.equal(getStoredAppSessionAuthToken(), "session-auth-token");
    assert.equal(loadStoredAppSessionToken()?.refreshToken, "session-refresh-token");
    assert.equal(getClawRouterGlobalTokenManager().getAccessToken(), "session-access-token");
    assert.equal(getClawRouterGlobalTokenManager().getAuthToken(), "session-auth-token");
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
  }
});

test("credential entry token preparation restores bootstrap access token over stored session tokens", () => {
  clearStoredAppSessionToken();
  resetClawRouterSdkClients();
  const previousAccessToken = process.env.SDKWORK_ACCESS_TOKEN;
  process.env.SDKWORK_ACCESS_TOKEN = "bootstrap-access-token";

  try {
    storeAppSessionFromResult({
      accessToken: "session-access-token",
      authToken: "session-auth-token",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });

    const tokenManager = getClawRouterGlobalTokenManager();
    prepareClawRouterCredentialEntryTokens();

    assert.equal(tokenManager.getAccessToken(), "session-access-token");
    assert.equal(tokenManager.getAuthToken(), "session-auth-token");
  } finally {
    if (previousAccessToken === undefined) {
      delete process.env.SDKWORK_ACCESS_TOKEN;
    } else {
      process.env.SDKWORK_ACCESS_TOKEN = previousAccessToken;
    }
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
  }
});

test("open gateway SDK clients never inherit portal session tokens", () => {
  clearStoredAppSessionToken();
  resetClawRouterSdkClients();

  try {
    storeAppSessionFromResult({
      accessToken: "access-token-open-gateway",
      authToken: "auth-token-open-gateway",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });

    const implicitClient = getClawRouterAiSdkClient() as unknown as {
      httpClient?: { authConfig?: { authMode?: string; tokenManager?: { getAccessToken?: () => string | undefined } } };
    };
    assert.equal(implicitClient.httpClient?.authConfig?.tokenManager?.getAccessToken?.(), undefined);

    const explicitClient = createClawRouterAiSdkClient({
      apiKey: "sk-open-gateway",
    }) as unknown as {
      httpClient?: { authConfig?: { apiKey?: string; authMode?: string; tokenManager?: { getAccessToken?: () => string | undefined } } };
    };
    assert.equal(explicitClient.httpClient?.authConfig?.authMode, "apikey");
    assert.equal(explicitClient.httpClient?.authConfig?.apiKey, "sk-open-gateway");
    assert.equal(explicitClient.httpClient?.authConfig?.tokenManager?.getAccessToken?.(), undefined);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
  }
});

test("commons exports an adaptive admin table shell with a fixed footer slot", () => {
  const shellSource = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/components/AdminTableShell.tsx", import.meta.url),
    "utf8",
  );
  const indexSource = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/index.ts", import.meta.url),
    "utf8",
  );

  for (const marker of [
    "export interface AdminTableShellProps",
    "export function AdminTableShell",
    "min-h-0 flex-1 overflow-hidden",
    "min-h-0 flex-1 overflow-auto",
    "data-admin-table-shell-viewport",
    "data-admin-table-shell-footer",
  ]) {
    assert.ok(shellSource.includes(marker), `missing admin table shell marker: ${marker}`);
  }

  assert.match(indexSource, /export \* from '\.\/components\/AdminTableShell';/);
});

test("navbar notification dropdown has a portal-side outside click dismiss guard", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/components/Navbar.tsx", import.meta.url),
    "utf8",
  );

  for (const marker of [
    "const notificationBellRef = useRef<HTMLDivElement>(null)",
    "const handleNotificationPointerDown = (event: PointerEvent) => {",
    "notificationBellRef.current.contains(target)",
    "notificationBellRef.current.querySelector('[role=\"menu\"]')",
    "notificationBellRef.current.querySelector<HTMLButtonElement>('button[aria-label]')",
    "toggleButton?.click()",
    "document.addEventListener('pointerdown', handleNotificationPointerDown, true)",
    "document.removeEventListener('pointerdown', handleNotificationPointerDown, true)",
    "ref={notificationBellRef}",
    "data-claw-notification-bell",
  ]) {
    assert.ok(source.includes(marker), `missing navbar notification dismiss marker: ${marker}`);
  }
});

test("portal notification service composes the shared service with canonical pagination and app scope", () => {
  const serviceSource = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/notificationService.ts", import.meta.url),
    "utf8",
  );
  const navbarSource = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/components/Navbar.tsx", import.meta.url),
    "utf8",
  );

  for (const marker of [
    "createSdkworkNotificationService({",
    "appId: DEFAULT_NOTIFICATION_APP_ID",
    "page_size: DEFAULT_NOTIFICATION_PAGE_SIZE",
    "pageSize: params?.page_size ?? DEFAULT_NOTIFICATION_PAGE_SIZE",
    "appSdkClient.notification.acknowledge.create(notificationId)",
    "appSdkClient.notification.popupSeen.create(notificationId)",
  ]) {
    assert.ok(serviceSource.includes(marker), `missing shared notification service marker: ${marker}`);
  }

  assert.doesNotMatch(serviceSource, /createIdempotencyParams/u);
  assert.ok(navbarSource.includes("service={notificationService}"));
  assert.ok(navbarSource.includes("const notificationService = useMemo(() => createPortalNotificationService(), [])"));
});

test("portal notification facade remains typed and backend SDK construction has no cross-domain compatibility overlay", () => {
  const notificationSource = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/notificationService.ts", import.meta.url),
    "utf8",
  );
  const sdkClientsSource = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts", import.meta.url),
    "utf8",
  );

  for (const marker of [
    "export type PortalNotificationClient = SdkworkNotificationGeneratedClient;",
    "appSdkClient.notification.list({",
    "appSdkClient.notification.acknowledge.create(notificationId)",
    "appSdkClient.notification.popupSeen.create(notificationId)",
  ]) {
    assert.ok(notificationSource.includes(marker), `missing notification client facade marker: ${marker}`);
  }

  assert.doesNotMatch(notificationSource, /appId: params\?\.appId/u);

  for (const marker of [
    "BackendDomainDependencyOverlay",
    "createBackendDomainCanonicalFacade",
    "attachManagementAlias",
    "facade.catalog.spus",
    "ClawRouterBackendDomainTransportSdkClient",
  ]) {
    assert.equal(sdkClientsSource.includes(marker), false, `retired backend aggregation marker must be absent: ${marker}`);
  }

  assert.match(
    sdkClientsSource,
    /createClawRouterBackendSdkClient[\s\S]*?new SdkworkBackendClient\(buildBackendConfig\(options\)\)/,
  );

  assert.doesNotMatch(
    sdkClientsSource,
    /TCommerce extends SdkworkBackendClient\['commerce'\] & SdkworkCommerceGeneratedBackendClient/,
  );
});

test("clawrouter backend client constructs without loading business-domain SDK resources", () => {
  const client = createClawRouterBackendSdkClient({
    backendBaseUrl: "http://127.0.0.1:18081/backend/v3/api",
  });
  const resources = client as unknown as Record<string, unknown>;

  assert.equal(resources.catalog, undefined);
  assert.equal(resources.orders, undefined);
  assert.equal(resources.wallet, undefined);
  assert.equal(typeof client.system.monitor.nodes.list, "function");
  assert.equal(typeof client.system.rateLimits.ip.list, "function");
});

test("iam directory app operations keep one canonical params shape before the appbase SDK boundary", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/iamDirectoryApiOperations.ts", import.meta.url),
    "utf8",
  );

  for (const marker of [
    "organization_id?:",
    "department_id?:",
    "user_id?:",
    "scope_id?:",
    "page_size?:",
    "params.pageSize ?? params.page_size",
  ]) {
    assert.doesNotMatch(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const marker of [
    "organizationId?: string;",
    "departmentId?: string;",
    "userId?: string;",
    "scopeId?: string;",
    "pageSize?: number;",
    "...(params.q ? { q: params.q } : {})",
  ]) {
    assert.ok(source.includes(marker), `missing canonical IAM directory params marker: ${marker}`);
  }
});

test("runtime stream URL uses standard lower snake case query parameters", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/runtime.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /\?after_event_no=/);
  assert.doesNotMatch(source, /\?afterEventNo=/);
});

test("admin resource center collection metadata reads only the canonical pageSize field", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/components/AdminResourceCenter.tsx", import.meta.url),
    "utf8",
  );

  assert.deepEqual(
    readAdminResourceCollectionMeta({ data: { total: 42, page: 2, pageSize: 20 } }),
    { total: 42, page: 2, pageSize: 20 },
  );
  assert.deepEqual(
    readAdminResourceCollectionMeta({
      data: {
        items: [],
        pageInfo: {
          mode: "offset",
          page: 2,
          pageSize: 20,
          totalItems: "42",
          totalPages: 3,
          hasMore: true,
        },
      },
    }),
    { total: 42, totalPages: 3, hasMore: true, page: 2, pageSize: 20 },
  );
  assert.deepEqual(
    readAdminResourceCollectionMeta({
      data: {
        items: [],
        pageInfo: {
          mode: "offset",
          page: 1,
          pageSize: 20,
          totalItems: "9007199254740993",
          totalPages: 450359962737050,
          hasMore: true,
        },
      },
    }),
    { totalPages: 450359962737050, hasMore: true, page: 1, pageSize: 20 },
  );
  assert.equal(readAdminResourceCollectionMeta({ data: { total: 42, page: 2, page_size: 20 } }), null);
  assert.equal(readAdminResourceCollectionMeta({ data: { total: 42, page: 0, pageSize: 20 } }), null);
  assert.equal(readAdminResourceCollectionMeta({ data: { total: 42, page: 1, pageSize: -1 } }), null);
  assert.equal(
    readAdminResourceCollectionMeta({ data: { total: 42, page: 1.5, pageSize: 20 } }),
    null,
  );
  assert.doesNotMatch(source, /pageSize\s*\?\?\s*data\.page_size/);
  assert.doesNotMatch(source, /data\.page_size/);
});

test("portal css stabilizes navbar notification dropdown empty state dimensions", () => {
  const cssSource = readFileSync(
    new URL("./src/index.css", import.meta.url),
    "utf8",
  );
  const navbarSource = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/components/Navbar.tsx", import.meta.url),
    "utf8",
  );

  assert.ok(
    navbarSource.includes('className="claw-router-navbar-notification-bell"'),
    "Navbar must pass the notification bell CSS scope class",
  );

  for (const marker of [
    ".claw-router-navbar-notification-bell",
    ".claw-router-navbar-notification-bell [role=\"menu\"]",
    "width: min(22rem, calc(100vw - 2rem));",
    "min-width: min(22rem, calc(100vw - 2rem));",
    ".claw-router-navbar-notification-bell [role=\"menu\"] > div:nth-child(2)",
    "min-height: 7rem;",
    ".claw-router-navbar-notification-bell [role=\"menu\"] > div:nth-child(2) > div:not(:has(*))",
    "white-space: normal;",
  ]) {
    assert.ok(cssSource.includes(marker), `missing navbar notification CSS marker: ${marker}`);
  }
});

test("navbar localizes notification controls and uses runtime site branding", () => {
  const navbarSource = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/components/Navbar.tsx", import.meta.url),
    "utf8",
  );
  const siteBrandingSource = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/siteBranding.ts", import.meta.url),
    "utf8",
  );

  for (const marker of [
    "useSiteBranding()",
    "siteBranding.siteName",
    "siteBranding.shortName",
    "siteBranding.logo",
    "acknowledge: t('commons.navbar.acknowledge'",
    "ariaLabel: t('commons.navbar.notificationCenter'",
    "detailsTitle: t('commons.navbar.notificationDetails'",
    "empty: t('commons.navbar.emptyNotifications'",
    "loading: t('commons.navbar.loadingNotifications'",
    "retry: t('commons.navbar.retryNotifications'",
    "source: t('commons.navbar.notificationSourceGateway'",
    "viewAll: t('commons.navbar.viewAllNotifications'",
    "applySiteBrandingToDocument",
  ]) {
    assert.ok(navbarSource.includes(marker) || siteBrandingSource.includes(marker), `missing site branding marker: ${marker}`);
  }

  assert.doesNotMatch(navbarSource, />\s*Claw Router\s*</u, "Navbar must render the configurable site name instead of hard-coded text");
});

test("footer renders configurable site branding and copyright", () => {
  const footerSource = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/components/Footer.tsx", import.meta.url),
    "utf8",
  );

  for (const marker of [
    "useSiteBranding()",
    "siteBranding.siteName",
    "siteBranding.footerCopyright",
    "siteBranding.logo",
    "siteBranding.icpRecordNumber",
    "siteBranding.icpRecordUrl",
    "siteBranding.policeRecordNumber",
    "siteBranding.policeRecordUrl",
    "footer.icpRecordLabel",
    "footer.policeRecordLabel",
  ]) {
    assert.ok(footerSource.includes(marker), `missing footer branding marker: ${marker}`);
  }

  assert.doesNotMatch(footerSource, />\s*Claw Router\s*</u, "Footer must render the configurable site name instead of hard-coded text");
  assert.doesNotMatch(footerSource, /XXXXXXX|浜琁CP|beian\.miit\.gov\.cn/, "Footer must render filing records from site branding instead of hard-coded placeholders");
  assert.ok(footerSource.includes('target="_blank"'), "Footer filing links must open official query pages in a new tab");
});

test("console layout keeps readable navigation labels and valid logout markup", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-console-shell/src/ConsoleLayout.tsx", import.meta.url),
    "utf8",
  );

  for (const label of [
    "Dashboard",
    "Token management",
    "Call statistics",
    "Wallet & top-up",
    "Bills and Reports",
    "Message Center",
    "Account overview",
    "Configuration center",
    "Log out",
  ]) {
    assert.match(source, new RegExp(`['">]${label}['"<]`));
  }

  const legacyConsoleMojibakePattern = new RegExp(
    `[\\u3400-\\u9fff]|${[
      "\\u6d60",
      "\\u748b",
      "\\u95bd",
      "\\u7490",
      "\\u5a11",
      "\\u5bb8",
      "\\u93c8",
      "\\u95b0",
      "\\u95ab",
    ].join("|")}`,
    "u",
  );
  assert.doesNotMatch(source, legacyConsoleMojibakePattern);
  assert.doesNotMatch(source, /path:\s*'\/console\/recharge'/);
  assert.doesNotMatch(source, /path:\s*'\/console\/checkout'/);
  assert.doesNotMatch(source, /path:\s*'\/console\/payment'/);
  assert.doesNotMatch(source, /console\.recharge\.nav\.recharge/);
  assert.doesNotMatch(source, /console\.checkout\.nav\.checkout/);
  assert.match(
    source,
    /\{sidebarOpen && <span>\{t\("console\.core\.consolelayout\.text\.12hokt7", "Log out"\)\}<\/span>\}/,
  );
});

test("console sidebar keeps dashboard top-level and groups the remaining menus by workflow", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-console-shell/src/ConsoleLayout.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const CONSOLE_SIDEBAR_GROUPS_DEFAULT_OPEN = true;/);
  assert.match(source, /const consoleSidebarItems = \[/);
  assert.match(source, /const consoleSidebarGroups = \[/);
  assert.match(source, /function ConsoleSidebarGroup/);
  assert.match(source, /defaultOpen=\{CONSOLE_SIDEBAR_GROUPS_DEFAULT_OPEN\}/);
  assert.match(source, /t\(group\.groupKey, group\.fallbackLabel\)/);
  assert.match(source, /t\(item\.labelKey, item\.fallbackLabel\)/);

  assert.match(
    source,
    /itemBlock\(\{\s*path: '\/console\/dashboard',\s*labelKey: 'console\.menu\.dashboard'/,
    "Dashboard should be a top-level console sidebar item.",
  );
  assert.doesNotMatch(
    source,
    /groupBlock\('console\.menu\.group\.[^']+',\s*'[^']+',\s*\[[\s\S]{0,320}path: '\/console\/dashboard'/,
    "Dashboard must not be nested inside a sidebar group.",
  );

  for (const groupKey of [
    "console.menu.group.observability",
    "console.menu.group.integration",
    "console.menu.group.accountBusiness",
    "console.menu.group.notificationsSettings",
  ]) {
    assert.match(source, new RegExp(`groupBlock\\('${groupKey}'`));
  }

  for (const path of [
    "/console/usage",
    "/console/api-keys",
    "/console/account",
    "/console/wallet",
    "/console/memberships",
    "/console/settlements",
    "/console/notifications",
    "/console/settings",
  ]) {
    assert.match(source, new RegExp(`path: '${path.replace(/\//g, "\\/")}'`));
  }

  assert.doesNotMatch(source, /to="\/console\/settings"/);
  assert.doesNotMatch(source, /mainNavigation\.map/);
  assert.doesNotMatch(source, /path:\s*'\/console\/recharge'/);
  assert.doesNotMatch(source, /path:\s*'\/console\/checkout'/);
  assert.doesNotMatch(source, /path:\s*'\/console\/payment'/);
  assert.doesNotMatch(source, /console\.menu\.group\.aiWorkspace/);
  assert.doesNotMatch(source, /console\.menu\.agents/);
  assert.doesNotMatch(source, /path:\s*'\/console\/agents'/);
  assert.doesNotMatch(source, /\bBot\b/);
});

test("console business routes compose T1 domain PC packages through Claw Router extensions", () => {
  const appSource = readPortalSource("./src/App.tsx");
  const mountSource = readPortalSource("./src/console-business/consoleBusinessHostMount.tsx");
  const walletSource = readPortalSource("./src/console-business/ClawRouterWalletPage.tsx");

  assert.match(appSource, /ClawRouterConsoleBusinessHostRoutes/);
  assert.match(appSource, /ClawRouterConsoleBusinessNavbarActions/);
  assert.match(mountSource, /ClawRouterWalletPage/);
  assert.match(walletSource, /@sdkwork\/account-pc-wallet/);
  assert.match(mountSource, /@sdkwork\/payment-pc-payment/);
  assert.doesNotMatch(appSource, /from '@sdkwork\/commerce-pc-host'/);
  assert.doesNotMatch(appSource, /ClawRouterConsoleCommerceHostRoutes/);
  assert.doesNotMatch(appSource, /consoleCommerceViews/);
  assert.doesNotMatch(appSource, /clawrouter-pc-console-wallet/);
  assert.doesNotMatch(appSource, /clawrouter-pc-console-recharge/);
  assert.doesNotMatch(appSource, /clawrouter-pc-console-commerce/);
});

test("console recharge exchange wording stays consistent in shell navigation and i18n resources", () => {
  const consoleShellSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-console-shell/src/ConsoleLayout.tsx", import.meta.url),
    "utf8",
  );
  const billingI18nSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-i18n/src/resources/console/billing.ts", import.meta.url),
    "utf8",
  );
  const rechargeI18nSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-i18n/src/resources/console/recharge.ts", import.meta.url),
    "utf8",
  );

  assert.match(consoleShellSource, /fallbackLabel: 'Wallet & top-up'/);
  assert.match(billingI18nSource, /"console\.billing\.billingview\.text\.gd62li": "\u5145\u503c\u5151\u6362"/u);
  assert.match(billingI18nSource, /"console\.billing\.billingview\.text\.1iq97ql": "\u5151\u6362"/u);
  assert.match(billingI18nSource, /"console\.billing\.billingview\.text\.1wlfhep": "\u5145\u503c"/u);
  assert.match(rechargeI18nSource, /"console\.recharge\.tabs\.redeem": "\u5151\u6362"/u);
  assert.match(rechargeI18nSource, /"console\.recharge\.tabs\.online": "\u5145\u503c"/u);
  assert.doesNotMatch(billingI18nSource, /"console\.billing\.billingview\.text\.gd62li": "\u94b1\u5305\u4e0e\u5145\u503c"/u);
  assert.doesNotMatch(billingI18nSource, /"console\.billing\.billingview\.text\.1iq97ql": "\u5361\u5bc6\u5151\u6362"/u);
  assert.doesNotMatch(billingI18nSource, /"console\.billing\.billingview\.text\.1wlfhep": "\u5728\u7ebf\u5145\u503c"/u);
  assert.doesNotMatch(rechargeI18nSource, /"console\.recharge\.tabs\.redeem": "\u5361\u5bc6\u5151\u6362"/u);
  assert.doesNotMatch(rechargeI18nSource, /"console\.recharge\.tabs\.online": "\u5728\u7ebf\u5145\u503c"/u);
});
test("portal auth helpers preserve the current route for login-required actions", () => {
  clearStoredAppSessionToken();

  assert.equal(hasStoredPortalSession(), false);
  assert.equal(
    buildPortalAuthLoginRedirect({
      hash: "#comments",
      pathname: "/models/openai/gpt-4o",
      search: "?sort=top",
    }),
    "/auth/login?redirect=%2Fmodels%2Fopenai%2Fgpt-4o%3Fsort%3Dtop%23comments",
  );
  assert.deepEqual(
    resolvePortalLoginRequiredAction({
      hasSession: false,
      location: {
        hash: "#install",
        pathname: "/models/openai/gpt-4o",
        search: "?tab=config",
      },
    }),
    {
      allowed: false,
      redirectTo: "/auth/login?redirect=%2Fmodels%2Fopenai%2Fgpt-4o%3Ftab%3Dconfig%23install",
    },
  );
  assert.deepEqual(
    resolvePortalLoginRequiredAction({
      hasSession: true,
      location: { pathname: "/playground", search: "", hash: "" },
    }),
    { allowed: true },
  );

  storeAppSessionFromResult({
    accessToken: "partial-access",
    authToken: "partial-auth",
  });
  assert.equal(hasStoredPortalSession(), true);

  storeAppSessionFromResult({
    accessToken: "full-access",
    authToken: "full-auth",
    context: {
      tenantId: "tenant-42",
      userId: "user-42",
      sessionId: "session-42",
    },
  });
  assert.equal(hasStoredPortalSession(), true);
  clearStoredAppSessionToken();
});

test("navbar sign-in preserves the current public route while console links use route protection", () => {
  const navbarSource = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/components/Navbar.tsx", import.meta.url),
    "utf8",
  );

  assert.match(navbarSource, /buildPortalAuthLoginRedirect/u);
  assert.match(navbarSource, /const handleSignIn = \(\) => \{\s*navigate\(buildPortalAuthLoginRedirect\(location\)\);\s*\}/u);
  assert.match(navbarSource, /<Link to="\/console"/u);
  assert.doesNotMatch(navbarSource, /redirect=\/console/u);
});

test("console sidebar exposes memberships as the commerce upgrade entry point", () => {
  const consoleShellSource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-console-shell/src/ConsoleLayout.tsx", import.meta.url),
    "utf8",
  );
  const navbarSource = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/components/Navbar.tsx", import.meta.url),
    "utf8",
  );

  assert.match(consoleShellSource, /path: '\/console\/memberships'/);
  assert.match(consoleShellSource, /fallbackLabel: 'Memberships'/);
  assert.match(navbarSource, /href: '\/token-plan'/u);
  assert.doesNotMatch(navbarSource, /href: '\/console\/memberships'/u);
  assert.doesNotMatch(navbarSource, /\/console\/billing\?vip/u);
});

test("navbar keeps the public GitHub repository entry hidden", () => {
  const navbarSource = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/components/Navbar.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(navbarSource, /github\.com\/Sdkwork-Cloud\/sdkwork-clawrouter\.git/u);
  assert.doesNotMatch(navbarSource, /GitHub Repository/u);
  assert.doesNotMatch(navbarSource, /\bGithub\b/u);
});

test("sdk request boundary validates query primitives and safe path segments", () => {
  assert.equal(optionalInteger(" 2026 ", "year"), 2026);
  assert.equal(optionalPositiveInteger(" 2 ", "page"), 2);
  assert.equal(optionalBoundedPositiveInteger("100", "pageSize", 100), 100);
  assert.equal(optionalText(" query ", "searchQuery", 128), "query");
  assert.equal(optionalText(" ", "searchQuery", 128), undefined);
  assert.equal(requiredSafePathSegment("app-1_2.3~stable", "appId"), "app-1_2.3~stable");
  assert.deepEqual(
    pruneUndefinedQueryParams({
      page: 2,
      pageSize: 100,
      searchQuery: "gpt-4o",
      empty: undefined,
      zero: 0,
    }),
    {
      page: "2",
      pageSize: "100",
      searchQuery: "gpt-4o",
      zero: "0",
    },
  );

  assert.throws(() => optionalInteger("2026.5", "year"), /year must be an integer/);
  assert.throws(() => optionalInteger("1e2", "page"), /page must be an integer/);
  assert.throws(() => optionalPositiveInteger(0, "page"), /page must be a positive integer/);
  assert.throws(() => optionalBoundedPositiveInteger(101, "pageSize", 100), /pageSize must be between 1 and 100/);
  assert.throws(() => optionalText({ value: "2026-05-05" }, "startTime", 64), /startTime must be a string/);
  assert.throws(() => optionalText("x".repeat(129), "searchQuery", 128), /searchQuery must be at most 128 characters/);
  assert.throws(() => requiredSafePathSegment("", "appId"), /appId is required/);
  assert.throws(() => requiredSafePathSegment(" app-1 ", "appId"), /appId must be a safe path segment/);
  assert.throws(() => requiredSafePathSegment("../admin", "appId"), /appId must be a safe path segment/);
  assert.throws(() => requiredSafePathSegment("app?debug=true", "appId"), /appId must be a safe path segment/);
});

test("syntaxHighlightJson accepts unknown and unserializable display values", () => {
  const circular: Record<string, unknown> = { name: "cycle" };
  circular.self = circular;

  assert.equal(syntaxHighlightJson(undefined), "undefined");
  assert.match(syntaxHighlightJson({ ok: true }), /<span class="[^"]+">true<\/span>/);
  assert.match(syntaxHighlightJson("<script>"), /&lt;script&gt;/);
  assert.doesNotThrow(() => syntaxHighlightJson(circular));
  assert.match(syntaxHighlightJson(circular), /\[Unserializable JSON value\]/);
});

test("api result readers support generated SDK data objects and raw API envelopes", () => {
  const items = [{ id: "runtime-model" }];

  assert.deepEqual(readApiItems({ items }), items);
  assert.deepEqual(readApiItems({ data: items }), items);
  assert.deepEqual(readApiItems({ code: "2000", msg: "success", data: { items } }), items);
  assert.deepEqual(readApiItems(items), items);
  assert.deepEqual(readApiRecord({ items }), { items });
  assert.deepEqual(readApiRecord({ data: items, total: 1 }), { data: items, total: 1 });
  assert.deepEqual(readApiRecord({ code: "default", name: "Default group" }), {
    code: "default",
    name: "Default group",
  });
  assert.deepEqual(readApiRecord({ message: "Scheduled maintenance", status: "active" }), {
    message: "Scheduled maintenance",
    status: "active",
  });
  assert.deepEqual(readApiRecord({ code: "2000", data: { items } }), { items });
  assert.deepEqual(readApiRecord({ code: 0, data: { items } }), { items });
  assert.deepEqual(readApiRecord({ code: "200", data: { items } }), { items });
});

test("api result required list reader fails closed for malformed list payloads", () => {
  const items = [{ id: "runtime-model" }];

  assert.deepEqual(readRequiredApiItems({ items: [] }, "Model list is missing"), []);
  assert.deepEqual(readRequiredApiItems({ items }, "Model list is missing"), items);
  assert.deepEqual(readRequiredApiItems(items, "Model list is missing"), items);
  assert.deepEqual(readRequiredApiItems({ data: items }, "Model list is missing"), items);
  assert.deepEqual(readRequiredApiItems({ code: "2000", data: { items: [] } }, "Model list is missing"), []);
  assert.deepEqual(readRequiredApiItems({ code: "2000", data: { logs: [] } }, "Log list is missing", ["logs"]), []);
  assert.throws(
    () => readRequiredApiItems({ ok: true }, "Model list is missing"),
    /Model list is missing/,
  );
  assert.throws(
    () => readRequiredApiItems({ code: "2000", data: { ok: true } }, "Model list is missing"),
    /Model list is missing/,
  );
  assert.throws(
    () => readRequiredApiItems({ code: "2000", data: { item: { id: "model-1" } } }, "Model list is missing"),
    /Model list is missing/,
  );
});

test("api result required item reader fails closed when command responses omit returned entities", () => {
  assert.deepEqual(readRequiredApiItem({ item: { id: "group-1" } }, "Missing group"), { id: "group-1" });
  assert.deepEqual(readRequiredApiItem({ code: "2000", data: { item: { id: "group-2" } } }, "Missing group"), {
    id: "group-2",
  });
  assert.throws(
    () => readRequiredApiItem({ id: "direct-entity" }, "Missing nested item", ["item"]),
    /Missing nested item/,
  );
  assert.throws(
    () => readRequiredApiItem({ items: [] }, "Created group response is missing data"),
    /Created group response is missing data/,
  );
  assert.throws(
    () => readRequiredApiItem({ updated: true }, "Updated group response is missing data"),
    /Updated group response is missing data/,
  );
  assert.throws(
    () => readRequiredApiItem({ code: "2000", data: null }, "Created group response is missing data"),
    /Created group response is missing data/,
  );
});

test("api result required string reader rejects missing or blank stable fields", () => {
  assert.equal(readRequiredString({ id: " group-1 " }, "id", "Group id is required"), "group-1");
  assert.equal(readRequiredString({ id: 42 }, "id", "Group id is required"), "42");
  assert.throws(
    () => readRequiredString({ id: " " }, "id", "Group id is required"),
    /Group id is required/,
  );
  assert.throws(
    () => readRequiredString({}, "id", "Group id is required"),
    /Group id is required/,
  );
});

test("api result required number reader rejects missing or invalid stable numeric fields", () => {
  assert.equal(readRequiredNumber({ id: 42 }, "id", "User id is required"), 42);
  assert.equal(readRequiredNumber({ id: "42" }, "id", "User id is required"), 42);
  assert.throws(
    () => readRequiredNumber({ id: 0 }, "id", "User id is required"),
    /User id is required/,
  );
  assert.throws(
    () => readRequiredNumber({ id: "not-a-number" }, "id", "User id is required"),
    /User id is required/,
  );
});

test("api result required non-negative number reader rejects missing or invalid pagination totals", () => {
  assert.equal(readRequiredNonNegativeNumber({ total: 0 }, "total", "Total is required"), 0);
  assert.equal(readRequiredNonNegativeNumber({ total: "0" }, "total", "Total is required"), 0);
  assert.equal(readRequiredNonNegativeNumber({ total: "42" }, "total", "Total is required"), 42);
  assert.throws(
    () => readRequiredNonNegativeNumber({ total: -1 }, "total", "Total is required"),
    /Total is required/,
  );
  assert.throws(
    () => readRequiredNonNegativeNumber({ total: "not-a-number" }, "total", "Total is required"),
    /Total is required/,
  );
  assert.throws(
    () => readRequiredNonNegativeNumber({}, "total", "Total is required"),
    /Total is required/,
  );
});

test("ensureSdkworkApiSuccess accepts generated SDK data objects and raw success envelopes", () => {
  assert.doesNotThrow(() => ensureSdkworkApiSuccess({ code: 0, data: { ok: true } }, "Failed to fetch apps"));
  assert.doesNotThrow(() => ensureSdkworkApiSuccess({ code: "200", data: { ok: true } }, "Failed to fetch apps"));
  assert.doesNotThrow(() => ensureSdkworkApiSuccess({ items: [] }, "Failed to fetch apps"));
  assert.doesNotThrow(() => ensureSdkworkApiSuccess({ items: [{ id: "runtime-model" }] }, "Failed to fetch models"));
  assert.doesNotThrow(() => ensureSdkworkApiSuccess([{ id: "runtime-model" }], "Failed to fetch models"));
  assert.doesNotThrow(() =>
    ensureSdkworkApiSuccess(
      { code: "default", name: "Default group", message: "Standard routing group" },
      "Failed to add group",
    ),
  );
  assert.throws(
    () => ensureSdkworkApiSuccess({}, "Failed to fetch apps"),
    /Failed to fetch apps/,
  );
  assert.throws(
    () => ensureSdkworkApiSuccess([], "Failed to fetch models"),
    /Failed to fetch models/,
  );
  assert.throws(
    () => ensureSdkworkApiSuccess("<!doctype html><html></html>", "Failed to fetch apps"),
    /Failed to fetch apps/,
  );
  assert.throws(
    () => ensureSdkworkApiSuccess({ code: "4001", msg: "Invalid group", data: null }, "Failed to add group"),
    /Invalid group/,
  );
  assert.throws(
    () => ensureSdkworkApiSuccess({ code: "4001", msg: "Invalid group" }, "Failed to add group"),
    /Invalid group/,
  );
  assert.throws(
    () => ensureSdkworkApiSuccess({ code: "4001" }, "Failed to add group"),
    /Failed to add group: 4001/,
  );
  assert.throws(
    () => ensureSdkworkApiSuccess({ code: 5000, message: "System error", data: null }, "Failed to add group"),
    /System error/,
  );
  assert.throws(
    () => ensureSdkworkApiSuccess({ code: 5000, message: "System error" }, "Failed to add group"),
    /System error/,
  );
  assert.throws(
    () => ensureSdkworkApiSuccess({ code: 5000 }, "Failed to add group"),
    /Failed to add group: 5000/,
  );
});

test("createAppSession stores dual IAM tokens returned as generated SDK data objects", async () => {
  const captured: { url: string; method: string; headers: Record<string, string> }[] = [];
  const tokenManager = getClawRouterGlobalTokenManager();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    value: {},
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    captured.push({
      url,
      method: init?.method ?? "GET",
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
    });
    return new Response(
      JSON.stringify({
        code: 0,
        data: {
          accessToken: "access-token-2026",
          authToken: "auth-token-2026",
          refreshToken: "refresh-token-2026",
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          sessionId: "session-2026",
          context: {
            appId: "sdkwork-clawrouter",
            authLevel: "password",
            dataScope: ["tenant:tenant-2026"],
            deploymentMode: "saas",
            environment: "dev",
            organizationId: "org-2026",
            permissionScope: ["clawrouter.console.access"],
            standardRoleCodes: ["org_admin"],
            sessionId: "session-2026",
            tenantId: "tenant-2026",
            userId: "user-2026",
          },
        },
        traceId: "trace-create-session-2026",
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  }) as typeof fetch;
  clearStoredAppSessionToken();
  resetClawRouterSdkClients();
  tokenManager.setTokens({ accessToken: "credential-entry-access-token" });

  try {
    const result = await createAppSession({ tokenManager });

    assert.equal(captured.length, 1);
    assert.equal(captured[0].url, "/app/v3/api/auth/sessions");
    assert.equal(captured[0].method, "POST");
    assert.equal(captured[0].headers["access-token"], "credential-entry-access-token");
    assert.equal(captured[0].headers["x-request-id"], undefined);
    assert.equal(getStoredAppSessionAuthToken(), "auth-token-2026");
    assert.equal(getStoredAppSessionAccessToken(), "access-token-2026");
    assert.equal(result.authToken, "auth-token-2026");
    assert.equal(result.accessToken, "access-token-2026");
    assert.equal(result.refreshToken, "refresh-token-2026");
    assert.equal(result.sessionId, "session-2026");
    assert.equal(result.context?.tenantId, "tenant-2026");
    assert.deepEqual(loadStoredAppSessionToken()?.context?.standardRoleCodes, ["org_admin"]);
    assert.equal(hasStoredPortalSession(), true);
  } finally {
    tokenManager.clearTokens();
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
    globalThis.fetch = originalFetch;
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  }
});

test("current session retrieval preserves stored refresh token when the server omits it", () => {
  clearStoredAppSessionToken();

  try {
    storeAppSessionFromResult({
      accessToken: "access-token-old",
      authToken: "auth-token-old",
      refreshToken: "refresh-token-2026",
      sessionId: "session-2026",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });

    const stored = storeAppSessionFromResult({
      accessToken: "access-token-current",
      authToken: "auth-token-current",
      sessionId: "session-2026",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });

    assert.equal(stored.refreshToken, "refresh-token-2026");
    assert.equal(stored.sessionId, "session-2026");
    assert.equal(loadStoredAppSessionToken()?.refreshToken, "refresh-token-2026");
    assert.equal(getStoredAppSessionAuthToken(), "auth-token-current");
    assert.equal(getStoredAppSessionAccessToken(), "access-token-current");
  } finally {
    clearStoredAppSessionToken();
  }
});

test("revokeAppSession deletes the persisted server session before clearing local tokens", async () => {
  const captured: { url: string; method: string; headers: Record<string, string> }[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    value: {},
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    captured.push({
      url,
      method: init?.method ?? "GET",
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
    });
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  clearStoredAppSessionToken();
  resetClawRouterSdkClients();
  storeAppSessionFromResult({
    accessToken: "access-token-logout",
    authToken: "auth-token-logout",
    refreshToken: "refresh-token-logout",
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    sessionId: "session-logout",
  });

  try {
    await revokeAppSession();

    assert.equal(captured.length, 1);
    assert.equal(captured[0].url, "/app/v3/api/auth/sessions/current");
    assert.equal(captured[0].method, "DELETE");
    assert.equal(captured[0].headers.authorization, "Bearer auth-token-logout");
    assert.equal(captured[0].headers["access-token"], "access-token-logout");
    assert.equal(getStoredAppSessionAuthToken(), undefined);
    assert.equal(getStoredAppSessionAccessToken(), undefined);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
    globalThis.fetch = originalFetch;
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  }
});

function portalAdminSessionPayload(
  accessToken: string,
  authToken: string,
  sessionId: string,
  options: { permissionScope?: string[] } = {},
) {
  return {
    accessToken,
    authToken,
    sessionId,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    context: {
      tenantId: "tenant-admin",
      userId: "user-admin",
      sessionId,
      permissionScope: options.permissionScope ?? ["clawrouter.admin.access", "clawrouter.system.read"],
    },
  };
}

test("portal admin access check authorizes the effective IAM permission scope without a business endpoint probe", async () => {
  for (const [permissionScope, expectedState] of [
    [["*"], "allowed"],
    [["clawrouter.*"], "allowed"],
    [["clawrouter.admin.access"], "allowed"],
    [["clawrouter.console.access"], "forbidden"],
  ] as const) {
    const captured: { url: string; method: string }[] = [];
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      enumerable: true,
      value: {},
    });
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      captured.push({ url, method: init?.method ?? "GET" });
      if (url === "/app/v3/api/auth/sessions/current") {
        return new Response(
          JSON.stringify({
            code: 0,
            data: portalAdminSessionPayload(
              `access-${expectedState}-${permissionScope[0]}`,
              `auth-${expectedState}-${permissionScope[0]}`,
              `session-${expectedState}-${permissionScope[0]}`,
              { permissionScope: [...permissionScope] },
            ),
            traceId: `trace-${expectedState}-${permissionScope[0]}`,
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    }) as typeof fetch;
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
    storeAppSessionFromResult(
      portalAdminSessionPayload(
        `seed-access-${expectedState}-${permissionScope[0]}`,
        `seed-auth-${expectedState}-${permissionScope[0]}`,
        `seed-session-${expectedState}-${permissionScope[0]}`,
      ),
    );

    try {
      const state = await verifyCurrentPortalAdminAccess();

      assert.equal(state, expectedState);
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url}`),
        ["GET /app/v3/api/auth/sessions/current"],
      );
      assert.equal(getStoredAppSessionAuthToken(), `auth-${expectedState}-${permissionScope[0]}`);
      assert.equal(getStoredAppSessionAccessToken(), `access-${expectedState}-${permissionScope[0]}`);
    } finally {
      clearStoredAppSessionToken();
      resetClawRouterSdkClients();
      globalThis.fetch = originalFetch;
      if (originalWindowDescriptor) {
        Object.defineProperty(globalThis, "window", originalWindowDescriptor);
      } else {
        delete (globalThis as { window?: Window }).window;
      }
    }
  }
});

test("portal admin access check clears an expired IAM session", async () => {
  const captured: { url: string; method: string }[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    value: {
      dispatchEvent: () => true,
      location: {
        hash: "",
        hostname: "localhost",
        pathname: "/admin/dashboard",
        replace: () => undefined,
        search: "",
      },
    },
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    captured.push({ url, method: init?.method ?? "GET" });
    if (url === "/app/v3/api/auth/sessions/current") {
      return new Response(JSON.stringify({ code: "401", msg: "session expired" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
  }) as typeof fetch;
  clearStoredAppSessionToken();
  resetClawRouterSdkClients();
  storeAppSessionFromResult(portalAdminSessionPayload("access-expired", "auth-expired", "session-expired"));

  try {
    const state = await verifyCurrentPortalAdminAccess();

    assert.equal(state, "anonymous");
    assert.deepEqual(
      captured.map((request) => `${request.method} ${request.url}`),
      ["GET /app/v3/api/auth/sessions/current"],
    );
    assert.equal(getStoredAppSessionAuthToken(), undefined);
    assert.equal(getStoredAppSessionAccessToken(), undefined);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
    globalThis.fetch = originalFetch;
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  }
});

test("portal admin access check reports a current-session service failure", async () => {
  const captured: { url: string; method: string }[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    value: {},
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    captured.push({ url, method: init?.method ?? "GET" });
    if (url === "/app/v3/api/auth/sessions/current") {
      return new Response(JSON.stringify({
        code: 50301,
        detail: "Current-session service is unavailable",
        status: 503,
        title: "Service unavailable",
        traceId: "trace-current-session-failure",
        type: "https://sdkwork.example/problems/service-unavailable",
      }), {
        status: 503,
        headers: { "content-type": "application/problem+json" },
      });
    }
    throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
  }) as typeof fetch;
  clearStoredAppSessionToken();
  resetClawRouterSdkClients();
  storeAppSessionFromResult(
    portalAdminSessionPayload("access-service-failure", "auth-service-failure", "session-service-failure"),
  );

  try {
    const state = await verifyCurrentPortalAdminAccess();

    assert.equal(state, "error");
    assert.deepEqual(
      captured.map((request) => `${request.method} ${request.url}`),
      Array.from({ length: 3 }, () => "GET /app/v3/api/auth/sessions/current"),
    );
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
    globalThis.fetch = originalFetch;
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  }
});

test("portal admin access check uses IAM session RBAC without a backend business probe", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawroutes-pc-commons/src/portal-session.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /hasPortalAdminSurfaceAccess/);
  assert.match(source, /auth\.sessions\.current\.retrieve\(\)/);
  assert.doesNotMatch(source, /getClawRouterBackendSdkClient/);
  assert.doesNotMatch(source, /installation\.status\.retrieve/);
});

test("BusinessStatePanel resolves invalid or missing kind before reading style metadata", () => {
  const source = readFileSync(new URL("./packages/sdkwork-clawroutes-pc-commons/src/components/BusinessState.tsx", import.meta.url), "utf8");

  assert.match(source, /function resolveBusinessStateKind\(/);
  assert.match(source, /const resolvedKind = resolveBusinessStateKind\(kind\)/);
  assert.match(source, /const style = stateStyle\[resolvedKind\]/);
  assert.doesNotMatch(source, /const style = stateStyle\[kind\]/);
  assert.match(source, /aria-live=\{resolvedKind === 'loading' \? 'polite' : 'assertive'\}/);
});

test("app-surface services do not supply client auth context selectors", () => {
  const sdkClientsSource = readPackageSource("packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts");
  const appSurfaceServiceSources = [
    "packages/sdkwork-clawrouter-pc-admin-record/src/recordService.ts",
    "packages/sdkwork-clawrouter-pc-playground/src/playgroundGenerationsService.ts",
  ];

  assert.match(sdkClientsSource, /sanitizeSdkHttpRequestOptions/);
  assert.match(sdkClientsSource, /auth-projection/);

  for (const relativePath of appSurfaceServiceSources) {
    const source = readPackageSource(relativePath);
    assert.doesNotMatch(source, /resolveStoredPortalTenantId/u, `${relativePath} must not resolve portal tenant for API calls`);
    assert.doesNotMatch(source, /resolveDriveTenantId/u, `${relativePath} must not resolve drive tenant for API calls`);
    assert.doesNotMatch(source, /resolveAgentTenantId/u, `${relativePath} must not resolve agent tenant for API calls`);
    assert.doesNotMatch(source, /tenantId:\s*resolve/u, `${relativePath} must not pass resolved tenantId to SDK calls`);
  }
});

function readPackageSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}
