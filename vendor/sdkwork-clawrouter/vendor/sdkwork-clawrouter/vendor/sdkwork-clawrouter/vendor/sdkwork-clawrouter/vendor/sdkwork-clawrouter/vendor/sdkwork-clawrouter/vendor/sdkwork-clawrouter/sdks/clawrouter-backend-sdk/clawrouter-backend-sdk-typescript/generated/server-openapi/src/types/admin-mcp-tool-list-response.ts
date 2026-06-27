import type { AdminMcpToolItem } from './admin-mcp-tool-item';

/** Admin mcp tool list response schema exposed by Claw Router. */
export interface AdminMcpToolListResponse {
  /** Items field on admin mcp tool list response. */
  items: AdminMcpToolItem[];
}
