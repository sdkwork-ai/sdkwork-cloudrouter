import type { FirewallsRulesCreateResult } from './firewalls-rules-create-result';

export interface FirewallsRulesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
