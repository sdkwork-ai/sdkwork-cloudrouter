import type { ProviderSecretsCreateResult } from './provider-secrets-create-result';

export interface ProviderSecretsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
