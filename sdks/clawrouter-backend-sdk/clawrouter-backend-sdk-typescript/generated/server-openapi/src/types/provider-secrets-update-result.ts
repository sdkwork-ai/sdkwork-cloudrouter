import type { AdminProviderSecretMutationResponse } from './admin-provider-secret-mutation-response';

/** Provider secrets update result schema exposed by Claw Router. */
export interface ProviderSecretsUpdateResult {
  /** Business response code. */
  code: string;
  /** Data field on provider secrets update result. */
  data?: AdminProviderSecretMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
