import type { AdminMcpServerMutationResponse } from './admin-mcp-server-mutation-response';

/** Servers retrieve result schema exposed by Claw Router. */
export interface ServersRetrieveResult {
  /** Business response code. */
  code: string;
  /** Data field on servers retrieve result. */
  data?: AdminMcpServerMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
