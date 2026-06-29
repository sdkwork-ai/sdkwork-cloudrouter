import type { ServiceNodesStatusUpdateResult } from './service-nodes-status-update-result';

export interface ServiceNodesStatusUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
