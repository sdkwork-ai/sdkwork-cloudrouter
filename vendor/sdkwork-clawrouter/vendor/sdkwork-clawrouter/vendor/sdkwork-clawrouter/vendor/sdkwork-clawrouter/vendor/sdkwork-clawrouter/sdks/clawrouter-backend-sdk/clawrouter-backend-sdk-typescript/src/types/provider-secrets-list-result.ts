import type { AdminProviderSecretsResponse } from './admin-provider-secrets-response';

/** Provider secrets list result schema exposed by Claw Router. */
export interface ProviderSecretsListResult {
  /** Business response code. */
  code: string;
  /** Data field on provider secrets list result. */
  data?: AdminProviderSecretsResponse;
  /** Human-readable response message. */
  msg?: string;
}
