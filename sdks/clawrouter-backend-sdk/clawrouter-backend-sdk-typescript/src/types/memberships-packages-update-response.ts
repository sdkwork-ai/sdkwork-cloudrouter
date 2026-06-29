import type { MembershipsPackagesUpdateResult } from './memberships-packages-update-result';

export interface MembershipsPackagesUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
