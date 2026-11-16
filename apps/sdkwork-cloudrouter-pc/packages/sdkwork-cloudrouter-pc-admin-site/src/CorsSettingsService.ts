import { getCloudRouterBackendSdkClient } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import {
  ensureSdkworkApiSuccess,
  readApiRecord,
  type ApiRecord,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

/**
 * Platform CORS settings live in the framework `framework_cors_policy` row for
 * the platform tenant and the deployment environment. The gateway edge scans
 * that row and hot-swaps its in-memory allowlist, so a save applies on every
 * process within one refresh interval without a restart or a redeploy.
 *
 * Entries accept exact `http(s)` origins and host wildcards:
 * `https://*.example.com` (one sub-domain label) and
 * `https://**.example.com` (one or more labels, i.e. second, third and fourth
 * level and deeper).
 */
export const PLATFORM_CORS_SETTINGS_PATH = '/backend/v3/api/system/cors/settings';

export type PlatformCorsSettings = {
  allowAllOrigins: boolean;
  allowedOrigins: string[];
  allowCredentials: boolean;
  version: string;
};

export type PlatformCorsSettingsUpdate = Pick<
  PlatformCorsSettings,
  'allowAllOrigins' | 'allowedOrigins' | 'allowCredentials'
>;

const DEFAULT_SETTINGS: PlatformCorsSettings = {
  allowAllOrigins: false,
  allowedOrigins: [],
  allowCredentials: true,
  version: '0',
};

function backendClient() {
  const client = getCloudRouterBackendSdkClient();
  if (!client?.http) {
    throw new Error('Cloud Router backend client is not configured');
  }
  return client;
}

function itemRecord(result: unknown): ApiRecord {
  const record = readApiRecord(result);
  const item = record.item;
  return item && typeof item === 'object' && !Array.isArray(item)
    ? (item as ApiRecord)
    : record;
}

function parseSettings(record: ApiRecord): PlatformCorsSettings {
  const origins = Array.isArray(record.allowedOrigins)
    ? record.allowedOrigins.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  return {
    allowAllOrigins: record.allowAllOrigins === true,
    allowedOrigins: origins,
    allowCredentials: record.allowCredentials !== false,
    version: typeof record.version === 'string' ? record.version : String(record.version ?? '0'),
  };
}

export async function fetchPlatformCorsSettings(): Promise<PlatformCorsSettings> {
  try {
    const result = await backendClient().http.request<unknown>(PLATFORM_CORS_SETTINGS_PATH, {
      method: 'GET' as never,
      sdkworkUnwrapKind: 'data',
    });
    ensureSdkworkApiSuccess(result, 'Unable to load CORS settings');
    return parseSettings(itemRecord(result));
  } catch (error) {
    // Rolling out the console ahead of the gateway build means the route can
    // still be absent; that is a documented empty state, while an auth or
    // transport failure must surface to the operator.
    if (isMissingRouteError(error)) {
      return { ...DEFAULT_SETTINGS };
    }
    throw error;
  }
}

function isMissingRouteError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 404) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /\b404\b|not registered|not found/i.test(message);
}

export async function updatePlatformCorsSettings(
  input: PlatformCorsSettingsUpdate,
): Promise<PlatformCorsSettings> {
  const body: PlatformCorsSettingsUpdate = {
    allowAllOrigins: input.allowAllOrigins === true,
    allowedOrigins: input.allowedOrigins,
    allowCredentials: input.allowCredentials !== false,
  };
  const result = await backendClient().http.request<unknown>(PLATFORM_CORS_SETTINGS_PATH, {
    method: 'PATCH' as never,
    body,
    contentType: 'application/json',
    sdkworkUnwrapKind: 'data',
  });
  ensureSdkworkApiSuccess(result, 'Unable to save CORS settings');
  return parseSettings(itemRecord(result));
}
