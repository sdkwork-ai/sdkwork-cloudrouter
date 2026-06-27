import manifest from '../../../../sdkwork.app.config.json';

export type SdkworkMCPPcEnvironment = 'development' | 'test' | 'staging' | 'production';

export type SdkworkMCPPcConfigProfile = 'dev' | 'test' | 'staging' | 'prod';

export type SdkworkMCPPcDeploymentMode = 'web' | 'desktop';
export type SdkworkMCPPcRuntimeTarget = 'browser' | 'desktop';

export interface SdkworkMCPPcAuthRuntimeConfig {
  accessTokenHeader: 'Access-Token';
  authTokenHeader: 'Authorization';
  refreshEnabled: boolean;
  tokenManagerMode: 'appbase-global';
  tokenStorage: 'browser-session';
}

export interface SdkworkMCPPcI18nRuntimeConfig {
  defaultLocale: string;
  fallbackLocale: string;
  supportedLocales: string[];
}

export interface SdkworkMCPPcDependencySdkBaseUrls {
  appApiBaseUrl?: string;
  backendApiBaseUrl?: string;
}

export interface SdkworkMCPPcSdkBaseUrls {
  appApiBaseUrl?: string;
  backendApiBaseUrl?: string;
  dependencySdkBaseUrls?: Record<string, SdkworkMCPPcDependencySdkBaseUrls>;
  sdkBaseUrl?: string;
}

export interface SdkworkMCPPcRuntimeConfig {
  appApiBaseUrl: string;
  appDisplayName: string;
  appKey: string;
  auth: SdkworkMCPPcAuthRuntimeConfig;
  backendApiBaseUrl: string;
  buildMode: SdkworkMCPPcEnvironment;
  configProfile: SdkworkMCPPcConfigProfile;
  defaultTenantId: string;
  deploymentMode: SdkworkMCPPcDeploymentMode;
  driveAppApiBaseUrl: string;
  environment: SdkworkMCPPcEnvironment;
  i18n: SdkworkMCPPcI18nRuntimeConfig;
  runtimeTarget: SdkworkMCPPcRuntimeTarget;
  sdkBaseUrl?: string;
  sdkBaseUrls?: SdkworkMCPPcSdkBaseUrls;
  version: string;
}

const environmentByMode: Record<string, SdkworkMCPPcEnvironment> = {
  development: 'development',
  dev: 'development',
  production: 'production',
  prod: 'production',
  staging: 'staging',
  test: 'test',
};

const profileByEnvironment: Record<SdkworkMCPPcEnvironment, SdkworkMCPPcConfigProfile> = {
  development: 'dev',
  production: 'prod',
  staging: 'staging',
  test: 'test',
};

const APP_API_PREFIX = '/app/v3/api';
const BACKEND_API_PREFIX = '/backend/v3/api';
const APPBASE_APP_SDK_FAMILY_ID = 'sdkwork-iam-app-sdk';

function envValue(key: string): string | undefined {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function resolveEnvironment(mode: string): SdkworkMCPPcEnvironment {
  return environmentByMode[mode] ?? 'development';
}

function parseSdkBaseUrls(sdkBaseUrl?: string): SdkworkMCPPcSdkBaseUrls | undefined {
  const raw = envValue('VITE_SDKWORK_MCP_PC_SDK_BASE_URLS_JSON');
  if (raw) {
    try {
      return JSON.parse(raw) as SdkworkMCPPcSdkBaseUrls;
    } catch {
      return undefined;
    }
  }

  if (!sdkBaseUrl) {
    return undefined;
  }

  const normalizedSdkBaseUrl = sdkBaseUrl.replace(/\/+$/u, '');
  return {
    appApiBaseUrl: `${normalizedSdkBaseUrl}${APP_API_PREFIX}`,
    backendApiBaseUrl: `${normalizedSdkBaseUrl}${BACKEND_API_PREFIX}`,
    dependencySdkBaseUrls: {
      [APPBASE_APP_SDK_FAMILY_ID]: {
        appApiBaseUrl: `${normalizedSdkBaseUrl}${APP_API_PREFIX}`,
      },
    },
    sdkBaseUrl: normalizedSdkBaseUrl,
  };
}

export function resolveSdkworkMCPPcRuntimeConfig(
  mode = import.meta.env.MODE,
): SdkworkMCPPcRuntimeConfig {
  const environment = resolveEnvironment(mode);
  const sdkBaseUrl = envValue('VITE_SDKWORK_MCP_PC_SDK_BASE_URL');
  const sdkBaseUrls = parseSdkBaseUrls(sdkBaseUrl);
  const defaultTenantId =
    envValue('VITE_SDKWORK_MCP_TENANT_ID') ?? manifest.backend?.tenantId ?? '100001';

  return {
    appApiBaseUrl:
      envValue('VITE_SDKWORK_MCP_APP_API_BASE_URL') ??
      sdkBaseUrls?.appApiBaseUrl ??
      APP_API_PREFIX,
    appDisplayName: manifest.app.displayName,
    appKey: manifest.app.key,
    auth: {
      accessTokenHeader: 'Access-Token',
      authTokenHeader: 'Authorization',
      refreshEnabled: true,
      tokenManagerMode: 'appbase-global',
      tokenStorage: 'browser-session',
    },
    backendApiBaseUrl:
      envValue('VITE_SDKWORK_MCP_BACKEND_API_BASE_URL') ??
      sdkBaseUrls?.backendApiBaseUrl ??
      BACKEND_API_PREFIX,
    buildMode: environment,
    configProfile: profileByEnvironment[environment],
    defaultTenantId,
    deploymentMode: 'web',
    driveAppApiBaseUrl:
      envValue('VITE_SDKWORK_DRIVE_APP_API_BASE_URL') ??
      envValue('VITE_SDKWORK_MCP_APP_API_BASE_URL') ??
      sdkBaseUrls?.appApiBaseUrl ??
      APP_API_PREFIX,
    environment,
    i18n: {
      defaultLocale: envValue('VITE_SDKWORK_MCP_DEFAULT_LOCALE') ?? 'zh-CN',
      fallbackLocale: 'en-US',
      supportedLocales: ['zh-CN', 'en-US'],
    },
    runtimeTarget: 'browser',
    sdkBaseUrl,
    sdkBaseUrls,
    version: '0.1.0',
  };
}

export function resolveAppbaseAppApiBaseUrl(config: SdkworkMCPPcRuntimeConfig): string {
  return (
    config.sdkBaseUrls?.dependencySdkBaseUrls?.[APPBASE_APP_SDK_FAMILY_ID]?.appApiBaseUrl ??
    config.appApiBaseUrl
  );
}
