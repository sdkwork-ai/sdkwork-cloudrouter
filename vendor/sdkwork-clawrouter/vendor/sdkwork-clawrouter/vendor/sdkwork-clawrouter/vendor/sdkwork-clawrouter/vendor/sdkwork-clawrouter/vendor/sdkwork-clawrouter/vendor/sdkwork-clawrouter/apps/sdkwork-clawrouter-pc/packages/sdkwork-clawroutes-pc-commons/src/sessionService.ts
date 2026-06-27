import {
  clearStoredAppSessionToken,
  loadStoredAppSessionToken,
  storeAppSessionFromResult,
  type StoredAppSessionToken,
} from './app-session-token.ts';
import { resetClawRouterIamRuntime } from './iam-runtime.ts';
import {
  getSdkworkAppbaseAppSdkClient,
  resetClawRouterSdkClients,
  type SdkworkAppbaseAppSdkClientOptions,
} from './sdk-clients.ts';

export async function createAppSession(
  options: SdkworkAppbaseAppSdkClientOptions = {},
): Promise<StoredAppSessionToken | null> {
  const result = await getSdkworkAppbaseAppSdkClient(options).auth.sessions.create({});
  const stored = storeAppSessionFromResult(result);
  resetClawRouterSdkClients();
  resetClawRouterIamRuntime();
  return stored;
}

export function getCurrentAppSession(): StoredAppSessionToken | null {
  return loadStoredAppSessionToken();
}

export function clearAppSession(): void {
  clearStoredAppSessionToken();
  resetClawRouterSdkClients();
  resetClawRouterIamRuntime();
}

export async function revokeAppSession(): Promise<void> {
  try {
    await getSdkworkAppbaseAppSdkClient().auth.sessions.current.delete();
  } catch {
    // Logout must always clear local state, even when the server session is already gone.
  } finally {
    clearAppSession();
  }
}
