import type { ProviderSecretsUpdateResult } from './provider-secrets-update-result';

export interface ProviderSecretsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
