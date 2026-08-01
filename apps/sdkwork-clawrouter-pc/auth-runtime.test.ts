import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import {
  mergeClawRouterAuthRuntimeConfig,
  DEFAULT_CLAW_ROUTER_AUTH_RUNTIME_CONFIG,
} from "./src/auth/clawRouterAuthConfig.ts";
import {
  PROTECTED_PORTAL_ROUTE_PREFIXES,
  buildProtectedPortalLoginRedirect,
  isProtectedPortalPath,
  resolveProtectedPortalAccess,
} from "./src/auth/protectedPortalRoutes.ts";
import {
  resolvePortalAuthenticatedAuthRouteRedirect,
} from "./packages/sdkwork-clawroutes-pc-commons/src/portal-auth.ts";
import {
  clearStoredAppSessionToken,
  loadStoredAppSessionToken,
  storeAppSessionFromResult,
} from "./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts";

type AuthSettingsPageModule = typeof import("./packages/sdkwork-clawrouter-pc-admin-site/src/ClawRouterAuthSettingsPage.tsx");

let authSettingsPageModulePromise: Promise<AuthSettingsPageModule> | undefined;

async function loadAuthSettingsPageModule(): Promise<AuthSettingsPageModule> {
  authSettingsPageModulePromise ??= import("./packages/sdkwork-clawrouter-pc-admin-site/src/ClawRouterAuthSettingsPage.tsx");
  return authSettingsPageModulePromise;
}

type SdkClientsModule = typeof import("./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts");
type AuthIamRuntimeModule = typeof import("../../../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react/src/auth-iam-runtime.ts");
type PortalSessionModule = typeof import("./packages/sdkwork-clawroutes-pc-commons/src/portal-session.ts");

let sdkClientsModulePromise: Promise<SdkClientsModule> | undefined;
let authIamRuntimeModulePromise: Promise<AuthIamRuntimeModule> | undefined;
let portalSessionModulePromise: Promise<PortalSessionModule> | undefined;

async function loadSdkClientsModule(): Promise<SdkClientsModule> {
  sdkClientsModulePromise ??= import("./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts");
  return sdkClientsModulePromise;
}

async function loadAuthIamRuntimeModule(): Promise<AuthIamRuntimeModule> {
  authIamRuntimeModulePromise ??= import("../../../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react/src/auth-iam-runtime.ts");
  return authIamRuntimeModulePromise;
}

async function loadPortalSessionModule(): Promise<PortalSessionModule> {
  portalSessionModulePromise ??= import("./packages/sdkwork-clawroutes-pc-commons/src/portal-session.ts");
  return portalSessionModulePromise;
}

async function loadSdkSessionAuthRuntime() {
  const {
    createClawRouterAppSdkClient,
    getClawRouterAppSdkClient,
    handleClawRouterSdkSessionAuthError,
    isClawRouterSdkSessionAuthError,
    resetClawRouterSdkSessionAuthRedirectState,
  } = await loadSdkClientsModule();
  return {
    createClawRouterAppSdkClient,
    getClawRouterAppSdkClient,
    handleClawRouterSdkSessionAuthError,
    isClawRouterSdkSessionAuthError,
    resetClawRouterSdkSessionAuthRedirectState,
  };
}

function readPortalFile(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function readRepoFile(relativePath: string): string {
  return readFileSync(new URL(relativePath, new URL("../../", import.meta.url)), "utf8");
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

function includeI18nLocaleContext(file: { relativePath: string; source: string }): string {
  if (file.relativePath.includes("/en-US/")) {
    return `en: {\n${file.source}\n}`;
  }
  if (file.relativePath.includes("/zh-CN/")) {
    return `zh: {\n${file.source}\n}`;
  }
  return file.source;
}

function readI18nResourceSource(): string {
  return [
    readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/index.ts"),
    ...readI18nResourceFiles().map(includeI18nLocaleContext),
    ...readPortalSourceFiles("./packages/sdkwork-clawrouter-pc-admin-upstream/src/i18n/")
      .map(includeI18nLocaleContext),
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
    for (const key of findOrderedMatches(localeSource, /["']([^"']+)["']\s*:/g)) {
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
  assert.match(authRouteSource, /from '\.\/clawRouterAuthRuntime'/);
  assert.doesNotMatch(authRouteSource, /ClawRouterAuthOAuthCallbackRoute/);
  assert.match(authRouteSource, /basePath="\/auth"/);
  assert.match(authRouteSource, /locale=\{i18n\.language\}/);
  assert.match(authRouteSource, /getRuntime=\{getClawRouterAuthRuntime\}/);
  assert.match(authRouteSource, /homePath="\/admin"/);
  assert.match(authRouteSource, /AUTH_METHOD_UNAVAILABLE_MESSAGE/);
  assert.match(authRouteSource, /methodUnavailableMessage=\{AUTH_METHOD_UNAVAILABLE_MESSAGE\}/);
});

test("authenticated auth routes default to admin while preserving an explicit redirect", () => {
  assert.equal(
    resolvePortalAuthenticatedAuthRouteRedirect({
      location: { pathname: "/auth/login" },
    }),
    "/admin",
  );
  assert.equal(
    resolvePortalAuthenticatedAuthRouteRedirect({
      location: { pathname: "/auth/login", search: "?redirect=%2Fconsole%2Fdashboard" },
    }),
    "/console/dashboard",
  );
});

test("claw router auth controller reuses appbase runtime while preserving app SDK boundary", () => {
  const controllerSource = readPortalFile("./src/auth/clawRouterAuthController.ts");
  const runtimeAdapterSource = readPortalFile("./src/auth/clawRouterAuthRuntime.ts");
  const routeSource = readPortalFile("./src/auth/ClawRouterAuthRoutes.tsx");
  const configSource = readPortalFile("./src/auth/clawRouterAuthConfig.ts");
  const settingsServiceSource = readPortalFile("./src/auth/clawRouterAuthSettingsService.ts");
  const adminSettingsServiceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-site/src/AuthSettingsService.ts");
  const iamRuntimeSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/iam-runtime.ts");
  const sdkClientsSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts");

  assert.match(controllerSource, /createSdkworkIamRuntimeAuthController/);
  assert.match(controllerSource, /getClawRouterAuthRuntime/);
  assert.doesNotMatch(controllerSource, /getClawRouterIamRuntime/);
  assert.match(runtimeAdapterSource, /getClawRouterIamRuntime/);
  assert.match(runtimeAdapterSource, /SdkworkIamRuntimeAuthRuntimeLike/);
  assert.match(runtimeAdapterSource, /toIamRegistrationInput/);
  assert.match(runtimeAdapterSource, /toIamRefreshSessionInput/);
  assert.doesNotMatch(runtimeAdapterSource, /as unknown as/);
  assert.match(iamRuntimeSource, /createSdkworkAppbasePcAuthRuntime/);
  assert.match(iamRuntimeSource, /createAppbaseAppClient:\s*getSdkworkAppbaseAppSdkClient/);
  assert.match(iamRuntimeSource, /credentialEntry:\s*\{[\s\S]*prepareTokens:\s*prepareClawRouterCredentialEntryTokens/u);
  assert.doesNotMatch(iamRuntimeSource, /wrapCredentialEntryClient|skipWrap/u);
  assert.match(iamRuntimeSource, /prepareTokens:\s*prepareClawRouterCredentialEntryTokens/);
  assert.match(iamRuntimeSource, /bindClawRouterIamSessionProjection/);
  assert.match(iamRuntimeSource, /patchClawRouterIamContextStore/);
  assert.match(iamRuntimeSource, /readSession:\s*\(\)\s*=>\s*toPortalIamBridgeSession\(loadStoredAppSessionToken\(\)\)/);
  assert.match(iamRuntimeSource, /sdkClients:\s*\[/);
  assert.match(iamRuntimeSource, /getClawRouterAppSdkClient\(\)/);
  assert.match(iamRuntimeSource, /getSdkworkDriveAppSdkClient\(\)/);
  assert.match(iamRuntimeSource, /getSdkworkGenerationsAppSdkClient\(\)/);
  for (const capability of ['Account', 'Catalog', 'Membership', 'Order', 'Payment', 'Promotion']) {
    assert.match(iamRuntimeSource, new RegExp(`getSdkwork${capability}AppSdkClient\\(\\)`));
  }
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
  assert.match(sdkClientsSource, /function buildDependencyAppConfig\([\s\S]*?tokenManager:\s*resolveClawRouterSdkTokenManager\(options\.tokenManager\)/);
  assert.doesNotMatch(sdkClientsSource, /DomainTransport|BackendDomainDependencyOverlay|facade\.catalog\.spus/);
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
  assert.match(routeSource, /getClawRouterAuthRuntime/);
  assert.match(routeSource, /from '\.\/clawRouterAuthRuntime'/);
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
  assert.equal("qrLoginType" in config, false);
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

test("auth runtime config validates backend QR login types without exposing a retired client field", () => {
  for (const qrLoginType of ["web", "official", "mini"] as const) {
    const config = mergeClawRouterAuthRuntimeConfig(authRuntimeSettingsFixture({ qrLoginType }));
    assert.equal("qrLoginType" in config, false);
  }
  assert.equal("qrLoginType" in DEFAULT_CLAW_ROUTER_AUTH_RUNTIME_CONFIG, false);
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
  const appSdkAssemblySource = readPortalFile("../../sdks/clawrouter-app-sdk/sdk-manifest.json");
  const appSdkComponentSource = readPortalFile("../../sdks/clawrouter-app-sdk/specs/component.spec.json");
  const appSdkSource = readPortalFile("../../sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi/src/sdk.ts");
  const backendSdkSystemSource = readPortalFile("../../sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi/src/api/system.ts");
  const backendSdkIndexSource = readPortalFile("../../sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi/src/sdk.ts");
  const backendSdkAuthSettingsUpdateSource = readPortalFile("../../sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi/src/types/admin-auth-settings-update-request.ts");
  const adminCoreSdkSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-core/src/sdk/index.ts");
  const appSdkTypesSource = readPortalFile("../../sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi/src/types/index.ts");
  const backendSdkTypesSource = readPortalFile("../../sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi/src/types/index.ts");
  const appbaseAuthServiceSource = readPortalFile("../../../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react/src/auth-service.ts");
  const appbaseIamRuntimeSource = readPortalFile("../../../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react/src/auth-iam-runtime.ts");
  const appbaseIamSdkPortsSource = readPortalFile("../../../sdkwork-iam/apps/sdkwork-iam-common/packages/sdkwork-iam-sdk-ports/src/index.ts");
  const retiredProviderPlatformSnake = "open" + "_platform";
  const retiredProviderPlatformCamel = "open" + "Platform";
  const retiredQrNamespace = "qr" + "Auth";

  const iamAppbaseOperationIds = [
    "authorizationUrls.create",
    "sessions.create",
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
  ] as const;

  for (const operationId of iamAppbaseOperationIds) {
    assert.match(appbaseAppOpenApiSource, new RegExp(`"operationId":\\s*"${operationId.replaceAll(".", "\\.")}"`));
  }
  assert.match(appbaseAppOpenApiSource, /"\/app\/v3\/api\/oauth\/authorization_urls"/);
  assert.match(appbaseAppOpenApiSource, /"\/app\/v3\/api\/oauth\/sessions"/);
  assert.doesNotMatch(contractSource, new RegExp(`/app/v3/api/${retiredProviderPlatformSnake}`));
  assert.doesNotMatch(contractSource, /api_path:\s*\/app\/v3\/api\/auth\/oauth_authorization_urls/);
  assert.doesNotMatch(contractSource, /api_path:\s*\/app\/v3\/api\/auth\/oauth_sessions/);
  assert.doesNotMatch(contractSource, /api_path:\s*\/app\/v3\/api\/auth\/qr_login_codes/);
  assert.match(appbaseAppOpenApiSource, /"\/app\/v3\/api\/auth\/sessions"/);
  assert.match(appbaseAppOpenApiSource, /"\/app\/v3\/api\/auth\/registrations"/);
  assert.match(contractSource, /operation_id:\s*auth\.settings\.retrieve/);
  assert.match(contractSource, /operation_id:\s*auth\.settings\.update/);
  assert.match(contractSource, /api_path:\s*\/backend\/v3\/api\/system\/auth\/settings/);
  assert.match(appbaseAppOpenApiSource, /"operationId":\s*"iam\.runtime\.retrieve"/);
  assert.match(appbaseAppOpenApiSource, /"\/app\/v3\/api\/system\/iam\/runtime"/);
  assert.match(appbaseAppOpenApiSource, /"operationId":\s*"iam\.verificationPolicy\.retrieve"/);
  assert.match(appbaseAppOpenApiSource, /"\/app\/v3\/api\/system\/iam\/verification_policy"/);
  assert.doesNotMatch(contractSource, /api_path:\s*\/app\/v3\/api\/auth\/runtime_settings/);
  assert.doesNotMatch(contractSource, /api_path:\s*\/app\/v3\/api\/auth\/verification_policy/);
  assert.match(adminCoreSdkSource, /emailRegistrationVerificationRequired:\s*boolean/);
  assert.match(adminCoreSdkSource, /phoneRegistrationVerificationRequired:\s*boolean/);
  assert.match(backendSdkAuthSettingsUpdateSource, /qrLoginType/);
  assert.match(backendSdkAuthSettingsUpdateSource, /wechat\?:/);
  assert.match(adminCoreSdkSource, /AdminAuthWechatOfficial/);
  assert.match(adminCoreSdkSource, /AdminAuthWechatMini/);
  assert.match(appbaseAppOpenApiSource, /"\/app\/v3\/api\/auth\/password_reset_requests"/);
  assert.match(appbaseAppOpenApiSource, /"\/app\/v3\/api\/iam\/users\/current"/);
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
    ["/app/v3/api/oauth/authorization_urls", "post", "authorizationUrls.create"],
    ["/app/v3/api/oauth/sessions", "post", "sessions.create"],
    ["/app/v3/api/oauth/device_authorizations", "post", "deviceAuthorizations.create"],
    ["/app/v3/api/oauth/device_authorizations/{deviceAuthorizationId}", "get", "deviceAuthorizations.retrieve"],
    ["/app/v3/api/oauth/device_authorizations/{deviceAuthorizationId}/scans", "post", "deviceAuthorizations.scans.create"],
    ["/app/v3/api/oauth/device_authorizations/{deviceAuthorizationId}/password_completions", "post", "deviceAuthorizations.passwordCompletions.create"],
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

  assert.equal(existsSync(new URL("../../sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/src/api/auth.ts", import.meta.url)), false);
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
  assert.ok(backendOpenApi.components?.schemas?.AdminAuthSettingsUpdateRequest?.properties?.verificationPolicy);
  assert.ok(backendOpenApi.components?.schemas?.AdminAuthSettingsUpdateRequest?.properties?.wechat);
  assert.equal(backendOpenApi.components?.schemas?.AdminAuthSettingsUpdateRequest?.properties?.loginMethods?.minItems, 1);
  assert.equal(backendOpenApi.components?.schemas?.AdminAuthSettingsUpdateRequest?.properties?.registerMethods?.minItems, 1);
  assert.equal(backendOpenApi.components?.schemas?.AdminAuthSettingsUpdateRequest?.properties?.recoveryMethods?.minItems, 1);
  assert.doesNotMatch(backendSdkIndexSource, /public readonly auth:/);
  assert.match(backendSdkSystemSource, /public readonly auth: SystemAuthApi/);
  assert.match(backendSdkSystemSource, /public readonly settings: SystemAuthSettingsApi/);
  assert.match(
    backendSdkSystemSource,
    /async retrieve\(requestOptions\?: ApiRequestOptions\): Promise<AdminAuthSettingsResponse>/,
  );
  assert.match(backendSdkSystemSource, /async update\(body: AdminAuthSettingsUpdateRequest/);
  assert.match(backendSdkAuthSettingsUpdateSource, /qrLoginType\?: 'web' \| 'official' \| 'mini'/);
  assert.match(backendSdkAuthSettingsUpdateSource, /wechat\?: Record<string, JsonValue>/);
  assert.match(adminCoreSdkSource, /AdminAuthVerificationPolicy/);
  assert.match(adminCoreSdkSource, /mini: AdminAuthWechatMini\[\]/);
  assert.match(adminCoreSdkSource, /official: AdminAuthWechatOfficial\[\]/);
  assert.doesNotMatch(appSdkTypesSource, /admin-auth-settings-response/);
  assert.doesNotMatch(appSdkTypesSource, /admin-auth-verification-policy/);
  assert.match(backendSdkTypesSource, /from '\.\/admin-auth-settings-response'/);
  assert.match(backendSdkTypesSource, /from '\.\/admin-auth-settings-update-request'/);
  assert.doesNotMatch(backendSdkTypesSource, /admin-auth-wechat-(settings|official|mini)/);
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
  const adminHostSource = readPortalFile("./src/admin/clawRouterAdminHostMount.tsx");
  const adminRegistrySource = readAdminRegistrySource();
  const settingsPageSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-site/src/ClawRouterAuthSettingsPage.tsx");
  const settingsServiceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-site/src/AuthSettingsService.ts");
  const routeClassificationSource = readPortalFile("../../docs/schema-registry/frontend-route-classification.yaml");

  assert.match(adminHostSource, /lazyAdminRoute\(\(\) => import\('@sdkwork\/clawrouter-pc-admin-site'\), 'ClawRouterAuthSettingsPage'\)/);
  assert.match(adminHostSource, /route\('settings', 'sdkwork-clawrouter', '@sdkwork\/clawrouter-pc-admin-site', \['clawrouter-backend-sdk'\]/);
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
  assert.match(routeClassificationSource, /apps\/sdkwork-clawrouter-pc\/packages\/sdkwork-clawrouter-pc-admin-site\/src\/AuthSettingsService\.ts/);
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

test("admin auth settings form preserves compact WeChat QR settings and validates mini program URLs", async () => {
  const { toAuthSettingsForm, toAuthSettingsRequest } = await loadAuthSettingsPageModule();
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

test("admin auth settings form preserves flexible OAuth providers and validates provider codes", async () => {
  const {
    formatOAuthProviders,
    parseOAuthProviderText,
    toAuthSettingsForm,
    toAuthSettingsRequest,
  } = await loadAuthSettingsPageModule();
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

test("generated appbase app SDK surface satisfies the IAM SDK port contract", async () => {
  const productSdkSource = readPortalFile("../../sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi/src/sdk.ts");
  const iamSdkPortsSource = readPortalFile("../../../sdkwork-iam/apps/sdkwork-iam-common/packages/sdkwork-iam-sdk-ports/src/index.ts");
  const authServiceSource = readPortalFile("../../../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react/src/auth-service.ts");
  const iamRuntimeSource = readPortalFile("../../../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react/src/auth-iam-runtime.ts");
  const retiredProviderPlatformCamel = "open" + "Platform";
  const { createClient } = await import("@sdkwork/iam-app-sdk");
  const client = createClient({ baseUrl: "http://localhost:18082" });

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

  assert.equal(typeof client.oauth.authorizationUrls.create, "function");
  assert.equal(typeof client.oauth.sessions.create, "function");
  assert.equal(typeof client.auth.passwordResetRequests.create, "function");
  assert.equal(typeof client.auth.passwordResets.create, "function");
  assert.equal(typeof client.auth.registrations.create, "function");
  assert.equal(typeof client.auth.sessions.create, "function");
  assert.equal(typeof client.auth.sessions.current.retrieve, "function");
  assert.equal(typeof client.auth.sessions.current.update, "function");
  assert.equal(typeof client.auth.sessions.current.delete, "function");
  assert.equal(typeof client.auth.sessions.refresh, "function");
  assert.equal(typeof client.iam.users.current.retrieve, "function");
  assert.equal(typeof client.system.iam.runtime.retrieve, "function");
  assert.equal(typeof client.system.iam.verificationPolicy.retrieve, "function");
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
    "/token-plan",
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
  const { createSdkworkIamRuntimeAuthService } = await loadAuthIamRuntimeModule();
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

test("claw router app session persists across browser tabs via shared localStorage", async () => {
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

    storageHarness.openNewTab();
    const newTab = await importFreshAppSessionTokenModule();
    const restored = newTab.loadStoredAppSessionToken();
    assert.ok(restored);
    assert.equal(restored.accessToken, "shared-access-token");
    assert.equal(restored.authToken, "shared-auth-token");
    assert.equal(restored.refreshToken, "shared-refresh-token");
    assert.equal(restored.sessionId, "shared-session-id");
    assert.equal(newTab.getStoredAppSessionAuthToken(), "shared-auth-token");
    assert.equal(newTab.getStoredAppSessionAccessToken(), "shared-access-token");
  } finally {
    clearStoredAppSessionToken();
    storageHarness.restore();
  }
});

test("current portal session clears stale local tokens when IAM returns an unusable session payload", async () => {
  const portalSession = await loadPortalSessionModule();
  const host = globalThis as typeof globalThis & {
    __SDKWORK_APPBASE_APP_SDK_CLIENT__?: unknown;
  };
  const previousAppbaseAppClient = host.__SDKWORK_APPBASE_APP_SDK_CLIENT__;

  try {
    storeAppSessionFromResult({
      code: 0,
      data: {
        accessToken: "stale-access-token",
        authToken: "stale-auth-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        refreshToken: "stale-refresh-token",
        sessionId: "stale-session-id",
      },
    });
    host.__SDKWORK_APPBASE_APP_SDK_CLIENT__ = {
      auth: {
        sessions: {
          current: {
            retrieve: async () => ({
              code: 0,
              data: {
                item: {
                  sessionId: "current-session-without-tokens",
                },
              },
            }),
          },
        },
      },
    };

    await assert.doesNotReject(() => portalSession.fetchCurrentPortalSession());
    assert.equal(loadStoredAppSessionToken(), null);
  } finally {
    if (previousAppbaseAppClient === undefined) {
      delete host.__SDKWORK_APPBASE_APP_SDK_CLIENT__;
    } else {
      host.__SDKWORK_APPBASE_APP_SDK_CLIENT__ = previousAppbaseAppClient;
    }
    clearStoredAppSessionToken();
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
  assert.equal(isAdminRouteAllowed("/admin/upstream", ["iam.users.read"]), false);
  assert.equal(isAdminRouteAllowed("/admin/upstream", ["clawrouter.admin.access"]), true);
  assert.equal(isAdminRouteAllowed("/admin/dashboard", ["clawrouter.admin.access"]), true);
  assert.equal(isAdminRouteAllowed("/admin/dashboard", ["clawrouter.*"]), true);
  assert.equal(isAdminRouteAllowed("/admin/upstream", ["*"]), true);
});

test("portal i18n keeps document language aligned with active locale", () => {
  const i18nSource = readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/index.ts");
  const mainSource = readPortalFile("./src/main.tsx");
  assert.match(mainSource, /SdkworkI18nProvider/);
  assert.match(mainSource, /syncDocumentLanguage/);
  assert.doesNotMatch(i18nSource, /initReactI18next|\.use\(/);
});

test("generated SDK auth errors clear the app session and redirect protected pages to login", async () => {
  const {
    handleClawRouterSdkSessionAuthError,
    isClawRouterSdkSessionAuthError,
    resetClawRouterSdkSessionAuthRedirectState,
  } = await loadSdkSessionAuthRuntime();
  const redirects: string[] = [];
  const restoreWindow = installPortalAuthRedirectWindow({
    hash: "#risk",
    pathname: "/admin/upstream",
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
      "/auth/login?redirect=%2Fadmin%2Fupstream%3Fprovider_id%3D2%23risk",
    ]);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkSessionAuthRedirectState();
    restoreWindow();
  }
});

test("generated SDK ProblemDetail invalid-session errors clear the app session", async () => {
  const {
    handleClawRouterSdkSessionAuthError,
    isClawRouterSdkSessionAuthError,
    resetClawRouterSdkSessionAuthRedirectState,
  } = await loadSdkSessionAuthRuntime();
  const redirects: string[] = [];
  const restoreWindow = installPortalAuthRedirectWindow({
    hash: "",
    pathname: "/console/dashboard",
    replace: (to) => redirects.push(to),
    search: "",
  });
  const invalidSessionProblem = {
    code: 40103,
    detail: "invalid or expired IAM session",
    i18nKey: "errors.result.40103",
    instance: "GET /app/v3/api/ai/dashboard/overview",
    operationId: "dashboard.overview.retrieve",
    status: 401,
    title: "Invalid token",
    traceId: "eb9cbae506d84c7a868ffbf53a43a553",
    type: "https://docs.sdkwork.com/problems/40103",
  };

  try {
    resetClawRouterSdkSessionAuthRedirectState();
    storeAppSessionFromResult({
      code: "200",
      data: {
        accessToken: "stale-access-token",
        authToken: "stale-auth-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
    });

    assert.equal(isClawRouterSdkSessionAuthError(invalidSessionProblem), true);
    assert.equal(handleClawRouterSdkSessionAuthError(invalidSessionProblem), true);

    assert.equal(loadStoredAppSessionToken(), null);
    assert.deepEqual(redirects, ["/auth/login?redirect=%2Fconsole%2Fdashboard"]);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkSessionAuthRedirectState();
    restoreWindow();
  }
});

test("invalid IAM sessions clear local auth state even when unauthorized mode is debug", async () => {
  const {
    handleClawRouterSdkSessionAuthError,
    resetClawRouterSdkSessionAuthRedirectState,
  } = await loadSdkSessionAuthRuntime();
  const redirects: string[] = [];
  const sessionAuthEvents: Array<Record<string, unknown>> = [];
  const restoreWindow = installPortalAuthRedirectWindow({
    hash: "",
    hostname: "127.0.0.1",
    pathname: "/console/membership",
    replace: (to) => redirects.push(to),
    runtimeEnv: {
      VITE_SDKWORK_SESSION_AUTH_UNAUTHORIZED_MODE: "debug",
    },
    search: "",
    sessionAuthEvents,
  });

  try {
    resetClawRouterSdkSessionAuthRedirectState();
    storeAppSessionFromResult({
      code: 0,
      data: {
        accessToken: "stale-access-token",
        authToken: "stale-auth-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
    });

    assert.equal(handleClawRouterSdkSessionAuthError({
      code: 40103,
      detail: "invalid or expired IAM session",
      instance: "GET /app/v3/api/memberships/current",
      operationId: "memberships.current.retrieve",
      status: 401,
      title: "Invalid token",
    }), true);

    assert.equal(loadStoredAppSessionToken(), null);
    assert.deepEqual(redirects, []);
    assert.deepEqual(sessionAuthEvents, []);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkSessionAuthRedirectState();
    restoreWindow();
  }
});

test("injected app SDK clients retain the invalid-session cleanup boundary", async () => {
  const {
    getClawRouterAppSdkClient,
    resetClawRouterSdkSessionAuthRedirectState,
  } = await loadSdkSessionAuthRuntime();
  const host = globalThis as typeof globalThis & {
    __SDKWORK_CLAW_ROUTER_APP_SDK_CLIENT__?: unknown;
  };
  const injectedDescriptor = Object.getOwnPropertyDescriptor(
    host,
    "__SDKWORK_CLAW_ROUTER_APP_SDK_CLIENT__",
  );
  const restoreWindow = installPortalAuthRedirectWindow({
    hash: "",
    hostname: "127.0.0.1",
    pathname: "/console/membership",
    replace: () => {},
    search: "",
  });
  const invalidSessionProblem = {
    code: 40103,
    detail: "invalid or expired IAM session",
    status: 401,
    title: "Invalid token",
  };

  try {
    resetClawRouterSdkSessionAuthRedirectState();
    storeAppSessionFromResult({
      code: 0,
      data: {
        accessToken: "stale-access-token",
        authToken: "stale-auth-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
    });
    Object.defineProperty(host, "__SDKWORK_CLAW_ROUTER_APP_SDK_CLIENT__", {
      configurable: true,
      value: {
        http: {
          request: async () => Promise.reject(invalidSessionProblem),
        },
      },
    });

    const client = getClawRouterAppSdkClient();
    await assert.rejects(
      () => client.http.request("/memberships/current"),
      (error) => error === invalidSessionProblem,
    );
    assert.equal(loadStoredAppSessionToken(), null);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkSessionAuthRedirectState();
    if (injectedDescriptor) {
      Object.defineProperty(host, "__SDKWORK_CLAW_ROUTER_APP_SDK_CLIENT__", injectedDescriptor);
    } else {
      delete host.__SDKWORK_CLAW_ROUTER_APP_SDK_CLIENT__;
    }
    restoreWindow();
  }
});

test("generated SDK auth errors clear stale sessions on public pages without forcing login", async () => {
  const {
    handleClawRouterSdkSessionAuthError,
    resetClawRouterSdkSessionAuthRedirectState,
  } = await loadSdkSessionAuthRuntime();
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

test("generated SDK auth errors stay on local protected pages when dev redirect bypass is enabled", async () => {
  const {
    handleClawRouterSdkSessionAuthError,
    resetClawRouterSdkSessionAuthRedirectState,
  } = await loadSdkSessionAuthRuntime();
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

    assert.equal(loadStoredAppSessionToken(), null);
    assert.deepEqual(redirects, []);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkSessionAuthRedirectState();
    restoreWindow();
  }
});

test("generated SDK auth errors open modal details on local protected pages by default", async () => {
  const {
    handleClawRouterSdkSessionAuthError,
    resetClawRouterSdkSessionAuthRedirectState,
  } = await loadSdkSessionAuthRuntime();
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

    assert.equal(loadStoredAppSessionToken(), null);
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

test("generated SDK auth errors redirect from local protected pages when redirect mode is configured", async () => {
  const {
    handleClawRouterSdkSessionAuthError,
    resetClawRouterSdkSessionAuthRedirectState,
  } = await loadSdkSessionAuthRuntime();
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

test("generated SDK unauthorized errors redirect once and skip auth pages", async () => {
  const {
    handleClawRouterSdkSessionAuthError,
    isClawRouterSdkSessionAuthError,
    resetClawRouterSdkSessionAuthRedirectState,
  } = await loadSdkSessionAuthRuntime();
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
  const {
    createClawRouterAppSdkClient,
    resetClawRouterSdkSessionAuthRedirectState,
  } = await loadSdkSessionAuthRuntime();
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

test("generated SDK request boundary clears sessions for invalid IAM session ProblemDetails", async () => {
  const {
    createClawRouterAppSdkClient,
    resetClawRouterSdkSessionAuthRedirectState,
  } = await loadSdkSessionAuthRuntime();
  const redirects: string[] = [];
  const restoreWindow = installPortalAuthRedirectWindow({
    hash: "",
    pathname: "/console/dashboard",
    replace: (to) => redirects.push(to),
    search: "",
  });
  const previousFetch = globalThis.fetch;

  try {
    resetClawRouterSdkSessionAuthRedirectState();
    storeAppSessionFromResult({
      code: "200",
      data: {
        accessToken: "stale-access-token",
        authToken: "stale-auth-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
    });
    globalThis.fetch = async () => new Response(
      JSON.stringify({
        code: 40103,
        detail: "invalid or expired IAM session",
        i18nKey: "errors.result.40103",
        instance: "GET /app/v3/api/ai/dashboard/overview",
        operationId: "dashboard.overview.retrieve",
        status: 401,
        title: "Invalid token",
        traceId: "eb9cbae506d84c7a868ffbf53a43a553",
        type: "https://docs.sdkwork.com/problems/40103",
      }),
      {
        headers: { "content-type": "application/problem+json" },
        status: 401,
      },
    );

    const client = createClawRouterAppSdkClient({
      appBaseUrl: "https://example.test/app/v3/api",
    });

    await assert.rejects(
      () => client.http.get("/ai/dashboard/overview"),
      /invalid or expired IAM session/,
    );
    assert.equal(loadStoredAppSessionToken(), null);
    assert.deepEqual(redirects, ["/auth/login?redirect=%2Fconsole%2Fdashboard"]);
  } finally {
    globalThis.fetch = previousFetch;
    clearStoredAppSessionToken();
    resetClawRouterSdkSessionAuthRedirectState();
    restoreWindow();
  }
});

test("dashboard SDK requests send the IAM dual-token headers", async () => {
  const { createClawRouterAppSdkClient } = await loadSdkSessionAuthRuntime();
  const previousFetch = globalThis.fetch;
  let requestHeaders: Headers | undefined;

  try {
    storeAppSessionFromResult({
      code: 0,
      data: {
        accessToken: "dashboard-access-token",
        authToken: "dashboard-auth-token",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
    });
    globalThis.fetch = async (_input, init) => {
      requestHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ code: 0, data: {} }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };

    const client = createClawRouterAppSdkClient({
      appBaseUrl: "https://example.test/app/v3/api",
    });
    await client.ai.dashboard.overview.retrieve({});

    assert.equal(requestHeaders?.get("Access-Token"), "dashboard-access-token");
    assert.equal(requestHeaders?.get("Authorization"), "Bearer dashboard-auth-token");
  } finally {
    globalThis.fetch = previousFetch;
    clearStoredAppSessionToken();
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
  assert.match(guardSource, /usePortalIamSession/);
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
  assert.match(sharedAuthSource, /loadStoredAppSessionToken/);
  assert.match(sharedAuthSource, /isSdkworkIamSessionAuthenticated/);
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
  const awaitedLogoutNavigationPattern =
    /await revokeAppSession\(\);\s*\} finally \{\s*navigate\('\/', \{ replace: true \}\);/;
  assert.match(consoleLayoutSource, awaitedLogoutNavigationPattern);
  assert.match(adminLayoutSource, awaitedLogoutNavigationPattern);
  assert.match(consoleLayoutSource, /disabled=\{isLoggingOut\}/);
  assert.match(adminLayoutSource, /disabled=\{isLoggingOut\}/);
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
  assert.match(adminRegistrySource, /groupBlock\('admin\.menu\.home\.upstreamManagement'/);
  assert.match(adminRegistrySource, /groupBlock\('admin\.menu\.home\.dataManagement'/);
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
    "admin.menu.home.upstreamManagement",
    "admin.menu.home.dataManagement",
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

  assert.ok(registryKeys.has("admin.header.home"), "home module must be covered");
  assert.ok(registryKeys.has("admin.header.operations"), "operations module must be covered");

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

  const modelManagementGroup = findAdminMenuGroupSource(adminRegistrySource, "admin.menu.home.modelManagement");
  assert.match(modelManagementGroup, /path:\s*'\/admin\/model'/);
  assert.match(i18nSource, /"admin\.menu\.home\.modelManagement":\s*"Model Management"/);
  assert.match(i18nSource, /"admin\.menu\.home\.modelManagement":\s*"\u6a21\u578b\u7ba1\u7406"/);
  assert.match(i18nSource, /"admin\.layout\.links\.models":\s*"Model Vendors"/);
  assert.match(i18nSource, /"admin\.menu\.models":\s*"Model Vendors"/);
  assert.match(i18nSource, /"admin\.layout\.links\.models":\s*"\u6a21\u578b\u5382\u5546\u7ba1\u7406"/);
  assert.match(i18nSource, /"admin\.menu\.models":\s*"\u6a21\u578b\u5382\u5546\u7ba1\u7406"/);
  assert.doesNotMatch(i18nSource, /\u6a21\u578b\u5e73\u53f0\u7ba1\u7406/);
});

test("upstream administration has one canonical navigation entry", () => {
  const adminRegistrySource = readAdminRegistrySource();
  const i18nSource = readI18nResourceSource();

  assert.match(
    adminRegistrySource,
    /groupBlock\('admin\.menu\.home\.modelManagement'[\s\S]*groupBlock\('admin\.menu\.home\.upstreamManagement'/,
  );
  assert.match(
    adminRegistrySource,
    /groupBlock\('admin\.menu\.home\.upstreamManagement',\s*\[\s*itemBlock\(\{\s*path:\s*'\/admin\/upstream',\s*labelKey:\s*'admin\.menu\.upstream'/s,
  );

  assert.doesNotMatch(adminRegistrySource, /groupBlock\('admin\.menu\.home\.userManagement'/);
  assert.doesNotMatch(adminRegistrySource, /groupBlock\('admin\.menu\.home\.agentSkills'/);
  assert.match(i18nSource, /"admin\.menu\.home\.upstreamManagement":\s*"Upstream Management"/);
  assert.match(i18nSource, /"admin\.menu\.home\.upstreamManagement":\s*"\u4e0a\u6e38\u7ba1\u7406"/);
});

test("upstream credentials never expose plaintext after submission", () => {
  const accountSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-upstream/src/accountTab.tsx");
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-upstream/src/upstreamService.ts");

  assert.doesNotMatch(accountSource, /rawSecret|credential\.secret|oneTimeSecret/);
  assert.match(accountSource, /name="secret" type="password" autoComplete="new-password"/);
  assert.match(serviceSource, /createCredential/);
  assert.doesNotMatch(serviceSource, /rawSecret/);
  assert.doesNotMatch(serviceSource, /fetch\(|axios|authorization/i);
});

test("admin module registry exposes the owned commercial management centers", () => {
  const adminRegistrySource = readAdminRegistrySource();
  const packageJson = JSON.parse(readPortalFile("./package.json")) as { dependencies: Record<string, string> };
  const appSource = readPortalFile("./src/App.tsx");
  const adminHostSource = readPortalFile("./src/admin/clawRouterAdminHostMount.tsx");
  const operationsMenu = findAdminModuleMenuSource(adminRegistrySource, "operations");

  assert.deepEqual(findOrderedMatches(adminRegistrySource, /id:\s*'([^']+)'/g), ["home", "membershipCenter", "marketingCenter", "paymentCenter", "storageCenter", "operations"]);
  assert.deepEqual(findOrderedMatches(adminRegistrySource, /moduleId:\s*'([^']+)'/g), ["home", "membershipCenter", "marketingCenter", "paymentCenter", "storageCenter", "operations"]);
  assert.doesNotMatch(operationsMenu, /\/admin\/oauth/);
  assert.doesNotMatch(adminRegistrySource, /path:\s*'\/admin\/(catalog|orders|finance|wallet|oauth|service-providers|agents|skill|prompts|mcp|announcement|user|organization)'/);

  for (const pkg of [
    "@sdkwork/clawrouter-pc-admin-catalog",
    "@sdkwork/clawrouter-pc-admin-orders",
    "@sdkwork/clawrouter-pc-admin-finance",
    "@sdkwork/clawrouter-pc-admin-wallet",
    "@sdkwork/clawrouter-pc-admin-messaging",
    "@sdkwork/clawrouter-pc-admin-agents",
    "@sdkwork/clawrouter-pc-admin-skill",
    "@sdkwork/clawrouter-pc-admin-prompts",
    "@sdkwork/clawrouter-pc-admin-mcp",
    "@sdkwork/clawrouter-pc-admin-announcement",
    "@sdkwork/clawrouter-pc-admin-user",
    "@sdkwork/clawrouter-pc-admin-organization",
    "@sdkwork/clawrouter-pc-admin-oauth",
    "@sdkwork/clawrouter-pc-admin-service-provider",
  ]) {
    assert.equal(packageJson.dependencies[pkg], undefined, `package.json must not depend on ${pkg}`);
  }

  assert.doesNotMatch(`${appSource}\n${adminHostSource}`, /CatalogAdmin|OrdersAdmin|FinanceAdmin|WalletAdmin|OauthAdmin|ServiceProviderAdmin|AgentsAdmin|SkillAdmin|PromptsAdmin|McpAdmin|AnnouncementAdmin|UserAdmin|OrganizationAdmin|MessagingAdmin/);
  assert.match(adminHostSource, /ModelAdmin|UpstreamAdmin|RecordAdmin|AnalyticsAdmin|MonitorAdmin|RateLimitAdmin/);
});

test("admin relay home menu excludes retired platform and commerce groups", () => {
  const adminRegistrySource = readAdminRegistrySource();

  assert.doesNotMatch(adminRegistrySource, /groupBlock\('admin\.menu\.home\.agentSkills'/);
  assert.doesNotMatch(adminRegistrySource, /groupBlock\('admin\.menu\.home\.userManagement'/);
  assert.doesNotMatch(adminRegistrySource, /groupBlock\('admin\.menu\.home\.productPlatform'/);
  assert.doesNotMatch(adminRegistrySource, /path:\s*'\/admin\/agents'/);
  assert.doesNotMatch(adminRegistrySource, /path:\s*'\/admin\/skill'/);
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

test("portal composes appbase auth and Tauri host packages through workspace installs", () => {
  const packageJson = JSON.parse(readPortalFile("./package.json")) as { dependencies: Record<string, string> };
  const viteConfigSource = readPortalFile("./vite.config.ts");
  const workspaceSource = readRepoFile("pnpm-workspace.yaml");
  const tauriBridgeSource = readPortalFile("./src/auth/clawRouterTauriAuthHost.ts");
  const legacyAppbasePackageFamilyPattern = new RegExp(`packages/${["pc-react", "identity"].join("/")}`);

  assert.equal(packageJson.dependencies["@sdkwork/auth-pc-react"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/auth-runtime-pc-react"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/iam-contracts"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/iam-core-pc-react"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/iam-react"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/iam-runtime"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/iam-sdk-adapter"], undefined);
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

  assert.match(viteConfigSource, /clawrouter-portal-pnpm-workspace-resolver/);
  assert.doesNotMatch(viteConfigSource, /find: '@sdkwork\//);
  assert.match(workspaceSource, /packages\/pc-react\/foundation\/(?:\*|sdkwork-i18n-pc-react)/);
  assert.match(workspaceSource, /sdkwork-core\/sdkwork-core-pc-react/);
  assert.match(workspaceSource, /sdkwork-iam\/apps\/sdkwork-iam-pc\/packages\/(?:\*|sdkwork-auth-pc-react)/);
  assert.match(workspaceSource, /packages\/common\/foundation\/(?:\*|sdkwork-runtime-bootstrap)/);
  assert.match(workspaceSource, /sdkwork-iam\/apps\/sdkwork-iam-common\/packages\/(?:\*|sdkwork-iam-runtime)/);
  assert.doesNotMatch(viteConfigSource, legacyAppbasePackageFamilyPattern);
  assert.doesNotMatch(workspaceSource, legacyAppbasePackageFamilyPattern);

  assert.match(tauriBridgeSource, /from '@sdkwork\/host-tauri-pc-react'/);
  assert.match(tauriBridgeSource, /createTauriHostBridge/);
  assert.match(tauriBridgeSource, /evaluateTauriHostBridgeReadiness/);
});

test("portal imports auth runtime session helpers through exported workspace subpaths", () => {
  const sdkClientsSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts");
  const iamRuntimeSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/iam-runtime.ts");
  const iamSessionProjectionSource = readPortalFile(
    "./packages/sdkwork-clawroutes-pc-commons/src/iam-runtime-session-projection.ts",
  );
  const authRuntimePackageJson = JSON.parse(readRepoFile(
    "../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-auth-runtime-pc-react/package.json",
  )) as {
    exports: Record<string, {
      default?: string;
      import?: string;
      types?: string;
    }>;
  };

  assert.match(
    sdkClientsSource,
    /from '@sdkwork\/auth-runtime-pc-react\/attachSdkworkSdkSessionAuthBoundary'/,
  );
  assert.doesNotMatch(
    sdkClientsSource,
    /from '@sdkwork\/auth-runtime-pc-react';/,
  );
  assert.match(
    iamRuntimeSource,
    /from '@sdkwork\/auth-runtime-pc-react\/appbasePcAuthRuntime'/,
  );
  assert.match(
    iamSessionProjectionSource,
    /from '@sdkwork\/auth-runtime-pc-react\/appbasePcAuthSessionBridge'/,
  );

  const expectedExports = {
    "./appbasePcAuthRuntime": "./src/appbasePcAuthRuntime.ts",
    "./appbasePcAuthSessionBridge": "./src/appbasePcAuthSessionBridge.ts",
    "./attachSdkworkSdkSessionAuthBoundary": "./src/attachSdkworkSdkSessionAuthBoundary.ts",
    "./handleSdkworkSessionAuthUnauthorizedError": "./src/handleSdkworkSessionAuthUnauthorizedError.ts",
    "./sdkSessionAuthError": "./src/sdkSessionAuthError.ts",
  };

  for (const [subpath, entry] of Object.entries(expectedExports)) {
    assert.equal(authRuntimePackageJson.exports[subpath]?.types, entry);
    assert.equal(authRuntimePackageJson.exports[subpath]?.import, entry);
    assert.equal(authRuntimePackageJson.exports[subpath]?.default, entry);
  }
});

test("portal resolves sdkwork UI through workspace package exports", () => {
  const viteConfigSource = readPortalFile("./vite.config.ts");

  assert.match(viteConfigSource, /clawrouter-portal-pnpm-workspace-resolver/);
  assert.match(viteConfigSource, /resolvePortalPackageModule/);
  assert.match(viteConfigSource, /readPackageImportEntry/);
  assert.doesNotMatch(viteConfigSource, /find: '@sdkwork\/ui-pc-react'/);
});

test("portal resolves T1 domain console packages through workspace installs", () => {
  const packageJson = JSON.parse(readPortalFile("./package.json")) as { dependencies: Record<string, string> };
  const viteConfigSource = readPortalFile("./vite.config.ts");
  const workspaceSource = readRepoFile("pnpm-workspace.yaml");

  assert.equal(packageJson.dependencies["@sdkwork/commerce-pc-admin-product"], undefined);
  assert.equal(packageJson.dependencies["@sdkwork/account-pc-wallet"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/membership-pc-membership"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/membership-pc-subscription"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/payment-pc-payment"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/order-pc-order"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/commerce-service"], undefined);
  assert.equal(packageJson.dependencies['@sdkwork/clawrouter-pc-admin-inventory'], undefined);
  assert.equal(packageJson.dependencies['@sdkwork/clawrouter-pc-admin-file-platform'], undefined);
  assert.doesNotMatch(viteConfigSource, /find: '@sdkwork\/commerce-pc-admin-product'/);
  assert.doesNotMatch(viteConfigSource, /find: '@sdkwork\/account-pc-wallet'/);
  assert.doesNotMatch(viteConfigSource, /find: '@sdkwork\/membership-pc-membership'/);
  assert.doesNotMatch(viteConfigSource, /find: '@sdkwork\/payment-pc-payment'/);
  assert.doesNotMatch(viteConfigSource, /find: '@sdkwork\/commerce-service'/);
  assert.doesNotMatch(viteConfigSource, /find: '@sdkwork\/commerce-sdk-ports'/);
  assert.doesNotMatch(viteConfigSource, /find: '@sdkwork\/commerce-contracts'/);
  assert.doesNotMatch(viteConfigSource, /sdkworkCommerceRoot/);
  assert.match(viteConfigSource, /clawrouter-portal-pnpm-workspace-resolver/);
  assert.doesNotMatch(workspaceSource, /^\s*- 'packages\/pc-react\//m);
  assert.match(workspaceSource, /sdkwork-account\/apps\/sdkwork-account-pc\/packages\/(?:\*|sdkwork-account-pc-wallet)/);
  assert.match(workspaceSource, /sdkwork-membership\/apps\/sdkwork-membership-pc\/packages\/(?:\*|sdkwork-membership-pc-membership)/);
  assert.match(workspaceSource, /sdkwork-payment\/apps\/sdkwork-payment-pc\/packages\/(?:\*|sdkwork-payment-pc-payment)/);
  assert.doesNotMatch(workspaceSource, /packages\/common\/commerce\/\*/);
  assert.equal(packageJson.dependencies["@sdkwork/commerce-pc-host"], undefined);
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
  const typecheckSource = readPortalFile("./scripts/typecheck-owned-sources.mjs");

  assert.equal(packageJson.scripts.typecheck, "node scripts/typecheck-owned-sources.mjs");
  assert.equal(packageJson.scripts.lint, "node scripts/typecheck-owned-sources.mjs");
  assert.match(typecheckSource, /ts\.createProgram/);
  assert.match(typecheckSource, /ts\.getPreEmitDiagnostics/);
  assert.match(typecheckSource, /isOwnedSourcePath/);
  assert.doesNotMatch(typecheckSource, /noUnusedLocals.*false/);
  assert.doesNotMatch(typecheckSource, /noUnusedParameters.*false/);
});
