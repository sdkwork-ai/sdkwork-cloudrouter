import type { ToolsUpdateResult } from './tools-update-result';

export interface ToolsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
