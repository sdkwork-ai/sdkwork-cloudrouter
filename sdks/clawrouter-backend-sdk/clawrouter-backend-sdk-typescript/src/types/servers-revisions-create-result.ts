import type { AdminMcpServerRevisionMutationResponse } from './admin-mcp-server-revision-mutation-response';

/** Servers revisions create result schema exposed by Claw Router. */
export interface ServersRevisionsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on servers revisions create result. */
  data?: AdminMcpServerRevisionMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
