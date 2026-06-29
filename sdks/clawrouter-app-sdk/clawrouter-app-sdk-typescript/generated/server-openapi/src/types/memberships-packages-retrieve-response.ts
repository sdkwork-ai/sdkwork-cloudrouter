import type { MembershipsPackagesRetrieveResult } from './memberships-packages-retrieve-result';

export interface MembershipsPackagesRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
