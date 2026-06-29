import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import {
  mergeClawRouterAuthRuntimeConfig,
  DEFAULT_CLAW_ROUTER_AUTH_RUNTIME_CONFIG,
} from "./src/auth/clawRouterAuthConfig.ts";
import {
  formatOAuthProviders,
  parseOAuthProviderText,
  toAuthSettingsForm,
  toAuthSettingsRequest,
} from "./packages/sdkwork-clawrouter-pc-admin-site/src/ClawRouterAuthSettingsPage.tsx";
import {
  PROTECTED_PORTAL_ROUTE_PREFIXES,
  buildProtectedPortalLoginRedirect,
  isProtectedPortalPath,
  resolveProtectedPortalAccess,
} from "./src/auth/protectedPortalRoutes.ts";
import {
  clearStoredAppSessionToken,
  loadStoredAppSessionToken,
  storeAppSessionFromResult,
} from "./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts";
import {
  createClawRouterAppSdkClient,
  handleClawRouterSdkSessionAuthError,
  isClawRouterSdkSessionAuthError,
  resetClawRouterSdkSessionAuthRedirectState,
} from "./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts";
import {
  createSdkworkIamRuntimeAuthService,
} from "../../../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react/src/auth-iam-runtime.ts";

function readPortalFile(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function readPortalSourceFiles(relativeDirectory: string): Array<{ relativePath: string; source: string }> {
  const root = new URL(relativeDirectory, import.meta.url);
  const files: Array<{ relativePath: string; source: string }> = [];

  function walk(directory: URL, prefix: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "dist" || entry.name === "node_modules" || entry.name === ".turbo") {
        continue;
      }

      const relativePath = `${prefix}${entry.name}`;
      const entryUrl = new URL(entry.isDirectory() ? `${entry.name}/` : entry.name, directory);

      if (entry.isDirectory()) {
        walk(entryUrl, `${relativePath}/`);
        continue;
      }

      if (/\.(?:js|jsx|mjs|ts|tsx)$/.test(entry.name)) {
        files.push({ relativePath: `${relativeDirectory}${relativePath}`, source: readFileSync(entryUrl, "utf8") });
      }
    }
  }

  walk(root, "");
  return files;
}

function readI18nResourceFiles(): Array<{ relativePath: string; source: string }> {
  const resourcesRoot = new URL("./packages/sdkwork-clawrouter-pc-i18n/src/resources/", import.meta.url);
  if (!existsSync(resourcesRoot)) {
    return [];
  }

  return readPortalSourceFiles("./packages/sdkwork-clawrouter-pc-i18n/src/resources/");
}

function readI18nResourceSource(): string {
  return [
    readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/index.ts"),
    ...readI18nResourceFiles().map((file) => file.source),
  ].join("\n");
}

function findOrderedMatches(source: string, pattern: RegExp): string[] {
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

function findObjectBlockAt(source: string, start: number): string {
  assert.notEqual(start, -1, "object block must be present");

  const openBrace = source.indexOf("{", start);
  assert.notEqual(openBrace, -1, "object block must open with a brace");

  let depth = 0;
  let quote: string | undefined;
  let escaped = false;

  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = undefined;
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openBrace, index + 1);
      }
    }
  }

  assert.fail("object block must close");
}

function findObjectBlock(source: string, marker: string): string {
  const markerIndex = source.indexOf(marker);
  assert.notEqual(markerIndex, -1, `${marker} must be present`);
  return findObjectBlockAt(source, markerIndex);
}

function findI18nLocaleKeys(source: string, locale: string): Set<string> {
  const keys = new Set<string>();
  const localePattern = new RegExp(`\\b${locale}:\\s*\\{`, "g");

  for (const match of source.matchAll(localePattern)) {
    const localeSource = findObjectBlockAt(source, match.index ?? 0);
    for (const key of findOrderedMatches(localeSource, /"([^"]+)"\s*:/g)) {
      if (key.includes(".")) {
        keys.add(key);
      }
    }
  }

  return keys;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readAdminRegistrySource(): string {
  return readPortalFile("./packages/sdkwork-clawrouter-pc-admin-shell/src/adminModuleRegistry.ts");
}

function readAdminLayoutSource(): string {
  return readPortalFile("./packages/sdkwork-clawrouter-pc-admin-shell/src/AdminLayout.tsx");
}

function findAdminModuleDefinitionSource(source: string, moduleId: string): string {
  const match = source.match(
    new RegExp(`moduleBlock\\(\\{\\s*id:\\s*'${escapeRegExp(moduleId)}'[\\s\\S]*?\\n\\s*\\}\\),`),
  );
  assert.ok(match, `${moduleId} admin module definition must remain present`);
  return match[0];
}

function findAdminModuleMenuSource(source: string, moduleId: string): string {
  const match = source.match(
    new RegExp(`\\{\\s*moduleId:\\s*'${escapeRegExp(moduleId)}'[\\s\\S]*?\\n\\s*\\},(?=\\n\\s*\\{\\s*moduleId:|\\n\\s*\\];)`),
  );
  assert.ok(match, `${moduleId} admin menu module must remain present`);
  return match[0];
}

function findAdminMenuGroupSource(source: string, groupKey: string): string {
  const match = source.match(
    new RegExp(`groupBlock\\('${escapeRegExp(groupKey)}',\\s*\\[[\\s\\S]*?\\n\\s*\\]\\),`),
  );
  assert.ok(match, `${groupKey} admin menu group must remain present`);
  return match[0];
}

function authRuntimeSettingsFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    leftRailMode: "auto",
    loginMethods: ["password", "emailCode"],
    oauthLoginEnabled: true,
    oauthProviders: ["github"],
    oauthRegion: "overseas",
    qrLoginEnabled: true,
    qrLoginType: "official",
    recoveryMethods: ["email"],
    registerMethods: ["email", "phone"],
    verificationPolicy: {
      emailCodeLoginEnabled: true,
      emailRegistrationVerificationRequired: false,
      phoneCodeLoginEnabled: false,
      phoneRegistrationVerificationRequired: true,
    },
    ...overrides,
  };
}

function installPortalAuthRedirectWindow({
  hash,
  hostname,
  pathname,
  replace,
  runtimeEnv,
  search,
  sessionAuthEvents,
}: {
  hash: string;
  hostname?: string;
  pathname: string;
  replace: (to: string) => void;
  runtimeEnv?: Record<string, string>;
  search: string;
  sessionAuthEvents?: Array<Record<string, unknown>>;
}): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      __CLAWROUTER_ENV__: runtimeEnv,
      addEventListener: () => {},
      dispatchEvent: (event: Event) => {
        if (
          sessionAuthEvents
          && event instanceof CustomEvent
          && event.type === "sdkwork:session-auth-unauthorized"
        ) {
          sessionAuthEvents.push(event.detail as Record<string, unknown>);
        }
        return true;
      },
      location: {
        hash,
        hostname,
        pathname,
        replace,
        search,
      },
      removeEventListener: () => {},
    },
  });
  return () => {
    if (descriptor) {
      Object.defineProperty(globalThis, "window", descriptor);
      return;
    }
    delete (globalThis as typeof globalThis & { window?: unknown }).window;
  };
}

function createPortalSessionStorageHarness(): { openNewTab: () => void; restore: () => void } {
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const sessionStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const localStore = new Map<string, string>();
  const createStorage = (store: Map<string, string>) => ({
    getItem: (key: string) => store.get(key) ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  });
  const installSessionStorage = (store: Map<string, string>) => {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: createStorage(store),
    });
  };

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: createStorage(localStore),
  });
  installSessionStorage(new Map<string, string>());

  return {
    openNewTab: () => {
      installSessionStorage(new Map<string, string>());
    },
    restore: () => {
      if (localStorageDescriptor) {
        Object.defineProperty(globalThis, "localStorage", localStorageDescriptor);
      } else {
        delete (globalThis as typeof globalThis & { localStorage?: unknown }).localStorage;
      }
      if (sessionStorageDescriptor) {
        Object.defineProperty(globalThis, "sessionStorage", sessionStorageDescriptor);
      } else {
        delete (globalThis as typeof globalThis & { sessionStorage?: unknown }).sessionStorage;
      }
    },
  };
}

let freshAppSessionTokenModuleImportIndex = 0;

async function importFreshAppSessionTokenModule(): Promise<typeof import("./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts")> {
  freshAppSessionTokenModuleImportIndex += 1;
  return import(`./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts?fresh=${freshAppSessionTokenModuleImportIndex}`);
}

test("portal exposes appbase auth routes as standalone React routes", () => {
  const appSource = readPortalFile("./src/App.tsx");
  const shellSource = readPortalFile("./packages/sdkwork-clawrouter-pc-shell/src/AppShellLayout.tsx");
  const authRouteSource = readPortalFile("./src/auth/ClawRouterAuthRoutes.tsx");
  const authShellSource = readPortalFile("./src/auth/ClawRouterAuthShell.tsx");
  const authAppearanceSource = readPortalFile("./src/auth/clawRouterAuthAppearance.ts");
  const indexCssSource = readPortalFile("./src/index.css");

  assert.match(appSource, /lazyRoute\(\(\) => import\('\.\/auth\/ClawRouterAuthRoutes'\), 'ClawRouterAuthRoutes'\)/);
  assert.match(appSource, /<Route path="\/auth\/\*" element=\{<PortalAuthenticatedAuthRouteGuard><ClawRouterAuthRoutes \/><\/PortalAuthenticatedAuthRouteGuard>\} \/>/);
  assert.match(appSource, /PortalAuthenticatedAuthRouteGuard/);
  assert.match(shellSource, /pathname\.startsWith\('\/auth'\)/);
  assert.match(shellSource, /sdkwork-auth-route-fallback sdkwork-clawrouter-auth-route-fallback fixed inset-0 z-\[60\] h-\[100dvh\] min-h-\[100dvh\]/);
  assert.doesNotMatch(appSource, /ClawRouterAuthOAuthCallbackRoute/);
  assert.doesNotMatch(appSource, /<Route path="\/auth\/login"/);
  assert.doesNotMatch(appSource, /<Route path="\/auth\/register"/);
  assert.doesNotMatch(appSource, /<Route path="\/auth\/forgot-password"/);
  assert.doesNotMatch(appSource, /<Route path="\/auth\/oauth\/callback\/:provider"/);
  assert.match(authRouteSource, /from '@sdkwork\/auth-pc-react'/);
  assert.match(authRouteSource, /SdkworkIamAuthRoutes/);
  assert.match(authRouteSource, /ClawRouterAuthShell/);
  assert.match(authRouteSource, /resolveClawRouterAuthAppearance/);
  assert.match(authRouteSource, /appearance=\{resolveClawRouterAuthAppearance\(\)\}/);
  assert.match(authRouteSource, /viewportMode="flow"/);
  assert.match(authShellSource, /sdkwork-clawrouter-auth-active/);
  assert.match(indexCssSource, /html\.sdkwork-clawrouter-auth-active/);
  assert.match(indexCssSource, /position: fixed;/);
  assert.match(authRouteSource, /className="!bg-transparent"/);
  assert.match(authShellSource, /sdkwork-clawrouter-auth-shell/);
  assert.match(authAppearanceSource, /sdkwork-clawrouter-auth-aside-panel/);
  assert.match(authAppearanceSource, /var\(--sdkwork-clawrouter-auth-content-text\)/);
  assert.match(indexCssSource, /\.sdkwork-clawrouter-auth-shell \{/);
  assert.match(indexCssSource, /@source "\.\.\/\.\.\/\.\.\/\.\.\/sdkwork-iam\/apps\/sdkwork-iam-pc\/packages\/sdkwork-auth-pc-react\/src"/);
  assert.match(authRouteSource, /from 'react-i18next'/);
  assert.match(authRouteSource, /const \{ i18n \} = useTranslation\(\)/);
  assert.doesNotMatch(authRouteSource, /SDKWORK_AUTH_I18N_CATALOG/);
  assert.doesNotMatch(authRouteSource, /SdkworkI18nProvider/);
  assert.doesNotMatch(authRouteSource, /SdkworkAuthPage/);
  assert.doesNotMatch(authRouteSource, /SdkworkAuthOAuthCallbackPage/);
  assert.doesNotMatch(authRouteSource, /clawRouterAuthController/);
  assert.doesNotMatch(authRouteSource, /ClawRouterAuthOAuthCallbackRoute/);
  assert.match(authRouteSource, /basePath="\/auth"/);
  assert.match(authRouteSource, /locale=\{i18n\.language\}/);
  assert.match(authRouteSource, /getRuntime=\{getClawRouterIamRuntime\}/);
  assert.match(authRouteSource, /homePath="\/console"/);
  assert.match(authRouteSource, /AUTH_METHOD_UNAVAILABLE_MESSAGE/);
  assert.match(authRouteSource, /methodUnavailableMessage=\{AUTH_METHOD_UNAVAILABLE_MESSAGE\}/);
});

test("claw router auth controller reuses appbase runtime while preserving app SDK boundary", () => {
  const controllerSource = readPortalFile("./src/auth/clawRouterAuthController.ts");
  const routeSource = readPortalFile("./src/auth/ClawRouterAuthRoutes.tsx");
  const configSource = readPortalFile("./src/auth/clawRouterAuthConfig.ts");
  const settingsServiceSource = readPortalFile("./src/auth/clawRouterAuthSettingsService.ts");
  const adminSettingsServiceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-site/src/AuthSettingsService.ts");
  const iamRuntimeSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/iam-runtime.ts");
  const sdkClientsSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts");

  assert.match(controllerSource, /createSdkworkIamRuntimeAuthController/);
  assert.match(controllerSource, /getClawRouterIamRuntime/);
  assert.match(iamRuntimeSource, /createSdkworkAppbasePcAuthRuntime/);
  assert.match(iamRuntimeSource, /createAppbaseAppClient:\s*\(\)\s*=>\s*wrapCredentialEntryClient\(getSdkworkAppbaseAppSdkClient\(\)/);
  assert.match(iamRuntimeSource, /credentialEntry:\s*\{[\s\S]*skipWrap:\s*true/u);
  assert.match(iamRuntimeSource, /from '@sdkwork\/iam-credential-entry'/);
  assert.match(iamRuntimeSource, /prepareTokens:\s*prepareClawRouterCredentialEntryTokens/);
  assert.match(iamRuntimeSource, /bindClawRouterIamSessionProjection/);
  assert.match(iamRuntimeSource, /patchClawRouterIamContextStore/);
  assert.match(iamRuntimeSource, /readSession:\s*\(\)\s*=>\s*toPortalIamBridgeSession\(loadStoredAppSessionToken\(\)\)/);
  assert.match(iamRuntimeSource, /sdkClients:\s*\[/);
  assert.match(iamRuntimeSource, /getClawRouterAppSdkClient\(\)/);
  assert.match(iamRuntimeSource, /getSdkworkDriveAppSdkClient\(\)/);
  assert.match(iamRuntimeSource, /getSdkworkGenerationsAppSdkClient\(\)/);
  assert.match(sdkClientsSource, /from '@sdkwork\/iam-credential-entry'/);
  assert.match(sdkClientsSource, /prepareCredentialEntryTokens/);
  assert.match(sdkClientsSource, /from '@sdkwork\/drive-app-sdk'/);
  assert.match(sdkClientsSource, /createDriveAppClient/);
  assert.match(sdkClientsSource, /VITE_SDKWORK_DRIVE_APP_API_BASE_URL/);
  assert.match(iamRuntimeSource, /tokenManager,/);
  assert.equal((sdkClientsSource.match(/createTokenManager\(\)/g) ?? []).length, 1);
  assert.match(sdkClientsSource, /function buildAppConfig\(options: ClawRouterAppSdkClientOptions\): SdkworkAppConfig \{\s*return \{[\s\S]*?tokenManager:\s*resolveClawRouterSdkTokenManager\(options\.tokenManager\)/);
  assert.match(sdkClientsSource, /function buildBackendConfig\(options: ClawRouterBackendSdkClientOptions\): SdkworkBackendConfig \{\s*return \{[\s\S]*?tokenManager:\s*resolveClawRouterSdkTokenManager\(options\.tokenManager\)/);
  assert.match(sdkClientsSource, /function buildAppbaseAppConfig\(options: SdkworkAppbaseAppSdkClientOptions\): SdkworkAppbaseAppConfig \{\s*return \{[\s\S]*?tokenManager:\s*resolveClawRouterSdkTokenManager\(options\.tokenManager\)/);
  assert.match(sdkClientsSource, /function buildGenerationsAppConfig\(options: SdkworkGenerationsAppSdkClientOptions\): SdkworkGenerationsAppConfig \{\s*return \{[\s\S]*?tokenManager:\s*resolveClawRouterSdkTokenManager\(options\.tokenManager\)/);
  assert.match(sdkClientsSource, /function buildDriveAppConfig\(options: SdkworkDriveAppSdkClientOptions\): SdkworkDriveAppConfig \{\s*return \{[\s\S]*?tokenManager:\s*resolveClawRouterSdkTokenManager\(options\.tokenManager\)/);
  assert.match(sdkClientsSource, /function buildCommerceAppConfig\(options: SdkworkCommerceAppSdkClientOptions\): SdkworkCommerceAppConfig \{\s*return \{[\s\S]*?tokenManager:\s*resolveClawRouterSdkTokenManager\(options\.tokenManager\)/);
  assert.match(sdkClientsSource, /function buildCommerceBackendConfig\(\s*options: SdkworkCommerceBackendSdkClientOptions,\s*\): SdkworkCommerceBackendConfig \{\s*return \{[\s\S]*?tokenManager:\s*resolveClawRouterSdkTokenManager\(options\.tokenManager\)/);
  assert.doesNotMatch(sdkClientsSource, /authToken:\s*options\.authToken/);
  assert.doesNotMatch(sdkClientsSource, /accessToken:\s*options\.accessToken/);
  assert.doesNotMatch(sdkClientsSource, /getStoredAppSessionAuthToken\(\)/);
  assert.doesNotMatch(sdkClientsSource, /getStoredAppSessionAccessToken\(\)/);
  assert.doesNotMatch(sdkClientsSource, /interface ClawRouterAiSdkClientOptions \{[\s\S]*?(?:authToken|accessToken)\?: string/);
  assert.doesNotMatch(iamRuntimeSource, /getClawRouterAiSdkClient\(\)/);
  assert.doesNotMatch(iamRuntimeSource, /getClawRouterBackendSdkClient\(\)/);
  assert.doesNotMatch(iamRuntimeSource, /getSdkworkAppbaseBackendSdkClient\(\)/);
  assert.doesNotMatch(iamRuntimeSource, /createIamAppSdkAdapter/);
  assert.doesNotMatch(iamRuntimeSource, /createIamBackendSdkAdapter/);
  assert.doesNotMatch(iamRuntimeSource, /from '@sdkwork\/iam-sdk-adapter'/);
  assert.doesNotMatch(iamRuntimeSource, /app:\s*createIamAppSdkAdapter/);
  assert.doesNotMatch(iamRuntimeSource, /app:\s*getClawRouterAppSdkClient\(\)/);
  assert.doesNotMatch(controllerSource, /createSdkworkAuthController/);
  assert.doesNotMatch(controllerSource, /createSdkworkLocalAuthService/);
  assert.doesNotMatch(controllerSource, /\.service\.auth\.sessions\.create/);
  assert.doesNotMatch(controllerSource, /\.service\.auth\.sessions\.current\.retrieve/);
  assert.doesNotMatch(controllerSource, /\.service\.auth\.sessions\.current\.delete/);
  assert.doesNotMatch(controllerSource, /\.service\.auth\.passwordResetRequests\.create/);
  assert.doesNotMatch(controllerSource, /\.service\.auth\.passwordResets\.create/);
  assert.doesNotMatch(controllerSource, /\.service\.auth\.verificationCodes\.create/);
  assert.doesNotMatch(controllerSource, /\.service\.auth\.verificationCodes\.verify/);
  assert.doesNotMatch(controllerSource, /\.service\.iam\.users\.current\.retrieve/);
  assert.doesNotMatch(controllerSource, /export async function login\(input: SdkworkAuthLoginInput\): Promise<SdkworkAuthSession>/);
  assert.doesNotMatch(controllerSource, /signIn: login/);
  assert.doesNotMatch(controllerSource, /loadStoredAppSessionToken/);
  assert.doesNotMatch(controllerSource, /storeAppSessionFromResult/);
  assert.doesNotMatch(controllerSource, /resetClawRouterSdkClients/);
  assert.doesNotMatch(controllerSource, /clearAppSession/);
  assert.doesNotMatch(controllerSource, /function normalizeOptionalAuthScalar\(value: unknown\): string \| undefined/);
  assert.doesNotMatch(controllerSource, /function normalizeRequiredString\(fieldName: string, value: unknown\): string/);
  assert.doesNotMatch(controllerSource, /AUTH_CONTRACT_GAP_ERROR_MESSAGE/);
  assert.doesNotMatch(controllerSource, /throwAuthContractGap/);
  assert.doesNotMatch(controllerSource, /Claw Router app API contract does not expose password login/);
  assert.doesNotMatch(controllerSource, /getClawRouterAppSdkClient\(\)\.auth\.login/);
  assert.doesNotMatch(controllerSource, /auth\.createAppSession/);
  assert.doesNotMatch(controllerSource, /getClawRouterAppSdkClient\(\)\.user\.fetchUserProfile/);
  assert.doesNotMatch(controllerSource, /\bfetch\s*\(/);
  assert.doesNotMatch(controllerSource, /\baxios\b/);
  assert.doesNotMatch(controllerSource, /\/app\/v3\/api/);
  assert.equal(existsSync(new URL("./src/auth/corePcReactCompat.ts", import.meta.url)), false);
  assert.match(routeSource, /SdkworkIamAuthRoutes/);
  assert.match(routeSource, /getClawRouterIamRuntime/);
  assert.doesNotMatch(routeSource, /clawRouterAuthController/);
  assert.match(routeSource, /useClawRouterAuthRuntimeConfig/);
  assert.match(routeSource, /runtimeConfig=\{runtimeConfig\}/);
  assert.doesNotMatch(routeSource, /const clawRouterAuthRuntimeConfig/);
  assert.match(routeSource, /appearance=\{resolveClawRouterAuthAppearance\(\)\}/);
  assert.match(routeSource, /ClawRouterAuthShell/);
  assert.match(configSource, /DEFAULT_CLAW_ROUTER_AUTH_RUNTIME_CONFIG/);
  assert.match(configSource, /leftRailMode:\s*'highlights-only'/);
  assert.match(configSource, /loginMethods:\s*\['password'\]/);
  assert.match(configSource, /oauthLoginEnabled:\s*false/);
  assert.match(configSource, /oauthProviders:\s*\[\]/);
  assert.doesNotMatch(configSource, /oauthProviders:\s*\[[^\]]*'tiktok'/);
  assert.doesNotMatch(configSource, /oauthProviders:\s*\[[^\]]*'google'/);
  assert.doesNotMatch(configSource, /oauthProviders:\s*\[[^\]]*'github'/);
  assert.match(configSource, /qrLoginEnabled:\s*true/);
  assert.match(configSource, /registerMethods:\s*\['email', 'phone'\]/);
  assert.match(configSource, /recoveryMethods:\s*\['email', 'phone'\]/);
  assert.match(configSource, /fetchClawRouterAuthRuntimeSettings/);
  assert.doesNotMatch(configSource, /fetchClawRouterAuthSettings/);
  assert.match(settingsServiceSource, /getSdkworkAppbaseAppSdkClient/);
  assert.doesNotMatch(settingsServiceSource, /getClawRouterAppSdkClient/);
  assert.doesNotMatch(settingsServiceSource, /getClawRouterBackendSdkClient/);
  assert.match(settingsServiceSource, /\.system\.iam\.runtime\.retrieve\(\)/);
  assert.match(settingsServiceSource, /\.system\.iam\.verificationPolicy\.retrieve\(\)/);
  assert.doesNotMatch(settingsServiceSource, /\.auth\.runtimeSettings/);
  assert.doesNotMatch(settingsServiceSource, /\.auth\.verificationPolicy/);
  assert.match(adminSettingsServiceSource, /getClawRouterBackendSdkClient/);
  assert.match(adminSettingsServiceSource, /\.system\.auth\.settings\.retrieve\(\)/);
  assert.match(adminSettingsServiceSource, /\.system\.auth\.settings\.update\(input/);
  assert.match(configSource, /emailRegistrationVerificationRequired:\s*false/);
  assert.match(configSource, /phoneRegistrationVerificationRequired:\s*false/);
  assert.doesNotMatch(configSource, /\bfetch\s*\(/);
  assert.doesNotMatch(configSource, /\baxios\b/);
  assert.doesNotMatch(configSource, /\/backend\/v3\/api\/system\/auth\/settings/);
  assert.doesNotMatch(settingsServiceSource, /\bfetch\s*\(/);
  assert.doesNotMatch(settingsServiceSource, /\baxios\b/);
  assert.doesNotMatch(settingsServiceSource, /\/backend\/v3\/api\/system\/auth\/settings/);
  assert.doesNotMatch(adminSettingsServiceSource, /\bfetch\s*\(/);
  assert.doesNotMatch(adminSettingsServiceSource, /\baxios\b/);
  assert.doesNotMatch(adminSettingsServiceSource, /\/backend\/v3\/api\/system\/auth\/settings/);
  assert.match(routeSource, /AUTH_METHOD_UNAVAILABLE_MESSAGE/);
  assert.match(routeSource, /methodUnavailableMessage=\{AUTH_METHOD_UNAVAILABLE_MESSAGE\}/);
  assert.doesNotMatch(routeSource, /surfaceAppearance/);
  assert.doesNotMatch(configSource, /leftRailMode:\s*'qr-only'/);
});

test("auth runtime config applies backend IAM settings without tenant or organization being required", () => {
  const config = mergeClawRouterAuthRuntimeConfig(authRuntimeSettingsFixture());

  assert.equal(config.leftRailMode, "auto");
  assert.deepEqual(config.loginMethods, ["password", "emailCode"]);
  assert.equal(config.oauthLoginEnabled, true);
  assert.deepEqual(config.oauthProviders, ["github"]);
  assert.equal(config.oauthProviderRegion, "overseas");
  assert.equal(config.qrLoginEnabled, true);
  assert.equal(config.qrLoginType, "wechat_official_account");
  assert.deepEqual(config.recoveryMethods, ["email"]);
  assert.deepEqual(config.registerMethods, ["email", "phone"]);
  assert.deepEqual(config.verificationPolicy, {
    emailCodeLoginEnabled: true,
    emailRegistrationVerificationRequired: false,
    phoneCodeLoginEnabled: false,
    phoneRegistrationVerificationRequired: true,
  });
  assert.equal(DEFAULT_CLAW_ROUTER_AUTH_RUNTIME_CONFIG.qrLoginEnabled, true);
  assert.equal(DEFAULT_CLAW_ROUTER_AUTH_RUNTIME_CONFIG.verificationPolicy?.emailRegistrationVerificationRequired, false);
});

test("auth runtime config fails closed when backend omits required IAM runtime fields", () => {
  for (const [field, message] of [
    ["leftRailMode", /Auth leftRailMode is required/],
    ["loginMethods", /Auth loginMethods are required/],
    ["oauthLoginEnabled", /Auth oauthLoginEnabled flag is required/],
    ["oauthProviders", /Auth oauthProviders are required/],
    ["qrLoginEnabled", /Auth qrLoginEnabled flag is required/],
    ["qrLoginType", /Auth qrLoginType is required/],
    ["recoveryMethods", /Auth recoveryMethods are required/],
    ["registerMethods", /Auth registerMethods are required/],
    ["verificationPolicy", /Auth verificationPolicy is required/],
  ] as const) {
    const settings = authRuntimeSettingsFixture();
    delete settings[field];
    assert.throws(
      () => mergeClawRouterAuthRuntimeConfig(settings),
      message,
    );
  }
});

test("auth runtime config fails closed when backend returns unsupported IAM runtime options", () => {
  for (const [patch, message] of [
    [{ leftRailMode: "banner-only" }, /Unsupported auth leftRailMode: banner-only/],
    [{ loginMethods: ["password", "magicLink"] }, /Unsupported auth loginMethods: magicLink/],
    [{ oauthRegion: "antarctica" }, /Unsupported auth oauthRegion: antarctica/],
    [{ qrLoginType: "wechat-work" }, /Unsupported auth qrLoginType: wechat-work/],
    [{ recoveryMethods: ["email", "totp"] }, /Unsupported auth recoveryMethods: totp/],
    [{ registerMethods: ["email", "username"] }, /Unsupported auth registerMethods: username/],
    [{ loginMethods: [] }, /Auth loginMethods are required/],
  ] as const) {
    assert.throws(
      () => mergeClawRouterAuthRuntimeConfig(authRuntimeSettingsFixture(patch)),
      message,
    );
  }
});

test("auth runtime config maps compact backend QR login types to appbase QR login types", () => {
  assert.equal(
    mergeClawRouterAuthRuntimeConfig(authRuntimeSettingsFixture({ qrLoginType: "web" })).qrLoginType,
    "sdkwork_app",
  );
  assert.equal(
    mergeClawRouterAuthRuntimeConfig(authRuntimeSettingsFixture({ qrLoginType: "official" })).qrLoginType,
    "wechat_official_account",
  );
  assert.equal(
    mergeClawRouterAuthRuntimeConfig(authRuntimeSettingsFixture({ qrLoginType: "mini" })).qrLoginType,
    "wechat_mini_program",
  );
  assert.equal(DEFAULT_CLAW_ROUTER_AUTH_RUNTIME_CONFIG.qrLoginType, "sdkwork_app");
});

test("auth runtime config fails closed when backend omits verification policy flags", () => {
  for (const [field, message] of [
    ["emailCodeLoginEnabled", /Auth emailCodeLoginEnabled flag is required/],
    ["emailRegistrationVerificationRequired", /Auth emailRegistrationVerificationRequired flag is required/],
    ["phoneCodeLoginEnabled", /Auth phoneCodeLoginEnabled flag is required/],
    ["phoneRegistrationVerificationRequired", /Auth phoneRegistrationVerificationRequired flag is required/],
  ] as const) {
    const verificationPolicy = {
      emailCodeLoginEnabled: true,
      emailRegistrationVerificationRequired: false,
      phoneCodeLoginEnabled: false,
      phoneRegistrationVerificationRequired: true,
    } as Record<string, unknown>;
    delete verificationPolicy[field];

    assert.throws(
      () => mergeClawRouterAuthRuntimeConfig(authRuntimeSettingsFixture({ verificationPolicy })),
      message,
    );
  }
});

test("claw router app auth composes the appbase IAM OAuth dependency SDK without regenerating dependency transport", () => {
  const contractSource = readPortalFile("../../docs/schema-registry/frontend-field-contracts.yaml");
  const appOpenApiSource = readPortalFile("../../generated/openapi/clawrouter-app-openapi.json");
  const backendOpenApiSource = readPortalFile("../../generated/openapi/clawrouter-backend-openapi.json");
  const appSdkInputSource = readPortalFile("../../sdks/clawrouter-app-sdk/openapi/clawrouter-app-sdk.sdkgen.json");
  const appbaseAppOpenApiSource = readPortalFile("../../../sdkwork-iam/sdks/sdkwork-iam-app-sdk/openapi/sdkwork-iam-app-api.openapi.yaml");
  const appSdkAssemblySource = readPortalFile("../../sdks/clawrouter-app-sdk/.sdkwork-assembly.json");
  const appSdkComponentSource = readPortalFile("../../sdks/clawrouter-app-sdk/specs/component.spec.json");
  const appSdkSource = readPortalFile("../../sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi/src/sdk.ts");
  const backendSdkSystemSource = readPortalFile("../../sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi/src/api/system.ts");
  const backendSdkIndexSource = readPortalFile("../../sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi/src/sdk.ts");
  const backendSdkAuthSettingsUpdateSource = readPortalFile("../../sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi/src/types/admin-auth-settings-update-request.ts");
  const appSdkTypesSource = readPortalFile("../../sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi/src/types/index.ts");
  const backendSdkTypesSource = readPortalFile("../../sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi/src/types/index.ts");
  const appbaseAuthServiceSource = readPortalFile("../../../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react/src/auth-service.ts");
  const appbaseIamRuntimeSource = readPortalFile("../../../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react/src/auth-iam-runtime.ts");
  const appbaseIamSdkPortsSource = readPortalFile("../../../sdkwork-iam/apps/sdkwork-iam-common/packages/sdkwork-iam-sdk-ports/src/index.ts");
  const retiredProviderPlatformSnake = "open" + "_platform";
  const retiredProviderPlatformCamel = "open" + "Platform";
  const retiredQrNamespace = "qr" + "Auth";

  for (const operationId of [
    "oauth.authorizationUrls.create",
    "oauth.sessions.create",
    "sessions.create",
    "sessions.current.retrieve",
    "sessions.current.update",
    "sessions.current.delete",
    "sessions.refresh",
    "passwordResetRequests.create",
    "passwordResets.create",
    "registrations.create",
    "iam.runtime.retrieve",
    "iam.verificationPolicy.retrieve",
    "users.current.retrieve",
  ]) {
    assert.match(contractSource, new RegExp(`operation_id:\\s*${operationId.replaceAll(".", "\\.")}`));
  }
  assert.match(contractSource, /api_path:\s*\/app\/v3\/api\/oauth\/authorization_urls/);
  assert.match(contractSource, /api_path:\s*\/app\/v3\/api\/oauth\/sessions/);
  assert.doesNotMatch(contractSource, new RegExp(`/app/v3/api/${retiredProviderPlatformSnake}`));
  assert.doesNotMatch(contractSource, /api_path:\s*\/app\/v3\/api\/auth\/oauth_authorization_urls/);
  assert.doesNotMatch(contractSource, /api_path:\s*\/app\/v3\/api\/auth\/oauth_sessions/);
  assert.doesNotMatch(contractSource, /api_path:\s*\/app\/v3\/api\/auth\/qr_login_codes/);
  assert.match(contractSource, /api_path:\s*\/app\/v3\/api\/auth\/sessions/);
  assert.match(contractSource, /api_path:\s*\/app\/v3\/api\/auth\/registrations/);
  assert.match(contractSource, /operation_id:\s*auth\.settings\.retrieve/);
  assert.match(contractSource, /operation_id:\s*auth\.settings\.update/);
  assert.match(contractSource, /api_path:\s*\/backend\/v3\/api\/system\/auth\/settings/);
  assert.match(contractSource, /operation_id:\s*iam\.runtime\.retrieve/);
  assert.match(contractSource, /api_path:\s*\/app\/v3\/api\/system\/iam\/runtime/);
  assert.match(contractSource, /operation_id:\s*iam\.verificationPolicy\.retrieve/);
  assert.match(contractSource, /api_path:\s*\/app\/v3\/api\/system\/iam\/verification_policy/);
  assert.doesNotMatch(contractSource, /api_path:\s*\/app\/v3\/api\/auth\/runtime_settings/);
  assert.doesNotMatch(contractSource, /api_path:\s*\/app\/v3\/api\/auth\/verification_policy/);
  assert.match(contractSource, /emailRegistrationVerificationRequired:\s*(?:\r?\n\s*)?\{?\s*type:\s*boolean/);
  assert.match(contractSource, /phoneRegistrationVerificationRequired:\s*(?:\r?\n\s*)?\{?\s*type:\s*boolean/);
  assert.match(contractSource, /qrLoginType/);
  assert.match(contractSource, /wechat/);
  assert.match(contractSource, /admin_auth_wechat_official/);
  assert.match(contractSource, /admin_auth_wechat_mini/);
  assert.match(contractSource, /api_path:\s*\/app\/v3\/api\/auth\/password_reset_requests/);
  assert.match(contractSource, /api_path:\s*\/app\/v3\/api\/iam\/users\/current/);
  assert.doesNotMatch(contractSource, /api_path:\s*\/app\/v3\/api\/auth\/login/);
  assert.doesNotMatch(contractSource, /api_path:\s*\/app\/v3\/api\/auth\/session\b/);

  const appOpenApi = JSON.parse(appOpenApiSource) as {
    paths?: Record<string, Record<string, { operationId?: string }>>;
    components?: { schemas?: Record<string, { properties?: Record<string, { enum?: string[]; minItems?: number }>; required?: string[] }>; securitySchemes?: Record<string, unknown> };
  };
  const appbaseAppOpenApi = JSON.parse(appbaseAppOpenApiSource) as {
    paths?: Record<string, Record<string, { operationId?: string }>>;
    components?: { schemas?: Record<string, { properties?: Record<string, { enum?: string[]; minItems?: number }>; required?: string[] }>; securitySchemes?: Record<string, unknown> };
  };
  const backendOpenApi = JSON.parse(backendOpenApiSource) as {
    paths?: Record<string, Record<string, { operationId?: string }>>;
    components?: { schemas?: Record<string, { properties?: Record<string, unknown>; required?: string[] }> };
  };
  const appSdkInput = JSON.parse(appSdkInputSource) as {
    paths?: Record<string, Record<string, { operationId?: string }>>;
  };
  const appSdkAssembly = JSON.parse(appSdkAssemblySource) as {
    sdkDependencies?: Array<{
      workspace?: string;
      generatedTransportImportPolicy?: string;
      packageByLanguage?: Record<string, string>;
    }>;
  };
  const appSdkComponent = JSON.parse(appSdkComponentSource) as {
    contracts?: {
      sdkDependencies?: Array<{
        workspace?: string;
        generatedTransportImportPolicy?: string;
        packageByLanguage?: Record<string, string>;
      }>;
    };
  };
  const appbaseOwnedAppRoutes = [
    ["/app/v3/api/oauth/authorization_urls", "post", "oauth.authorizationUrls.create"],
    ["/app/v3/api/oauth/sessions", "post", "oauth.sessions.create"],
    ["/app/v3/api/oauth/device_authorizations", "post", "oauth.deviceAuthorizations.create"],
    ["/app/v3/api/oauth/device_authorizations/{deviceAuthorizationId}", "get", "oauth.deviceAuthorizations.retrieve"],
    ["/app/v3/api/oauth/device_authorizations/{deviceAuthorizationId}/scans", "post", "oauth.deviceAuthorizations.scans.create"],
    ["/app/v3/api/oauth/device_authorizations/{deviceAuthorizationId}/password_completions", "post", "oauth.deviceAuthorizations.passwordCompletions.create"],
    ["/app/v3/api/auth/password_reset_requests", "post", "passwordResetRequests.create"],
    ["/app/v3/api/auth/password_resets", "post", "passwordResets.create"],
    ["/app/v3/api/auth/registrations", "post", "registrations.create"],
    ["/app/v3/api/auth/sessions", "post", "sessions.create"],
    ["/app/v3/api/auth/sessions/current", "delete", "sessions.current.delete"],
    ["/app/v3/api/auth/sessions/current", "get", "sessions.current.retrieve"],
    ["/app/v3/api/auth/sessions/current", "patch", "sessions.current.update"],
    ["/app/v3/api/auth/sessions/refresh", "post", "sessions.refresh"],
    ["/app/v3/api/iam/users/current", "get", "users.current.retrieve"],
    ["/app/v3/api/system/iam/runtime", "get", "iam.runtime.retrieve"],
    ["/app/v3/api/system/iam/verification_policy", "get", "iam.verificationPolicy.retrieve"],
  ] as const;

  for (const [path, method, operationId] of appbaseOwnedAppRoutes) {
    assert.equal(appbaseAppOpenApi.paths?.[path]?.[method]?.operationId, operationId);
    assert.equal(appSdkInput.paths?.[path], undefined, `clawrouter app SDK input must not regenerate ${method.toUpperCase()} ${path}`);
  }
  assert.doesNotMatch(appOpenApiSource, new RegExp(`/app/v3/api/${retiredProviderPlatformSnake}`));
  assert.doesNotMatch(appSdkInputSource, new RegExp(`/app/v3/api/${retiredProviderPlatformSnake}`));
  assert.doesNotMatch(appSdkInputSource, /\/app\/v3\/api\/oauth\/authorization_urls/);
  assert.doesNotMatch(appSdkInputSource, /\/app\/v3\/api\/oauth\/sessions/);

  for (const dependency of [appSdkAssembly.sdkDependencies?.[0], appSdkComponent.contracts?.sdkDependencies?.[0]]) {
    assert.equal(dependency?.workspace, "sdkwork-iam-app-sdk");
    assert.equal(dependency?.generatedTransportImportPolicy, "forbidden");
    assert.equal(dependency?.packageByLanguage?.typescript, "@sdkwork/iam-app-sdk");
  }

  assert.equal(existsSync(new URL("../../sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi/src/api/auth.ts", import.meta.url)), false);
  assert.doesNotMatch(appSdkSource, /public readonly auth: AuthApi/);
  assert.doesNotMatch(appSdkSource, new RegExp(`public readonly ${retiredProviderPlatformCamel}:`));
  assert.doesNotMatch(appSdkSource, /@sdkwork\/appbase-app-sdk/);
  assert.doesNotMatch(appSdkTypesSource, /auth-runtime-settings-response/);
  assert.doesNotMatch(appSdkTypesSource, /iam-session-create-request/);
  assert.doesNotMatch(appSdkTypesSource, /iam-registration-create-request/);
  assert.doesNotMatch(appSdkTypesSource, /iam-verification-code/);
  assert.doesNotMatch(appSdkTypesSource, new RegExp(`${retiredProviderPlatformSnake.replace("_", "-")}`));

  for (const portContractFragment of [
    "oauth?:",
    "authorizationUrls?:",
    "sessions?:",
    "passwordResetRequests?:",
    "passwordResets?:",
    "registrations?:",
    "users?:",
    "current?:",
  ]) {
    assert.match(appbaseIamSdkPortsSource, new RegExp(portContractFragment.replaceAll("?", "\\?")));
  }
  assert.match(appbaseAuthServiceSource, /client\.oauth\?\.authorizationUrls\?\.create/);
  assert.match(appbaseAuthServiceSource, /client\.oauth\?\.sessions\?\.create/);
  assert.match(appbaseIamRuntimeSource, /runtime\.service\.oauth\?\.authorizationUrls\?\.create/);
  assert.match(appbaseIamRuntimeSource, /runtime\.service\.oauth\?\.sessions\?\.create/);
  assert.doesNotMatch(appbaseAuthServiceSource, /loginQrCodes\?\.callback/);
  assert.doesNotMatch(appbaseIamRuntimeSource, /runtime\.service\.auth\.loginQrCodeCallbacks/);
  for (const [path, method] of appbaseOwnedAppRoutes) {
    assert.equal(appbaseAppOpenApi.paths?.[path]?.[method]?.["x-sdkwork-owner"], "sdkwork-iam");
  }
  assert.doesNotMatch(appOpenApiSource, /\/app\/v3\/api\/auth\//);
  assert.doesNotMatch(appOpenApiSource, /\/app\/v3\/api\/oauth\//);
  assert.doesNotMatch(appSdkTypesSource, /auth-runtime-settings-response/);
  assert.doesNotMatch(appSdkTypesSource, /auth-verification-policy/);
  assert.doesNotMatch(appSdkTypesSource, /iam-registration-create-request/);
  assert.doesNotMatch(appSdkTypesSource, /iam-session-create-request/);
  assert.doesNotMatch(appbaseAppOpenApiSource, /\/app\/v3\/api\/auth\/login/);
  assert.doesNotMatch(appbaseAppOpenApiSource, /\/app\/v3\/api\/auth\/session"/);
  assert.doesNotMatch(appbaseAppOpenApiSource, new RegExp(`"${retiredQrNamespace}\\.sessions\\.`));
  assert.doesNotMatch(backendOpenApiSource, /\/backend\/v3\/api\/auth\//);
  assert.ok(!Object.keys(backendOpenApi.paths ?? {}).some((path) => path.startsWith("/backend/v3/api/auth/")));
  assert.equal(backendOpenApi.paths?.["/backend/v3/api/system/auth/settings"]?.get?.operationId, "auth.settings.retrieve");
  assert.equal(backendOpenApi.paths?.["/backend/v3/api/system/auth/settings"]?.patch?.operationId, "auth.settings.update");
  assert.ok(backendOpenApi.components?.schemas?.AdminAuthSettingsResponse?.properties?.verificationPolicy);
  assert.ok(backendOpenApi.components?.schemas?.AdminAuthSettingsResponse?.properties?.wechat);
  assert.ok(backendOpenApi.components?.schemas?.AdminAuthSettingsResponse?.required?.includes("qrLoginType"));
  assert.ok(backendOpenApi.components?.schemas?.AdminAuthSettingsResponse?.required?.includes("wechat"));
  assert.ok(backendOpenApi.components?.schemas?.AdminAuthWechatSettings);
  assert.ok(backendOpenApi.components?.schemas?.AdminAuthWechatOfficial);
  assert.ok(backendOpenApi.components?.schemas?.AdminAuthWechatMini);
  assert.equal(backendOpenApi.components?.schemas?.AdminAuthSettingsUpdateRequest?.properties?.loginMethods?.minItems, 1);
  assert.equal(backendOpenApi.components?.schemas?.AdminAuthSettingsUpdateRequest?.properties?.registerMethods?.minItems, 1);
  assert.equal(backendOpenApi.components?.schemas?.AdminAuthSettingsUpdateRequest?.properties?.recoveryMethods?.minItems, 1);
  assert.doesNotMatch(backendSdkIndexSource, /public readonly auth:/);
  assert.match(backendSdkSystemSource, /public readonly auth: SystemAuthApi/);
  assert.match(backendSdkSystemSource, /public readonly settings: SystemAuthSettingsApi/);
  assert.match(backendSdkSystemSource, /async retrieve\(\): Promise<AuthSettingsRetrieveResult>/);
  assert.match(backendSdkSystemSource, /async update\(body: AdminAuthSettingsUpdateRequest/);
  assert.match(backendSdkAuthSettingsUpdateSource, /qrLoginType\?: 'web' \| 'official' \| 'mini'/);
  assert.match(backendSdkAuthSettingsUpdateSource, /wechat\?: AdminAuthWechatSettingsUpdate/);
  assert.doesNotMatch(appSdkTypesSource, /admin-auth-settings-response/);
  assert.doesNotMatch(appSdkTypesSource, /admin-auth-verification-policy/);
  assert.match(backendSdkTypesSource, /from '\.\/admin-auth-settings-response'/);
  assert.match(backendSdkTypesSource, /from '\.\/admin-auth-settings-update-request'/);
  assert.match(backendSdkTypesSource, /from '\.\/admin-auth-wechat-settings'/);
  assert.match(backendSdkTypesSource, /from '\.\/admin-auth-wechat-official'/);
  assert.match(backendSdkTypesSource, /from '\.\/admin-auth-wechat-mini'/);
});

test("appbase OAuth runtime uses canonical OAuth app resources", () => {
  const authServiceSource = readPortalFile("../../../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react/src/auth-service.ts");
  const iamRuntimeSource = readPortalFile("../../../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react/src/auth-iam-runtime.ts");

  assert.match(authServiceSource, /client\.oauth\?\.authorizationUrls\?\.create/);
  assert.match(authServiceSource, /client\.oauth\?\.sessions\?\.create/);
  assert.match(iamRuntimeSource, /runtime\.service\.oauth\?\.authorizationUrls\?\.create/);
  assert.match(iamRuntimeSource, /runtime\.service\.oauth\?\.sessions\?\.create/);
  assert.doesNotMatch(authServiceSource, /client\.auth\.oauthAuthorizationUrls/);
  assert.doesNotMatch(authServiceSource, /client\.auth\.oauthSessions/);
  assert.doesNotMatch(authServiceSource, /client\.auth\.loginQrCodeCallbacks/);
  assert.doesNotMatch(authServiceSource, /loginQrCodes\?\.callback/);
  assert.doesNotMatch(iamRuntimeSource, /runtime\.service\.auth\.loginQrCodeCallbacks/);
  assert.doesNotMatch(iamRuntimeSource, /runtime\.service\.auth\.loginQrCodes\.callback/);
  assert.doesNotMatch(iamRuntimeSource, /callback\?: \(qrKey: string, payload\?: Record<string, unknown>\)/);
});

test("portal exposes backend-backed admin auth settings configuration", () => {
  const appSource = readPortalFile("./src/App.tsx");
  const adminRegistrySource = readAdminRegistrySource();
  const settingsPageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-site/src/ClawRouterAuthSettingsPage.tsx");
  const settingsServiceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-site/src/AuthSettingsService.ts");
  const routeClassificationSource = readPortalFile("../../docs/schema-registry/frontend-route-classification.yaml");

  assert.match(appSource, /lazyRoute\(\(\) => import\('@sdkwork\/clawrouter-pc-admin-site'\), 'ClawRouterAuthSettingsPage'\)/);
  assert.match(appSource, /<Route path="settings" element=\{<ClawRouterAuthSettingsPage \/>} \/>/);
  assert.match(adminRegistrySource, /path:\s*'\/admin\/settings'/);
  assert.match(adminRegistrySource, /ShieldCheck/);
  assert.match(settingsPageSource, /fetchClawRouterAuthSettings/);
  assert.match(settingsPageSource, /updateClawRouterAuthSettings/);
  assert.match(settingsPageSource, /emailRegistrationVerificationRequired/);
  assert.match(settingsPageSource, /phoneRegistrationVerificationRequired/);
  assert.match(settingsPageSource, /qrLoginEnabled/);
  assert.match(settingsPageSource, /qrLoginType/);
  assert.match(settingsPageSource, /WechatChannelEditor/);
  assert.match(settingsPageSource, /admin\.authSettings\.fields\.oauthProviderCodes/);
  assert.match(settingsPageSource, /parseOAuthProviderText/);
  assert.match(settingsServiceSource, /getClawRouterBackendSdkClient\(\)\.system\.auth\.settings\.retrieve\(\)/);
  assert.match(settingsServiceSource, /getClawRouterBackendSdkClient\(\)\.system\.auth\.settings\.update\(input/);
  assert.doesNotMatch(settingsServiceSource, /\bfetch\s*\(/);
  assert.doesNotMatch(settingsServiceSource, /\baxios\b/);
  assert.doesNotMatch(settingsServiceSource, /\/backend\/v3\/api\/system\/auth\/settings/);
  assert.match(routeClassificationSource, /route:\s*\/admin\/settings/);
  assert.match(routeClassificationSource, /api_surface:\s*backend/);
  assert.match(routeClassificationSource, /apps\/sdkwork-clawrouter-pc\/packages\/sdkwork-clawrouter-pc-admin-site\/src\/ClawRouterAuthSettingsPage\.tsx/);
});

test("admin auth settings page localizes visible copy and uses the available content width", () => {
  const settingsPageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-site/src/ClawRouterAuthSettingsPage.tsx");
  const i18nSource = readI18nResourceSource();

  for (const key of [
    "admin.authSettings.title",
    "admin.authSettings.sections.runtime",
    "admin.authSettings.sections.oauthQr",
    "admin.authSettings.sections.verificationPolicy",
    "admin.authSettings.fields.loginMethods",
    "admin.authSettings.fields.registrationMethods",
    "admin.authSettings.fields.recoveryMethods",
    "admin.authSettings.fields.qrLoginType",
    "admin.authSettings.fields.wechatOfficial",
    "admin.authSettings.fields.wechatMini",
    "admin.authSettings.fields.wechatKey",
    "admin.authSettings.fields.wechatName",
    "admin.authSettings.fields.wechatAppId",
    "admin.authSettings.fields.wechatSecretRef",
    "admin.authSettings.fields.wechatTokenRef",
    "admin.authSettings.fields.wechatAesKeyRef",
    "admin.authSettings.fields.wechatUrl",
    "admin.authSettings.fields.wechatOriginalId",
    "admin.authSettings.fields.wechatScene",
    "admin.authSettings.fields.wechatPath",
    "admin.authSettings.fields.wechatEnv",
    "admin.authSettings.fields.oauthProviderCodes",
    "admin.authSettings.placeholders.oauthProviderCodes",
    "admin.authSettings.messages.saved",
    "admin.authSettings.errors.loadFallback",
    "admin.authSettings.errors.saveFallback",
  ]) {
    assert.match(settingsPageSource, new RegExp(key.replaceAll(".", "\\.")), `${key} must be consumed by the settings page`);
    assert.match(i18nSource, new RegExp(`"${key.replaceAll(".", "\\.")}"`), `${key} must be present in i18n resources`);
  }

  assert.doesNotMatch(settingsPageSource, /admin\.authSettings\.description/);

  for (const hardcodedText of [
    "Auth settings",
    "Runtime options",
    "OAuth and QR",
    "Verification policy",
    "Login methods",
    "Registration methods",
    "Recovery methods",
    "Official account",
    "Mini program",
    "Mini path",
    "OAuth provider codes",
    "Auth settings saved.",
    "Failed to load auth settings.",
    "Failed to save auth settings.",
  ]) {
    assert.doesNotMatch(settingsPageSource, new RegExp(`['"\`]${hardcodedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"\`]`));
  }

  assert.doesNotMatch(settingsPageSource, /max-w-6xl/);
  for (const expected of [
    "h-[calc(100vh-112px)]",
    "max-h-[calc(100vh-112px)]",
    "md:h-[calc(100vh-128px)]",
    "md:max-h-[calc(100vh-128px)]",
    "data-admin-auth-settings-body",
    "data-admin-auth-settings-main",
    "data-admin-auth-settings-right",
    "xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]",
    "xl:overflow-hidden",
    "xl:overflow-y-auto",
    "custom-scrollbar",
  ]) {
    assert.ok(settingsPageSource.includes(expected), `missing adaptive admin auth settings marker: ${expected}`);
  }
});

test("admin auth settings form preserves compact WeChat QR settings and validates mini program URLs", () => {
  const form = toAuthSettingsForm(authRuntimeSettingsFixture({
    qrLoginType: "mini",
    wechat: {
      official: [{
        key: " oa-main ",
        name: " Service OA ",
        appId: "wx-official",
        originalId: "gh_123",
        secretRef: "secret://wechat/oa/secret",
        tokenRef: "vault://wechat/oa/token",
        aesKeyRef: "secret://wechat/oa/aes",
        url: "https://wechat.example.com/oa/login",
        enabled: true,
        primary: true,
        scene: "login",
      }],
      mini: [{
        key: " mini-main ",
        name: " Service Mini ",
        appId: "wx-mini",
        secretRef: "secret://wechat/mini/secret",
        url: "https://wxaurl.cn/login",
        enabled: true,
        primary: true,
        path: "pages/login/index",
        env: "trial",
      }],
    },
  }));

  assert.equal(form.qrLoginType, "mini");
  assert.equal(form.wechat.official[0]?.key, "oa-main");
  assert.equal(form.wechat.mini[0]?.path, "pages/login/index");
  assert.equal(form.wechat.mini[0]?.env, "trial");

  const request = toAuthSettingsRequest(form);
  assert.equal(request.qrLoginType, "mini");
  assert.deepEqual(request.wechat?.official?.map((item) => item.key), ["oa-main"]);
  assert.deepEqual(request.wechat?.mini?.map((item) => item.key), ["mini-main"]);
  assert.equal(request.wechat?.official?.[0]?.secretRef, "secret://wechat/oa/secret");
  assert.equal(request.wechat?.mini?.[0]?.url, "https://wxaurl.cn/login");

  assert.throws(
    () => toAuthSettingsRequest({
      ...form,
      wechat: {
        ...form.wechat,
        mini: [{ ...form.wechat.mini[0]!, path: "/pages/login/index" }],
      },
    }),
    /mini program path must not start with slash or contain query or fragment/,
  );
  assert.throws(
    () => toAuthSettingsRequest({
      ...form,
      wechat: {
        ...form.wechat,
        official: [{ ...form.wechat.official[0]!, secretRef: "plain-secret" }],
      },
    }),
    /wechat secret refs must start with secret:\/\/ or vault:\/\//,
  );
  assert.throws(
    () => toAuthSettingsRequest({
      ...form,
      qrLoginEnabled: true,
      qrLoginType: "mini",
      wechat: {
        ...form.wechat,
        mini: [{ ...form.wechat.mini[0]!, url: undefined }],
      },
    }),
    /wechat.mini.url is required when mini QR login is enabled/,
  );
});

test("admin auth settings form preserves flexible OAuth providers and validates provider codes", () => {
  const form = toAuthSettingsForm(authRuntimeSettingsFixture({
    oauthProviders: [" github ", "custom-provider", "github", "enterprise_iam"],
  }));

  assert.deepEqual(form.oauthProviders, ["github", "custom-provider", "enterprise_iam"]);
  assert.equal(formatOAuthProviders(form.oauthProviders), "github, custom-provider, enterprise_iam");
  assert.deepEqual(parseOAuthProviderText("github, custom-provider enterprise_iam\ngithub"), [
    "github",
    "custom-provider",
    "enterprise_iam",
  ]);

  assert.deepEqual(
    toAuthSettingsRequest({
      ...form,
      oauthProviders: ["github", " custom-provider ", "github", " "],
    }).oauthProviders,
    ["github", "custom-provider"],
  );
  assert.throws(
    () => toAuthSettingsRequest({ ...form, oauthProviders: ["github", "bad.provider"] }),
    /oauthProviders items must be 64 characters or fewer and use letters, digits, underscore, or hyphen/,
  );
  assert.throws(
    () => toAuthSettingsRequest({ ...form, oauthRegion: "antarctica" as never }),
    /oauthRegion must be one of mainland, overseas/,
  );
});

test("generated appbase app SDK surface satisfies the IAM SDK port contract", () => {
  const productSdkSource = readPortalFile("../../sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi/src/sdk.ts");
  const sdkSource = readPortalFile("../../../sdkwork-iam/sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/src/sdk.ts");
  const appSdkAuthSource = readPortalFile("../../../sdkwork-iam/sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/src/api/auth.ts");
  const appSdkIamSource = readPortalFile("../../../sdkwork-iam/sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/src/api/iam.ts");
  const appSdkOauthSource = readPortalFile("../../../sdkwork-iam/sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/src/api/oauth.ts");
  const appSdkSystemSource = readPortalFile("../../../sdkwork-iam/sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/src/api/system.ts");
  const iamSdkPortsSource = readPortalFile("../../../sdkwork-iam/apps/sdkwork-iam-common/packages/sdkwork-iam-sdk-ports/src/index.ts");
  const authServiceSource = readPortalFile("../../../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react/src/auth-service.ts");
  const iamRuntimeSource = readPortalFile("../../../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react/src/auth-iam-runtime.ts");
  const retiredProviderPlatformCamel = "open" + "Platform";

  for (const portContractFragment of [
    "oauth?:",
    "authorizationUrls?:",
    "sessions?:",
    "passwordResetRequests?:",
    "passwordResets?:",
    "registrations?:",
    "users?:",
    "current?:",
  ]) {
    assert.match(iamSdkPortsSource, new RegExp(portContractFragment.replaceAll("?", "\\?")));
  }
  assert.match(authServiceSource, /messaging\?: \{/);
  assert.match(authServiceSource, /verificationCodes\?: \{/);
  assert.match(authServiceSource, /client\.messaging\?\.verificationCodes\?\.create/);
  assert.match(authServiceSource, /client\.messaging\?\.verificationCodes\?\.verify/);
  assert.match(authServiceSource, /client\.oauth\?\.authorizationUrls\?\.create/);
  assert.match(authServiceSource, /client\.oauth\?\.sessions\?\.create/);
  assert.match(iamRuntimeSource, /runtime\.service\.oauth\?\.authorizationUrls\?\.create/);
  assert.match(iamRuntimeSource, /runtime\.service\.oauth\?\.sessions\?\.create/);

  for (const sdkSurfaceFragment of [
    "public readonly auth: AuthApi",
    "public readonly system: SystemApi",
    "public readonly iam: IamApi",
    "public readonly oauth: OauthApi",
    "public readonly authorizationUrls: OauthAuthorizationUrlsApi",
    "public readonly sessions: OauthSessionsApi",
    "public readonly passwordResetRequests: AuthPasswordResetRequestsApi",
    "public readonly passwordResets: AuthPasswordResetsApi",
    "public readonly registrations: AuthRegistrationsApi",
    "public readonly sessions: AuthSessionsApi",
    "public readonly iam: SystemIamApi",
    "public readonly runtime: SystemIamRuntimeApi",
    "public readonly verificationPolicy: SystemIamVerificationPolicyApi",
    "public readonly current: AuthSessionsCurrentApi",
    "public readonly users: IamUsersApi",
    "public readonly current: IamUsersCurrentApi",
  ]) {
    assert.match(
      `${sdkSource}\n${appSdkAuthSource}\n${appSdkIamSource}\n${appSdkOauthSource}\n${appSdkSystemSource}`,
      new RegExp(sdkSurfaceFragment),
    );
  }

  for (const generatedPathFragment of [
    /appApiPath\(`\/oauth\/authorization_urls`\)/,
    /appApiPath\(`\/oauth\/sessions`\)/,
    /appApiPath\(`\/auth\/password_reset_requests`\)/,
    /appApiPath\(`\/auth\/password_resets`\)/,
    /appApiPath\(`\/auth\/registrations`\)/,
    /appApiPath\(`\/auth\/sessions`\)/,
    /appApiPath\(`\/auth\/sessions\/current`\)/,
    /appApiPath\(`\/auth\/sessions\/refresh`\)/,
    /appApiPath\(`\/iam\/users\/current`\)/,
    /appApiPath\(`\/system\/iam\/runtime`\)/,
    /appApiPath\(`\/system\/iam\/verification_policy`\)/,
  ]) {
    assert.match(
      `${appSdkAuthSource}\n${appSdkIamSource}\n${appSdkOauthSource}\n${appSdkSystemSource}`,
      generatedPathFragment,
    );
  }
  assert.doesNotMatch(appSdkAuthSource, /loginQrCodes/);
  assert.doesNotMatch(appSdkAuthSource, /loginQrCodeCallbacks/);
  assert.doesNotMatch(appSdkAuthSource, /verificationCodes/);
  assert.doesNotMatch(productSdkSource, /public readonly auth: AuthApi/);
  assert.doesNotMatch(productSdkSource, new RegExp(`public readonly ${retiredProviderPlatformCamel}:`));

  assert.match(authServiceSource, /verificationCode\?: string/);
  assert.doesNotMatch(authServiceSource, /appClient\.auth\?\.loginQrCodeCallbacks/);
  assert.doesNotMatch(authServiceSource, /assertRegistrationInput/);
  assert.doesNotMatch(authServiceSource, /SDKWork IAM registration requires verificationCode/);
});

test("navbar routes sign in through the auth module instead of bootstrapping sessions directly", () => {
  const navbarSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/components/Navbar.tsx");
  const portalAuthSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/portal-auth.ts");
  const sessionTokenSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts");

  assert.doesNotMatch(navbarSource, /createAppSession/);
  assert.match(navbarSource, /buildPortalAuthLoginRedirect/);
  assert.match(navbarSource, /navigate\(buildPortalAuthLoginRedirect\(location\)\)/);
  assert.match(navbarSource, /hasStoredPortalSession/);
  assert.match(navbarSource, /isPortalSessionStored/);
  assert.match(navbarSource, /setIsPortalSessionStored\(hasStoredPortalSession\(\)\)/);
  assert.match(navbarSource, /subscribePortalSessionChange/);
  assert.match(navbarSource, /const isConsolePath = location\.pathname\.startsWith\('\/console'\)/);
  assert.match(navbarSource, /const shouldShowAuthenticatedActions = isPortalSessionStored \|\| isConsolePath/);
  assert.match(navbarSource, /!shouldShowAuthenticatedActions \?/);
  assert.doesNotMatch(navbarSource, /!\s*location\.pathname\.startsWith\('\/console'\)\s*\?/);
  assert.match(portalAuthSource, /subscribePortalSessionChange/);
  assert.match(portalAuthSource, /window\.addEventListener\(PORTAL_SESSION_CHANGE_EVENT/);
  assert.match(sessionTokenSource, /dispatchPortalSessionChange/);
  assert.match(sessionTokenSource, /storeAppSessionFromResult/);
  assert.match(sessionTokenSource, /clearStoredAppSessionToken/);
  assert.doesNotMatch(navbarSource, /redirect=\/console/);
  assert.doesNotMatch(navbarSource, /sessionBootstrapLoading/);
  assert.doesNotMatch(navbarSource, /SESSION_BOOTSTRAP_ERROR_MESSAGE/);
});

test("portal auth guard classifies every console and admin path as login protected", () => {
  assert.deepEqual(PROTECTED_PORTAL_ROUTE_PREFIXES, ["/console", "/admin"]);

  for (const path of [
    "/console",
    "/console/dashboard",
    "/console/api-keys",
    "/console/checkout",
    "/admin",
    "/admin/dashboard",
    "/admin/user",
    "/admin/ratelimit",
  ]) {
    assert.equal(isProtectedPortalPath(path), true, `${path} must require login`);
  }

  for (const path of [
    "/",
    "/models",
    "/models/openai/gpt-4o",
    "/product-docs",
    "/docs",
    "/api-reference",
    "/sdk-reference",
    "/playground",
    "/auth/login",
    "/console-public",
    "/administrator",
  ]) {
    assert.equal(isProtectedPortalPath(path), false, `${path} must remain public`);
  }
});

test("portal auth guard redirects anonymous protected routes to login with a safe full return path", () => {
  assert.equal(
    buildProtectedPortalLoginRedirect({
      hash: "#roles",
      pathname: "/admin/user",
      search: "?tab=members&page=2",
    }),
    "/auth/login?redirect=%2Fadmin%2Fuser%3Ftab%3Dmembers%26page%3D2%23roles",
  );

  assert.deepEqual(
    resolveProtectedPortalAccess({
      hasSession: false,
      location: {
        hash: "#keys",
        pathname: "/console/api-keys",
        search: "?project=claw",
      },
    }),
    {
      allowed: false,
      redirectTo: "/auth/login?redirect=%2Fconsole%2Fapi-keys%3Fproject%3Dclaw%23keys",
      reason: "login-required",
    },
  );

  assert.deepEqual(
    resolveProtectedPortalAccess({
      hasSession: true,
      location: { hash: "", pathname: "/admin/dashboard", search: "" },
    }),
    { allowed: true },
  );

  assert.deepEqual(
    resolveProtectedPortalAccess({
      hasSession: false,
      location: { hash: "", pathname: "/models", search: "?q=gpt" },
    }),
    { allowed: true },
  );
});

test("appbase IAM runtime auth service persists sessions before portal redirects to protected pages", async () => {
  let storedSession: { accessToken?: string; authToken?: string; refreshToken?: string } = {};
  const persistedSessions: Array<{ accessToken?: string; authToken?: string; refreshToken?: string }> = [];
  const runtime = {
    service: {
      auth: {
        passwordResetRequests: {
          create: async () => ({}),
        },
        passwordResets: {
          create: async () => ({}),
        },
        registrations: {
          create: async () => ({
            accessToken: "register-access",
            authToken: "register-auth",
            refreshToken: "register-refresh",
          }),
        },
        sessions: {
          create: async (body: Record<string, unknown>) => ({
            accessToken: `${String(body.grantType)}-access`,
            authToken: `${String(body.grantType)}-auth`,
            refreshToken: `${String(body.grantType)}-refresh`,
          }),
          current: {
            delete: async () => undefined,
            retrieve: async () => ({
              accessToken: "current-access",
              authToken: "current-auth",
            }),
            update: async () => ({
              accessToken: "updated-access",
              authToken: "updated-auth",
              refreshToken: "updated-refresh",
            }),
          },
          refresh: async () => ({
            accessToken: "refreshed-access",
            authToken: "refreshed-auth",
            refreshToken: "refreshed-refresh",
          }),
        },
      },
      oauth: {
        authorizationUrls: {
          create: async () => ({ url: "https://auth.example.test/oauth" }),
        },
        sessions: {
          create: async () => ({
            accessToken: "oauth-access",
            authToken: "oauth-auth",
            refreshToken: "oauth-refresh",
          }),
        },
      },
      messaging: {
        verificationCodes: {
          create: async () => ({}),
          verify: async () => ({ verified: true }),
        },
      },
      iam: {
        users: {
          current: {
            retrieve: async () => ({ userId: "1", username: "Ada" }),
          },
        },
      },
    },
    tokenStore: {
      get: () => storedSession,
      set: (session: { accessToken?: string; authToken?: string; refreshToken?: string }) => {
        storedSession = { ...session };
        persistedSessions.push({ ...session });
      },
    },
  };
  const service = createSdkworkIamRuntimeAuthService({
    getRuntime: () => runtime,
  });

  for (const [name, run] of [
    ["password login", () => service.signIn({ username: "ada@example.test", password: "secret" })],
    ["email code login", () => service.signInWithEmailCode({ email: "ada@example.test", code: "123456" })],
    ["phone code login", () => service.signInWithPhoneCode({ phone: "+15555550123", code: "123456" })],
    ["session bridge login", () => service.signInWithSessionBridge({
      bridgeToken: "session-bridge-token",
      email: "ada@example.test",
      name: "Ada",
    })],
    ["registration", () => service.register({ username: "ada", email: "ada@example.test", password: "secret" })],
    ["OAuth login", () => service.signInWithOAuth({ code: "oauth-code", deviceType: "desktop", provider: "github" })],
    ["refresh", () => service.refreshSession()],
    ["current session update", () => service.updateCurrentSession()],
  ] as const) {
    const beforeCount = persistedSessions.length;
    const session = await run();
    assert.equal(
      persistedSessions.length,
      beforeCount + 1,
      `${name} must persist returned tokens before redirect`,
    );
    assert.deepEqual(
      persistedSessions[persistedSessions.length - 1],
      {
        accessToken: session.accessToken,
        authToken: session.authToken,
        refreshToken: session.refreshToken,
      },
      `${name} persisted token store payload must match returned session`,
    );
  }
});

test("claw router app session persists across module reload in the same browser tab", async () => {
  const storageHarness = createPortalSessionStorageHarness();
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;

  try {
    const firstTab = await importFreshAppSessionTokenModule();
    firstTab.storeAppSessionFromResult({
      code: "200",
      data: {
        accessToken: "shared-access-token",
        authToken: "shared-auth-token",
        expiresAt,
        refreshToken: "shared-refresh-token",
        sessionId: "shared-session-id",
      },
    });

    const reloadedTab = await importFreshAppSessionTokenModule();
    const restored = reloadedTab.loadStoredAppSessionToken();

    assert.ok(restored);
    assert.deepEqual(
      {
        accessToken: restored.accessToken,
        authToken: restored.authToken,
        expiresAt: restored.expiresAt,
        refreshToken: restored.refreshToken,
        sessionId: restored.sessionId,
      },
      {
        accessToken: "shared-access-token",
        authToken: "shared-auth-token",
        expiresAt,
        refreshToken: "shared-refresh-token",
        sessionId: "shared-session-id",
      },
    );
    assert.equal(Number.isFinite(restored.storedAt), true);
    assert.equal(reloadedTab.getStoredAppSessionAuthToken(), "shared-auth-token");
    assert.equal(reloadedTab.getStoredAppSessionAccessToken(), "shared-access-token");
  } finally {
    clearStoredAppSessionToken();
    storageHarness.restore();
  }
});

test("claw router app session does not leak into a new browser tab", async () => {
  const storageHarness = createPortalSessionStorageHarness();
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;

  try {
    const firstTab = await importFreshAppSessionTokenModule();
    firstTab.storeAppSessionFromResult({
      code: "200",
      data: {
        accessToken: "tab-one-access-token",
        authToken: "tab-one-auth-token",
        expiresAt,
        refreshToken: "tab-one-refresh-token",
        sessionId: "tab-one-session-id",
      },
    });

    storageHarness.openNewTab();
    const newTab = await importFreshAppSessionTokenModule();
    assert.equal(newTab.loadStoredAppSessionToken(), null);
    assert.equal(newTab.getStoredAppSessionAuthToken(), undefined);
    assert.equal(newTab.getStoredAppSessionAccessToken(), undefined);
  } finally {
    clearStoredAppSessionToken();
    storageHarness.restore();
  }
});

test("admin layout enforces route permission guard for protected admin pages", async () => {
  const adminLayoutSource = readAdminLayoutSource();
  const guardSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-shell/src/AdminRoutePermissionGuard.tsx");
  const permissionsSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-shell/src/admin-menu-permissions.ts");
  const { isAdminRouteAllowed } = await import("./packages/sdkwork-clawrouter-pc-admin-shell/src/admin-menu-permissions.ts");

  assert.match(adminLayoutSource, /<AdminRoutePermissionGuard>/);
  assert.match(guardSource, /isAdminRouteAllowed/);
  assert.match(guardSource, /shared\.auth\.adminAccess\.forbiddenTitle/);
  assert.match(permissionsSource, /resolveAdminRoutePermissionHint/);
  assert.equal(isAdminRouteAllowed("/admin/prompts", ["clawrouter.admin.access"]), true);
  assert.equal(isAdminRouteAllowed("/admin/prompts", ["iam.users.read"]), false);
  assert.equal(isAdminRouteAllowed("/admin/user", ["iam.users.read"]), true);
});

test("portal i18n keeps document language aligned with active locale", () => {
  const i18nSource = readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/index.ts");
  const syncSource = readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/sync-document-language.ts");
  assert.match(i18nSource, /syncDocumentLanguage/);
  assert.match(syncSource, /document\.documentElement\.lang/);
  assert.match(i18nSource, /i18n\.on\('languageChanged', syncDocumentLanguage\)/);
});

test("generated SDK auth errors clear the app session and redirect protected pages to login", () => {
  const redirects: string[] = [];
  const restoreWindow = installPortalAuthRedirectWindow({
    hash: "#risk",
    pathname: "/admin/service-providers/dashboard",
    replace: (to) => redirects.push(to),
    search: "?provider_id=2",
  });

  try {
    resetClawRouterSdkSessionAuthRedirectState();
    storeAppSessionFromResult({
      code: "200",
      data: {
        accessToken: "access-token",
        authToken: "auth-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
    });

    assert.equal(isClawRouterSdkSessionAuthError({
      code: "4010",
      msg: "app session token has expired",
    }), true);
    assert.equal(handleClawRouterSdkSessionAuthError({
      code: "4010",
      msg: "app session token has expired",
    }), true);

    assert.equal(loadStoredAppSessionToken(), null);
    assert.deepEqual(redirects, [
      "/auth/login?redirect=%2Fadmin%2Fservice-providers%2Fdashboard%3Fprovider_id%3D2%23risk",
    ]);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkSessionAuthRedirectState();
    restoreWindow();
  }
});

test("generated SDK auth errors clear stale sessions on public pages without forcing login", () => {
  const redirects: string[] = [];
  const restoreWindow = installPortalAuthRedirectWindow({
    hash: "",
    pathname: "/",
    replace: (to) => redirects.push(to),
    search: "",
  });

  try {
    resetClawRouterSdkSessionAuthRedirectState();
    storeAppSessionFromResult({
      code: "200",
      data: {
        accessToken: "access-token",
        authToken: "auth-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
    });

    assert.equal(handleClawRouterSdkSessionAuthError({
      code: "4010",
      msg: "app session token has expired",
    }), true);

    assert.equal(loadStoredAppSessionToken(), null);
    assert.deepEqual(redirects, []);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkSessionAuthRedirectState();
    restoreWindow();
  }
});

test("generated SDK auth errors stay on local protected pages when dev redirect bypass is enabled", () => {
  const redirects: string[] = [];
  const restoreWindow = installPortalAuthRedirectWindow({
    hash: "",
    hostname: "127.0.0.1",
    pathname: "/console/dashboard",
    replace: (to) => redirects.push(to),
    runtimeEnv: {
      VITE_SDKWORK_CLAWROUTER_DEV_SESSION_AUTH_REDIRECT_BYPASS: "true",
    },
    search: "",
  });

  try {
    resetClawRouterSdkSessionAuthRedirectState();
    storeAppSessionFromResult({
      code: "200",
      data: {
        accessToken: "access-token",
        authToken: "auth-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
    });

    assert.equal(handleClawRouterSdkSessionAuthError({
      code: "4010",
      msg: "app session token has expired",
    }), true);

    assert.notEqual(loadStoredAppSessionToken(), null);
    assert.deepEqual(redirects, []);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkSessionAuthRedirectState();
    restoreWindow();
  }
});

test("generated SDK auth errors open modal details on local protected pages by default", () => {
  const redirects: string[] = [];
  const sessionAuthEvents: Array<Record<string, unknown>> = [];
  const restoreWindow = installPortalAuthRedirectWindow({
    hash: "",
    hostname: "127.0.0.1",
    pathname: "/console/dashboard",
    replace: (to) => redirects.push(to),
    sessionAuthEvents,
    search: "",
  });

  try {
    resetClawRouterSdkSessionAuthRedirectState();
    storeAppSessionFromResult({
      code: "200",
      data: {
        accessToken: "access-token",
        authToken: "auth-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
    });

    assert.equal(handleClawRouterSdkSessionAuthError({
      code: "4010",
      msg: "app session token has expired",
    }), true);

    assert.notEqual(loadStoredAppSessionToken(), null);
    assert.deepEqual(redirects, []);
    assert.equal(sessionAuthEvents.length, 1);
    assert.equal(sessionAuthEvents[0]?.code, "4010");
    assert.equal(sessionAuthEvents[0]?.message, "app session token has expired");
    assert.equal(sessionAuthEvents[0]?.path, "/console/dashboard");
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkSessionAuthRedirectState();
    restoreWindow();
  }
});

test("generated SDK auth errors redirect from local protected pages when redirect mode is configured", () => {
  const redirects: string[] = [];
  const restoreWindow = installPortalAuthRedirectWindow({
    hash: "",
    hostname: "127.0.0.1",
    pathname: "/console/dashboard",
    replace: (to) => redirects.push(to),
    runtimeEnv: {
      VITE_SDKWORK_SESSION_AUTH_UNAUTHORIZED_MODE: "redirect",
    },
    search: "",
  });

  try {
    resetClawRouterSdkSessionAuthRedirectState();
    storeAppSessionFromResult({
      code: "200",
      data: {
        accessToken: "access-token",
        authToken: "auth-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
    });

    assert.equal(handleClawRouterSdkSessionAuthError({
      code: "4010",
      msg: "app session token has expired",
    }), true);

    assert.equal(loadStoredAppSessionToken(), null);
    assert.deepEqual(redirects, [
      "/auth/login?redirect=%2Fconsole%2Fdashboard",
    ]);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkSessionAuthRedirectState();
    restoreWindow();
  }
});

test("generated SDK unauthorized errors redirect once and skip auth pages", () => {
  const redirects: string[] = [];
  const restoreWindow = installPortalAuthRedirectWindow({
    hash: "",
    pathname: "/console/wallet",
    replace: (to) => redirects.push(to),
    search: "",
  });

  try {
    resetClawRouterSdkSessionAuthRedirectState();

    assert.equal(isClawRouterSdkSessionAuthError({
      code: "UNAUTHORIZED",
      httpStatus: 401,
      message: "Authentication failed",
    }), true);
    assert.equal(handleClawRouterSdkSessionAuthError({
      code: "UNAUTHORIZED",
      httpStatus: 401,
      message: "Authentication failed",
    }), true);
    assert.equal(handleClawRouterSdkSessionAuthError({
      code: "UNAUTHORIZED",
      httpStatus: 401,
      message: "Authentication failed",
    }), true);
    assert.deepEqual(redirects, ["/auth/login?redirect=%2Fconsole%2Fwallet"]);

    restoreWindow();
    const restoreAuthWindow = installPortalAuthRedirectWindow({
      hash: "",
      pathname: "/auth/login",
      replace: (to) => redirects.push(to),
      search: "?redirect=%2Fconsole%2Fwallet",
    });
    assert.equal(handleClawRouterSdkSessionAuthError({
      code: "401",
      msg: "not logged in",
    }), true);
    assert.deepEqual(redirects, ["/auth/login?redirect=%2Fconsole%2Fwallet"]);
    restoreAuthWindow();
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkSessionAuthRedirectState();
    restoreWindow();
  }
});

test("generated SDK request boundary redirects when API responses report an expired app session", async () => {
  const redirects: string[] = [];
  const restoreWindow = installPortalAuthRedirectWindow({
    hash: "",
    pathname: "/console/api-keys",
    replace: (to) => redirects.push(to),
    search: "?tab=usage",
  });
  const previousFetch = globalThis.fetch;

  try {
    resetClawRouterSdkSessionAuthRedirectState();
    storeAppSessionFromResult({
      code: "200",
      data: {
        accessToken: "access-token",
        authToken: "auth-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
    });
    globalThis.fetch = async () => new Response(
      JSON.stringify({
        code: "4010",
        data: null,
        msg: "app session token has expired",
      }),
      {
        headers: { "content-type": "application/json" },
        status: 200,
      },
    );

    const client = createClawRouterAppSdkClient({
      appBaseUrl: "https://example.test/app/v3/api",
    });

    await assert.rejects(
      () => client.http.get("/auth-required"),
      /app session token has expired/,
    );
    assert.equal(loadStoredAppSessionToken(), null);
    assert.deepEqual(redirects, ["/auth/login?redirect=%2Fconsole%2Fapi-keys%3Ftab%3Dusage"]);
  } finally {
    globalThis.fetch = previousFetch;
    clearStoredAppSessionToken();
    resetClawRouterSdkSessionAuthRedirectState();
    restoreWindow();
  }
});

test("portal wires console and admin routes through the protected session guard", () => {
  const appSource = readPortalFile("./src/App.tsx");
  const guardSource = readPortalFile("./src/auth/protectedPortalRoutes.ts");
  const sharedAuthSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/portal-auth.ts");

  assert.match(appSource, /RequirePortalSession/);
  assert.match(appSource, /SdkworkSessionAuthBrowserRoot|SdkworkSessionAuthUnauthorizedProvider/);
  assert.match(appSource, /<Route path="\/console" element=\{<PortalErrorBoundary><RequirePortalSession><ConsoleLayout/);
  assert.match(appSource, /RequireAdminSession/);
  assert.match(appSource, /<Route path="\/admin" element=\{<PortalErrorBoundary><RequireAdminSession><AdminLayout/);
  assert.match(appSource, /<Route path="\*" element=\{<Navigate to="\/console\/dashboard" replace \/>} \/>/);
  assert.match(appSource, /<Route path="\*" element=\{<Navigate to="\/admin\/dashboard" replace \/>} \/>/);
  assert.match(guardSource, /hasPortalIamSession/);
  assert.match(guardSource, /PortalAuthenticatedAuthRouteGuard/);
  assert.match(guardSource, /resolvePortalAuthenticatedAuthRouteRedirect/);
  assert.match(sharedAuthSource, /sanitizePortalAuthRedirect/);
  assert.match(guardSource, /buildPortalAuthLoginRedirect/);
  assert.match(guardSource, /verifyCurrentPortalAdminAccess/);
  assert.match(guardSource, /RequireAdminSession/);
  assert.match(guardSource, /adminAccessState === 'forbidden'/);
  assert.match(guardSource, /shared\.auth\.adminAccess\.forbiddenTitle/);
  assert.doesNotMatch(guardSource, /adminAccessState === 'forbidden'[\s\S]*to: '\/console\/dashboard'/);
  assert.match(guardSource, /@sdkwork\/clawroutes-pc-commons\/runtime/);
  assert.doesNotMatch(guardSource, /sdkwork-clawroutes-pc-commons\/runtime/);
  assert.match(sharedAuthSource, /hasPortalIamSession/);
  assert.match(sharedAuthSource, /resolveStoredPortalTenantId/);
  assert.doesNotMatch(guardSource, /\bfetch\s*\(/);
  assert.doesNotMatch(guardSource, /\baxios\b/);
  assert.doesNotMatch(guardSource, /Authorization/);
  assert.doesNotMatch(guardSource, /Access-Token/);
  assert.doesNotMatch(sharedAuthSource, /\bfetch\s*\(/);
  assert.doesNotMatch(sharedAuthSource, /\baxios\b/);
  assert.doesNotMatch(sharedAuthSource, /Authorization/);
  assert.doesNotMatch(sharedAuthSource, /Access-Token/);
});

test("console and admin logout revoke the current IAM session through the app SDK", () => {
  const consoleLayoutSource = readPortalFile("./packages/sdkwork-clawrouter-pc-console-shell/src/ConsoleLayout.tsx");
  const adminLayoutSource = readAdminLayoutSource();
  const sessionServiceSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/sessionService.ts");

  assert.match(consoleLayoutSource, /revokeAppSession/);
  assert.doesNotMatch(consoleLayoutSource, /clearAppSession/);
  assert.match(adminLayoutSource, /revokeAppSession/);
  assert.match(sessionServiceSource, /auth\.sessions\.current\.delete\(\)/);
  assert.match(sessionServiceSource, /finally \{\s*clearAppSession\(\);\s*\}/);
  assert.doesNotMatch(sessionServiceSource, /\bfetch\s*\(/);
  assert.doesNotMatch(sessionServiceSource, /\baxios\b/);
});

test("admin sidebar labels are resolved through i18n keys", () => {
  const adminLayoutSource = readAdminLayoutSource();
  const adminRegistrySource = readAdminRegistrySource();
  const i18nSource = readI18nResourceSource();

  assert.match(adminLayoutSource, /useTranslation/);
  assert.match(adminRegistrySource, /groupBlock\('admin\.menu\.home\.modelManagement'/);
  assert.match(adminRegistrySource, /groupBlock\('admin\.menu\.home\.accountPoolManagement'/);
  assert.match(adminRegistrySource, /groupBlock\('admin\.menu\.home\.agentSkills'/);
  assert.match(adminRegistrySource, /groupBlock\('admin\.menu\.home\.dataManagement'/);
  assert.match(adminRegistrySource, /labelKey:\s*'admin\.menu\.agentSkills'/);
  assert.match(adminRegistrySource, /labelKey:\s*'admin\.menu\.analytics'/);
  assert.match(adminRegistrySource, /labelKey:\s*'admin\.menu\.authSettings'/);
  assert.match(adminLayoutSource, /t\(group\.groupKey\)/);
  assert.match(adminLayoutSource, /t\(item\.labelKey\)/);
  assert.match(adminLayoutSource, /t\('admin\.menu\.logout'\)/);

  for (const hardcodedText of ["App Store", "Agent Skills", "Auth Settings", "Admin Backend"]) {
    assert.doesNotMatch(adminLayoutSource, new RegExp(`label:\\s*['"\`]${hardcodedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"\`]`));
    assert.doesNotMatch(adminLayoutSource, new RegExp(`>\\s*${hardcodedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*<`));
    assert.doesNotMatch(adminRegistrySource, new RegExp(`label:\\s*['"\`]${hardcodedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"\`]`));
  }

  for (const key of [
    "admin.menu.home.modelManagement",
    "admin.menu.home.accountPoolManagement",
    "admin.menu.home.agentSkills",
    "admin.menu.home.dataManagement",
    "admin.menu.agentSkills",
    "admin.menu.analytics",
    "admin.menu.authSettings",
    "admin.menu.logout",
  ]) {
    assert.match(i18nSource, new RegExp(`"${key.replaceAll(".", "\\.")}"`), `${key} must be present in i18n resources`);
  }
});

test("claw router i18n resources are split by business domain", () => {
  const indexSource = readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/index.ts");
  const resourceFiles = readI18nResourceFiles()
    .filter((file) => !file.relativePath.endsWith("/types.ts") && !file.relativePath.endsWith("/merge.ts"));
  const resourceIndex = resourceFiles.find((file) => file.relativePath === "./packages/sdkwork-clawrouter-pc-i18n/src/resources/index.ts");
  const businessResourceFiles = resourceFiles.filter((file) => file.relativePath !== "./packages/sdkwork-clawrouter-pc-i18n/src/resources/index.ts");

  assert.ok(resourceIndex, "i18n package must expose a resources/index.ts aggregator");
  assert.match(indexSource, /from '\.\/resources'/);
  assert.doesNotMatch(indexSource, /const resources\s*=\s*\{/);
  assert.ok(indexSource.split(/\r?\n/).length <= 100, "i18n entrypoint must stay below 100 lines");
  assert.ok((resourceIndex?.source ?? "").split(/\r?\n/).length <= 160, "i18n resources aggregator must stay below 160 lines");
  assert.ok(businessResourceFiles.length >= 30, "i18n resources must be split into focused business files");

  for (const file of businessResourceFiles) {
    const lineCount = file.source.split(/\r?\n/).length;
    assert.ok(lineCount <= 700, `${file.relativePath} must stay below 700 lines, got ${lineCount}`);
    assert.match(file.source, /\ben:\s*\{/, `${file.relativePath} must define English messages`);
    assert.match(file.source, /\bzh:\s*\{/, `${file.relativePath} must define Chinese messages`);
  }
});

test("admin module registry labels have English and Chinese translations", () => {
  const adminRegistrySource = readAdminRegistrySource();
  const i18nSource = readI18nResourceSource();
  const enKeys = findI18nLocaleKeys(i18nSource, "en");
  const zhKeys = findI18nLocaleKeys(i18nSource, "zh");
  const registryKeys = new Set([
    ...findOrderedMatches(adminRegistrySource, /nameKey:\s*'([^']+)'/g),
    ...findOrderedMatches(adminRegistrySource, /groupBlock\('([^']+)'/g),
    ...findOrderedMatches(adminRegistrySource, /labelKey:\s*'([^']+)'/g),
  ]);

  assert.ok(registryKeys.has("admin.header.messagingCenter"), "messaging center module must be covered");
  assert.ok(registryKeys.has("admin.menu.messaging.providers"), "messaging center menu must be covered");

  for (const key of [...registryKeys].sort()) {
    assert.ok(enKeys.has(key), `${key} must be present in English i18n resources`);
    assert.ok(zhKeys.has(key), `${key} must be present in Chinese i18n resources`);
  }
});

test("direct admin translation lookups without fallbacks have English and Chinese translations", () => {
  const i18nSource = readI18nResourceSource();
  const enKeys = findI18nLocaleKeys(i18nSource, "en");
  const zhKeys = findI18nLocaleKeys(i18nSource, "zh");
  const sourceFiles = [
    ...readPortalSourceFiles("./src/"),
    ...readPortalSourceFiles("./packages/"),
  ].filter((file) => file.relativePath !== "./packages/sdkwork-clawrouter-pc-i18n/src/index.ts");
  const missingLookups: string[] = [];

  for (const file of sourceFiles) {
    for (const key of findOrderedMatches(file.source, /\bt\(\s*['"](admin\.[A-Za-z0-9_.-]+)['"]\s*\)/g)) {
      if (!enKeys.has(key) || !zhKeys.has(key)) {
        missingLookups.push(`${key} in ${file.relativePath}`);
      }
    }
  }

  assert.deepEqual(missingLookups.sort(), []);
});

test("admin auth and site settings belong to the operations module", () => {
  const adminRegistrySource = readAdminRegistrySource();
  const i18nSource = readI18nResourceSource();
  const homeLayoutModule = findAdminModuleMenuSource(adminRegistrySource, "home");
  const operationsLayoutModule = findAdminModuleMenuSource(adminRegistrySource, "operations");
  const homeHeaderModule = findAdminModuleDefinitionSource(adminRegistrySource, "home");
  const operationsHeaderModule = findAdminModuleDefinitionSource(adminRegistrySource, "operations");

  assert.match(homeLayoutModule, /path:\s*'\/admin\/announcement'/);
  assert.doesNotMatch(homeLayoutModule, /path:\s*'\/admin\/settings'/);
  assert.doesNotMatch(homeLayoutModule, /path:\s*'\/admin\/site'/);

  assert.match(operationsLayoutModule, /groupBlock\('admin\.menu\.ops\.system'/);
  assert.match(operationsLayoutModule, /path:\s*'\/admin\/settings',\s*labelKey:\s*'admin\.menu\.authSettings'/);
  assert.match(operationsLayoutModule, /path:\s*'\/admin\/site',\s*labelKey:\s*'admin\.menu\.siteSettings'/);

  assert.doesNotMatch(homeHeaderModule, /'\/admin\/settings'/);
  assert.doesNotMatch(homeHeaderModule, /'\/admin\/site'/);
  assert.match(operationsHeaderModule, /'\/admin\/settings'/);
  assert.match(operationsHeaderModule, /'\/admin\/site'/);
  assert.match(i18nSource, /"admin\.menu\.ops\.system":\s*"System Settings"/);
});

test("admin dashboard is a top-level sidebar item", () => {
  const adminLayoutSource = readAdminLayoutSource();
  const adminRegistrySource = readAdminRegistrySource();

  assert.match(
    adminRegistrySource,
    /moduleId:\s*'home',\s*items:\s*\[\s*itemBlock\(\{\s*path:\s*'\/admin\/dashboard',\s*labelKey:\s*'admin\.menu\.dashboard'/s,
  );
  assert.match(adminLayoutSource, /currentModuleMenu\.items\?\.map\(\(item\) => \(/);
  assert.doesNotMatch(adminRegistrySource, /groupBlock\('admin\.menu\.home\.overview'/);
});

test("admin model vendor item is grouped under model management", () => {
  const adminRegistrySource = readAdminRegistrySource();
  const i18nSource = readI18nResourceSource();

  assert.match(
    adminRegistrySource,
    /groupBlock\('admin\.menu\.home\.modelManagement',\s*\[\s*itemBlock\(\{\s*path:\s*'\/admin\/model',\s*labelKey:\s*'admin\.menu\.models'/s,
  );

  const agentsAndSkillsGroup = findAdminMenuGroupSource(adminRegistrySource, "admin.menu.home.agentSkills");
  assert.doesNotMatch(agentsAndSkillsGroup, /path:\s*'\/admin\/model'/);
  assert.match(i18nSource, /"admin\.menu\.home\.modelManagement":\s*"Model Management"/);
  assert.match(i18nSource, /"admin\.menu\.home\.modelManagement":\s*"\u6a21\u578b\u7ba1\u7406"/);
  assert.match(i18nSource, /"admin\.layout\.links\.models":\s*"Model Vendors"/);
  assert.match(i18nSource, /"admin\.menu\.models":\s*"Model Vendors"/);
  assert.match(i18nSource, /"admin\.layout\.links\.models":\s*"\u6a21\u578b\u5382\u5546\u7ba1\u7406"/);
  assert.match(i18nSource, /"admin\.menu\.models":\s*"\u6a21\u578b\u5382\u5546\u7ba1\u7406"/);
  assert.doesNotMatch(i18nSource, /\u6a21\u578b\u5e73\u53f0\u7ba1\u7406/);
});

test("admin group and AI channels are grouped under AI channel management", () => {
  const adminRegistrySource = readAdminRegistrySource();
  const i18nSource = readI18nResourceSource();

  assert.match(
    adminRegistrySource,
    /groupBlock\('admin\.menu\.home\.modelManagement'[\s\S]*groupBlock\('admin\.menu\.home\.accountPoolManagement'[\s\S]*groupBlock\('admin\.menu\.home\.agentSkills'/,
  );
  assert.match(
    adminRegistrySource,
    /groupBlock\('admin\.menu\.home\.accountPoolManagement',\s*\[\s*itemBlock\(\{\s*path:\s*'\/admin\/group',\s*labelKey:\s*'admin\.menu\.groups'[\s\S]*itemBlock\(\{\s*path:\s*'\/admin\/channel',\s*labelKey:\s*'admin\.menu\.channels'/s,
  );

  const userManagementGroup = findAdminMenuGroupSource(adminRegistrySource, "admin.menu.home.userManagement");
  assert.doesNotMatch(userManagementGroup, /path:\s*'\/admin\/group'/);

  const agentsAndSkillsGroup = findAdminMenuGroupSource(adminRegistrySource, "admin.menu.home.agentSkills");
  assert.doesNotMatch(agentsAndSkillsGroup, /path:\s*'\/admin\/group'/);
  assert.doesNotMatch(agentsAndSkillsGroup, /path:\s*'\/admin\/channel'/);
  assert.match(i18nSource, /"admin\.menu\.home\.accountPoolManagement":\s*"AI Channel Management"/);
  assert.match(i18nSource, /"admin\.menu\.home\.accountPoolManagement":\s*"AI \u6e20\u9053\u7ba1\u7406"/);
});

test("admin channel credential details expose API key copy without leaking hidden values in the table", () => {
  const channelSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx");
  const i18nSource = readI18nResourceSource();

  assert.match(channelSource, /Copy,/);
  assert.match(channelSource, /const handleCopyCredentialApiKey = useCallback/);
  assert.match(channelSource, /navigator\.clipboard\.writeText\(apiKey\)/);
  assert.match(channelSource, /t\('admin\.channel\.fields\.apiKey'\)/);
  assert.match(channelSource, /<CredentialDetailsModal[\s\S]*onCopyCredentialApiKey=\{handleCopyCredentialApiKey\}/);
  assert.match(channelSource, /<BusinessStateTableRow colSpan=\{8\}/);
  assert.match(channelSource, /copyLabel=\{t\('common\.actions\.copyApiKey'\)\}/);
  assert.match(channelSource, /onCopy=\{\(\) => onCopyCredentialApiKey\(credential\)\}/);
  assert.match(channelSource, /copyDisabled=\{!hasApiKey\}/);
  assert.match(channelSource, /const hasApiKey = Boolean\(credential\.apiKey\?\.trim\(\)\);/);
  assert.match(channelSource, /maskApiKeyForDisplay\(credential\.apiKey\)/);
  assert.match(channelSource, /<CredentialSummaryCell channel=\{channel\} \/>/);
  assert.doesNotMatch(channelSource, /<ApiKeyCell/);
  assert.doesNotMatch(channelSource, /apiKeyVisible\s*\?\s*channel\.apiKey/);
  assert.ok(findI18nLocaleKeys(i18nSource, "en").has("admin.channel.table.apiKey"));
  assert.ok(findI18nLocaleKeys(i18nSource, "zh").has("admin.channel.table.apiKey"));
});

test("admin channel table keeps channel and provider content on one line", () => {
  const channelSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx");

  assert.match(channelSource, /<td className="px-6 py-4 align-top max-w-\[14rem\]">/);
  assert.match(channelSource, /className="flex min-w-0 items-center gap-2 whitespace-nowrap"/);
  assert.match(channelSource, /<span className="min-w-0 truncate">\{channel\.name\}<\/span>/);
  assert.match(channelSource, /<CapabilityBadges capabilities=\{channel\.capabilities\} \/>/);
  assert.doesNotMatch(channelSource, /<CapabilityBadges capabilities=\{channel\.capabilities\} \/>\s*<\/td>/);
  assert.doesNotMatch(channelSource, /className="flex flex-wrap gap-1 mt-2"/);
  assert.match(channelSource, /<td className="px-6 py-4 align-top max-w-\[12rem\]">/);
  assert.doesNotMatch(channelSource, /<div className="flex flex-col gap-1\.5">/);
  assert.match(channelSource, /<div className="flex min-w-0 items-center gap-2 whitespace-nowrap">/);
  assert.match(channelSource, /text-sm flex min-w-0 items-center gap-1\.5 whitespace-nowrap/);
  assert.match(channelSource, /<span className="min-w-0 truncate">\{channel\.vendor\}<\/span>/);
  assert.match(channelSource, /text-xs text-slate-500 min-w-0 whitespace-nowrap/);
  assert.doesNotMatch(channelSource, /<span className="min-w-0 truncate">\{channel\.protocol\}<\/span>/);
  assert.match(channelSource, /<span className="min-w-0 truncate">\{channel\.accessType\}<\/span>/);
});

test("admin OAuth module lives under operations", () => {
  const adminRegistrySource = readAdminRegistrySource();
  const i18nSource = readI18nResourceSource();
  const operationsHeaderModule = findAdminModuleDefinitionSource(adminRegistrySource, "operations");
  const homeHeaderModule = findAdminModuleDefinitionSource(adminRegistrySource, "home");
  const operationsMenu = findAdminModuleMenuSource(adminRegistrySource, "operations");
  const homeMenu = findAdminModuleMenuSource(adminRegistrySource, "home");
  const retiredAdminProviderPath = "/admin/" + "open" + "-platform";

  for (const moduleId of ["home", "productCenter", "transactionCenter", "memberCenter", "marketingCenter", "financeCenter", "storageCenter", "driveCenter", "operations", "serviceProviderCenter"]) {
    assert.match(adminRegistrySource, new RegExp(`\\| '${moduleId}'`), `${moduleId} must be part of AdminModuleId`);
  }
  assert.doesNotMatch(adminRegistrySource, /id:\s*'oauth'/);
  assert.doesNotMatch(adminRegistrySource, /id:\s*'appCenter'/);
  assert.match(
    operationsHeaderModule,
    /id:\s*'operations',\s*nameKey:\s*'admin\.header\.operations'[\s\S]*pathPrefixes:\s*\[[^\]]*'\/admin\/oauth'[^\]]*\]/,
  );
  assert.doesNotMatch(homeHeaderModule, /'\/admin\/app'/);
  assert.doesNotMatch(homeHeaderModule, new RegExp(retiredAdminProviderPath.replaceAll("/", "\\/")));

  assert.match(operationsMenu, /moduleId:\s*'operations'/);
  assert.match(operationsMenu, /groupBlock\('admin\.menu\.ops\.oauth'/);
  assert.match(operationsMenu, /path:\s*'\/admin\/oauth\/login-platforms',\s*labelKey:\s*'admin\.menu\.oauth\.loginPlatforms'/);
  assert.match(operationsMenu, /path:\s*'\/admin\/oauth\/official-accounts',\s*labelKey:\s*'admin\.menu\.oauth\.officialAccounts'/);
  assert.match(operationsMenu, /path:\s*'\/admin\/oauth\/mini-programs',\s*labelKey:\s*'admin\.menu\.oauth\.miniPrograms'/);
  assert.doesNotMatch(homeMenu, /path:\s*'\/admin\/app'/);
  assert.doesNotMatch(homeMenu, /\/admin\/oauth/);
  assert.match(i18nSource, /"admin\.menu\.oauth\.loginPlatforms":\s*"OAuth Login Platform Accounts"/);
  assert.match(i18nSource, /"admin\.menu\.oauth\.officialAccounts":\s*"Official Accounts"/);
  assert.match(i18nSource, /"admin\.menu\.oauth\.miniPrograms":\s*"Mini Programs"/);
});

test("admin commerce module is split into product transaction member marketing and finance centers", () => {
  const adminRegistrySource = readAdminRegistrySource();
  const i18nSource = readI18nResourceSource();
  const transactionHeaderModule = findAdminModuleDefinitionSource(adminRegistrySource, "transactionCenter");

  assert.doesNotMatch(adminRegistrySource, /id:\s*'commerce'/);
  assert.doesNotMatch(adminRegistrySource, /moduleId:\s*'commerce'/);
  assert.match(
    adminRegistrySource,
    /id:\s*'productCenter',\s*nameKey:\s*'admin\.header\.productCenter'[\s\S]*defaultPath:\s*'\/admin\/catalog\/products'[\s\S]*pathPrefixes:\s*\[[^\]]*'\/admin\/catalog'[^\]]*'\/admin\/inventory'[^\]]*\]/,
  );
  assert.match(
    adminRegistrySource,
    /id:\s*'transactionCenter',\s*nameKey:\s*'admin\.header\.transactionCenter'[\s\S]*defaultPath:\s*'\/admin\/orders\/orders'[\s\S]*pathPrefixes:\s*\[[^\]]*'\/admin\/orders'[^\]]*'\/admin\/payments'[^\]]*\]/,
  );
  assert.doesNotMatch(transactionHeaderModule, /'\/admin\/memberships'/);
  assert.match(
    adminRegistrySource,
    /id:\s*'memberCenter',\s*nameKey:\s*'admin\.header\.memberCenter'[\s\S]*defaultPath:\s*'\/admin\/memberships\/packages'[\s\S]*pathPrefixes:\s*\[[^\]]*'\/admin\/memberships'[^\]]*\]/,
  );
  assert.match(
    adminRegistrySource,
    /id:\s*'marketingCenter',\s*nameKey:\s*'admin\.header\.marketingCenter'[\s\S]*defaultPath:\s*'\/admin\/marketing\/offers'[\s\S]*pathPrefixes:\s*\[[^\]]*'\/admin\/marketing'[^\]]*\]/,
  );
  assert.match(
    adminRegistrySource,
    /id:\s*'financeCenter',\s*nameKey:\s*'admin\.header\.financeCenter'[\s\S]*defaultPath:\s*'\/admin\/finance\/order-revenue'[\s\S]*pathPrefixes:\s*\[[^\]]*'\/admin\/finance'[^\]]*'\/admin\/wallet'[^\]]*\]/,
  );

  for (const key of [
    "admin.header.productCenter",
    "admin.header.transactionCenter",
    "admin.header.memberCenter",
    "admin.header.marketingCenter",
    "admin.header.financeCenter",
  ]) {
    assert.match(i18nSource, new RegExp(`"${key.replaceAll(".", "\\.")}"`), `${key} must be present in i18n resources`);
  }

  assert.match(i18nSource, /"admin\.header\.productCenter":\s*"Product Center"/);
  assert.match(i18nSource, /"admin\.header\.transactionCenter":\s*"Transaction Center"/);
  assert.match(i18nSource, /"admin\.header\.memberCenter":\s*"Member Center"/);
  assert.match(i18nSource, /"admin\.header\.memberCenter":\s*"\u4f1a\u5458\u4e2d\u5fc3"/);
  assert.match(i18nSource, /"admin\.header\.marketingCenter":\s*"Marketing Center"/);
  assert.match(i18nSource, /"admin\.header\.financeCenter":\s*"Finance Center"/);
  assert.match(i18nSource, /"admin\.header\.productCenter":\s*"\u5546\u54c1\u4e2d\u5fc3"/);
  assert.match(i18nSource, /"admin\.header\.transactionCenter":\s*"\u4ea4\u6613\u4e2d\u5fc3"/);
  assert.match(i18nSource, /"admin\.header\.marketingCenter":\s*"\u8425\u9500\u4e2d\u5fc3"/);
  assert.match(i18nSource, /"admin\.header\.financeCenter":\s*"\u8d22\u52a1\u4e2d\u5fc3"/);
});

test("admin commerce second-level sections are promoted into the left sidebar", () => {
  const adminRegistrySource = readAdminRegistrySource();
  const i18nSource = readI18nResourceSource();

  const productCenterModule = findAdminModuleMenuSource(adminRegistrySource, "productCenter");
  assert.match(productCenterModule, /groupBlock\('admin\.menu\.productCenter\.catalog'/);
  assert.match(productCenterModule, /path:\s*'\/admin\/catalog\/products',\s*labelKey:\s*'admin\.menu\.catalogProducts'/);
  assert.match(productCenterModule, /path:\s*'\/admin\/catalog\/skus',\s*labelKey:\s*'admin\.menu\.catalogSkus'/);
  assert.match(productCenterModule, /groupBlock\('admin\.menu\.productCenter\.inventory'/);
  assert.match(productCenterModule, /path:\s*'\/admin\/inventory\/stocks',\s*labelKey:\s*'admin\.menu\.inventoryStocks'/);
  assert.match(productCenterModule, /path:\s*'\/admin\/inventory\/reservations',\s*labelKey:\s*'admin\.menu\.inventoryReservations'/);
  assert.match(productCenterModule, /path:\s*'\/admin\/inventory\/ledger',\s*labelKey:\s*'admin\.menu\.inventoryLedger'/);

  const transactionCenterModule = findAdminModuleMenuSource(adminRegistrySource, "transactionCenter");
  assert.match(transactionCenterModule, /path:\s*'\/admin\/orders\/orders',\s*labelKey:\s*'admin\.menu\.orderList'/);
  assert.match(transactionCenterModule, /path:\s*'\/admin\/orders\/refunds',\s*labelKey:\s*'admin\.menu\.orderRefunds'/);
  assert.match(transactionCenterModule, /path:\s*'\/admin\/payments\/provider-accounts',\s*labelKey:\s*'admin\.menu\.paymentProviderAccounts'/);
  assert.doesNotMatch(transactionCenterModule, /path:\s*'\/admin\/memberships\//);

  const memberCenterModule = findAdminModuleMenuSource(adminRegistrySource, "memberCenter");
  assert.match(memberCenterModule, /groupBlock\('admin\.menu\.memberCenter\.memberships'/);
  assert.match(memberCenterModule, /path:\s*'\/admin\/memberships\/packages',\s*labelKey:\s*'admin\.menu\.membershipPackages'/);
  assert.match(memberCenterModule, /path:\s*'\/admin\/memberships\/plans',\s*labelKey:\s*'admin\.menu\.membershipPlans'/);
  assert.match(memberCenterModule, /path:\s*'\/admin\/memberships\/members',\s*labelKey:\s*'admin\.menu\.membershipMembers'/);
  assert.match(memberCenterModule, /path:\s*'\/admin\/memberships\/entitlements',\s*labelKey:\s*'admin\.menu\.membershipEntitlements'/);
  assert.match(memberCenterModule, /path:\s*'\/admin\/memberships\/recharge-packages',\s*labelKey:\s*'admin\.menu\.membershipRechargePackages'/);
  assert.match(
    memberCenterModule,
    /path:\s*'\/admin\/memberships\/packages'[\s\S]*path:\s*'\/admin\/memberships\/plans'[\s\S]*path:\s*'\/admin\/memberships\/members'/,
  );

  const marketingCenterModule = findAdminModuleMenuSource(adminRegistrySource, "marketingCenter");
  assert.match(marketingCenterModule, /groupBlock\('admin\.menu\.marketingCenter\.offers'/);
  assert.match(marketingCenterModule, /groupBlock\('admin\.menu\.marketingCenter\.lifecycle'/);
  assert.match(marketingCenterModule, /groupBlock\('admin\.menu\.marketingCenter\.ledger'/);
  assert.match(marketingCenterModule, /path:\s*'\/admin\/marketing\/offers',\s*labelKey:\s*'admin\.menu\.marketingPromotionOffers'/);
  assert.match(marketingCenterModule, /path:\s*'\/admin\/marketing\/promotion-coupon-stocks',\s*labelKey:\s*'admin\.menu\.marketingPromotionCouponStocks'/);
  assert.match(marketingCenterModule, /path:\s*'\/admin\/marketing\/promotion-codes',\s*labelKey:\s*'admin\.menu\.marketingPromotionCodes'/);
  assert.match(marketingCenterModule, /path:\s*'\/admin\/marketing\/promotion-code-redemptions',\s*labelKey:\s*'admin\.menu\.marketingPromotionCodeRedemptions'/);
  assert.match(marketingCenterModule, /path:\s*'\/admin\/marketing\/user-coupons',\s*labelKey:\s*'admin\.menu\.marketingUserCoupons'/);
  assert.match(marketingCenterModule, /path:\s*'\/admin\/marketing\/discount-applications',\s*labelKey:\s*'admin\.menu\.marketingDiscountApplications'/);
  assert.match(marketingCenterModule, /path:\s*'\/admin\/marketing\/discount-allocations',\s*labelKey:\s*'admin\.menu\.marketingDiscountAllocations'/);
  assert.match(marketingCenterModule, /path:\s*'\/admin\/marketing\/promotion-coupon-ledger',\s*labelKey:\s*'admin\.menu\.marketingPromotionCouponLedger'/);
  assert.match(marketingCenterModule, /path:\s*'\/admin\/marketing\/budget-ledger',\s*labelKey:\s*'admin\.menu\.marketingBudgetLedger'/);
  assert.match(marketingCenterModule, /path:\s*'\/admin\/marketing\/external-bindings',\s*labelKey:\s*'admin\.menu\.marketingExternalBindings'/);
  assert.match(marketingCenterModule, /path:\s*'\/admin\/marketing\/events',\s*labelKey:\s*'admin\.menu\.marketingEvents'/);
  assert.match(marketingCenterModule, /path:\s*'\/admin\/marketing\/referrals',\s*labelKey:\s*'admin\.menu\.marketingReferrals'/);
  assert.doesNotMatch(marketingCenterModule, /coupon-templates|coupon-campaigns|coupon-redemptions|financeCoupon/);

  const financeCenterModule = findAdminModuleMenuSource(adminRegistrySource, "financeCenter");
  assert.match(financeCenterModule, /path:\s*'\/admin\/wallet\/wallet-accounts',\s*labelKey:\s*'admin\.menu\.walletAccounts'/);
  assert.match(financeCenterModule, /path:\s*'\/admin\/wallet\/wallet-ledger',\s*labelKey:\s*'admin\.menu\.walletLedger'/);
  assert.match(financeCenterModule, /path:\s*'\/admin\/finance\/order-revenue',\s*labelKey:\s*'admin\.menu\.financeOrderRevenue'/);
  assert.match(financeCenterModule, /path:\s*'\/admin\/finance\/invoices',\s*labelKey:\s*'admin\.menu\.financeInvoices'/);
  assert.doesNotMatch(financeCenterModule, /financeCouponTemplates/);
  assert.doesNotMatch(financeCenterModule, /financeCenter\.coupons/);

  for (const key of [
    "admin.menu.productCenter.catalog",
    "admin.menu.productCenter.inventory",
    "admin.menu.transactionCenter.orders",
    "admin.menu.transactionCenter.payments",
    "admin.menu.memberCenter.memberships",
    "admin.menu.marketingCenter.growth",
    "admin.menu.marketingCenter.offers",
    "admin.menu.marketingCenter.lifecycle",
    "admin.menu.marketingCenter.ledger",
    "admin.menu.marketingPromotionOffers",
    "admin.menu.marketingPromotionCouponStocks",
    "admin.menu.marketingPromotionCodes",
    "admin.menu.marketingPromotionCodeRedemptions",
    "admin.menu.marketingUserCoupons",
    "admin.menu.marketingDiscountApplications",
    "admin.menu.marketingDiscountAllocations",
    "admin.menu.marketingPromotionCouponLedger",
    "admin.menu.marketingBudgetLedger",
    "admin.menu.marketingExternalBindings",
    "admin.menu.marketingEvents",
    "admin.menu.financeCenter.wallet",
    "admin.menu.financeCenter.reports",
    "admin.menu.inventoryStocks",
    "admin.menu.inventoryReservations",
    "admin.menu.inventoryLedger",
    "admin.menu.paymentProviderAccounts",
    "admin.menu.membershipPackages",
    "admin.menu.membershipPlans",
    "admin.menu.membershipMembers",
    "admin.menu.marketingReferrals",
    "admin.menu.financeOrderRevenue",
  ]) {
    assert.match(i18nSource, new RegExp(`"${key.replaceAll(".", "\\.")}"`), `${key} must be present in i18n resources`);
  }
});

test("admin commerce section routes mount section-specific pages", () => {
  const appSource = readPortalFile("./src/App.tsx");

  assert.match(appSource, /<Route path="catalog" element=\{<Navigate to="\/admin\/catalog\/products" replace \/>} \/>/);
  assert.match(appSource, /<Route path="catalog\/products" element=\{<CatalogAdmin sectionId="products" \/>} \/>/);
  assert.match(appSource, /<Route path="inventory" element=\{<Navigate to="\/admin\/inventory\/stocks" replace \/>} \/>/);
  assert.match(appSource, /<Route path="inventory\/stocks" element=\{<InventoryAdmin sectionId="stocks" \/>} \/>/);
  assert.match(appSource, /<Route path="inventory\/reservations" element=\{<InventoryAdmin sectionId="reservations" \/>} \/>/);
  assert.match(appSource, /<Route path="orders\/refunds" element=\{<OrdersAdmin sectionId="refunds" \/>} \/>/);
  assert.match(appSource, /<Route path="payments\/provider-accounts" element=\{<PaymentsAdmin sectionId="providerAccounts" \/>} \/>/);
  assert.match(appSource, /<Route path="memberships\/packages" element=\{<MembershipsAdmin sectionId="packages" \/>} \/>/);
  assert.match(appSource, /<Route path="memberships\/plans" element=\{<MembershipsAdmin sectionId="plans" \/>} \/>/);
  assert.match(appSource, /<Route path="memberships\/members" element=\{<MembershipsAdmin sectionId="members" \/>} \/>/);
  assert.match(appSource, /<Route path="memberships\/recharge-packages" element=\{<MembershipsAdmin sectionId="rechargePackages" \/>} \/>/);
  assert.match(appSource, /<Route path="wallet\/wallet-ledger" element=\{<WalletAdmin sectionId="walletLedger" \/>} \/>/);
  assert.match(appSource, /<Route path="finance\/order-revenue" element=\{<FinanceAdmin sectionId="orderRevenueReport" \/>} \/>/);
  assert.match(appSource, /<Route path="marketing\/offers" element=\{<MarketingAdmin sectionId="promotionOffers" \/>} \/>/);
  assert.match(appSource, /<Route path="marketing\/promotion-coupon-stocks" element=\{<MarketingAdmin sectionId="promotionCouponStocks" \/>} \/>/);
  assert.match(appSource, /<Route path="marketing\/promotion-codes" element=\{<MarketingAdmin sectionId="promotionCodes" \/>} \/>/);
  assert.match(appSource, /<Route path="marketing\/promotion-code-redemptions" element=\{<MarketingAdmin sectionId="promotionCodeRedemptions" \/>} \/>/);
  assert.match(appSource, /<Route path="marketing\/user-coupons" element=\{<MarketingAdmin sectionId="userCoupons" \/>} \/>/);
  assert.match(appSource, /<Route path="marketing\/discount-applications" element=\{<MarketingAdmin sectionId="discountApplications" \/>} \/>/);
  assert.match(appSource, /<Route path="marketing\/discount-allocations" element=\{<MarketingAdmin sectionId="discountAllocations" \/>} \/>/);
  assert.match(appSource, /<Route path="marketing\/promotion-coupon-ledger" element=\{<MarketingAdmin sectionId="promotionCouponLedger" \/>} \/>/);
  assert.match(appSource, /<Route path="marketing\/budget-ledger" element=\{<MarketingAdmin sectionId="budgetLedger" \/>} \/>/);
  assert.match(appSource, /<Route path="marketing\/external-bindings" element=\{<MarketingAdmin sectionId="externalBindings" \/>} \/>/);
  assert.match(appSource, /<Route path="marketing\/events" element=\{<MarketingAdmin sectionId="promotionEvents" \/>} \/>/);
  assert.match(appSource, /<Route path="marketing\/referrals" element=\{<MarketingAdmin sectionId="referrals" \/>} \/>/);
  assert.doesNotMatch(appSource, /marketing\/coupon-templates|marketing\/coupon-campaigns|marketing\/coupon-redemptions|finance\/coupon-/);
});

test("admin finance no longer owns legacy coupon marketing surface", () => {
  const financeSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-finance/src/index.tsx");
  const i18nSource = readI18nResourceSource();

  assert.doesNotMatch(financeSource, /surface\?: 'finance' \| 'marketing'/);
  assert.doesNotMatch(financeSource, /DEFAULT_MARKETING_COUPON_SECTION_ID/);
  assert.doesNotMatch(financeSource, /couponTemplates|couponCampaigns|couponCodes|couponRedemptions/);
  assert.doesNotMatch(financeSource, /admin\.commerce\.marketing\.coupons/);
  assert.doesNotMatch(financeSource, /description=\{t\('admin\.commerce\.finance\.desc', 'Invoices, coupons/);

  for (const key of [
    "admin.commerce.marketing.coupons.title",
    "admin.commerce.marketing.coupons.desc",
    "admin.commerce.marketing.coupons.empty",
    "admin.commerce.marketing.coupons.error",
    "admin.commerce.marketing.coupons.loading",
    "admin.commerce.finance.couponTemplates.title",
    "admin.commerce.finance.couponCampaigns.title",
    "admin.commerce.finance.couponCodes.title",
    "admin.commerce.finance.couponRedemptions.title",
    "admin.menu.financeCouponTemplates",
    "admin.menu.financeCouponCampaigns",
    "admin.menu.financeCouponCodes",
    "admin.menu.financeCouponRedemptions",
  ]) {
    assert.doesNotMatch(i18nSource, new RegExp(`"${key.replaceAll(".", "\\.")}"`), `${key} must be removed from i18n resources`);
  }
});

test("admin service provider center is an independent package backed by backend SDK", () => {
  const packageJson = JSON.parse(readPortalFile("./package.json")) as { dependencies: Record<string, string> };
  const tsconfigSource = readPortalFile("./tsconfig.typecheck.json");
  const adminRegistrySource = readAdminRegistrySource();
  const appSource = readPortalFile("./src/App.tsx");
  const i18nSource = readI18nResourceSource();
  const serviceProviderPackageJson = JSON.parse(readPortalFile("./packages/sdkwork-clawrouter-pc-admin-service-provider/package.json")) as { name: string; dependencies: Record<string, string> };
  const serviceProviderSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-service-provider/src/index.tsx");
  const serviceProviderServiceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-service-provider/src/serviceProviderService.ts");
  const serviceProviderHeaderModule = findAdminModuleDefinitionSource(adminRegistrySource, "serviceProviderCenter");
  const serviceProviderMenu = findAdminModuleMenuSource(adminRegistrySource, "serviceProviderCenter");

  assert.equal(packageJson.dependencies["@sdkwork/clawrouter-pc-admin-service-provider"], "workspace:*");
  assert.equal(serviceProviderPackageJson.name, "@sdkwork/clawrouter-pc-admin-service-provider");
  assert.equal(serviceProviderPackageJson.dependencies["@sdkwork/clawrouter-backend-sdk"], undefined);
  assert.equal(serviceProviderPackageJson.dependencies["@sdkwork/clawroutes-pc-commons"], "workspace:*");
  assert.match(tsconfigSource, /"@sdkwork\/clawrouter-pc-admin-service-provider":\s*\[\s*"\.\/packages\/sdkwork-clawrouter-pc-admin-service-provider\/src\/index\.tsx"\s*\]/);

  assert.match(
    serviceProviderHeaderModule,
    /id:\s*'serviceProviderCenter',\s*nameKey:\s*'admin\.header\.serviceProviderCenter'[\s\S]*defaultPath:\s*'\/admin\/service-providers\/dashboard'[\s\S]*pathPrefixes:\s*\[[^\]]*'\/admin\/service-providers'[^\]]*\]/,
  );
  assert.deepEqual(findOrderedMatches(adminRegistrySource, /id:\s*'([^']+)'/g).slice(-1), ["serviceProviderCenter"]);
  assert.deepEqual(findOrderedMatches(adminRegistrySource, /moduleId:\s*'([^']+)'/g).slice(-1), ["serviceProviderCenter"]);
  for (const groupKey of [
    "admin.menu.serviceProviderCenter.operations",
    "admin.menu.serviceProviderCenter.governance",
    "admin.menu.serviceProviderCenter.finance",
    "admin.menu.serviceProviderCenter.control",
  ]) {
    assert.match(serviceProviderMenu, new RegExp(`groupBlock\\('${groupKey.replaceAll(".", "\\.")}'`));
  }
  for (const [path, labelKey] of [
    ["/admin/service-providers/dashboard", "admin.menu.serviceProvider.dashboard"],
    ["/admin/service-providers/providers", "admin.menu.serviceProvider.providers"],
    ["/admin/service-providers/relations", "admin.menu.serviceProvider.relations"],
    ["/admin/service-providers/downstreams", "admin.menu.serviceProvider.downstreams"],
    ["/admin/service-providers/members", "admin.menu.serviceProvider.members"],
    ["/admin/service-providers/bindings", "admin.menu.serviceProvider.bindings"],
    ["/admin/service-providers/contracts", "admin.menu.serviceProvider.contracts"],
    ["/admin/service-providers/pricing", "admin.menu.serviceProvider.pricing"],
    ["/admin/service-providers/usage", "admin.menu.serviceProvider.usage"],
    ["/admin/service-providers/wallet", "admin.menu.serviceProvider.wallet"],
    ["/admin/service-providers/statements", "admin.menu.serviceProvider.statements"],
    ["/admin/service-providers/reconciliation", "admin.menu.serviceProvider.reconciliation"],
    ["/admin/service-providers/adjustments", "admin.menu.serviceProvider.adjustments"],
    ["/admin/service-providers/risk", "admin.menu.serviceProvider.risk"],
    ["/admin/service-providers/audit", "admin.menu.serviceProvider.audit"],
  ]) {
    assert.match(
      serviceProviderMenu,
      new RegExp(`path:\\s*'${path.replaceAll("/", "\\/")}',\\s*labelKey:\\s*'${labelKey.replaceAll(".", "\\.")}'`),
    );
  }

  assert.match(appSource, /const ServiceProviderAdmin = lazyRoute<AdminSectionRouteProps>\(\(\) => import\('@sdkwork\/clawrouter-pc-admin-service-provider'\), 'ServiceProviderAdmin'\);/);
  assert.match(appSource, /<Route path="service-providers" element=\{<Navigate to="\/admin\/service-providers\/dashboard" replace \/>} \/>/);
  for (const sectionId of [
    "dashboard",
    "providers",
    "relations",
    "downstreams",
    "members",
    "bindings",
    "contracts",
    "pricing",
    "usage",
    "wallet",
    "statements",
    "reconciliation",
    "adjustments",
    "risk",
    "audit",
  ]) {
    assert.match(
      appSource,
      new RegExp(`<Route path="service-providers\\/${sectionId}" element=\\{<ServiceProviderAdmin sectionId="${sectionId}" \\/>\\} \\/>`),
    );
  }

  assert.match(i18nSource, /"admin\.header\.serviceProviderCenter":\s*"Service Provider Center"/);
  assert.match(i18nSource, /"admin\.menu\.serviceProviderCenter\.operations":\s*"Operations"/);
  assert.match(i18nSource, /"admin\.menu\.serviceProviderCenter\.governance":\s*"Governance"/);
  assert.match(i18nSource, /"admin\.menu\.serviceProviderCenter\.finance":\s*"Finance"/);
  assert.match(i18nSource, /"admin\.menu\.serviceProviderCenter\.control":\s*"Control"/);
  assert.match(i18nSource, /"admin\.menu\.serviceProvider\.dashboard":\s*"Operating Dashboard"/);
  assert.match(i18nSource, /"admin\.menu\.serviceProvider\.providers":\s*"Provider Registry"/);

  assert.match(serviceProviderSource, /export function ServiceProviderAdmin/);
  assert.match(serviceProviderSource, /const DEFAULT_SECTION_ID: ServiceProviderAdminSectionId = 'dashboard'/);
  assert.match(serviceProviderSource, /<AdminResourceCenter<ServiceProviderAdminSectionId, ServiceProviderAdminGroup>/);
  for (const serviceCall of [
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.dashboard\.retrieve\(params\)/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.providerRegistry\.list\(params\)/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.relations\.list\(params\)/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.downstreams\.list\(params\)/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.downstreams\.create\(input,/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.members\.list\(params\)/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.bindings\.list\(params\)/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.contracts\.list\(params\)/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.pricingRules\.list\(params\)/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.pricingRules\.create\(input,/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.pricingRules\.update\(ruleId, input,/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.priceSimulation\.create\(input,/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.usage\.list\(params\)/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.providerWalletAccounts\.list\(params\)/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.statements\.list\(params\)/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.reconciliationRuns\.list\(params\)/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.adjustments\.list\(params\)/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.riskEvents\.list\(params\)/,
    /getClawRouterBackendSdkClient\(\)\.serviceProviders\.auditEvents\.list\(params\)/,
  ]) {
    assert.match(serviceProviderServiceSource, serviceCall);
  }
  assert.doesNotMatch(serviceProviderServiceSource, /ServiceProviderAccountService/);
  const retiredBackendProviderResource = "getClawRouterBackendSdkClient()." + "open" + "Platform";
  assert.doesNotMatch(serviceProviderServiceSource, new RegExp(retiredBackendProviderResource.replaceAll(".", "\\.")));
  assert.doesNotMatch(serviceProviderServiceSource, /\bfetch\s*\(/);
  assert.doesNotMatch(serviceProviderServiceSource, /\baxios\b/);
  assert.doesNotMatch(serviceProviderServiceSource, /\/backend\/v3\/api/);
});

test("admin OAuth owns official account and mini program resource-account sections through appbase backend SDK", () => {
  const packageJson = JSON.parse(readPortalFile("./package.json")) as { dependencies: Record<string, string> };
  const tsconfigSource = readPortalFile("./tsconfig.typecheck.json");
  const adminRegistrySource = readAdminRegistrySource();
  const adminLayoutSource = readAdminLayoutSource();
  const appSource = readPortalFile("./src/App.tsx");
  const i18nSource = readI18nResourceSource();
  const oauthPackageJson = JSON.parse(readPortalFile("./packages/sdkwork-clawrouter-pc-admin-oauth/package.json")) as { name: string; dependencies: Record<string, string> };
  const oauthSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-oauth/src/index.tsx");
  const oauthServiceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-oauth/src/oauthAdminService.ts");
  const legacyAdminProviderPackage = "sdkwork-clawrouter-pc-admin-" + "open" + "-platform";
  const legacyOfficialPackage = "sdkwork-clawrouter-pc-admin-wechat-official-account";
  const legacyMiniProgramPackage = "sdkwork-clawrouter-pc-admin-wechat-mini-program";
  const retiredBackendSdkResource = "getClawRouterBackendSdkClient()." + "open" + "Platform";

  assert.equal(packageJson.dependencies["@sdkwork/clawrouter-pc-admin-oauth"], "workspace:*");
  assert.equal(packageJson.dependencies[legacyAdminProviderPackage], undefined);
  assert.equal(packageJson.dependencies[legacyOfficialPackage], undefined);
  assert.equal(packageJson.dependencies[legacyMiniProgramPackage], undefined);
  assert.equal(oauthPackageJson.name, "@sdkwork/clawrouter-pc-admin-oauth");
  assert.equal(oauthPackageJson.dependencies["@sdkwork/clawrouter-backend-sdk"], undefined);
  assert.equal(oauthPackageJson.dependencies["@sdkwork/clawroutes-pc-commons"], "workspace:*");
  assert.match(tsconfigSource, /"@sdkwork\/clawrouter-pc-admin-oauth":\s*\[\s*"\.\/packages\/sdkwork-clawrouter-pc-admin-oauth\/src\/index\.tsx"\s*\]/);

  const operationsHeaderModule = findAdminModuleDefinitionSource(adminRegistrySource, "operations");
  assert.match(operationsHeaderModule, /'\/admin\/oauth'/);
  const operationsMenu = findAdminModuleMenuSource(adminRegistrySource, "operations");
  assert.match(operationsMenu, /groupBlock\('admin\.menu\.ops\.oauth'/);
  assert.match(operationsMenu, /path:\s*'\/admin\/oauth\/login-platforms',\s*labelKey:\s*'admin\.menu\.oauth\.loginPlatforms'/);
  assert.match(operationsMenu, /path:\s*'\/admin\/oauth\/official-accounts',\s*labelKey:\s*'admin\.menu\.oauth\.officialAccounts'/);
  assert.match(operationsMenu, /path:\s*'\/admin\/oauth\/mini-programs',\s*labelKey:\s*'admin\.menu\.oauth\.miniPrograms'/);
  assert.match(adminLayoutSource, /from '\.\/adminSidebarActive'/);
  assert.match(adminLayoutSource, /hasActiveSidebarGroupItem\(location\.pathname, group\)/);
  assert.match(adminLayoutSource, /isSidebarItemActive\(location\.pathname, item, group\.items\)/);
  assert.match(adminLayoutSource, /isSidebarItemActive\(location\.pathname, item, siblingItems\)/);
  assert.match(adminLayoutSource, /aria-current=\{isActive \? 'page' : undefined\}/);
  assert.doesNotMatch(adminLayoutSource, /end=\{isSidebarItemExact\(item\)\}/);

  assert.match(appSource, /const OAuthAdmin = lazyRoute\(\(\) => import\('@sdkwork\/clawrouter-pc-admin-oauth'\), 'OAuthAdmin'\);/);
  assert.match(appSource, /<Route path="oauth" element=\{<Navigate to="\/admin\/oauth\/login-platforms" replace \/>} \/>/);
  assert.match(appSource, /<Route path="oauth\/login-platforms" element=\{<OAuthAdmin sectionId="oauthLoginPlatforms" \/>} \/>/);
  assert.match(appSource, /<Route path="oauth\/official-accounts" element=\{<OAuthAdmin sectionId="officialAccounts" \/>} \/>/);
  assert.match(appSource, /<Route path="oauth\/mini-programs" element=\{<OAuthAdmin sectionId="miniPrograms" \/>} \/>/);

  for (const key of [
    "admin.menu.oauth.loginPlatforms",
    "admin.menu.oauth.officialAccounts",
    "admin.menu.oauth.miniPrograms",
    "admin.oauth.sections.oauthLoginPlatforms",
    "admin.oauth.sections.officialAccounts",
    "admin.oauth.sections.miniPrograms",
  ]) {
    assert.match(i18nSource, new RegExp(`"${key.replaceAll(".", "\\.")}"`), `${key} must be present in i18n resources`);
  }
  assert.match(i18nSource, /"admin\.menu\.oauth\.officialAccounts":\s*"Official Accounts"/);
  assert.match(i18nSource, /"admin\.menu\.oauth\.miniPrograms":\s*"Mini Programs"/);

  assert.match(oauthSource, /export function OAuthAdmin/);
  assert.match(oauthSource, /sectionId\?: string/);
  assert.match(oauthSource, /const DEFAULT_SECTION_ID: OAuthAdminSectionId = 'oauthLoginPlatforms'/);
  assert.match(oauthSource, /route:\s*'\/admin\/oauth\/official-accounts'/);
  assert.match(oauthSource, /route:\s*'\/admin\/oauth\/mini-programs'/);
  assert.match(oauthSource, /resourceAccountKind: 'official_account'/);
  assert.match(oauthSource, /resourceAccountKind: 'mini_program'/);
  assert.match(oauthSource, /AdminResourceCenter/);
  assert.match(oauthSource, /activeSectionId=\{activeSection\.id\}/);
  assert.match(oauthSource, /showSectionNavigation=\{false\}/);

  for (const sdkMarker of [
    "getSdkworkAppbaseBackendSdkClient",
    "iam.oauth.resourceAccounts",
  ]) {
    assert.ok(oauthServiceSource.includes(sdkMarker), `OAuth service must use appbase backend SDK marker: ${sdkMarker}`);
  }
  assert.doesNotMatch(oauthServiceSource, new RegExp(retiredBackendSdkResource.replaceAll(".", "\\.")));
  assert.doesNotMatch(oauthServiceSource, /\bfetch\s*\(/);
  assert.doesNotMatch(oauthServiceSource, /\baxios\b/);
  assert.doesNotMatch(oauthServiceSource, /\/backend\/v3\/api/);
});

test("admin commerce pages no longer render nested second-level sidebars", () => {
  const adminResourceCenterSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/components/AdminResourceCenter.tsx");
  const catalogWrapperSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-catalog/src/index.tsx");
  const catalogSource = readPortalFile("../../packages/pc-react/commerce/sdkwork-commerce-pc-admin-product/src/index.tsx");
  const inventorySource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-inventory/src/index.tsx");
  const ordersSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-orders/src/index.tsx");
  const paymentsSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-payments/src/index.tsx");
  const walletSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-wallet/src/index.tsx");
  const financeSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-finance/src/index.tsx");
  const membershipsSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-memberships/src/index.tsx");
  const marketingSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-marketing/src/index.tsx");

  assert.match(adminResourceCenterSource, /activeSectionId\?: TSectionId/);
  assert.match(adminResourceCenterSource, /showSectionNavigation\?: boolean/);
  assert.match(adminResourceCenterSource, /showSectionNavigation && \(/);
  assert.match(catalogWrapperSource, /from "@sdkwork\/commerce-pc-admin-product"/);

  for (const source of [catalogSource, inventorySource, ordersSource, paymentsSource, walletSource, financeSource]) {
    assert.match(source, /activeSectionId=\{activeSectionId\}/);
    assert.match(source, /showSectionNavigation=\{false\}/);
  }

  assert.match(membershipsSource, /sectionId\?: string/);
  assert.match(membershipsSource, /resolveMembershipSectionId/);
  assert.match(membershipsSource, /export type MembershipsAdminSectionId =[\s\S]*\| 'packageGroups'[\s\S]*\| 'rechargePackages'/);
  assert.match(membershipsSource, /sectionId === 'plans'/);
  assert.match(membershipsSource, /import \{ MembershipPlansPage \} from '\.\/pages\/MembershipPlansPage'/);
  assert.match(membershipsSource, /<MembershipPlansPage \/>/);
  assert.match(membershipsSource, /const activeSection = resolveMembershipSectionId\(sectionId\);/);
  assert.match(membershipsSource, /activeSection === 'packages'/);
  assert.match(membershipsSource, /activeSection === 'packageGroups'/);
  assert.doesNotMatch(membershipsSource, /setActiveTab/);
  assert.doesNotMatch(marketingSource, /<aside className=/);
});

test("admin membership member level and entitlement sections do not depend on package catalog loading", () => {
  const membershipsSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-memberships/src/index.tsx");
  const packagesPageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipPackagesPage.tsx");
  const plansPageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipPlansPage.tsx");
  const membersPageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipMembersPage.tsx");
  const entitlementsPageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipEntitlementsPage.tsx");

  assert.match(membershipsSource, /<MembershipPackagesPage \/>/);
  assert.match(membershipsSource, /<MembershipPlansPage \/>/);
  assert.match(membershipsSource, /<MembersTab \/>/);
  assert.match(membershipsSource, /<EntitlementsTab loadEntitlements=\{fetchMembershipAdminEntitlements\} \/>/);
  assert.doesNotMatch(membershipsSource, /fetchMembershipAdminPackageCatalog/);
  assert.doesNotMatch(membershipsSource, /useEffect\(\(\) => \{\s*void loadData\(\);\s*\}, \[\]\);/);
  assert.match(packagesPageSource, /const loadCatalog = useCallback\(async \([^)]*\) => \{/);
  assert.match(
    packagesPageSource,
    /useEffect\(\(\) => \{\s*void loadCatalog\(\);\s*\}, \[loadCatalog\]\);/,
  );
  assert.match(packagesPageSource, /fetchMembershipAdminPackageCatalog/);
  assert.doesNotMatch(plansPageSource, /fetchMembershipAdminPackageCatalog/);
  assert.doesNotMatch(membersPageSource, /fetchMembershipAdminPackageCatalog/);
  assert.doesNotMatch(entitlementsPageSource, /fetchMembershipAdminPackageCatalog/);
  assert.match(plansPageSource, /fetchMembershipAdminPlans\(\)/);
  assert.match(membersPageSource, /fetchMembershipAdminMembers\(\)/);
  assert.match(entitlementsPageSource, /loadEntitlements = fetchMembershipAdminEntitlements/);
});

test("admin membership level management uses backend SDK memberships plans", () => {
  const plansPageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipPlansPage.tsx");
  const membershipsServiceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-memberships/src/membershipsService.ts");
  const i18nSource = readI18nResourceSource();

  assert.match(plansPageSource, /export function MembershipPlansPage\(\)/);
  assert.match(plansPageSource, /fetchMembershipAdminPlans/);
  assert.match(plansPageSource, /createMembershipAdminPlan/);
  assert.match(plansPageSource, /updateMembershipAdminPlan/);
  assert.match(plansPageSource, /deleteMembershipAdminPlan/);
  assert.match(plansPageSource, /<MembershipPlanDrawerForm/);
  assert.match(plansPageSource, /Level/);
  assert.match(membershipsServiceSource, /backendMembershipsPlansList/);
  assert.match(membershipsServiceSource, /backendMembershipsPlansCreate/);
  assert.match(membershipsServiceSource, /backendMembershipsPlansUpdate/);
  assert.match(membershipsServiceSource, /backendMembershipsPlansDelete/);
  assert.match(membershipsServiceSource, /getSdkworkCommerceService\(\)\.admin\.memberships\.plans\.list/);
  assert.match(membershipsServiceSource, /getSdkworkCommerceService\(\)\.admin\.memberships\.plans\.create/);
  assert.match(membershipsServiceSource, /getSdkworkCommerceService\(\)\.admin\.memberships\.plans\.update/);
  assert.match(membershipsServiceSource, /getSdkworkCommerceService\(\)\.admin\.memberships\.plans\.delete/);
  assert.doesNotMatch(membershipsServiceSource, /\bfetch\s*\(/);
  assert.doesNotMatch(membershipsServiceSource, /\baxios\b/);
  assert.doesNotMatch(membershipsServiceSource, /\/backend\/v3\/api/);

  for (const key of [
    "admin.menu.membershipPlans",
    "admin.commerce.memberships.plans.add",
    "admin.commerce.memberships.plans.empty",
    "admin.commerce.memberships.plans.form.code",
    "admin.commerce.memberships.plans.form.name",
    "admin.commerce.memberships.plans.form.rank",
    "admin.commerce.memberships.plans.form.status",
    "admin.commerce.memberships.plans.form.submit",
  ]) {
    assert.match(i18nSource, new RegExp(`"${key.replaceAll(".", "\\.")}"`), `${key} must be present in i18n resources`);
  }
});

test("admin home product platform group is renamed to agents and skills", () => {
  const adminRegistrySource = readAdminRegistrySource();
  const i18nSource = readI18nResourceSource();

  assert.match(
    adminRegistrySource,
    /groupBlock\('admin\.menu\.home\.agentSkills',\s*\[\s*itemBlock\(\{\s*path:\s*'\/admin\/agents',\s*labelKey:\s*'admin\.menu\.agents'[\s\S]*itemBlock\(\{\s*path:\s*'\/admin\/skill',\s*labelKey:\s*'admin\.menu\.agentSkills'/,
  );
  assert.doesNotMatch(adminRegistrySource, /groupBlock\('admin\.menu\.home\.productPlatform'/);

  const agentsAndSkillsGroup = findAdminMenuGroupSource(adminRegistrySource, "admin.menu.home.agentSkills");
  const retiredAdminProviderPath = "/admin/" + "open" + "-platform";
  assert.doesNotMatch(agentsAndSkillsGroup, /path:\s*'\/admin\/app'/);
  assert.doesNotMatch(agentsAndSkillsGroup, new RegExp(`path:\\s*'${retiredAdminProviderPath.replaceAll("/", "\\/")}'`));
  assert.match(i18nSource, /"admin\.menu\.home\.agentSkills":\s*"Agents & Skills"/);
  assert.match(i18nSource, /"admin\.menu\.home\.agentSkills":\s*"\u667a\u80fd\u4f53\u548c\u6280\u80fd"/);
});

test("admin usage records and analytics are grouped under home data management", () => {
  const adminRegistrySource = readAdminRegistrySource();
  const i18nSource = readI18nResourceSource();
  const homeMenu = findAdminModuleMenuSource(adminRegistrySource, "home");
  const operationsMenu = findAdminModuleMenuSource(adminRegistrySource, "operations");
  const homeHeaderModule = findAdminModuleDefinitionSource(adminRegistrySource, "home");
  const operationsHeaderModule = findAdminModuleDefinitionSource(adminRegistrySource, "operations");

  assert.match(
    homeMenu,
    /groupBlock\('admin\.menu\.home\.agentSkills'[\s\S]*groupBlock\('admin\.menu\.home\.dataManagement'[\s\S]*groupBlock\('admin\.menu\.home\.system'/,
  );
  assert.match(
    homeMenu,
    /groupBlock\('admin\.menu\.home\.dataManagement',\s*\[\s*itemBlock\(\{\s*path:\s*'\/admin\/record',\s*labelKey:\s*'admin\.menu\.records'[\s\S]*itemBlock\(\{\s*path:\s*'\/admin\/analytics',\s*labelKey:\s*'admin\.menu\.analytics'/,
  );

  assert.doesNotMatch(operationsMenu, /path:\s*'\/admin\/record'/);
  assert.doesNotMatch(operationsMenu, /path:\s*'\/admin\/analytics'/);
  assert.match(homeHeaderModule, /'\/admin\/record'/);
  assert.match(homeHeaderModule, /'\/admin\/analytics'/);
  assert.doesNotMatch(operationsHeaderModule, /'\/admin\/record'/);
  assert.doesNotMatch(operationsHeaderModule, /'\/admin\/analytics'/);
  assert.match(i18nSource, /"admin\.menu\.home\.dataManagement":\s*"Data Management"/);
  assert.match(i18nSource, /"admin\.menu\.home\.dataManagement":\s*"\u6570\u636e\u7ba1\u7406"/);
});

test("admin sidebar menu groups are expanded by default", () => {
  const adminLayoutSource = readAdminLayoutSource();

  assert.match(adminLayoutSource, /const ADMIN_SIDEBAR_GROUPS_DEFAULT_OPEN = true/);
  assert.match(adminLayoutSource, /defaultOpen=\{ADMIN_SIDEBAR_GROUPS_DEFAULT_OPEN\}/);
  assert.doesNotMatch(adminLayoutSource, /defaultOpen=\{group\.items\.some/);
});

test("portal aliases appbase auth and Tauri host packages for local reuse", () => {
  const packageJson = JSON.parse(readPortalFile("./package.json")) as { dependencies: Record<string, string> };
  const tsconfigSource = readPortalFile("./tsconfig.json");
  const viteConfigSource = readPortalFile("./vite.config.ts");
  const workspaceSource = readPortalFile("./pnpm-workspace.yaml");
  const tauriBridgeSource = readPortalFile("./src/auth/clawRouterTauriAuthHost.ts");
  const legacyAppbasePackageFamilyPattern = new RegExp(`packages/${["pc-react", "identity"].join("/")}`);

  assert.equal(packageJson.dependencies["@sdkwork/auth-pc-react"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/auth-runtime-pc-react"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/iam-contracts"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/iam-core-pc-react"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/iam-react"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/iam-runtime"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/iam-sdk-adapter"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/iam-sdk-ports"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/iam-service"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/runtime-bootstrap"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/appbase-pc-react"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/core-pc-react"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/host-pc-react"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/host-tauri-pc-react"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/i18n-pc-react"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/ui-pc-react"], "workspace:*");
  assert.equal(packageJson.dependencies.qrcode, "^1.5.4");
  assert.equal(packageJson.dependencies["react-hook-form"], "^7.72.1");

  for (const packageName of [
    "@sdkwork/auth-pc-react",
    "@sdkwork/auth-runtime-pc-react",
    "@sdkwork/appbase-pc-react",
    "@sdkwork/core-pc-react",
    "@sdkwork/iam-contracts",
    "@sdkwork/iam-core-pc-react",
    "@sdkwork/iam-react",
    "@sdkwork/iam-runtime",
    "@sdkwork/iam-sdk-adapter",
    "@sdkwork/iam-sdk-ports",
    "@sdkwork/iam-service",
    "@sdkwork/runtime-bootstrap",
    "@sdkwork/host-pc-react",
    "@sdkwork/host-tauri-pc-react",
    "@sdkwork/i18n-pc-react",
    "@sdkwork/ui-pc-react",
  ]) {
    assert.ok(tsconfigSource.includes(`"${packageName}"`), `${packageName} must be present in tsconfig paths`);
    assert.ok(viteConfigSource.includes(`'${packageName}'`), `${packageName} must be present in Vite aliases`);
  }
  assert.match(tsconfigSource, /packages\/pc-react\/foundation\/sdkwork-i18n-pc-react/);
  assert.match(viteConfigSource, /packages\/pc-react\/foundation\/sdkwork-i18n-pc-react/);
  assert.match(tsconfigSource, /packages\/common\/foundation\/sdkwork-runtime-bootstrap\/src\/index\.ts/);
  assert.match(viteConfigSource, /packages\/common\/foundation\/sdkwork-runtime-bootstrap\/src\/index\.ts/);
  assert.match(workspaceSource, /packages\/pc-react\/foundation\/(?:\*|sdkwork-i18n-pc-react)/);
  assert.match(tsconfigSource, /sdkwork-core\/sdkwork-core-pc-react\/src\/index\.ts/);
  assert.match(viteConfigSource, /sdkwork-core-pc-react\/src\/index\.ts/);
  assert.match(workspaceSource, /sdkwork-core\/sdkwork-core-pc-react/);
  assert.match(tsconfigSource, /sdkwork-iam\/apps\/sdkwork-iam-pc\/packages\/sdkwork-auth-pc-react/);
  assert.match(viteConfigSource, /apps\/sdkwork-iam-pc\/packages\/sdkwork-auth-pc-react/);
  assert.match(workspaceSource, /sdkwork-iam\/apps\/sdkwork-iam-pc\/packages\/(?:\*|sdkwork-auth-pc-react)/);
  assert.match(workspaceSource, /packages\/common\/foundation\/(?:\*|sdkwork-runtime-bootstrap)/);
  assert.match(workspaceSource, /sdkwork-iam\/apps\/sdkwork-iam-common\/packages\/(?:\*|sdkwork-iam-runtime)/);
  assert.doesNotMatch(tsconfigSource, legacyAppbasePackageFamilyPattern);
  assert.doesNotMatch(viteConfigSource, legacyAppbasePackageFamilyPattern);
  assert.doesNotMatch(workspaceSource, legacyAppbasePackageFamilyPattern);

  assert.match(tauriBridgeSource, /from '@sdkwork\/host-tauri-pc-react'/);
  assert.match(tauriBridgeSource, /createTauriHostBridge/);
  assert.match(tauriBridgeSource, /evaluateTauriHostBridgeReadiness/);
});

test("portal consumes sdkwork UI from source so Vite does not ship the UI dist require helper", () => {
  const tsconfigSource = readPortalFile("./tsconfig.json");
  const viteConfigSource = readPortalFile("./vite.config.ts");

  assert.match(viteConfigSource, /sdkwork-ui-pc-react\/src\/index\.ts/);
  assert.match(viteConfigSource, /sdkwork-ui-pc-react\/src\/theme\/index\.ts/);
  assert.match(
    viteConfigSource,
    /clawrouterPortalWorkspaceDependencyResolver\(configDir,\s*\[[\s\S]*appbaseRoot,[\s\S]*sdkworkCommerceRoot,[\s\S]*\]\)/,
  );
  assert.match(viteConfigSource, /workspaceDependencyRoots\.some/);
  assert.match(viteConfigSource, /function isPortalWorkspaceDependencyImporter/);
  assert.match(viteConfigSource, /isPortalWorkspaceDependencyImporter\(importer, workspaceDependencyRoots\)/);
  assert.match(viteConfigSource, /readPackageImportEntry/);
  assert.doesNotMatch(viteConfigSource, /sdkwork-ui-pc-react\/dist\/index\.js/);
  assert.doesNotMatch(viteConfigSource, /sdkwork-ui-pc-react\/dist\/theme\.js/);
  assert.match(tsconfigSource, /sdkwork-ui-pc-react\/src\/index\.ts/);
  assert.match(tsconfigSource, /sdkwork-ui-pc-react\/src\/theme\/index\.ts/);
  assert.doesNotMatch(tsconfigSource, /sdkwork-ui-pc-react\/dist\/index\.d\.ts/);
});

test("portal resolves Commerce workspace modules and their peer dependencies from source", () => {
  const packageJson = JSON.parse(readPortalFile("./package.json")) as { dependencies: Record<string, string> };
  const tsconfigSource = readPortalFile("./tsconfig.json");
  const viteConfigSource = readPortalFile("./vite.config.ts");
  const workspaceSource = readPortalFile("./pnpm-workspace.yaml");

  assert.equal(packageJson.dependencies["@sdkwork/commerce-pc-admin-product"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/commerce-pc-wallet"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/commerce-pc-membership"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/commerce-pc-membership-purchase"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/commerce-pc-billing"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/commerce-pc-checkout"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/commerce-pc-payment"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/commerce-service"], "workspace:*");
  assert.match(tsconfigSource, /sdkwork-commerce-pc-checkout\/src\/index\.ts/);
  assert.match(tsconfigSource, /sdkwork-commerce-pc-payment\/src\/index\.ts/);
  assert.match(tsconfigSource, /sdkwork-commerce-pc-admin-product\/src\/index\.tsx/);
  assert.match(tsconfigSource, /sdkwork-commerce-pc-wallet\/src\/index\.ts/);
  assert.match(tsconfigSource, /sdkwork-commerce-pc-membership\/src\/index\.ts/);
  assert.match(tsconfigSource, /sdkwork-commerce-pc-membership-purchase\/src\/index\.ts/);
  assert.match(tsconfigSource, /sdkwork-commerce-pc-billing\/src\/index\.ts/);
  assert.match(tsconfigSource, /sdkwork-commerce-service\/src\/index\.ts/);
  assert.match(tsconfigSource, /sdkwork-commerce-sdk-ports\/src\/index\.ts/);
  assert.match(tsconfigSource, /sdkwork-commerce-contracts\/src\/index\.ts/);
  assert.match(viteConfigSource, /find: '@sdkwork\/commerce-pc-admin-product'/);
  assert.match(viteConfigSource, /find: '@sdkwork\/commerce-pc-wallet'/);
  assert.match(viteConfigSource, /find: '@sdkwork\/commerce-pc-membership'/);
  assert.match(viteConfigSource, /find: '@sdkwork\/commerce-pc-membership-purchase'/);
  assert.match(viteConfigSource, /find: '@sdkwork\/commerce-pc-billing'/);
  assert.match(viteConfigSource, /find: '@sdkwork\/commerce-pc-checkout'/);
  assert.match(viteConfigSource, /find: '@sdkwork\/commerce-pc-payment'/);
  assert.match(viteConfigSource, /find: '@sdkwork\/commerce-service'/);
  assert.match(viteConfigSource, /find: '@sdkwork\/commerce-sdk-ports'/);
  assert.match(viteConfigSource, /find: '@sdkwork\/commerce-contracts'/);
  assert.match(viteConfigSource, /sdkworkCommerceRoot/);
  assert.match(viteConfigSource, /return isPortalWorkspaceDependencyImporter\(importer, workspaceDependencyRoots\)\s*&& !isSdkworkWorkspaceDependency\(source\)/);
  assert.match(viteConfigSource, /rootDefaultExport/);
  assert.match(workspaceSource, /packages\/pc-react\/commerce\/sdkwork-commerce-pc-admin-product/);
  assert.match(workspaceSource, /packages\/pc-react\/commerce\/sdkwork-commerce-pc-wallet/);
  assert.match(workspaceSource, /packages\/pc-react\/commerce\/sdkwork-commerce-pc-membership/);
  assert.match(workspaceSource, /packages\/pc-react\/commerce\/sdkwork-commerce-pc-membership-purchase/);
  assert.match(workspaceSource, /packages\/pc-react\/commerce\/sdkwork-commerce-pc-billing/);
  assert.match(workspaceSource, /packages\/common\/commerce\/\*/);
  assert.doesNotMatch(viteConfigSource, /find: 'react-i18next'/);
  assert.doesNotMatch(viteConfigSource, /find: 'react-router-dom'/);
  assert.doesNotMatch(viteConfigSource, /find: 'lucide-react'/);
});

test("portal serves the React external-store shim through an ESM compat module in Vite dev", () => {
  const compatSource = readPortalFile("./src/auth/useSyncExternalStoreShimCompat.ts");
  const withSelectorCompatSource = readPortalFile("./src/auth/useSyncExternalStoreWithSelectorCompat.ts");
  const viteConfigSource = readPortalFile("./vite.config.ts");

  assert.match(viteConfigSource, /find: 'use-sync-external-store\/shim'/);
  assert.match(viteConfigSource, /replacement: path\.resolve\(configDir, 'src\/auth\/useSyncExternalStoreShimCompat\.ts'\)/);
  assert.match(viteConfigSource, /find: 'use-sync-external-store\/shim\/with-selector'/);
  assert.match(viteConfigSource, /replacement: path\.resolve\(configDir, 'src\/auth\/useSyncExternalStoreWithSelectorCompat\.ts'\)/);
  assert.doesNotMatch(viteConfigSource, /source\.startsWith\('@radix-ui\/'\)/);
  assert.match(compatSource, /from 'react'/);
  assert.match(compatSource, /export \{ useSyncExternalStore \}/);
  assert.match(compatSource, /export default useSyncExternalStoreShim/);
  assert.match(withSelectorCompatSource, /useSyncExternalStoreWithSelector/);
  assert.match(withSelectorCompatSource, /export default useSyncExternalStoreWithSelectorShim/);
});

test("portal typecheck remains scoped to claw router packages after appbase workspace reuse", () => {
  const packageJson = JSON.parse(readPortalFile("./package.json")) as { scripts: Record<string, string> };

  assert.equal(packageJson.scripts.typecheck, "tsc -p tsconfig.typecheck.json --noEmit");
  assert.equal(packageJson.scripts.lint, "tsc -p tsconfig.typecheck.json --noEmit");
});
