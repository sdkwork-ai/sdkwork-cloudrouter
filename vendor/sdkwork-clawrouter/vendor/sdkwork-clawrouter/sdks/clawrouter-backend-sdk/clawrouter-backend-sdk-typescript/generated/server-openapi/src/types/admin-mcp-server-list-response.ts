import type { AdminMcpServerItem } from './admin-mcp-server-item';

/** Admin mcp server list response schema exposed by Claw Router. */
export interface AdminMcpServerListResponse {
  /** Items field on admin mcp server list response. */
  items: AdminMcpServerItem[];
}
