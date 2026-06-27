import type { AdminMcpBindingItem } from './admin-mcp-binding-item';

/** Admin mcp binding list response schema exposed by Claw Router. */
export interface AdminMcpBindingListResponse {
  /** Items field on admin mcp binding list response. */
  items: AdminMcpBindingItem[];
}
