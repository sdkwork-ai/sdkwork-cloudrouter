import manifest from "../../sdkwork.app.config.json";

export type SdkworkCommercePcEnvironment =
  | "development"
  | "test"
  | "staging"
  | "production";

export type SdkworkCommercePcConfigProfile =
  | "dev"
  | "test"
  | "staging"
  | "prod";

export type SdkworkCommercePcDeploymentMode = "web";
export type SdkworkCommercePcRuntimeTarget = "browser";
export type SdkworkCommercePcBuildMode = SdkworkCommercePcEnvironment;

export interface SdkworkCommercePcAuthRuntimeConfig {
  accessTokenHeader: "Access-Token";
  authTokenHeader: "Authorization";
  refreshEnabled: boolean;
  tokenManagerMode: "appbase-global";
  tokenStorage: "browser-session";
}

export interface SdkworkCommercePcI18nRuntimeConfig {
  defaultLocale: string;
  fallbackLocale: string;
  supportedLocales: string[];
}

export interface SdkworkCommercePcDependencySdkBaseUrls {
  appApiBaseUrl?: string;
  backendApiBaseUrl?: string;
}

export interface SdkworkCommercePcSdkBaseUrls {
  appApiBaseUrl?: string;
  backendApiBaseUrl?: string;
  dependencySdkBaseUrls?: Record<string, SdkworkCommercePcDependencySdkBaseUrls>;
  sdkBaseUrl?: string;
}

export interface SdkworkCommercePcRuntimeConfig {
  appApiBaseUrl: string;
  appDisplayName: string;
  appKey: string;
  auth: SdkworkCommercePcAuthRuntimeConfig;
  backendApiBaseUrl?: string;
  buildMode: SdkworkCommercePcBuildMode;
  configProfile: SdkworkCommercePcConfigProfile;
  deploymentMode: SdkworkCommercePcDeploymentMode;
  environment: SdkworkCommercePcEnvironment;
  i18n: SdkworkCommercePcI18nRuntimeConfig;
  runtimeTarget: SdkworkCommercePcRuntimeTarget;
  sdkBaseUrl?: string;
  sdkBaseUrls?: SdkworkCommercePcSdkBaseUrls;
  version: string;
}

const environmentByMode: Record<string, SdkworkCommercePcEnvironment> = {
  development: "development",
  dev: "development",
  production: "production",
  prod: "production",
  staging: "staging",
  test: "test",
};

const profileByEnvironment: Record<SdkworkCommercePcEnvironment, SdkworkCommercePcConfigProfile> = {
  development: "dev",
  production: "prod",
  staging: "staging",
  test: "test",
};

function envValue(key: string): string | undefined {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function resolveEnvironment(mode: string): SdkworkCommercePcEnvironment {
  return environmentByMode[mode] ?? "development";
}

function parseSdkBaseUrls(
  sdkBaseUrl?: string,
): SdkworkCommercePcSdkBaseUrls | undefined {
  const raw = envValue("VITE_SDKWORK_COMMERCE_PC_SDK_BASE_URLS_JSON");
  if (raw) {
    try {
      return JSON.parse(raw) as SdkworkCommercePcSdkBaseUrls;
    } catch {
      return undefined;
    }
  }

  if (!sdkBaseUrl) {
    return undefined;
  }

  const normalizedSdkBaseUrl = sdkBaseUrl.replace(/\/+$/u, "");
  return {
    appApiBaseUrl: `${normalizedSdkBaseUrl}/app/v3/api`,
    backendApiBaseUrl: `${normalizedSdkBaseUrl}/backend/v3/api`,
    dependencySdkBaseUrls: {
      "sdkwork-iam-app-sdk": {
        appApiBaseUrl: `${normalizedSdkBaseUrl}/app/v3/api`,
      },
      "sdkwork-iam-backend-sdk": {
        backendApiBaseUrl: `${normalizedSdkBaseUrl}/backend/v3/api`,
      },
    },
    sdkBaseUrl: normalizedSdkBaseUrl,
  };
}

export function resolveSdkworkCommercePcRuntimeConfig(
  mode = import.meta.env.MODE,
): SdkworkCommercePcRuntimeConfig {
  const environment = resolveEnvironment(mode);
  const sdkBaseUrl = envValue("VITE_SDKWORK_COMMERCE_PC_SDK_BASE_URL");
  const sdkBaseUrls = parseSdkBaseUrls(sdkBaseUrl);

  return {
    appApiBaseUrl: envValue("VITE_SDKWORK_COMMERCE_PC_APP_API_BASE_URL")
      ?? sdkBaseUrls?.appApiBaseUrl
      ?? (sdkBaseUrl ? `${sdkBaseUrl.replace(/\/+$/u, "")}/app/v3/api` : "/app/v3/api"),
    appDisplayName: manifest.app.displayName,
    appKey: manifest.app.key,
    auth: {
      accessTokenHeader: "Access-Token",
      authTokenHeader: "Authorization",
      refreshEnabled: true,
      tokenManagerMode: "appbase-global",
      tokenStorage: "browser-session",
    },
    backendApiBaseUrl: envValue("VITE_SDKWORK_COMMERCE_PC_BACKEND_API_BASE_URL")
      ?? sdkBaseUrls?.backendApiBaseUrl,
    buildMode: environment,
    configProfile: profileByEnvironment[environment],
    deploymentMode: "web",
    environment,
    i18n: {
      defaultLocale: envValue("VITE_SDKWORK_COMMERCE_PC_DEFAULT_LOCALE") ?? "zh-CN",
      fallbackLocale: "en-US",
      supportedLocales: ["zh-CN", "en-US"],
    },
    runtimeTarget: "browser",
    sdkBaseUrl,
    sdkBaseUrls,
    version: manifest.release.currentVersion,
  };
}
