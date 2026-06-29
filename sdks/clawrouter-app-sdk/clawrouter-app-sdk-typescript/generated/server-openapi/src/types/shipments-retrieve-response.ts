import type { ShipmentsRetrieveResult } from './shipments-retrieve-result';

export interface ShipmentsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
