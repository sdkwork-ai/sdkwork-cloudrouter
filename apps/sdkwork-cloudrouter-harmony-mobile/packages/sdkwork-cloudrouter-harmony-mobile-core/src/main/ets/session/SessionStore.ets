/**
 * Session and context store.
 *
 * Authority: `APP_SDK_INTEGRATION_SPEC.md`. Logout, refresh failure, tenant
 * switch, and account switch must clear this store together with the token
 * manager, secure platform storage, and realtime/session bridges.
 */

export interface CloudRouterHarmonySession {
  readonly accessToken?: string;
  readonly authToken?: string;
  readonly tenantId?: string;
  readonly organizationId?: string;
  readonly subject?: string;
}

let currentSession: CloudRouterHarmonySession | null = null;

export function readCloudRouterHarmonySession(): CloudRouterHarmonySession | null {
  return currentSession;
}

export function writeCloudRouterHarmonySession(
  session: CloudRouterHarmonySession | null,
): void {
  currentSession = session;
}

export function clearCloudRouterHarmonySession(): void {
  currentSession = null;
}
