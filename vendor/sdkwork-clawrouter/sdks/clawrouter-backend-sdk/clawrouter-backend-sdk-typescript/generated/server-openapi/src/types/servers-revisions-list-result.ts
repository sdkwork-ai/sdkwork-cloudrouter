import type { AdminMcpServerRevisionListResponse } from './admin-mcp-server-revision-list-response';

/** Servers revisions list result schema exposed by Claw Router. */
export interface ServersRevisionsListResult {
  /** Business response code. */
  code: string;
  /** Data field on servers revisions list result. */
  data?: AdminMcpServerRevisionListResponse;
  /** Human-readable response message. */
  msg?: string;
}
