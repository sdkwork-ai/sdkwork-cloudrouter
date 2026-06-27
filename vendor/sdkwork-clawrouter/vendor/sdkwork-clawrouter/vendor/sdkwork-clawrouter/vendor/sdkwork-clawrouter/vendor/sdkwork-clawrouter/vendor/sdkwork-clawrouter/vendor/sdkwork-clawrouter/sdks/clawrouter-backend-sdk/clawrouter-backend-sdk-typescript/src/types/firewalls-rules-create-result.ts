import type { AdminFirewallMutationResponse } from './admin-firewall-mutation-response';

/** Firewalls rules create result schema exposed by Claw Router. */
export interface FirewallsRulesCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on firewalls rules create result. */
  data?: AdminFirewallMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
