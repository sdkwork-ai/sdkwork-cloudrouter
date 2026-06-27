import type { AdminMcpServerRevisionMutationResponse } from './admin-mcp-server-revision-mutation-response';

/** Revisions publish result schema exposed by Claw Router. */
export interface RevisionsPublishResult {
  /** Business response code. */
  code: string;
  /** Data field on revisions publish result. */
  data?: AdminMcpServerRevisionMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
