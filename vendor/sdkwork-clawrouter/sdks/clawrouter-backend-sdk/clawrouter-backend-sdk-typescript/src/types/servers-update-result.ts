import type { AdminMcpServerMutationResponse } from './admin-mcp-server-mutation-response';

/** Servers update result schema exposed by Claw Router. */
export interface ServersUpdateResult {
  /** Business response code. */
  code: string;
  /** Data field on servers update result. */
  data?: AdminMcpServerMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
