import type { AdminMcpServerMutationResponse } from './admin-mcp-server-mutation-response';

/** Servers create result schema exposed by Claw Router. */
export interface ServersCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on servers create result. */
  data?: AdminMcpServerMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
