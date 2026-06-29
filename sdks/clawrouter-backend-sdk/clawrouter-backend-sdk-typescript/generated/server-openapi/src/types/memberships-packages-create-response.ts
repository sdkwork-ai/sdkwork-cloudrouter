import type { MembershipsPackagesCreateResult } from './memberships-packages-create-result';

export interface MembershipsPackagesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
