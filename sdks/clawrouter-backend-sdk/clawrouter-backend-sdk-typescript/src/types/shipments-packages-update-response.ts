import type { ShipmentsPackagesUpdateResult } from './shipments-packages-update-result';

export interface ShipmentsPackagesUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
