import { CancelledError, ForbiddenError, TimeoutError, type RequestConfig } from '@sdkwork/sdk-common';
import { readApiRecord } from './api-result.ts';
import { clearStoredAppSessionToken, storeAppSessionFromResult } from './app-session-token.ts';
import { resetClawRouterIamRuntime } from './iam-runtime.ts';
import { getClawRouterBackendSdkClient, getSdkworkAppbaseAppSdkClient, resetClawRouterSdkClients } from './sdk-clients.ts';
import { hasPortalAdminSurfaceAccess, readPortalPermissionScope } from './portal-permission-scope.ts';

export type PortalAdminAccessState = 'anonymous' | 'checking' | 'allowed' | 'forbidden' | 'error';

const PORTAL_ADMIN_ACCESS_CHECK_TIMEOUT_MS = 8_000;

export interface VerifyCurrentPortalAdminAccessOptions {
  timeoutMs?: number;
}

type BackendRequestInterceptorClient = {
  addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>): () => void;
};

export interface PortalSessionResponse extends Record<string, unknown> {
  accessToken: string;
  authToken: string;
  refreshToken?: string;
}

let currentSessionPromise: Promise<PortalSessionResponse | null> | null = null;

export async function fetchCurrentPortalSession(): Promise<PortalSessionResponse | null> {
  if (!currentSessionPromise) {
    currentSessionPromise = getSdkworkAppbaseAppSdkClient()
      .auth.sessions.current.retrieve()
      .then((result) => {
        const session = readCurrentPortalSession(result);
        if (session) {
          storeAppSessionFromResult(result);
          resetClawRouterSdkClients();
        }
        return session;
      })
      .catch((error) => {
        if (isPortalSessionAuthError(error)) {
          clearPortalSessionState();
          return null;
        }
        throw error;
      })
      .finally(() => {
        currentSessionPromise = null;
      });
  }
  return currentSessionPromise;
}

export async function revokeCurrentPortalSession(): Promise<void> {
  try {
    await getSdkworkAppbaseAppSdkClient().auth.sessions.current.delete();
  } catch (error) {
    if (!isPortalSessionAuthError(error)) {
      throw error;
    }
  } finally {
    clearPortalSessionState();
  }
}

export async function verifyCurrentPortalAdminAccess(
  options: VerifyCurrentPortalAdminAccessOptions = {},
): Promise<PortalAdminAccessState> {
  const session = await fetchCurrentPortalSession();
  if (!session) {
    return 'anonymous';
  }

  if (!hasPortalAdminSurfaceAccess(readPortalPermissionScope())) {
    return 'forbidden';
  }

  try {
    await retrieveInstallationStatusForAdminAccess(options.timeoutMs);
    return 'allowed';
  } catch (error) {
    if (error instanceof ForbiddenError || readErrorHttpStatus(error) === 403 || readErrorCode(error) === 'FORBIDDEN') {
      return 'forbidden';
    }
    if (isPortalSessionAuthError(error)) {
      clearPortalSessionState();
      return 'anonymous';
    }
    return 'error';
  }
}

async function retrieveInstallationStatusForAdminAccess(timeoutMs?: number): Promise<void> {
  const timeout = normalizeAdminAccessCheckTimeout(timeoutMs);
  const sdkRequestTimeout = timeout + 1_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  const backendClient = getClawRouterBackendSdkClient({ timeout: sdkRequestTimeout });
  const httpClient = backendClient.http as unknown as BackendRequestInterceptorClient;
  const removeInterceptor = httpClient.addRequestInterceptor((config: RequestConfig) => ({
    ...config,
    signal: config.signal ?? controller.signal,
    timeout: config.timeout ?? sdkRequestTimeout,
  }));

  try {
    await backendClient.system.installation.status.retrieve();
  } catch (error) {
    if (controller.signal.aborted && isAdminAccessCheckAbort(error)) {
      throw new TimeoutError(`Admin access check timed out after ${timeout}ms`, timeout);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    removeInterceptor();
  }
}

function normalizeAdminAccessCheckTimeout(timeoutMs: number | undefined): number {
  return typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0
    ? Math.max(1, Math.floor(timeoutMs))
    : PORTAL_ADMIN_ACCESS_CHECK_TIMEOUT_MS;
}

function isAdminAccessCheckAbort(error: unknown): boolean {
  return (
    error instanceof TimeoutError
    || error instanceof CancelledError
    || readErrorCode(error) === 'TIMEOUT'
    || readErrorCode(error) === 'CANCELLED'
  );
}

export function clearPortalSessionState(): void {
  clearStoredAppSessionToken();
  resetClawRouterSdkClients();
  resetClawRouterIamRuntime();
}

function isPortalSessionAuthError(error: unknown): boolean {
  const status = readErrorHttpStatus(error);
  const code = readErrorCode(error);
  return status === 401 || code === 'UNAUTHORIZED' || code === 'TOKEN_EXPIRED' || code === 'TOKEN_INVALID';
}

function readErrorHttpStatus(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined;
  }
  const value = error.httpStatus;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }
  const value = error.code;
  return typeof value === 'string' ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readCurrentPortalSession(result: unknown): PortalSessionResponse | null {
  const session = readApiRecord(result);
  return isPortalSessionResponse(session) ? session : null;
}

function isPortalSessionResponse(value: unknown): value is PortalSessionResponse {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.accessToken === 'string'
    && value.accessToken.trim().length > 0
    && typeof value.authToken === 'string'
    && value.authToken.trim().length > 0
  );
}
