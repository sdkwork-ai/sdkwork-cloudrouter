import type { AdminMcpToolItem } from './admin-mcp-tool-item';

/** Admin mcp discovery response schema exposed by Claw Router. */
export interface AdminMcpDiscoveryResponse {
  /** Checked at field on admin mcp discovery response. */
  checkedAt: string;
  /** Discovered count field on admin mcp discovery response. */
  discoveredCount: string;
  /** Server id field on admin mcp discovery response. */
  serverId: string;
  /** Tools field on admin mcp discovery response. */
  tools: AdminMcpToolItem[];
}
