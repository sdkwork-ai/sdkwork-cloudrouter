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
export interface ApplicationIdentityProvisionResult {
  /**
   * The persisted identity status IAM now reports (`active` after success,
   * `pending_identity` when no adapter is configured, `failed` when IAM
   * rejected the attempt).
   */
  status: string;
  /**
   * The application's snowflake id (`deployApplicationId`), exactly as the
   * registration response carried it. The same IAM installation anchor that
   * `apps.create` / `apps.retrieve` / `apps.update` publish.
   */
  deployApplicationId?: string;
}

export interface ApplicationIdentityService {
  /**
   * Retries identity provisioning for one Deploy application.
   * @param appId - `deploy_app.uuid` from the catalog row.
   * @returns the identity status and the decimal application anchor IAM now
   * reports.
   */
  provision(appId: string): Promise<ApplicationIdentityProvisionResult>;
}

export type ApplicationIdentityTransport = (
  appId: string,
) => Promise<{ identityStatus?: string; deployApplicationId?: string }>;

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
    async provision(appId: string): Promise<ApplicationIdentityProvisionResult> {
      const trimmed = appId.trim();
      if (!trimmed) {
        throw new Error("Deploy application id is required to provision its IAM identity.");
      }
      const result = await provision(trimmed);
      const status = typeof result?.identityStatus === "string" ? result.identityStatus.trim() : "";
      const deployApplicationId = decimalId(result?.deployApplicationId);
      return {
        status: status || "active",
        ...(deployApplicationId ? { deployApplicationId } : {}),
      };
    },
  };
}

/**
 * A decimal int64 id exactly as the wire carried it.
 *
 * The anchor is a snowflake past 2^53, so it must never pass through `Number`.
 * A value of another shape is dropped instead of displayed as an application
 * id.
 */
function decimalId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return /^-?[0-9]+$/u.test(trimmed) ? trimmed : undefined;
}
