import type { AdminFirewallRulesResponse } from './admin-firewall-rules-response';

/** Firewalls rules list result schema exposed by Claw Router. */
export interface FirewallsRulesListResult {
  /** Business response code. */
  code: string;
  /** Data field on firewalls rules list result. */
  data?: AdminFirewallRulesResponse;
  /** Human-readable response message. */
  msg?: string;
}
