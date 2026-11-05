import {
  clearStoredAppSessionToken,
  loadStoredAppSessionToken,
  storeAppSessionFromResult,
  type StoredAppSessionToken,
} from './app-session-token.ts';
import { resetCloudRouterIamRuntime } from './iam-runtime.ts';
import {
  getSdkworkAppbaseAppSdkClient,
  resetCloudRouterSdkClients,
  type SdkworkAppbaseAppSdkClientOptions,
} from './sdk-clients.ts';

export async function createAppSession(
  options: SdkworkAppbaseAppSdkClientOptions = {},
): Promise<StoredAppSessionToken | null> {
  const result = await getSdkworkAppbaseAppSdkClient(options).auth.sessions.create({});
  const stored = storeAppSessionFromResult(result);
  resetCloudRouterSdkClients();
  resetCloudRouterIamRuntime();
  return stored;
}

export function getCurrentAppSession(): StoredAppSessionToken | null {
  return loadStoredAppSessionToken();
}

export function clearAppSession(): void {
  clearStoredAppSessionToken();
  resetCloudRouterSdkClients();
  resetCloudRouterIamRuntime();
}

const REVOKE_APP_SESSION_TIMEOUT_MS = 1500;

export async function revokeAppSession(): Promise<void> {
  try {
    await settleWithin(
      getSdkworkAppbaseAppSdkClient().auth.sessions.current.delete(),
      REVOKE_APP_SESSION_TIMEOUT_MS,
    );
  } catch {
    // Logout must always clear local state, even when the server session is
    // already gone or the network never answers.
  } finally {
    clearAppSession();
  }
}

/**
 * Wait for a revocation request only as long as the user will tolerate it.
 *
 * The local session is what a sign-out must end, and an unreachable API must
 * not hold the interface on "signing out". The request still runs to
 * completion in the background; this only bounds the wait.
 */
function settleWithin(promise: Promise<unknown>, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    void promise.then(finish, finish);
  });
}
