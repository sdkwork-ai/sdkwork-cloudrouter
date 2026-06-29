import type { ServiceNodesUpdateResult } from './service-nodes-update-result';

export interface ServiceNodesUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
