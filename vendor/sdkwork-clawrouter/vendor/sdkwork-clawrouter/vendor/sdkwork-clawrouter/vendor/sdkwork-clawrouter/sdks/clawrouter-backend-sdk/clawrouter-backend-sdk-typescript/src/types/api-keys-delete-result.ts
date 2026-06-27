import type { AdminDeleteResponse } from './admin-delete-response';

/** Api keys delete result schema exposed by Claw Router. */
export interface ApiKeysDeleteResult {
  /** Business response code. */
  code: string;
  /** Data field on api keys delete result. */
  data?: AdminDeleteResponse;
  /** Human-readable response message. */
  msg?: string;
}
