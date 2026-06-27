/** Admin firewall rule create request schema exposed by Claw Router. */
export interface AdminFirewallRuleCreateRequest {
  /** Operator-provided reason for audit records. */
  reason: string;
  /** Firewall rule category. */
  type: string;
  /** IP address, CIDR block, domain, or request target expression. */
  value: string;
}
