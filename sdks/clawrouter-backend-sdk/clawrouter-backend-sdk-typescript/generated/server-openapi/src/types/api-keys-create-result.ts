import type { AdminApiKeyCreateResponse } from './admin-api-key-create-response';

/** Api keys create result schema exposed by Claw Router. */
export interface ApiKeysCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on api keys create result. */
  data?: AdminApiKeyCreateResponse;
  /** Human-readable response message. */
  msg?: string;
}
