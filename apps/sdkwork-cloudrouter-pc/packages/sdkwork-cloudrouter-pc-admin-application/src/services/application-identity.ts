import { getSdkworkDeploymentsBackendSdkClient } from "@sdkwork/cloudroutes-pc-commons/runtime";

/**
 * IAM identity provisioning for Deploy applications.
 *
 * `apps.create` provisions one IAM installation per Deploy application and
 * records the outcome on `deploy_app.identity_status`. IAM can be temporarily
 * unreachable, in which case the app is still created but cannot mint an
 * application access token. `apps.identityProvision` is the replay-safe retry
 * endpoint; this service is its console binding.
 */
export interface ApplicationIdentityService {
  /**
   * Retries identity provisioning for one Deploy application.
   * @param appId - `deploy_app.uuid` from the catalog row.
   * @returns the identity status IAM now reports (`active` after success).
   */
  provision(appId: string): Promise<string>;
}

export type ApplicationIdentityTransport = (
  appId: string,
) => Promise<{ identityStatus?: string }>;

/**
 * Builds the service over the generated Deploy backend client.
 * @param transport - optional injected provision call for tests.
 * @returns the identity service.
 */
export function createApplicationIdentityService(
  transport?: ApplicationIdentityTransport,
): ApplicationIdentityService {
  const provision = transport
    ?? ((appId: string) => getSdkworkDeploymentsBackendSdkClient().app.identityProvision(appId));
  return {
    async provision(appId: string): Promise<string> {
      const trimmed = appId.trim();
      if (!trimmed) {
        throw new Error("Deploy application id is required to provision its IAM identity.");
      }
      const result = await provision(trimmed);
      const status = typeof result?.identityStatus === "string" ? result.identityStatus.trim() : "";
      return status || "active";
    },
  };
}
