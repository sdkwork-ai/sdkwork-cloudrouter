/**
 * Cloud Router app-api SDK port and factory contract.
 *
 * Authority: `APP_SDK_INTEGRATION_SPEC.md` and
 * `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 6.
 *
 * The Harmony root consumes `/app/v3/api` through a generated
 * ArkTS/TypeScript app SDK client adapted for the Harmony runtime. This file
 * owns the injected port contract, base-URL normalization, and the credential
 * resolution boundary. Concrete transport construction stays in the root
 * bootstrap.
 *
 * PREREQUISITE: `sdks/cloudrouter-app-sdk` currently publishes csharp, flutter,
 * go, java, kotlin, python, rust, swift, and typescript targets. No ArkTS target
 * exists yet, so this module deliberately declares the port and the adapter seam
 * instead of vendoring a transport copy. Feature packages must never fill this
 * gap with raw request APIs or manual auth headers.
 */

export interface CloudRouterAppSdkClientConfig {
  readonly baseUrl: string;
  readonly accessToken?: string;
  readonly authToken?: string;
  readonly platform?: string;
}

export interface CloudRouterAppSdkClient {
  readonly baseUrl: string;
  readonly platform: string;
}

const APP_API_SUFFIX: string = '/app/v3/api';
const BACKEND_API_SUFFIX: string = '/backend/v3/api';

let configuredAppApiBaseUrl: string | null = null;
let configuredBackendApiBaseUrl: string | null = null;

function normalizeSuffixed(value: string, label: string, suffix: string): string {
  const normalized: string = value.trim().replace(/\/+$/u, '');
  if (normalized.length === 0) {
    throw new Error(label + ' is required before SDK bootstrap');
  }
  if (!normalized.endsWith(suffix)) {
    throw new Error(label + ' must end with ' + suffix);
  }
  return normalized;
}

export function configureCloudRouterAppSdkBaseUrl(baseUrl: string): void {
  configuredAppApiBaseUrl = normalizeSuffixed(baseUrl, 'Cloud Router app API base URL', APP_API_SUFFIX);
}

export function configureCloudRouterBackendApiBaseUrl(baseUrl: string): void {
  configuredBackendApiBaseUrl = normalizeSuffixed(baseUrl, 'Cloud Router backend API base URL', BACKEND_API_SUFFIX);
}

export function resolveCloudRouterAppSdkBaseUrl(): string {
  if (configuredAppApiBaseUrl === null) {
    throw new Error('Cloud Router app API base URL must be configured before SDK bootstrap');
  }
  return configuredAppApiBaseUrl;
}

export function resolveCloudRouterBackendApiBaseUrl(): string {
  if (configuredBackendApiBaseUrl === null) {
    throw new Error('Cloud Router backend API base URL must be configured before SDK bootstrap');
  }
  return configuredBackendApiBaseUrl;
}

export function createCloudRouterAppSdkClientConfig(
  baseUrl: string,
  accessToken?: string,
  authToken?: string,
): CloudRouterAppSdkClientConfig {
  configureCloudRouterAppSdkBaseUrl(baseUrl);
  return {
    baseUrl: resolveCloudRouterAppSdkBaseUrl(),
    accessToken,
    authToken,
    platform: 'harmony-native',
  };
}

const cloudRouterAppSdkClient: CloudRouterAppSdkClient | null = null;

export function getCloudRouterAppSdkClient(
  config?: CloudRouterAppSdkClientConfig,
): CloudRouterAppSdkClient {
  const resolved: CloudRouterAppSdkClientConfig = config ?? createCloudRouterAppSdkClientConfig(
    resolveCloudRouterAppSdkBaseUrl(),
  );
  return cloudRouterAppSdkClient ?? {
    baseUrl: resolved.baseUrl,
    platform: resolved.platform ?? 'harmony-native',
  };
}

export function resetCloudRouterAppSdkClient(): void {
  configuredAppApiBaseUrl = null;
  configuredBackendApiBaseUrl = null;
}
