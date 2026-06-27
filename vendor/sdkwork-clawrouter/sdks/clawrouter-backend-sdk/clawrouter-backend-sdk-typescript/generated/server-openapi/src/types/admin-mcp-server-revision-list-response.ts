import type { AdminMcpServerRevisionItem } from './admin-mcp-server-revision-item';

/** Admin mcp server revision list response schema exposed by Claw Router. */
export interface AdminMcpServerRevisionListResponse {
  /** Items field on admin mcp server revision list response. */
  items: AdminMcpServerRevisionItem[];
}
