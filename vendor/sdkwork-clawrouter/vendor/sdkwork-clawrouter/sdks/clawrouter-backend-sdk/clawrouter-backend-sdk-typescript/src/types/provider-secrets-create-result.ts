import type { AdminProviderSecretMutationResponse } from './admin-provider-secret-mutation-response';

/** Provider secrets create result schema exposed by Claw Router. */
export interface ProviderSecretsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on provider secrets create result. */
  data?: AdminProviderSecretMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
