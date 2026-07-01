import type { ApiKeysCreateResult } from './api-keys-create-result';

export interface ApiKeysCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
