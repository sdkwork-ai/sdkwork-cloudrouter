import { readApiRecord } from './api-result.ts';
import { clearStoredAppSessionToken, loadStoredAppSessionToken, shouldRefreshStoredAppSession, storeAppSessionFromResult } from './app-session-token.ts';
import { resetClawRouterIamRuntime } from './iam-runtime.ts';
import {
  getSdkworkAppbaseAppSdkClient,
  isClawRouterSdkSessionAuthError,
  resetClawRouterSdkClients,
} from './sdk-clients.ts';
import { hasPortalAdminSurfaceAccess, readPortalPermissionScope } from './portal-permission-scope.ts';

export type PortalAdminAccessState = 'anonymous' | 'checking' | 'allowed' | 'forbidden' | 'error';

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
      .then(applyCurrentPortalSessionResult)
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

let currentRefreshPromise: Promise<PortalSessionResponse | null> | null = null;

// Proactively refresh the session when the access token is within the refresh
// threshold. Uses the stored refresh token via the appbase SDK. Falls back to
// clearing the session on auth errors so the existing 401 boundary redirects.
export async function refreshPortalSessionIfNeeded(): Promise<PortalSessionResponse | null> {
  if (!shouldRefreshStoredAppSession()) {
    return readStoredPortalSession();
  }
  if (currentRefreshPromise) {
    return currentRefreshPromise;
  }
  currentRefreshPromise = getSdkworkAppbaseAppSdkClient()
    .auth.sessions.current.retrieve()
    .then(applyCurrentPortalSessionResult)
    .catch((error) => {
      if (isPortalSessionAuthError(error)) {
        clearPortalSessionState();
        return null;
      }
      throw error;
    })
    .finally(() => {
      currentRefreshPromise = null;
    });
  return currentRefreshPromise;
}

function readStoredPortalSession(): PortalSessionResponse | null {
  const token = loadStoredAppSessionToken();
  if (!token) {
    return null;
  }
  return {
    accessToken: token.accessToken,
    authToken: token.authToken,
    ...(token.refreshToken ? { refreshToken: token.refreshToken } : {}),
  };
}

function applyCurrentPortalSessionResult(result: unknown): PortalSessionResponse | null {
  const session = readCurrentPortalSession(result);
  if (session) {
    storeAppSessionFromResult(result);
    resetClawRouterSdkClients();
    return session;
  }

  clearPortalSessionState();
  return null;
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

export async function verifyCurrentPortalAdminAccess(): Promise<PortalAdminAccessState> {
  try {
    await refreshPortalSessionIfNeeded();

    const session = await fetchCurrentPortalSession();
    if (!session) {
      return 'anonymous';
    }

    return hasPortalAdminSurfaceAccess(readPortalPermissionScope()) ? 'allowed' : 'forbidden';
  } catch (error) {
    if (isPortalSessionAuthError(error)) {
      clearPortalSessionState();
      return 'anonymous';
    }
    return 'error';
  }
}

export function clearPortalSessionState(): void {
  clearStoredAppSessionToken();
  resetClawRouterSdkClients();
  resetClawRouterIamRuntime();
}

function isPortalSessionAuthError(error: unknown): boolean {
  return isClawRouterSdkSessionAuthError(error);
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
