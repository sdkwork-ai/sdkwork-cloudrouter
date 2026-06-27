import type { AdminFirewallItem } from './admin-firewall-item';

/** Admin firewall rules response schema exposed by Claw Router. */
export interface AdminFirewallRulesResponse {
  /** Items field on admin firewall rules response. */
  items: AdminFirewallItem[];
}
