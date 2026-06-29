import type { ShipmentsPackagesCreateResult } from './shipments-packages-create-result';

export interface ShipmentsPackagesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
