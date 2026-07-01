import type { ApiKeysUpdateResult } from './api-keys-update-result';

export interface ApiKeysUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
