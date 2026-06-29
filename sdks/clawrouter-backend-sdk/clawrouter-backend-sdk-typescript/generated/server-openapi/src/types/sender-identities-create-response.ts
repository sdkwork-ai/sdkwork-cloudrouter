import type { SenderIdentitiesCreateResult } from './sender-identities-create-result';

export interface SenderIdentitiesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
