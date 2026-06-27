import type { AdminMcpToolMutationResponse } from './admin-mcp-tool-mutation-response';

/** Tools update result schema exposed by Claw Router. */
export interface ToolsUpdateResult {
  /** Business response code. */
  code: string;
  /** Data field on tools update result. */
  data?: AdminMcpToolMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
