import type { ServiceNodesCreateResult } from './service-nodes-create-result';

export interface ServiceNodesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
