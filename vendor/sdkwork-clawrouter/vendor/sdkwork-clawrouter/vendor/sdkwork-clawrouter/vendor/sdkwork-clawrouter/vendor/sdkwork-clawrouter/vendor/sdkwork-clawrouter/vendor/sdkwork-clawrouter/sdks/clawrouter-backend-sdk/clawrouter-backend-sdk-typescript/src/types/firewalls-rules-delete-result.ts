import type { AdminDeleteResponse } from './admin-delete-response';

/** Firewalls rules delete result schema exposed by Claw Router. */
export interface FirewallsRulesDeleteResult {
  /** Business response code. */
  code: string;
  /** Data field on firewalls rules delete result. */
  data?: AdminDeleteResponse;
  /** Human-readable response message. */
  msg?: string;
}
