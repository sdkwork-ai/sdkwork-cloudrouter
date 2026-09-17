/**
 * Appbase IAM runtime wiring for the HarmonyOS root.
 *
 * Authority: `APP_SDK_INTEGRATION_SPEC.md` and `IAM_LOGIN_INTEGRATION_SPEC.md`.
 *
 * One global token manager is shared by the appbase app SDK, every
 * authenticated app-api SDK client, and explicit backend-admin clients.
 * Logout and refresh failure must clear the token manager, session/context
 * stores, secure platform storage, and realtime bridges together.
 */

export interface CloudRouterHarmonyIamRuntime {
  isAuthenticated(): boolean;
  clearOnLogout(): void;
}

export class CloudRouterHarmonyIamRuntimeImpl implements CloudRouterHarmonyIamRuntime {
  private authenticated: boolean = false;

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  clearOnLogout(): void {
    this.authenticated = false;
  }
}

let iamRuntime: CloudRouterHarmonyIamRuntime | null = null;

export function createCloudRouterHarmonyIamRuntime(): CloudRouterHarmonyIamRuntime {
  iamRuntime = new CloudRouterHarmonyIamRuntimeImpl();
  return iamRuntime;
}

export function getCloudRouterHarmonyIamRuntime(): CloudRouterHarmonyIamRuntime {
  if (iamRuntime === null) {
    return createCloudRouterHarmonyIamRuntime();
  }
  return iamRuntime;
}
